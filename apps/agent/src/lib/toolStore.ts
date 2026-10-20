"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny dependency-free tool store (ported from the upstream platform's zustand toolStore,
 * rewritten without the dependency). The realtime tool handler runs outside
 * React, so a module-level store with subscribe/snapshot is the simplest way
 * to drive the visual ToolRenderer from a function-call.
 */
export type ToolState = { activeTool: string | null; toolParams: Record<string, any> | null };

let state: ToolState = { activeTool: null, toolParams: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Things that happen on screen — a form sent, a submission that failed — have
 * to get back to the model, or the conversation stalls: the visitor completes
 * the form and the advisor sits there waiting, never confirming, never saying
 * what happens next. VoiceAdvisor subscribes to this and forwards each report
 * into the live session so the advisor can pick the thread back up out loud.
 */
type ScreenReport = { text: string; askForReply: boolean };
const reporters = new Set<(r: ScreenReport) => void>();

export const toolStore = {
  get: () => state,
  setActiveTool(activeTool: string | null, toolParams: Record<string, any> | null = null) {
    state = { activeTool, toolParams };
    emit();
  },
  reset() {
    state = { activeTool: null, toolParams: null };
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Tell the live advisor what just happened on screen. */
  report(text: string, askForReply = true) {
    for (const r of reporters) r({ text, askForReply });
  },
  onReport(fn: (r: ScreenReport) => void) {
    reporters.add(fn);
    return () => {
      reporters.delete(fn);
    };
  },
};

const serverSnapshot: ToolState = { activeTool: null, toolParams: null };

export function useToolStore(): ToolState {
  return useSyncExternalStore(toolStore.subscribe, toolStore.get, () => serverSnapshot);
}
