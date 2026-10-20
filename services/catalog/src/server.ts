import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@app/shared";
import {
  getSolutionsPage,
  getSolutionBySlug,
  parseSolutionInput,
  createSolution,
} from "./solutions.js";

/**
 * CATALOG service — owns Solutions (the marketplace), search and partner writes.
 */
const log = createLogger("catalog");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);

app.get("/health", async () => ok({ service: "catalog", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

app.get("/v1/catalog", async (req) => {
  const q = (req.query || {}) as Record<string, string>;
  const page = await getSolutionsPage(
    {
      q: q.q,
      category: q.category,
      licenseModel: q.licenseModel,
      region: q.region,
      whiteLabel: q.whiteLabel === "true" ? true : undefined,
      minPrice: q.minPrice ? Number(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
    },
    { page: q.page ? Number(q.page) : 1, sort: q.sort as never }
  );
  return ok(page);
});

app.get("/v1/catalog/:slug", async (req, reply) => {
  const { slug } = req.params as { slug: string };
  const solution = await getSolutionBySlug(slug);
  return solution ? ok(solution) : reply.code(404).send(err("Solution not found"));
});

app.post("/v1/catalog", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Unauthorized"));
  try {
    const data = parseSolutionInput(req.body);
    const solution = await createSolution(data, claims.sub);
    return ok(solution);
  } catch (e) {
    return reply.code(400).send(err((e as Error).message));
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`catalog on :${PORT}`));
