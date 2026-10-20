import { ImageResponse } from "next/og";
import { COMPANY } from "@/lib/content";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${COMPANY.name} — ${COMPANY.tagline}`;

// Navy ground, ivory text, the brand's gold accent — the same lockup as the
// nav wordmark, rendered inline because ImageResponse cannot load the
// stylesheet.
const TEAL = "#0c3433";
const INK = "#f8f7f3";
const GOLD = "#d7b75a";
const MUTED = "#9fb8b5";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: TEAL,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        {/* The two-tone wordmark, as the header renders it. */}
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>
          <span style={{ color: GOLD }}>{COMPANY.wordmarkLead}</span>
          <span>&nbsp;{COMPANY.wordmarkRest}</span>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 20, color: INK }}>{COMPANY.tagline}</div>
        {/* The gold rule that runs through the rest of the brand. */}
        <div style={{ display: "flex", width: 240, height: 3, background: GOLD, marginTop: 34 }} />
        <div style={{ fontSize: 26, color: MUTED, marginTop: 30 }}>
          {`Since ${COMPANY.foundedYear} · ${COMPANY.foundedCity} & North City, ${COMPANY.country} · ${COMPANY.domain}`}
        </div>
      </div>
    ),
    size
  );
}
