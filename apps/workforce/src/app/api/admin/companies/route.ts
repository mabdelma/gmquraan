import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { recordAudit } from "@/lib/audit";
import {
  companyDeleteProblem,
  companyProblem,
  companyTransitionProblem,
  currencyChangeProblem,
  groupProblem,
  isGroupWide,
  type CompanyStatus,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Administering companies and business groups (ORG-01).
 *
 * The company code is the authorization axis — `access.ts` compares
 * `viewer.companyIds` against `record.entityId`, and that string is this code.
 * So a code change is not a rename, it is a change to what every existing
 * record is scoped against. It is refused once anything is filed, for the same
 * reason the base currency is.
 *
 * Every mutation writes an AuditLog row with before and after, because
 * "who changed the legal name of the entity our contracts are signed under"
 * is a question that gets asked once and needs an answer.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const action = String(form.get("action") || "");

  const to = (params: Record<string, string>) => {
    const q = new URLSearchParams(params);
    return new Response(null, { status: 303, headers: { Location: `/admin/companies?${q}` } });
  };
  const fail = (m: string) => to({ error: m });

  // Server-side, and the page check is presentation only. Both are needed:
  // hiding a link is not authorization.
  if (!isGroupWide(auth.member.role)) {
    return fail("Only group-wide roles can change the company structure.");
  }

  // Both records are written. AuditLog is the console's existing log and other
  // screens read it; AuditEvent is the cross-cutting one with before/after and a
  // correlation id. Dropping the old writer would blank those screens, so the
  // two run side by side until the readers move (Wave 1.4 follow-up).
  const audit = (action: string, target: string, detail: string) =>
    prisma.auditLog.create({
      data: { actorId: auth.member.id, actorEmail: auth.member.email, action, target, detail },
    });

  const trail = (
    action: string,
    entityRef: string,
    opts: { companyId?: string | null; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; note?: string } = {}
  ) =>
    recordAudit({
      action,
      actorKind: "HUMAN",
      actorId: auth.member.id,
      actorName: auth.member.name,
      entityType: "Company",
      entityRef,
      companyId: opts.companyId ?? entityRef,
      before: opts.before ?? null,
      after: opts.after ?? null,
      note: opts.note ?? null,
    });

  const companies = await prisma.company.findMany({ select: { id: true, code: true } });
  const existingCodes = companies.map((c) => c.code);

  if (action === "create" || action === "update") {
    const id = String(form.get("id") || "");
    const current = id ? await prisma.company.findUnique({ where: { id } }) : null;
    if (action === "update" && !current) return fail("That company no longer exists.");

    const code = String(form.get("code") || "").trim();
    const legalName = String(form.get("legalName") || "").trim();
    const country = String(form.get("country") || "").trim();
    const baseCurrency = String(form.get("baseCurrency") || "").trim().toUpperCase();
    const status = String(form.get("status") || "ACTIVE") as CompanyStatus;

    const problem = companyProblem({
      code,
      legalName,
      country,
      baseCurrency,
      status,
      existingCodes,
      currentCode: current?.code ?? null,
    });
    if (problem) return fail(problem);

    if (current) {
      // How much is filed against this company. Used for both the currency gate
      // and the code gate — a code change would silently re-scope all of it.
      const filed = await prisma.teamMember.count({ where: { entityId: current.code } });

      const currencyIssue = currencyChangeProblem(current.baseCurrency, baseCurrency, filed > 0);
      if (currencyIssue) return fail(currencyIssue);

      if (code !== current.code && filed > 0) {
        return fail(
          `The code is what ${filed} record${filed === 1 ? "" : "s"} are scoped against. Changing it would re-scope them all — create a new company instead.`
        );
      }

      if (status !== current.status) {
        const t = companyTransitionProblem(current.status as CompanyStatus, status);
        if (t) return fail(t);
      }

      await prisma.$transaction([
        prisma.company.update({
          where: { id },
          data: { code, legalName, country, baseCurrency, status },
        }),
        audit(
          "company.update",
          code,
          `${current.legalName} (${current.code}, ${current.baseCurrency}, ${current.status}) -> ${legalName} (${code}, ${baseCurrency}, ${status})`
        ),
      ]);
      await trail("org.company.update", code, {
        before: { code: current.code, legalName: current.legalName, country: current.country, baseCurrency: current.baseCurrency, status: current.status },
        after: { code, legalName, country, baseCurrency, status },
      });
      return to({ done: `Saved ${legalName}.` });
    }

    const created = await prisma.company.create({
      data: {
        code,
        legalName,
        country,
        baseCurrency,
        status,
        groupId: String(form.get("groupId") || "") || null,
        registrationLabel: String(form.get("registrationLabel") || "").trim() || null,
        registrationValue: String(form.get("registrationValue") || "").trim() || null,
      },
    });
    await audit("company.create", created.code, `${legalName}, ${country}, ${baseCurrency}, ${status}`);
    await trail("org.company.create", created.code, {
      after: { code, legalName, country, baseCurrency, status },
    });
    return to({ done: `Created ${legalName}.` });
  }

  if (action === "delete") {
    const id = String(form.get("id") || "");
    const current = await prisma.company.findUnique({ where: { id } });
    if (!current) return fail("That company no longer exists.");

    const [records, branches] = await Promise.all([
      prisma.teamMember.count({ where: { entityId: current.code } }),
      prisma.branch.count({ where: { companyId: id } }),
    ]);

    const problem = companyDeleteProblem({ records, branches });
    if (problem) return fail(problem);

    await prisma.$transaction([
      prisma.company.delete({ where: { id } }),
      audit("company.delete", current.code, `${current.legalName} removed; nothing was filed against it`),
    ]);
    await trail("org.company.delete", current.code, {
      before: { code: current.code, legalName: current.legalName, status: current.status },
      note: "Nothing was filed against it.",
    });
    return to({ done: `Deleted ${current.legalName}.` });
  }

  if (action === "create-group" || action === "rename-group") {
    const id = String(form.get("id") || "");
    const name = String(form.get("name") || "").trim();
    const groups = await prisma.businessGroup.findMany({ select: { id: true, name: true } });
    const current = groups.find((g) => g.id === id) ?? null;

    const problem = groupProblem({
      name,
      existingNames: groups.map((g) => g.name),
      currentName: current?.name ?? null,
    });
    if (problem) return fail(problem);

    if (current) {
      await prisma.$transaction([
        prisma.businessGroup.update({ where: { id }, data: { name } }),
        audit("group.rename", name, `${current.name} -> ${name}`),
      ]);
      return to({ done: `Renamed to ${name}.` });
    }
    const g = await prisma.businessGroup.create({ data: { name } });
    await audit("group.create", g.name, `Business group created`);
    return to({ done: `Created ${name}.` });
  }

  return fail("Unknown action.");
}
