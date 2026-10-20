import { prisma } from "@app/db";

/**
 * Append a domain event to the log (event-bus foundation). Fire-and-forget and
 * best-effort — it NEVER throws, so emitting can't break the flow that raised it.
 * Async consumers / analytics read from the DomainEvent log.
 */
export type DomainEventType =
  | "user.registered"
  | "payment.succeeded"
  | "solution.published"
  | "quote.accepted"
  | "payout.sent"
  | "demo.requested";

export async function emit(type: DomainEventType | string, payload?: Record<string, unknown>): Promise<void> {
  try {
    await prisma.domainEvent.create({ data: { type, payload: (payload ?? undefined) as never } });
  } catch {
    /* best-effort — a full event bus would retry via an outbox; here we swallow. */
  }
}
