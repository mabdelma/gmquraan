/**
 * Record the controlled locations of the information architecture.
 *
 * Every directory in the package becomes a row, including the empty ones. The
 * package marks those with `.keep` because they are declared locations, and a
 * folder that is absent says something different from one that is empty.
 *
 * Nothing is copied to disk. The bytes already live once, content-addressed, in
 * the document store; a second tree beside it would be the duplicate source of
 * truth the blueprint warns against.
 *
 *   GMOS_TREE=/srv/app/staging/... npm --workspace @app/db run seed:folders
 */
import { readFile, readdir } from "fs/promises";
import { join, relative } from "path";
import { PrismaClient } from "@prisma/client";
import { zoneOf } from "@app/core";

const prisma = new PrismaClient();
const TREE = process.env.GMOS_TREE || "/srv/app/staging/gmos-v1.2/unskinned-core";

async function* dirs(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = join(dir, e.name);
    yield p;
    yield* dirs(p);
  }
}

/** First heading or paragraph of the folder's README, where it has one. */
async function purposeOf(abs: string): Promise<string | null> {
  try {
    const text = await readFile(join(abs, "README.md"), "utf8");
    const line = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && !l.startsWith("---"));
    return line ? line.slice(0, 300) : null;
  } catch {
    return null;
  }
}

async function main() {
  let recorded = 0;
  let unzoned = 0;

  for await (const abs of dirs(TREE)) {
    const path = relative(TREE, abs).replace(/\\/g, "/");
    const zone = zoneOf(path);
    if (!zone) {
      unzoned++;
      continue;
    }
    const name = path.split("/").pop()!;
    const purpose = await purposeOf(abs);

    await prisma.repositoryFolder.upsert({
      where: { path },
      update: { name, zone, depth: path.split("/").length - 1, purpose },
      create: { path, name, zone, depth: path.split("/").length - 1, purpose },
    });
    recorded++;
  }

  const total = await prisma.repositoryFolder.count();
  const withPurpose = await prisma.repositoryFolder.count({ where: { purpose: { not: null } } });
  console.log(`[folders] recorded : ${recorded}`);
  if (unzoned) console.log(`[folders] skipped  : ${unzoned} outside any declared zone`);
  console.log(`[folders] register now holds ${total} controlled location(s), ${withPurpose} with a stated purpose`);
}

main()
  .catch((e) => {
    console.error("[folders] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
