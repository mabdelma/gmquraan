"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDeleteLabels, type DeleteLabels } from "@/lib/ui-i18n";

export function DeleteSolutionButton({ id, title, t }: { id: string; title: string; t?: DeleteLabels }) {
  const L = t ?? getDeleteLabels("en");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(L.confirm.replace("{title}", title))) return;
    setBusy(true);
    await fetch(`/api/partner/solutions/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} className="text-xs text-red-400 hover:underline disabled:opacity-50">
      {L.del}
    </button>
  );
}
