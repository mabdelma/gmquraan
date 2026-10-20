import type { DomainStatus } from "@/lib/mailcow";
import type { CentralForms } from "@/lib/central-forms-i18n";

type MM = CentralForms["mm"];

/** MB → a human size. mailcow reports these in bytes; we normalise to MB first. */
export function fmtMb(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return "0 MB";
  if (mb < 1024) return `${Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}

function Meter({ used, total, warn = 0.9 }: { used: number; total: number; warn?: number }) {
  if (total <= 0) return null;
  const pct = Math.min(100, (used / total) * 100);
  const hot = used / total >= warn;
  return (
    <div className="h-1.5 rounded-full bg-[color:var(--overlay)] mt-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${hot ? "bg-red-500" : "app-gradient"}`}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );
}

/** Server-side health strip: is the domain live, and how much room is left. */
export function MailStatus({ s, t }: { s: DomainStatus; t: MM }) {
  const slots = s.mailboxes + s.mailboxesLeft;
  const aliasSlots = s.aliases + s.aliasesLeft;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <div className="panel rounded-2xl p-4">
        <div className="text-xs text-[color:var(--ink)]/50">{t.statusDomain}</div>
        <div className="font-semibold mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${s.active ? "bg-emerald-500" : "bg-red-500"}`} />
          {s.active ? t.statusActive : t.statusInactive}
        </div>
        <div className="text-xs text-[color:var(--ink)]/45 mt-1">{s.domain}</div>
      </div>

      <div className="panel rounded-2xl p-4">
        <div className="text-xs text-[color:var(--ink)]/50">{t.statusMailboxes}</div>
        <div className="font-semibold mt-1">
          {s.mailboxes} <span className="text-[color:var(--ink)]/45 font-normal">/ {slots}</span>
        </div>
        <Meter used={s.mailboxes} total={slots} />
      </div>

      <div className="panel rounded-2xl p-4">
        <div className="text-xs text-[color:var(--ink)]/50">{t.statusStorage}</div>
        <div className="font-semibold mt-1">
          {fmtMb(s.allocatedMb)} <span className="text-[color:var(--ink)]/45 font-normal">/ {fmtMb(s.capacityMb)}</span>
        </div>
        <Meter used={s.allocatedMb} total={s.capacityMb} />
        <div className="text-xs text-[color:var(--ink)]/45 mt-1.5">
          {t.statusStored}: {fmtMb(s.storedMb)} · {s.messages.toLocaleString()} {t.statusMessages}
        </div>
      </div>

      <div className="panel rounded-2xl p-4">
        <div className="text-xs text-[color:var(--ink)]/50">{t.statusAliases}</div>
        <div className="font-semibold mt-1">
          {s.aliases} <span className="text-[color:var(--ink)]/45 font-normal">/ {aliasSlots}</span>
        </div>
        <Meter used={s.aliases} total={aliasSlots} />
      </div>
    </div>
  );
}
