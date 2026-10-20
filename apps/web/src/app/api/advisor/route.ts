import { NextResponse } from "next/server";
import { retrieveSolutions, buildContext, SYSTEM_PROMPT, ADVISOR_LANGS, recordUsage } from "@/lib/advisor";
import { limited } from "@/lib/rate-limit";

type ChatTurn = { role: "user" | "assistant"; content: string };

/** Sanitize client-supplied history: keep the last 8 valid turns, capped length. */
function cleanHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ChatTurn => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));
}

/**
 * AI Solutions Advisor chat endpoint, grounded in the live catalog. Multi-turn
 * (history-aware) and replies in the visitor's selected language. Uses OpenAI when
 * OPENAI_API_KEY is set; otherwise returns a grounded fallback. Records usage.
 */
export async function POST(req: Request) {
  const tooMany = limited(req, "advisor", 20, 60_000);
  if (tooMany) return tooMany;
  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").slice(0, 1000);
  if (!message) return NextResponse.json({ success: false, error: "message required" }, { status: 400 });
  const history = cleanHistory(body.history);
  const lang = ADVISOR_LANGS[String(body.locale)] || "English";

  const solutions = await retrieveSolutions(message);
  const context = buildContext(solutions);

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Grounded fallback — recommend the top matches directly.
    const reply =
      solutions.length === 0
        ? "I couldn't find a matching solution yet. Tell us what you need via the contact form and our team will source it."
        : `Here are solutions that may fit:\n\n${solutions
            .map((s) => `• **${s.title}** — ${s.summary} (/marketplace/${s.slug})`)
            .join("\n")}\n\nWant a demo of any of these?`;
    await recordUsage(null, 0, 0);
    return NextResponse.json({ success: true, reply, grounded: true });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\nAlways reply in ${lang}.\n\nCatalog context:\n${context}` },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.4,
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a reply.";
    const usage = data.usage || {};
    await recordUsage(null, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);
    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json({ success: false, error: "Advisor temporarily unavailable" }, { status: 502 });
  }
}
