import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { isAdminRole, isValidRole, isValidPlan, isValidEmail } from "@/lib/central-users";
import { logAudit } from "@/lib/audit";

const genPassword = () => randomBytes(9).toString("base64url").slice(0, 12);

/** Parse simple CSV (handles quoted fields + escaped quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

/** Bulk-create users from CSV: columns email,name,role,plan,password (password optional → generated). */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const csv = String(b.csv || "").trim();
  if (!csv) return NextResponse.json({ success: false, error: "No CSV provided" }, { status: 400 });

  let rows = parseCsv(csv);
  // Drop a header row if present.
  if (rows[0] && rows[0].some((c) => /email/i.test(c))) rows = rows.slice(1);
  if (rows.length === 0) return NextResponse.json({ success: false, error: "No data rows" }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ success: false, error: "Max 1000 rows per import" }, { status: 400 });

  const created: { email: string; password: string; role: string }[] = [];
  const skipped: { email: string; reason: string }[] = [];

  for (const r of rows) {
    const email = (r[0] || "").trim().toLowerCase();
    const name = (r[1] || "").trim() || null;
    const role = (r[2] || "CLIENT").trim().toUpperCase() || "CLIENT";
    const plan = (r[3] || "STARTER").trim().toUpperCase() || "STARTER";
    const provided = (r[4] || "").trim();

    if (!isValidEmail(email)) { skipped.push({ email: email || "(blank)", reason: "invalid email" }); continue; }
    if (!isValidRole(role)) { skipped.push({ email, reason: `invalid role "${role}"` }); continue; }
    if (!isValidPlan(plan)) { skipped.push({ email, reason: `invalid plan "${plan}"` }); continue; }
    if (isAdminRole(role) && admin.role !== "SUPER_ADMIN") { skipped.push({ email, reason: "admin role needs super-admin" }); continue; }
    if (provided && provided.length < 8) { skipped.push({ email, reason: "password < 8 chars" }); continue; }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) { skipped.push({ email, reason: "already exists" }); continue; }

    const password = provided || genPassword();
    try {
      await prisma.user.create({
        data: {
          email, name, role: role as never, plan: plan as never,
          passwordHash: await bcrypt.hash(password, 10),
          emailVerified: new Date(), consentAt: new Date(), onboarded: true,
        },
      });
      created.push({ email, password, role });
    } catch {
      skipped.push({ email, reason: "create failed" });
    }
  }

  if (created.length)
    await logAudit(admin, "user.import", null, `${created.length} created, ${skipped.length} skipped`);
  return NextResponse.json({ success: true, created, skipped });
}
