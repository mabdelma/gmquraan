import { NextResponse } from "next/server";
import { buildAdvisorInstructions } from "@/lib/grounding";
import { getAgentLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

/**
 * Mints an ephemeral OpenAI Realtime client secret so the browser can open a
 * WebRTC session directly with the model (gpt-realtime) without exposing the
 * server key. The browser uses the returned token to POST to /v1/realtime/calls.
 *
 * The session is grounded in Unskinned's live solution catalog and given a spoken
 * advisor persona so the voice agent recommends real, current solutions.
 */
export async function POST() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ success: false, error: "OPENAI_API_KEY not set" }, { status: 503 });
  }
  try {
    const instructions = await buildAdvisorInstructions(await getAgentLocale());
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
          instructions,
          audio: { output: { voice: process.env.OPENAI_REALTIME_VOICE || "alloy" } },
        },
      }),
    });
    const data = await res.json();
    return NextResponse.json({ success: res.ok, data }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to mint realtime token" }, { status: 502 });
  }
}
