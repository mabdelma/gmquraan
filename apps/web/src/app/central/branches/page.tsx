import { redirect } from "next/navigation";
import { getCentralAdmin } from "@/lib/central-session";
import { getStoredBranches, defaultBranches } from "@/lib/branches";
import { getStoredPeople } from "@/lib/cards-store";
import { BranchManager } from "@/components/BranchManager";

export const dynamic = "force-dynamic";

export default async function CentralBranchesPage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const [stored, people] = await Promise.all([getStoredBranches(), getStoredPeople()]);
  // Show the built-in entities read-only until they are imported, so the page is
  // never blank and it is obvious what the cards are currently using.
  const branches = stored.length ? stored : [];

  // Which cards each branch feeds, so deleting one is an informed decision.
  const usage: Record<string, string[]> = {};
  for (const p of people) {
    for (const slug of p.branchSlugs) (usage[slug] ??= []).push(p.name);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">Branches</h1>
      <p className="[color:var(--muted)] mt-2 text-sm">
        The legal entities and offices. Each person on <strong>/cards</strong> is assigned one or more branches, and
        their contact address — on the card and in the saved contact — comes from here.
      </p>
      {stored.length === 0 && (
        <p className="[color:var(--muted)] text-xs mt-2">
          Currently using the built-in entities:{" "}
          {defaultBranches().map((b) => `${b.flag} ${b.country}`).join(" · ")}.
        </p>
      )}
      <div className="mt-8">
        <BranchManager branches={branches} usage={usage} />
      </div>
    </section>
  );
}
