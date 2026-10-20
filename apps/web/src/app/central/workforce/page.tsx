import { redirect } from "next/navigation";
import { getCentralAdmin } from "@/lib/central-session";
import { getStoredPeople } from "@/lib/cards-store";
import { resolveBranches, formatAddress } from "@/lib/branches";
import { PeopleManager } from "@/components/PeopleManager";

export const dynamic = "force-dynamic";

export default async function CentralWorkforcePage() {
  const admin = await getCentralAdmin();
  if (!admin) redirect("/central");

  const [people, branchRows] = await Promise.all([getStoredPeople(), resolveBranches()]);
  const branches = branchRows.map((b) => ({
    slug: b.slug,
    flag: b.flag,
    country: b.country,
    legalName: b.legalName,
    address: formatAddress(b),
  }));

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-extrabold">Our workforce</h1>
      <p className="[color:var(--muted)] mt-2 text-sm">
        Add, edit, reorder or remove the people shown on the public <strong>/cards</strong> page. QR codes and vCards
        are generated automatically for anyone added here.
      </p>
      <div className="mt-8">
        <PeopleManager people={people} branches={branches} />
      </div>
    </section>
  );
}
