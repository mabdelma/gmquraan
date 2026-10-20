import { loginWithPassword } from "@/lib/auth";
import { completeAuthentication } from "@/lib/after-auth";

export const dynamic = "force-dynamic";

/** Back to the sign-in page with the message, keeping the typed address. */
function back(req: Request, message: string, email: string) {
  const url = new URL("/", req.url);
  url.searchParams.set("error", message);
  if (email) url.searchParams.set("email", email);
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  if (!email || !password) {
    return back(req, "Enter your email address and password.", email);
  }

  const result = await loginWithPassword(email, password);
  if (!result.ok) return back(req, result.message, email);

  // Whether a second factor is needed is decided in one place for all three
  // sign-in paths, so they cannot drift apart.
  return completeAuthentication(result.memberId, result.method);
}
