import type { DomainEvent } from "./types.js";

/**
 * Event-bus abstraction for the async phase. The default `LogBus` just logs
 * (so services run without a broker); swap in a NATS / Redis Streams adapter
 * in production. Producers call `publish`; consumers `subscribe`.
 *
 *   demo.requested      → notifications (email the partner)
 *   payment.succeeded    → billing / auth (provision plan)
 *   coupon.redeemed      → billing (decrement, analytics)
 *   user.registered      → notifications (welcome / verify)
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: DomainEvent["type"], handler: (e: DomainEvent) => Promise<void> | void): void;
}

class LogBus implements EventBus {
  private handlers = new Map<string, ((e: DomainEvent) => Promise<void> | void)[]>();

  async publish(event: DomainEvent): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[events] ${event.type}`, event);
    const hs = this.handlers.get(event.type) ?? [];
    await Promise.all(hs.map((h) => h(event)));
  }

  subscribe(type: DomainEvent["type"], handler: (e: DomainEvent) => Promise<void> | void): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }
}

let _bus: EventBus | null = null;

/** Returns the process-wide event bus. Replace LogBus with a broker adapter in prod. */
export function getEventBus(): EventBus {
  if (!_bus) _bus = new LogBus();
  return _bus;
}
