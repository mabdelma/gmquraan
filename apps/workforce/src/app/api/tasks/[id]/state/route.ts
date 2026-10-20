import { memberOr401 } from "@/lib/guard";
import { moveTask } from "@/lib/tasks";
import type { TaskState } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Change a task's state.
 *
 * The state machine, the access check and the audit event all live in
 * moveTask — this route only unwraps the form and puts the answer back on the
 * page, so there is one place where a transition can happen.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const form = await req.formData();
  const to = String(form.get("to") || "") as TaskState;
  const note = String(form.get("note") || "").slice(0, 500);

  const result = await moveTask(auth.viewer, id, to, auth.member.name, note || undefined);

  const url = new URL(`/tasks/${id}`, req.url);
  if (!result.ok) url.searchParams.set("error", result.message);
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
