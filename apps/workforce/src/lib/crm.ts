import { prisma } from "@app/db";
import {
  customerRef,
  dedupeCustomer,
  isGroupWide,
  opportunityRef,
  type CustomerCandidate,
  type Viewer,
} from "@app/core";

/**
 * CRM access and identifiers.
 *
 * Visibility follows the same shape as everything else in the portal: your own
 * records, your reporting line's, and the whole group for the roles that hold
 * it. Commercial data is CONFIDENTIAL by default, which keeps it out of the
 * hands of anybody whose clearance stops at INTERNAL.
 */

export function canSeeCustomer(v: Viewer, c: { ownerId: string; entityScope?: unknown }): boolean {
  if (isGroupWide(v.role)) return true;
  if (c.ownerId === v.id) return true;
  if ((v.reportIds ?? []).includes(c.ownerId)) return true;

  // Entity scope, where it is set: a Spanish salesperson has no business
  // reading the Canadian book unless the customer is shared with them.
  const scope = Array.isArray(c.entityScope) ? (c.entityScope as string[]) : null;
  if (scope && v.entityId && scope.includes(v.entityId)) return true;

  return false;
}

export async function visibleCustomers(v: Viewer, limit = 200) {
  const rows = await prisma.customer.findMany({
    where: { mergedIntoId: null },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      owner: { select: { name: true } },
      _count: { select: { opportunities: true, activities: true } },
    },
  });
  // Filtered in one tested place rather than approximated in a where clause.
  return rows.filter((c) => canSeeCustomer(v, c));
}

export async function visibleOpportunities(v: Viewer, opts: { open?: boolean; limit?: number } = {}) {
  const rows = await prisma.opportunity.findMany({
    where: opts.open ? { stage: { notIn: ["WON", "LOST"] } } : {},
    orderBy: [{ expectedCloseDate: "asc" }, { updatedAt: "desc" }],
    take: opts.limit ?? 200,
    include: {
      owner: { select: { name: true } },
      customer: { select: { id: true, displayName: true, ownerId: true, entityScope: true } },
    },
  });
  return rows.filter((o) => canSeeCustomer(v, o.customer) || o.ownerId === v.id);
}

/** Next customer reference. */
export async function nextCustomerRef(): Promise<string> {
  const count = await prisma.customer.count();
  return customerRef(count + 1);
}

/** Next opportunity reference for the year. Immutable once issued. */
export async function nextOpportunityRef(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.opportunity.count({ where: { ref: { startsWith: `OPP-${year}-` } } });
  return opportunityRef(year, count + 1);
}

/**
 * Run the deduplication check against every customer, not just the visible
 * ones.
 *
 * That is deliberate and worth stating: if a salesperson cannot see the
 * Canadian book, they must still be stopped from creating a second record for
 * a company already in it, or the canonical-customer rule holds only for
 * people who can see everything. The candidate names come back so a review is
 * possible — which does disclose that a customer exists. That is the lesser
 * harm, and blocking silently would be worse than both.
 */
export async function checkForDuplicates(proposed: Omit<CustomerCandidate, "id">) {
  const existing = await prisma.customer.findMany({
    where: { mergedIntoId: null },
    select: {
      id: true,
      displayName: true,
      legalName: true,
      taxId: true,
      websiteDomain: true,
      primaryEmail: true,
      primaryPhone: true,
    },
    take: 2000,
  });
  return dedupeCustomer(proposed, existing);
}

/** Record an activity and move the opportunity's activity clock. */
export async function logActivity(a: {
  customerId: string;
  opportunityId?: string | null;
  actorId: string;
  activityType: "CALL" | "MEETING" | "EMAIL" | "WHATSAPP" | "NOTE" | "TASK" | "DOCUMENT" | "PROPOSAL" | "STATUS_CHANGE" | "APPROVAL" | "SYSTEM_EVENT";
  summary: string;
  detail?: string | null;
  occurredAt?: Date;
}) {
  const when = a.occurredAt ?? new Date();
  await prisma.crmActivity.create({
    data: {
      customerId: a.customerId,
      opportunityId: a.opportunityId ?? null,
      actorId: a.actorId,
      activityType: a.activityType,
      summary: a.summary,
      detail: a.detail ?? null,
      occurredAt: when,
    },
  });

  // The inactivity rules measure from here, so an activity that did not update
  // the clock would leave a busy opportunity looking neglected.
  if (a.opportunityId) {
    await prisma.opportunity.update({
      where: { id: a.opportunityId },
      data: { lastActivityAt: when },
    });
  }
}
