/**
 * Small status labels. Colour alone never carries the meaning — every chip
 * spells out its state in text too, so they survive a colour-blind reader and a
 * monochrome print.
 */

const base = "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold";

const STATE_TONE: Record<string, string> = {
  NEW: "[background:var(--overlay)]",
  TRIAGED: "[background:var(--overlay)]",
  PLANNED: "[background:var(--overlay)]",
  ASSIGNED: "[background:var(--surface)]",
  IN_PROGRESS: "[background:var(--surface)] [color:var(--accent-text)]",
  BLOCKED: "[background:var(--surface)] [color:var(--danger)]",
  REVIEW: "[background:var(--surface)] [color:var(--warn)]",
  APPROVED: "[background:var(--surface)] [color:var(--ok)]",
  COMPLETED: "[background:var(--surface)] [color:var(--ok)]",
  ARCHIVED: "[background:var(--overlay)] [color:var(--muted)]",
  CANCELLED: "[background:var(--overlay)] [color:var(--muted)]",
};

export const humanState = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export function StateChip({ state }: { state: string }) {
  return <span className={`${base} ${STATE_TONE[state] ?? "[background:var(--overlay)]"}`}>{humanState(state)}</span>;
}

/** P0 is the one that should catch the eye; the rest stay quiet. */
const PRIORITY_TONE: Record<string, string> = {
  P0: "[background:var(--surface)] [color:var(--danger)]",
  P1: "[background:var(--surface)] [color:var(--warn)]",
  P2: "[background:var(--overlay)] [color:var(--muted)]",
  P3: "[background:var(--overlay)] [color:var(--muted)]",
};

export function PriorityChip({ priority }: { priority: string }) {
  return <span className={`${base} ${PRIORITY_TONE[priority] ?? ""}`}>{priority}</span>;
}

export function DueLabel({ due }: { due: Date | null }) {
  if (!due) return null;

  const days = Math.floor((due.getTime() - Date.now()) / 86_400_000);
  const overdue = due.getTime() < Date.now();
  const text = overdue
    ? days === 0
      ? "Due today"
      : `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
    : days === 0
      ? "Due today"
      : days === 1
        ? "Due tomorrow"
        : `Due in ${days} days`;

  return (
    <time
      dateTime={due.toISOString()}
      className={`shrink-0 text-xs ${overdue ? "font-semibold [color:var(--danger)]" : "[color:var(--muted)]"}`}
    >
      {text}
    </time>
  );
}
