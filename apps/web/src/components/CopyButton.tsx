"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getUi } from "@/lib/ui-i18n";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(getUi("en").copied);
  useEffect(() => {
    setCopiedLabel(getUi((document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1] || "en") as Locale).copied);
  }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <button onClick={copy} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)] shrink-0">
      {copied ? copiedLabel : label}
    </button>
  );
}
