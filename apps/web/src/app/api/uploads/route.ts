import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { getCentralAdmin } from "@/lib/central-session";
import { limited } from "@/lib/rate-limit";

const DIR = process.env.UPLOAD_DIR || "/data/uploads";
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
};
const MAX = 10 * 1024 * 1024; // 10 MB (photos)

/** Upload an image (central admin). Stores to a volume; served via /api/files. */
export async function POST(req: Request) {
  const tooMany = limited(req, "upload", 20, 60_000);
  if (tooMany) return tooMany;

  const central = await getCentralAdmin();
  if (!central) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext)
    return NextResponse.json(
      { success: false, error: `Unsupported image type${file.type ? ` (${file.type})` : ""}. Use PNG, JPG or WebP — iPhone HEIC photos aren't supported.` },
      { status: 415 }
    );
  if (file.size > MAX)
    return NextResponse.json({ success: false, error: "Image must be under 10 MB" }, { status: 413 });

  const name = `${randomUUID()}.${ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(`${DIR}/${name}`, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ success: true, url: `/api/files/${name}` });
}
