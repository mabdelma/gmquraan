import bcrypt from "bcryptjs";
import { prisma } from "../src/index.js";

/** Create/promote a SUPER_ADMIN for the central console. Reads ADMIN_EMAIL + ADMIN_PASSWORD. */
async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", passwordHash },
    create: {
      email,
      name: "Unskinned Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      locale: "en",
      emailVerified: new Date(),
      consentAt: new Date(),
      onboarded: true,
    },
  });
  console.log("SUPER_ADMIN ready:", email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
