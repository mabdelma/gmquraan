/**
 * Gold line iconography for the brand sections.
 *
 * Inline SVG rather than an icon package: there are sixteen of them, they
 * are all one stroke weight, and shipping a dependency to draw a leaf would
 * cost more than the whole set. `stroke="currentColor"` means colour comes
 * from the surrounding text, so the same icon works on navy and on ivory
 * without a second variant.
 *
 * Every icon is decorative — the label always sits beside it as real text —
 * so they are hidden from assistive technology rather than given a name that
 * would be read out twice.
 */
type P = { className?: string };

const base = (className = "") => ({
  // Default to 24px unless the caller passes an explicit size class, so a
  // larger tile never ends up with `size-6 size-8` fighting in the CSS.
  className: className.includes("size-") ? className : `size-6 ${className}`,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

/* ── values ─────────────────────────────────────────────────────────────── */
export const IconShield = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3l7 3v5c0 4.4-2.9 8.2-7 9.4C7.9 19.2 5 15.4 5 11V6l7-3z" />
    <path d="M9.2 12.2l1.9 1.9 3.7-3.9" />
  </svg>
);
export const IconTeam = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="9" cy="9" r="2.6" />
    <circle cx="16.5" cy="10.5" r="2" />
    <path d="M3.5 18.5c.6-2.7 2.8-4.2 5.5-4.2s4.9 1.5 5.5 4.2" />
    <path d="M16 14.6c2.1.2 3.7 1.5 4.2 3.6" />
  </svg>
);
export const IconStar = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 4l2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3L4.5 9.6l5.2-.7L12 4z" />
  </svg>
);
export const IconLeaf = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M5 19c0-7 4.5-11 14-11 0 8.5-4.2 12.5-10.5 12.5C6.6 20.5 5 20 5 19z" />
    <path d="M9 16.5c1.6-3 4-5.2 7.5-6.5" />
  </svg>
);
export const IconChart = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 19.5h16" />
    <rect x="5.5" y="12" width="3.2" height="6" rx=".6" />
    <rect x="10.4" y="8.5" width="3.2" height="9.5" rx=".6" />
    <rect x="15.3" y="5" width="3.2" height="13" rx=".6" />
  </svg>
);

/* ── practice areas ──────────────────────────────────────── */
export const IconBuildings = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3.5 20h17" />
    <path d="M6 20V9l5-3v14" />
    <path d="M11 20V11l6 2.5V20" />
    <path d="M8.2 11.5v.01M8.2 14.5v.01M13.8 15v.01" />
  </svg>
);
/** Portal frame with bracing — structure, not another building outline. */
export const IconFrame = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20V6.5h16V20" />
    <path d="M4 10.5h16" />
    <path d="M4 10.5L20 20M20 10.5L4 20" />
  </svg>
);
export const IconBolt = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M13.2 3.5L6 13.2h4.6L10 20.5 17.5 10h-4.9l.6-6.5z" />
  </svg>
);
export const IconClipboard = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="5.5" y="5" width="13" height="15" rx="1.6" />
    <path d="M9 4h6v2.6H9z" />
    <path d="M9 11h6M9 14.5h4" />
  </svg>
);
export const IconCrane = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M8 20V4.5" />
    <path d="M3.5 7.5h16" />
    <path d="M8 4.5L3.5 7.5M8 4.5l11.5 3" />
    <path d="M14 7.5v4.2" />
    <path d="M4.5 20h7" />
    <rect x="12.4" y="11.7" width="3.2" height="3" rx=".5" />
  </svg>
);
/** Isometric cube — the 3D output, as opposed to the 2D sheet. */
export const IconCube = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3.2l7.5 4.3v8.8L12 20.8 4.5 16.3V7.5L12 3.2z" />
    <path d="M4.5 7.5L12 11.9l7.5-4.4" />
    <path d="M12 11.9v8.9" />
  </svg>
);

/* ── contact ────────────────────────────────────────────────────────────── */
export const IconMail = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3.5" y="6" width="17" height="12" rx="1.8" />
    <path d="M4 7.5l8 5.5 8-5.5" />
  </svg>
);
export const IconPhone = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6.2 4.5h3l1.4 3.5-1.9 1.4a11 11 0 004.9 4.9l1.4-1.9 3.5 1.4v3a1.7 1.7 0 01-1.9 1.7C10.2 17.8 6.2 13.8 4.5 6.4A1.7 1.7 0 016.2 4.5z" />
  </svg>
);
export const IconPin = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 21c4-4.4 6-7.7 6-10.2A6 6 0 006 10.8C6 13.3 8 16.6 12 21z" />
    <circle cx="12" cy="10.6" r="2.2" />
  </svg>
);
export const IconCard = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.8" />
    <path d="M4 9h16M7 13.5h4" />
  </svg>
);

/** Practice-area slug → icon, so a new area is one entry rather than a switch. */
export const PRACTICE_ICON: Record<string, (p: P) => React.JSX.Element> = {
  "architectural-design": IconBuildings,
  "structural-design": IconFrame,
  "mechanical-electrical": IconBolt,
  "technical-office": IconClipboard,
  "construction-execution": IconCrane,
  "reports-and-visualisation": IconCube,
};

/**
 * One mark per value in VALUES (lib/brand-content.ts). The keys are the
 * association's own values, so a value added there without a mark here renders
 * as an empty cell in the trust strip — which is the intended pressure.
 */
export const VALUE_ICON: Record<string, (p: P) => React.JSX.Element> = {
  transparency: IconShield,
  participation: IconTeam,
  dignity: IconStar,
  community: IconBuildings,
  health: IconLeaf,
};
