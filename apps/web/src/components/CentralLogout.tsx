"use client";

import { useRouter } from "next/navigation";

export function CentralLogout({ label = "Sign out", shortLabel }: { label?: string; shortLabel?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/central/logout", { method: "POST" });
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      title={label}
      aria-label={label}
      className="min-h-11 rounded-xl border border-[color:var(--hairline)] px-2 text-sm hover:bg-[color:var(--overlay)] lg:px-4"
    >
      {shortLabel ? (
        <>
          <span aria-hidden="true" className="lg:hidden">{shortLabel}</span>
          <span className="hidden lg:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
