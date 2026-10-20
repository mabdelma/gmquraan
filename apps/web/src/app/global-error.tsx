"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      navigator.sendBeacon?.(
        "/api/internal/client-error",
        JSON.stringify({ message: error.message, stack: error.stack, url: typeof location !== "undefined" ? location.href : undefined })
      );
    } catch { /* ignore */ }
  }, [error]);
  return (
    <html lang="en">
      <body style={{ background: "#d5d5d5", color: "#0b1220", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "120px auto", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#55607a", marginTop: 8 }}>A critical error occurred. {error.digest}</p>
          <button
            onClick={reset}
            style={{ marginTop: 24, padding: "12px 20px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
