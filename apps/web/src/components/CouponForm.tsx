"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCouponLabels, type CouponLabels } from "@/lib/ui-i18n";

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

export function CouponForm({ t }: { t?: CouponLabels }) {
  const L = t ?? getCouponLabels("en");
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      setMsg(L.created);
      form.reset();
      router.refresh();
    } else setMsg(json.error || L.failed);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="code" required placeholder={L.codePh} aria-label={L.codePh} className={input} />
      <div className="grid grid-cols-2 gap-3">
        <select name="discountType" className={input} defaultValue="PERCENT">
          <option value="PERCENT" className="bg-[color:var(--surface)]">{L.percentOff}</option>
          <option value="FIXED" className="bg-[color:var(--surface)]">{L.fixedEuro}</option>
        </select>
        <input name="amount" type="number" required placeholder={L.amount} aria-label={L.amount} className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select name="appliesToPlan" className={input} defaultValue="">
          <option value="" className="bg-[color:var(--surface)]">{L.anyPlan}</option>
          <option value="GROWTH" className="bg-[color:var(--surface)]">Growth</option>
          <option value="ENTERPRISE" className="bg-[color:var(--surface)]">Enterprise</option>
        </select>
        <input name="maxRedemptions" type="number" placeholder={L.maxUses} aria-label={L.maxUses} className={input} />
      </div>
      <button className="app-gradient text-[color:var(--on-accent)] font-bold w-full py-2 rounded-xl text-sm">{L.create}</button>
      {msg && <p className="text-xs text-[color:var(--ink)]/60">{msg}</p>}
    </form>
  );
}
