import { prisma } from "@app/db";
import type { CentralAdmin } from "./central-session";

/** Record a central-admin action. Never throws — auditing must not break the action. */
export async function logAudit(
  admin: Pick<CentralAdmin, "id" | "email">,
  action: string,
  target?: string | null,
  detail?: string | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorId: admin.id, actorEmail: admin.email, action, target: target ?? null, detail: detail ?? null },
    });
  } catch {
    /* swallow — auditing is best-effort */
  }
}
