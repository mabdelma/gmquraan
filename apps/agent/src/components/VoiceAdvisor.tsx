"use client";

import { useRef, useState, useEffect } from "react";
import { TOOL_DEFS, TOOL_EXECUTORS } from "@/lib/tools";
import { toolStore, useToolStore } from "@/lib/toolStore";
import type { AgentMessages } from "@/lib/i18n";
import { ToolRenderer } from "./ToolRenderer";
import { VoiceOrb } from "./VoiceOrb";
import { BrandLogo } from "./BrandLogo";

type Status = "idle" | "connecting" | "live" | "error";
const MODEL = "gpt-realtime";

/**
 * Why this browser cannot run the advisor, or null when it can.
 *
 * Checked before anything else so an unsupported browser gets a sentence it can
 * act on instead of "Cannot read properties of undefined (reading
 * 'getUserMedia')". `mediaDevices` is undefined on insecure origins, which is
 * the single most common cause.
 */
function unsupportedReason(): string | null {
  if (typeof window === "undefined") return null;
  const secure = window.isSecureContext || location.hostname === "localhost";
  if (!secure) return "Microphone access needs a secure connection — open this page over https://.";
  if (typeof RTCPeerConnection === "undefined") {
    return "This browser does not support WebRTC. Try Chrome, Edge, Firefox or Safari.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser will not share a microphone. Try opening the page in Chrome, Edge, Firefox or Safari.";
  }
  return null;
}

export function VoiceAdvisor({ t }: { t: AgentMessages }) {
  const [status, setStatus] = useState<Status>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activeTool } = useToolStore();

  async function handleFunctionCall(name: string, callId: string, argsJson: string) {
    let result: unknown;
    try {
      const args = argsJson ? JSON.parse(argsJson) : {};
      const exec = TOOL_EXECUTORS[name];
      result = exec ? await exec(args) : { success: false, error: `Unknown tool ${name}` };
    } catch (e) {
      result = { success: false, error: (e as Error).message };
    }
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) } }));
      dc.send(JSON.stringify({ type: "response.create" }));
    }
  }

  /**
   * Forward on-screen outcomes into the live session. Without this the advisor
   * never learns that the visitor finished a form, so it goes quiet at exactly
   * the moment it should be confirming and asking what else is needed.
   */
  useEffect(() => {
    return toolStore.onReport(({ text, askForReply }) => {
      const dc = dcRef.current;
      if (!dc || dc.readyState !== "open") return;
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
        })
      );
      if (askForReply) dc.send(JSON.stringify({ type: "response.create" }));
    });
  }, []);

  function onEvent(e: MessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    const type: string = msg.type || "";
    // Animate the orb from the advisor's own audio output events (no stream tap).
    if (type.includes("audio.delta") || type === "output_audio_buffer.started") setSpeaking(true);
    else if (type.includes("audio.done") || type === "output_audio_buffer.stopped" || type === "response.done") setSpeaking(false);
    if (type === "response.function_call_arguments.done") {
      handleFunctionCall(msg.name, msg.call_id, msg.arguments || "{}");
    }
  }

  async function start() {
    setStatus("connecting");
    setError("");
    toolStore.reset();
    try {
      // Fail with an explanation rather than a TypeError. getUserMedia is absent
      // on http:// origins and in older browsers, and WebRTC is missing from
      // some in-app webviews entirely.
      const problem = unsupportedReason();
      if (problem) throw new Error(problem);

      const tokenRes = await fetch("/api/realtime", { method: "POST" });
      const tokenJson = await tokenRes.json();
      const ephemeral = tokenJson?.data?.value || tokenJson?.data?.client_secret?.value;
      if (!ephemeral) throw new Error(tokenJson?.error || "Could not get a session token");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = onEvent;
      dc.onopen = () => {
        dc.send(JSON.stringify({ type: "session.update", session: { tools: TOOL_DEFS, tool_choice: "auto" } }));
        // Greet first so the visitor immediately hears the advisor respond.
        dc.send(JSON.stringify({ type: "response.create" }));
      };

      pc.ontrack = (e) => {
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
          audioRef.current.play().catch(() => {});
        }
      };
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mic;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${MODEL}`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeral}`, "Content-Type": "application/sdp" },
      });
      if (!sdpRes.ok) throw new Error("Realtime connection failed");
      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("live");
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) stop();
      };
      setStatus("live");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      stop();
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    setSpeaking(false);
    if (status === "live") setStatus("idle");
  }

  const live = status === "live";

  /**
   * Once the advisor has answered, the full-height hero is in the way on a
   * phone: it pushed the actual answer entirely below the fold and took the
   * End button off-screen with it. With a result on show the card collapses to
   * a sticky bar — orb, status, control — and the answer sits directly beneath.
   * Above `lg` there is room for both, so the hero stays as it was.
   */
  const compact = Boolean(activeTool);

  const Cardd = (
    <div className={`advisor-card${compact ? " is-compact" : ""}`} style={cardStyle}>
      <div className="advisor-head">
        <div className="advisor-brand">
          <BrandLogo h={30} />
        </div>
        <h1 className="app-gradient-title advisor-title">{t.title}</h1>
        <p className="advisor-blurb">{t.desc}</p>
      </div>
      <div className="advisor-body">
        <div className="advisor-orb">
          <VoiceOrb isSpeaking={live && speaking} size={200} />
        </div>
        {/* Programmatic sink for the advisor's voice — nothing to expose. */}
        <audio ref={audioRef} autoPlay aria-hidden="true" tabIndex={-1} />

        <div className="advisor-controls">
          {live ? (
            <button onClick={stop} className="btn btn-danger btn-lg rounded-pill px-4 advisor-cta">
              {t.end}
            </button>
          ) : (
            <button
              onClick={start}
              disabled={status === "connecting"}
              className="btn btn-warning btn-lg rounded-pill px-4 advisor-cta"
            >
              {status === "connecting" ? t.connecting : t.talk}
            </button>
          )}

          {/* Connection state reaches screen readers, which cannot see the orb. */}
          <p className="visually-hidden-live" role="status" aria-live="polite">
            {status === "connecting" ? t.connecting : live ? t.liveHint : ""}
          </p>

          {live && <p className="advisor-hint">{t.liveHint}</p>}
          {error && (
            // role="alert" so a failure is announced the moment it appears.
            <p role="alert" className="advisor-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="row g-3 g-lg-4 justify-content-center align-items-start mt-1">
      {/* On phones the answer comes first; from lg up the advisor sits left. */}
      <div className={`${activeTool ? "col-12 col-lg-4 order-2 order-lg-1" : "col-12 col-lg-7"} advisor-col`}>
        {Cardd}
      </div>
      {activeTool && (
        <div className="col-12 col-lg-7 order-1 order-lg-2">
          <ToolRenderer t={t} />
        </div>
      )}
    </div>
  );
}

// The card was a fixed dark navy, which left a dark panel floating on the white
// page in light mode. Tokens instead, so it is a light panel on light and keeps
// the deep navy on dark. The shadow is tuned per theme in globals.css.
const cardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--hairline)",
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "var(--card-shadow)",
};
