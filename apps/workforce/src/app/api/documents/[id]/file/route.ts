import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { getBytes, mayActOnDocument, type DocRecord } from "@/lib/documents";
import { isPreviewable, operationFor } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Serve a document's bytes.
 *
 * `?download=1` is a different permission from viewing, not a different
 * Content-Disposition on the same one — reading in a controlled viewer and
 * taking a copy away are separate disclosures and the shipped permission model
 * lists them as separate verbs.
 *
 * Every served byte is verified against the digest it is filed under, so a
 * corrupted or swapped file fails loudly rather than being handed over as
 * though it were the approved record.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";

  const doc = await prisma.controlledDocument.findUnique({ where: { id } });
  if (!doc || !doc.storagePath || !doc.sha256) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const op = operationFor(wantsDownload ? "download" : "preview");
  const verdict = mayActOnDocument(auth.viewer, doc as unknown as DocRecord, op);
  if (!verdict.ok) {
    // 404 rather than 403: confirming a record exists to somebody who may not
    // see it is itself a disclosure, and `discover` is a separate permission.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await getBytes(doc.storagePath, doc.sha256);
  } catch (e) {
    await prisma.documentEvent.create({
      data: {
        documentId: doc.id,
        actorKind: "SYSTEM",
        actorRef: "system",
        actorName: "GM-OS",
        action: "integrity_failure",
        note: (e as Error).message,
      },
    });
    return NextResponse.json({ error: "Integrity check failed" }, { status: 500 });
  }

  // Downloads are recorded; previews are not. Otherwise the history of a
  // frequently-read document becomes unreadable, and a copy leaving is the
  // event worth being able to account for.
  if (wantsDownload) {
    await prisma.documentEvent.create({
      data: {
        documentId: doc.id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: "downloaded",
        note: `${doc.docId} downloaded.`,
      },
    });
  }

  const inline = !wantsDownload && isPreviewable(doc.mimeType ?? "");
  const filename = `${doc.docId}-${doc.shortTitle}-v${doc.versionMajor}.${doc.versionMinor}`;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // Never serve the stored type back verbatim for anything not on the
      // preview list — an unexpected type rendered inline is how stored XSS
      // works.
      "Content-Type": inline ? (doc.mimeType ?? "application/octet-stream") : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
