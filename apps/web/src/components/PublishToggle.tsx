"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublishToggle({
  id,
  published,
  labels,
}: {
  id: string;
  published: boolean;
  labels: { publish: string; unpublish: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/partner/solutions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-xs border border-[color:var(--hairline)] rounded-lg px-2.5 py-1 hover:bg-[color:var(--overlay)] disabled:opacity-50"
    >
      {published ? labels.unpublish : labels.publish}
    </button>
  );
}
