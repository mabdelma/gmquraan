import { NextResponse } from "next/server";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";

/** Liveness + DB readiness for the web app. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, data: { service: "web", status: "up", db: "up" } });
  } catch {
    return NextResponse.json(
      { success: false, data: { service: "web", status: "up", db: "down" } },
      { status: 503 }
    );
  }
}
