"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";
import type { AppMessages } from "@/lib/app-messages";
import type { SolutionFormMessages } from "@/lib/solution-form-i18n";

const input =
  "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

type Cat = { key: string; title: string };

export type SolutionDefaults = {
  title?: string;
  summary?: string;
  description?: string;
  price?: number; // cents
  category?: string;
  licenseModel?: string;
  region?: string;
  vendorName?: string | null;
  tags?: string[];
  techStack?: string[];
  whiteLabel?: boolean;
  partnerSharePercent?: number;
  images?: string[];
  url?: string | null;
  published?: boolean;
};

export function NewSolutionForm({
  t,
  licenses,
  categories,
  defaults,
  editId,
  submitLabel,
  endpoint = "/api/partner/solutions",
  doneHref,
  showLiveStatus = false,
  canEditShare = true,
  x,
}: {
  t: AppMessages["partnerNew"];
  licenses: Record<string, string>;
  categories: Cat[];
  defaults?: SolutionDefaults;
  editId?: string;
  submitLabel?: string;
  endpoint?: string;
  doneHref?: string;
  showLiveStatus?: boolean;
  canEditShare?: boolean;
  x: SolutionFormMessages;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const d = defaults ?? {};

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = { ...Object.fromEntries(form.entries()), whiteLabel: form.get("whiteLabel") === "on" };
    if (showLiveStatus) data.published = form.get("published") === "on";
    const res = await fetch(editId ? `${endpoint}/${editId}` : endpoint, {
      method: editId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) {
      router.push(doneHref ?? "/central/solutions");
      router.refresh();
    } else setError(json.error || x.couldNotSave);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-8">
      <input name="title" required placeholder={t.titleField} defaultValue={d.title} className={input} />
      <input name="summary" required placeholder={t.summary} defaultValue={d.summary} className={input} />
      <textarea name="description" rows={5} placeholder={t.description} defaultValue={d.description} className={input} />
      <div className="grid grid-cols-2 gap-4">
        <select name="category" className={input} defaultValue={d.category ?? categories[0]?.key}>
          {categories.map((c) => (
            <option key={c.key} value={c.key} className="bg-[color:var(--surface)]">{c.title}</option>
          ))}
        </select>
        <select name="licenseModel" className={input} defaultValue={d.licenseModel ?? "SUBSCRIPTION"}>
          <option value="SUBSCRIPTION" className="bg-[color:var(--surface)]">{licenses.SUBSCRIPTION}</option>
          <option value="ONE_TIME" className="bg-[color:var(--surface)]">{licenses.ONE_TIME}</option>
          <option value="REVENUE_SHARE" className="bg-[color:var(--surface)]">{licenses.REVENUE_SHARE}</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input
          name="price"
          type="number"
          min="0"
          step="1"
          placeholder={t.price}
          defaultValue={d.price ? d.price / 100 : undefined}
          className={input}
        />
        <select name="region" className={input} defaultValue={d.region ?? "GLOBAL"}>
          <option value="GLOBAL" className="bg-[color:var(--surface)]">{x.regionGlobal}</option>
          <option value="GCC" className="bg-[color:var(--surface)]">{x.regionGcc}</option>
          <option value="EUROPE" className="bg-[color:var(--surface)]">{x.regionEurope}</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{x.share}</label>
        <input
          name="partnerSharePercent"
          type="number"
          min="0"
          max="100"
          step="1"
          defaultValue={d.partnerSharePercent ?? 50}
          readOnly={!canEditShare}
          disabled={!canEditShare}
          className={`${input} ${!canEditShare ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        <p className="text-[11px] text-[color:var(--ink)]/35 mt-1">
          {x.shareHint}{" "}
          <a href="/partner-policy" target="_blank" className="text-[color:var(--accent-text)]/80 underline">
            {x.policy}
          </a>
          .
        </p>
      </div>
      <ImageUpload name="imageUrl" initial={d.images?.[0]} label={x.logo} />
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{x.liveUrl}</label>
        <input
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://app.example.com"
          defaultValue={d.url ?? undefined}
          className={input}
        />
        <p className="text-[11px] text-[color:var(--ink)]/35 mt-1">{x.liveUrlHint}</p>
      </div>
      <input name="vendorName" placeholder={t.vendor} defaultValue={d.vendorName ?? undefined} className={input} />
      <input name="tags" placeholder={t.tags} defaultValue={d.tags?.join(", ")} className={input} />
      <input name="techStack" placeholder={t.techStack} defaultValue={d.techStack?.join(", ")} className={input} />
      <label className="flex items-center gap-2 text-sm text-[color:var(--ink)]/60">
        <input name="whiteLabel" type="checkbox" defaultChecked={d.whiteLabel} /> {t.whiteLabel}
      </label>
      {showLiveStatus && (
        <label className="flex items-center gap-2 text-sm text-[color:var(--ink)]/60">
          <input name="published" type="checkbox" defaultChecked={d.published ?? true} /> {x.liveStatus}
        </label>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="app-gradient text-[color:var(--on-accent)] font-bold w-full py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? t.publishing : submitLabel ?? t.publish}
      </button>
    </form>
  );
}
