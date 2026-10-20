import { getCentralAdmin } from "@/lib/central-session";
import { revenueSnapshot } from "@/lib/revenue-snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream of the live revenue snapshot. One persistent
 * connection (auto-reconnecting via EventSource) instead of client polling.
 * Pushes immediately, then every 5s; comment heartbeats keep proxies open.
 */
export async function GET(req: Request) {
  if (!(await getCentralAdmin())) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const push = async () => {
        try {
          const data = await revenueSnapshot();
          controller.enqueue(encoder.encode(`event: revenue\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`: error\n\n`));
        }
      };
      await push();
      timer = setInterval(push, 5000);
      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
