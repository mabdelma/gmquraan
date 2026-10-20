/**
 * Audit (AUD-01).
 *
 * There are six audit-ish tables in this schema already — AuditLog,
 * DocumentEvent, TaskEvent, FolderEvent, JmlEvent, OpportunityStageEvent — and
 * each answers a question about one domain. None of them answers "what happened
 * across the system in the last hour, and who did it", which is the question an
 * auditor asks and the one `data_dictionary.csv` describes with
 * `audit.audit_event` carrying `before_json` and `after_json`.
 *
 * So this is a cross-cutting record, not a replacement. The domain tables stay:
 * a document's history belongs on the document and is rendered there. What
 * changes is that anything worth auditing also lands in one place, with a
 * correlation id so a single request that touched four domains reads as one
 * event rather than four unrelated ones.
 */

export const ACTOR_KINDS = ["HUMAN", "AGENT", "SYSTEM"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

/**
 * Fields that must never be written into an audit payload.
 *
 * Audit rows are read by people who are entitled to know *that* something
 * changed without being entitled to the value — a payroll approver may see that
 * a salary was amended without seeing the figure, and nobody at all should find
 * a password hash or a TOTP secret sitting in a log that is deliberately kept
 * for years.
 *
 * Matched on the field name, case-insensitively, at any depth.
 */
const NEVER_LOG = [
  "password",
  "passwordhash",
  "portalpasswordhash",
  "totpsecret",
  "recoverycodes",
  "secret",
  "token",
  "tokenhash",
  "apikey",
  "authorization",
  "cookie",
  "sessionid",
  "privatekey",
];

/** Fields recorded as changed, but with the value replaced. */
const REDACT_VALUE = ["salary", "basesalary", "netamount", "grossamount", "compensation", "iban", "bankaccount"];

const REDACTED = "[redacted]";
const OMITTED = "[omitted]";

/**
 * Strip an object down to something safe to keep for years.
 *
 * Two different treatments on purpose. A secret is *omitted* — its presence in
 * a log is the problem, so the key does not survive. A salary is *redacted* —
 * the fact that it changed is exactly what the audit exists to record, so the
 * key survives with its value replaced.
 */
export function redactForAudit(value: unknown, depth = 0): unknown {
  if (depth > 6) return OMITTED;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redactForAudit(v, depth + 1));
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (NEVER_LOG.some((n) => key === n || key.endsWith(n))) continue;
    if (REDACT_VALUE.some((r) => key === r || key.endsWith(r))) {
      out[k] = v === null || v === undefined ? v : REDACTED;
      continue;
    }
    out[k] = redactForAudit(v, depth + 1);
  }
  return out;
}

/**
 * What actually changed between two states.
 *
 * Storing whole before and after objects makes every row large and makes the
 * interesting part — the one field somebody altered — hard to see. This keeps
 * only the keys that differ, on both sides.
 *
 * The comparison happens on the raw values and the redaction happens after.
 * Doing it the other way round — redacting first, then diffing — makes two
 * different salaries compare equal, because both sides have already become the
 * same marker, and the audit then reports that nothing changed. Recording that
 * a salary moved is the entire reason the entry exists.
 */
export function changedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): { before: Record<string, unknown>; after: Record<string, unknown>; keys: string[] } {
  const b = before ?? {};
  const a = after ?? {};

  // Diff on what is really there.
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])
  );

  const pick = (src: Record<string, unknown>) =>
    Object.fromEntries(keys.filter((k) => k in src).map((k) => [k, src[k]]));

  // Redact only what is about to be written.
  return {
    before: (redactForAudit(pick(b)) ?? {}) as Record<string, unknown>,
    after: (redactForAudit(pick(a)) ?? {}) as Record<string, unknown>,
    keys,
  };
}

/**
 * Why this action name is not acceptable, or null.
 *
 * `domain.thing.verb`, lowercase. A convention rather than a preference: audit
 * is searched by prefix — "everything finance did", "everything that happened
 * to a company" — and that only works if the names agree on where the domain
 * sits.
 */
export function auditActionProblem(action: string): string | null {
  if (!action.trim()) return "An audit entry needs an action.";
  if (action !== action.toLowerCase()) return "Audit actions are lowercase.";
  if (!/^[a-z0-9]+(\.[a-z0-9_]+){1,3}$/.test(action)) {
    return "Use domain.thing.verb, e.g. org.company.update.";
  }
  return null;
}

export type AuditEntry = {
  action: string;
  actorKind: ActorKind;
  actorId: string;
  actorName?: string | null;
  /** What was acted on: "Company", "ControlledDocument", … */
  entityType: string;
  entityRef: string;
  /** The company scope this belongs to, so audit reads obey the same axis. */
  companyId?: string | null;
  correlationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
};

/** Why this entry cannot be recorded, or null. */
export function auditEntryProblem(e: AuditEntry): string | null {
  const a = auditActionProblem(e.action);
  if (a) return a;
  if (!ACTOR_KINDS.includes(e.actorKind)) return "Unknown actor kind.";
  if (!e.actorId.trim()) return "An audit entry needs an actor.";
  if (!e.entityType.trim() || !e.entityRef.trim()) return "An audit entry needs the thing it acted on.";
  return null;
}

/**
 * Whether a viewer may read this audit row.
 *
 * Audit obeys the same company scope as the records it describes — otherwise
 * the log becomes the way to learn what happens in a company you cannot see.
 * `SCOPING_RULES.md`: "search/export/report/AI retrieval apply the same scope as
 * transactional APIs". A log is a report.
 */
export function canReadAudit(
  viewer: { companyIds?: readonly string[] },
  row: { companyId?: string | null }
): boolean {
  if (!row.companyId) return true;
  if (!viewer.companyIds) return false;
  return viewer.companyIds.includes(row.companyId);
}
