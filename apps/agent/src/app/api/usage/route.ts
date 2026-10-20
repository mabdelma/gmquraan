import { NextResponse } from "next/server";
import { prisma } from "@app/db";

/** The realtime agent reports token usage per response; record it to AgentUsage. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  await prisma.agentUsage.create({
    data: {
      userId: b.userId ?? null,
      model: b.model || "gpt-realtime",
      inputTokens: Number(b.inputTokens || 0),
      outputTokens: Number(b.outputTokens || 0),
      totalTokens: Number(b.inputTokens || 0) + Number(b.outputTokens || 0),
    },
  });
  return NextResponse.json({ success: true });
}
