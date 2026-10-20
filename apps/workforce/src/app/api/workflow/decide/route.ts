import { memberOr401 } from "@/lib/guard";
import { decide } from "@/lib/workflow";

export const dynamic = "force-dynamic";

/**
 * Decide one workflow stage.
 *
 * Everything that decides whether this person may act — segregation of duties,
 * eligibility, quorum, evidence — lives in the engine and the service layer.
 * This route is deliberately thin: it reads the form, calls one function and
 * reports the answer. A route that re-checked any of it would be a second
 * opinion that can disagree with the tested one.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const instanceId = String(form.get("instanceId") || "");
  const outcome = String(form.get("outcome") || "");
  const note = String(form.get("note") || "").trim().slice(0, 500) || null;

  const to = (params: Record<string, string>) =>
    new Response(null, {
      status: 303,
      headers: { Location: `/approvals?${new URLSearchParams(params)}` },
    });

  if (outcome !== "APPROVE" && outcome !== "REJECT") return to({ error: "Choose approve or reject." });

  const result = await decide({
    instanceId,
    deciderId: auth.member.id,
    deciderName: auth.member.name,
    outcome,
    note,
  });

  if (!result.ok) return to({ error: result.error });

  return to({
    done:
      result.state === "RUNNING"
        ? `Recorded. Now with ${result.stage.replace(/_/g, " ")}.`
        : `Recorded. The request is ${result.state.toLowerCase()}.`,
  });
}
