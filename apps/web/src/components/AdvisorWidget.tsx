"use client";

import { useState } from "react";
import { getAdvisorWidgetLabels, type AdvisorWidgetLabels } from "@/lib/advisor-widget-i18n";
import type { Locale } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

export function AdvisorWidget({ locale = "en", t }: { locale?: Locale; t?: AdvisorWidgetLabels }) {
  const L = t ?? getAdvisorWidgetLabels(locale);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: L.greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    // History = prior turns (excluding the opening greeting); locale from the shared cookie.
    const history = msgs.slice(1).slice(-8);
    const locale = document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1] || "en";
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history, locale }),
      });
      const json = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: json.success ? json.reply : L.unavailable },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: L.networkError }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed app-fab app-fab-r z-50 app-gradient text-[color:var(--on-accent)] font-bold rounded-full h-14 w-14 shadow-lg hover:opacity-90"
        aria-label={L.openAria}
      >
        AI
      </button>

      {open && (
        <div className="fixed app-panel-hi app-fab-r z-50 w-[360px] max-w-[90vw] panel rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="app-gradient text-[color:var(--on-accent)] px-4 py-3 font-bold flex items-center justify-between">
            <span>{L.title}</span>
            <a
              href="https://ai.gmquran.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold bg-[color:var(--bg)]/15 hover:bg-[color:var(--bg)]/25 rounded-full px-2.5 py-1"
              title={L.voiceTitle}
            >
              {L.voiceBtn}
            </a>
          </div>
          <div className="flex-1 max-h-80 overflow-y-auto p-4 space-y-3 text-sm">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-line rounded-xl px-3 py-2 ${
                  m.role === "user" ? "bg-[color:var(--overlay)] ml-8" : "bg-[color:var(--surface)] mr-8 text-[color:var(--ink)]/80"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="text-[color:var(--ink)]/55 text-xs">{L.typing}</div>}
          </div>
          <form onSubmit={send} className="p-3 border-t border-[color:var(--hairline)] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={L.placeholder}
              aria-label={L.placeholder}
              className="flex-1 rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60"
            />
            <button className="app-gradient text-[color:var(--on-accent)] font-bold px-3 rounded-xl text-sm">{L.send}</button>
          </form>
        </div>
      )}
    </>
  );
}
