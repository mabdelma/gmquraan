"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUiB, getReviewStatus } from "@/lib/ui-i18n";

export function ReviewModerationRow({
  id,
  rating,
  title,
  content,
  reviewer,
  approved,
}: {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  reviewer: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uiB, setUiB] = useState(getUiB("en"));
  const [st, setSt] = useState(getReviewStatus("en"));
  useEffect(() => {
    const loc = (document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1] || "en") as Locale;
    setUiB(getUiB(loc));
    setSt(getReviewStatus(loc));
  }, []);

  async function act(action: "approve" | "reject" | "delete") {
    setBusy(true);
    if (action === "delete") {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved: action === "approve" }),
      });
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="panel rounded-xl p-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[color:var(--accent-text)]">{"★".repeat(rating)}</span>
          <span className="text-[color:var(--ink)]/55">{"★".repeat(5 - rating)}</span>
          <span className="ml-2 text-xs text-[color:var(--ink)]/55">{uiB.byWord} {reviewer}</span>
          {approved ? (
            <span className="ml-2 text-xs text-emerald-400">{st.approved}</span>
          ) : (
            <span className="ml-2 text-xs text-[color:var(--accent-text)]">{st.pending}</span>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          {!approved && (
            <button onClick={() => act("approve")} disabled={busy} className="text-emerald-400 hover:underline">
              {uiB.approve}
            </button>
          )}
          {approved && (
            <button onClick={() => act("reject")} disabled={busy} className="text-[color:var(--accent-text)] hover:underline">
              {uiB.unapprove}
            </button>
          )}
          <button onClick={() => act("delete")} disabled={busy} className="text-red-400 hover:underline">
            {uiB.delete}
          </button>
        </div>
      </div>
      {title && <div className="font-semibold mt-2">{title}</div>}
      {content && <p className="text-[color:var(--ink)]/60 text-sm mt-1">{content}</p>}
    </div>
  );
}
