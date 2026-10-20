import { readFile } from "fs/promises";

const DIR = process.env.UPLOAD_DIR || "/data/uploads";
const TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
};

/** Serve an uploaded image from the volume. Name is sanitized against traversal. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[A-Za-z0-9_.-]+$/.test(name) || name.includes("..")) return new Response("Bad request", { status: 400 });
  const ext = name.split(".").pop() || "";
  const type = TYPE[ext];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(`${DIR}/${name}`);
    return new Response(new Uint8Array(buf), {
      headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
