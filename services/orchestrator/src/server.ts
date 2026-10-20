import Fastify from "fastify";
import { createLogger, ok } from "@app/shared";
import { ALL_TICKS, type TickResult } from "./ticks.js";

/**
 * ORCHESTRATOR — the part of GM-OS that runs with nobody watching.
 *
 * A plain interval rather than a cron library: there is one schedule, the
 * cadence does not vary per job, and a dependency that parses cron expressions
 * would be more moving parts than the thing it schedules.
 *
 * The loop is deliberately conservative. Ticks run in sequence, not in
 * parallel, so two of them cannot contend for the same rows; one throwing does
 * not stop the rest; and a run that is still going when the next interval fires
 * is skipped rather than overlapped.
 */
const log = createLogger("orchestrator");
const app = Fastify({ loggerInstance: log });

const PORT = Number(process.env.PORT || 8080);
const INTERVAL_MS = Number(process.env.ORCHESTRATOR_INTERVAL_MS || 60_000);

let running = false;
let lastRun: { at: string; results: TickResult[]; errors: string[] } | null = null;

async function runAll(): Promise<{ results: TickResult[]; errors: string[] }> {
  const results: TickResult[] = [];
  const errors: string[] = [];

  for (const tick of ALL_TICKS) {
    try {
      const r = await tick();
      results.push(r);
      if (r.changed > 0) log.info({ tick: r.name, changed: r.changed }, "tick did work");
    } catch (e) {
      // One failing tick must not stop the others: the disposal queue should
      // keep draining even if the scheduling agent is broken.
      const message = `${tick.name}: ${(e as Error).message}`;
      errors.push(message);
      log.error({ err: e, tick: tick.name }, "tick failed");
    }
  }
  return { results, errors };
}

async function cycle() {
  if (running) {
    log.warn("previous cycle still running — skipping this interval");
    return;
  }
  running = true;
  try {
    const { results, errors } = await runAll();
    lastRun = { at: new Date().toISOString(), results, errors };
  } finally {
    running = false;
  }
}

app.get("/health", async () => ok({ service: "orchestrator", status: "up" }));

/** Readiness reports the last cycle, so a stuck loop is visible from outside. */
app.get("/ready", async () => ok({ ready: true, running, lastRun }));

/**
 * Run the cycle now. Useful for a deploy smoke test and for pushing the queue
 * along without waiting a minute. It is not authenticated because it is not
 * exposed beyond the internal network — no Caddy route points at this service —
 * and because every tick is idempotent, so triggering it twice is harmless.
 */
app.post("/v1/orchestrator/run", async () => {
  const { results, errors } = await runAll();
  return ok({ results, errors });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  log.info(`orchestrator on :${PORT}, cycle every ${INTERVAL_MS}ms`);
  // A short delay before the first cycle so the database is accepting
  // connections after a compose restart.
  setTimeout(() => {
    void cycle();
    setInterval(() => void cycle(), INTERVAL_MS);
  }, 10_000);
});
