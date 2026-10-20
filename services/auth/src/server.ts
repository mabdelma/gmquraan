import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, signToken, bearer } from "@app/shared";
import {
  registerUser,
  verifyCredentials,
  createToken,
  consumeToken,
  markVerified,
  resetPassword,
  sendEmail,
} from "./users.js";

/**
 * AUTH service — owns users, credentials, JWT issuance, email verify/reset.
 * Issues HS256 JWTs over AUTH_SECRET; every other service verifies via @app/shared.
 */
const log = createLogger("auth");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);
const APP_URL = process.env.APP_URL || "http://localhost:3000";

app.get("/health", async () => ok({ service: "auth", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Internal token verification (gateway / other services).
app.get("/v1/auth/verify", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  return claims ? ok(claims) : reply.code(401).send(err("Invalid token"));
});

app.post("/v1/auth/register", async (req, reply) => {
  try {
    const user = await registerUser((req.body || {}) as never);
    const token = await createToken("verify", user.id);
    await sendEmail(user.email, "verify", user.locale, `${APP_URL}/verify?token=${token}`);
    const jwt = signToken({ sub: user.id, role: user.role, email: user.email });
    return ok({ token: jwt, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    return reply.code(400).send(err((e as Error).message));
  }
});

app.post("/v1/auth/login", async (req, reply) => {
  const b = (req.body || {}) as { email?: string; password?: string };
  if (!b.email || !b.password) return reply.code(400).send(err("Email and password required"));
  const user = await verifyCredentials(b.email, b.password);
  if (!user) return reply.code(401).send(err("Invalid email or password"));
  const jwt = signToken({ sub: user.id, role: user.role, email: user.email });
  return ok({
    token: jwt,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
  });
});

app.post("/v1/auth/verify-email", async (req, reply) => {
  const b = (req.body || {}) as { token?: string };
  const userId = await consumeToken(b.token || "", "verify");
  if (!userId) return reply.code(400).send(err("Invalid or expired token"));
  await markVerified(userId);
  return ok({ verified: true });
});

app.post("/v1/auth/forgot", async (req) => {
  const b = (req.body || {}) as { email?: string };
  const email = (b.email || "").trim().toLowerCase();
  if (email) {
    const { prisma } = await import("@app/db");
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await createToken("reset", user.id);
      await sendEmail(user.email, "reset", user.locale, `${APP_URL}/reset-password?token=${token}`);
    }
  }
  // Always 200 — don't leak which emails exist.
  return ok({ sent: true });
});

app.post("/v1/auth/reset", async (req, reply) => {
  const b = (req.body || {}) as { token?: string; password?: string };
  const userId = await consumeToken(b.token || "", "reset");
  if (!userId) return reply.code(400).send(err("Invalid or expired token"));
  try {
    await resetPassword(userId, b.password || "");
    return ok({ reset: true });
  } catch (e) {
    return reply.code(400).send(err((e as Error).message));
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`auth on :${PORT}`));
