"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getUploadLabels } from "@/lib/ui-i18n";

/** Uploads an image to /api/uploads and stores the resulting URL in a hidden field. */
export function ImageUpload({
  name,
  initial,
  label,
  onChange: onChangeUrl,
}: {
  name: string;
  initial?: string;
  label: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(initial || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [t, setT] = useState(getUploadLabels("en"));
  const fileRef = useRef<HTMLInputElement>(null);

  // Localize from the shared locale cookie after mount (avoids hydration mismatch).
  useEffect(() => {
    const loc = (document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1] || "en") as Locale;
    setT(getUploadLabels(loc));
  }, []);

  const setUrl = (u: string) => {
    setUrlState(u);
    onChangeUrl?.(u);
  };

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) setUrl(j.url);
      else setErr(j.error || t.failed.replace("{status}", String(res.status)));
    } catch {
      setErr(t.networkError);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = ""; // allow re-selecting the same file
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-[color:var(--ink)]/50">{label}</label>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-3 flex-wrap">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-12 w-12 rounded-lg bg-[color:var(--overlay)] object-contain p-1" />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="text-sm border border-[color:var(--hairline)] rounded-lg px-4 py-2 hover:bg-[color:var(--overlay)] disabled:opacity-40"
        >
          {busy ? t.uploading : url ? t.replace : t.upload}
        </button>

        {url && !busy && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="text-sm border border-red-500/40 text-red-300 rounded-lg px-3 py-2 hover:bg-red-500/10"
          >
            {t.remove}
          </button>
        )}
      </div>

      <p className="text-[11px] text-[color:var(--ink)]/35">{t.hint}</p>
      {err && <p className="text-red-300 text-sm border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">{err}</p>}
    </div>
  );
}
