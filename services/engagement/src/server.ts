import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@app/shared";
import {
  createLead,
  listLeads,
  setLeadStatus,
  toggleSaved,
  saveSearch,
  requestDemo,
  getUserDemoRequests,
} from "./engagement.js";
import { runSavedSearchAlerts } from "./alerts.js";

/**
 * ENGAGEMENT service — saved solutions/searches, demo requests, leads/CRM and
 * the saved-search alert cron. Notifies partners of demo requests + clients of
 * saved-search matches via the notifications service.
 */
const log = createLogger("engagement");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

const userId = (req: { headers: Record<string, unknown> }) =>
  verifyToken(bearer(req.headers.authorization as string | undefined))?.sub;

app.get("/health", async () => ok({ service: "engagement", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Public: contact-form / solution-page lead capture.
app.post("/v1/engagement/leads", async (req, reply) => {
  try {
    const lead = await createLead((req.body || {}) as never);
    return ok({ id: lead.id });
  } catch (e) {
    return reply.code(400).send(err((e as Error).message));
  }
});

// CRM: a partner's pipeline.
app.get("/v1/engagement/leads", async (req, reply) => {
  const uid = userId(req);
  if (!uid) return reply.code(401).send(err("Unauthorized"));
  return ok(await listLeads(uid));
});

app.patch("/v1/engagement/leads/:id", async (req, reply) => {
  if (!userId(req)) return reply.code(401).send(err("Unauthorized"));
  const { id } = req.params as { id: string };
  const { status } = (req.body || {}) as { status: never };
  return ok(await setLeadStatus(id, status));
});

app.post("/v1/engagement/saved", async (req, reply) => {
  const uid = userId(req);
  if (!uid) return reply.code(401).send(err("Unauthorized"));
  const { solutionId } = (req.body || {}) as { solutionId: string };
  if (!solutionId) return reply.code(400).send(err("solutionId required"));
  return ok(await toggleSaved(uid, solutionId));
});

app.post("/v1/engagement/searches", async (req, reply) => {
  const uid = userId(req);
  if (!uid) return reply.code(401).send(err("Unauthorized"));
  const b = (req.body || {}) as { name: string; query: string; alerts?: boolean };
  return ok(await saveSearch(uid, b.name, b.query, Boolean(b.alerts)));
});

app.post("/v1/engagement/demos", async (req, reply) => {
  const uid = userId(req);
  if (!uid) return reply.code(401).send(err("Unauthorized"));
  const b = (req.body || {}) as { solutionId: string; note?: string; preferredAt?: string };
  if (!b.solutionId) return reply.code(400).send(err("solutionId required"));
  const demo = await requestDemo(uid, b.solutionId, b.note, b.preferredAt ? new Date(b.preferredAt) : undefined);
  return ok({ id: demo.id });
});

app.get("/v1/engagement/demos", async (req, reply) => {
  const uid = userId(req);
  if (!uid) return reply.code(401).send(err("Unauthorized"));
  return ok(await getUserDemoRequests(uid));
});

// Cron-triggered saved-search alert run.
app.post("/v1/engagement/alerts/run", async () => ok(await runSavedSearchAlerts()));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`engagement on :${PORT}`));
