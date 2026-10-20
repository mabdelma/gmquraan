"use client";

import { toolStore } from "./toolStore";

/**
 * Unskinned realtime-agent tools (adapted from the upstream platform's toolService). Each tool has
 * an OpenAI function schema (sent in session.update) and a browser-side executor
 * that fetches Unskinned data / computes a result and drives the visual ToolRenderer.
 */

/**
 * These tools used to fetch "/api/solutions", which does not exist — not on
 * this origin and not on the main site. Every call 404'd, so `matches` was
 * always empty and the side panel either opened blank or never opened at all.
 *
 * The real catalogue is the catalog service. It is reached through a
 * same-origin proxy at /api/catalog: the public API sends no CORS headers, and
 * the fix for that is a proxy rather than opening the catalogue to every origin
 * on the internet.
 */
type CatalogResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function getCatalog<T>(path: string): Promise<CatalogResult<T>> {
  try {
    const res = await fetch(path, { headers: { accept: "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) {
      return { ok: false, error: body?.error || `Catalogue returned ${res.status}` };
    }
    return { ok: true, data: (body.data ?? body) as T };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

type Solution = {
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  region?: string;
  tags?: string[];
};

// ── Function schemas advertised to the model ────────────────────────────────
export const TOOL_DEFS = [
  {
    type: "function",
    name: "search_solutions",
    description: "Search the live Unskinned marketplace catalog for solutions matching a query and/or category.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text need, e.g. 'booking system' or 'AI chatbot'." },
        category: {
          type: "string",
          enum: ["SAAS_PLATFORM", "LAUNCH_KIT", "AI_AUTOMATION", "MARKETPLACE_SOLUTION", "PRODUCTIZED_SERVICE", "MARKET_ENABLEMENT"],
        },
      },
    },
  },
  {
    type: "function",
    name: "show_solution",
    description: "Display a single solution's detail card on screen by its slug.",
    parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
  },
  {
    type: "function",
    name: "compare_solutions",
    description: "Show a side-by-side comparison of two solutions by their slugs.",
    parameters: {
      type: "object",
      properties: { slugA: { type: "string" }, slugB: { type: "string" } },
      required: ["slugA", "slugB"],
    },
  },
  {
    type: "function",
    name: "estimate_roi",
    description: "Project the return on investment of adopting a solution over a number of months.",
    parameters: {
      type: "object",
      properties: {
        solution: { type: "string", description: "Solution name (for the chart title)." },
        monthlyCost: { type: "number", description: "Monthly cost in EUR." },
        expectedMonthlyValue: { type: "number", description: "Expected monthly value/savings/revenue in EUR." },
        months: { type: "number", description: "Horizon in months (default 12)." },
      },
      required: ["monthlyCost", "expectedMonthlyValue"],
    },
  },
  {
    type: "function",
    name: "market_insights",
    description: "Show a quick snapshot of available solutions in a category/region (count, price range).",
    parameters: {
      type: "object",
      properties: { category: { type: "string" }, region: { type: "string" } },
    },
  },
  {
    type: "function",
    name: "request_demo",
    description: "Open a side form for the visitor to enter their details (name, email) and request a demo or to be contacted. Use this whenever the visitor wants a demo, a quote, or to be contacted — let them fill the form rather than collecting it by voice.",
    parameters: {
      type: "object",
      properties: {
        solution: { type: "string", description: "Solution name or slug they're interested in, to prefill the form." },
        name: { type: "string", description: "Prefill name, if already known." },
        email: { type: "string", description: "Prefill email, if already known." },
      },
    },
  },
  {
    type: "function",
    name: "show_referral_reward",
    description: "Show the Unskinned reseller/referral reward: buyers get a discount, resellers earn commission.",
    parameters: {
      type: "object",
      properties: { code: { type: "string", description: "A referral code, if the visitor has one." } },
    },
  },
] as const;

// ── Executors (browser-side) ────────────────────────────────────────────────
export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<any>> = {
  async search_solutions({ query = "", category }) {
    const qs = new URLSearchParams();
    if (query) qs.set("q", query);
    if (category) qs.set("category", category);

    const r = await getCatalog<{ items: Solution[] }>(`/api/catalog?${qs.toString()}`);
    if (!r.ok) {
      // Nothing is opened on a failure. An empty panel next to an advisor
      // saying "here are your options" is worse than no panel at all.
      return { success: false, error: `Could not reach the catalogue (${r.error}). Say so and offer to take their details instead.` };
    }

    const matches = r.data.items ?? [];
    toolStore.setActiveTool("solutionList", { matches, query });
    return {
      success: true,
      count: matches.length,
      matches: matches.slice(0, 8).map((m) => ({ slug: m.slug, title: m.title, price: m.price, currency: m.currency })),
      instruction: matches.length
        ? "The list is now on screen. Talk through the matches by name."
        : "Nothing matched. Say so plainly and ask a question that narrows or widens the search.",
    };
  },

  async show_solution({ slug }) {
    const r = await getCatalog<Solution>(`/api/catalog/${encodeURIComponent(slug)}`);
    if (!r.ok) return { success: false, error: `Could not open that solution (${r.error}).` };

    const s = r.data;
    toolStore.setActiveTool("showSolution", { solution: s });
    return {
      success: true,
      title: s.title,
      price: s.price,
      currency: s.currency,
      category: s.category,
      instruction: "It is now on screen. Describe what it does and what it costs.",
    };
  },

  async compare_solutions({ slugA, slugB }) {
    const [a, b] = await Promise.all([
      getCatalog<Solution>(`/api/catalog/${encodeURIComponent(slugA)}`),
      getCatalog<Solution>(`/api/catalog/${encodeURIComponent(slugB)}`),
    ]);
    if (!a.ok || !b.ok) {
      // Say which one failed rather than a generic miss — the visitor may have
      // named something we do not carry, and that is worth telling them.
      const missing = [!a.ok && slugA, !b.ok && slugB].filter(Boolean).join(" and ");
      return { success: false, error: `Could not load ${missing}.` };
    }

    toolStore.setActiveTool("compareSolutions", { a: a.data, b: b.data });
    return {
      success: true,
      a: { title: a.data.title, price: a.data.price },
      b: { title: b.data.title, price: b.data.price },
      instruction: "The comparison is on screen. Walk through the difference that actually matters for them.",
    };
  },

  async estimate_roi({ solution, monthlyCost, expectedMonthlyValue, months = 12 }) {
    const m = Math.max(1, Math.min(60, Math.round(months)));
    const series = Array.from({ length: m }, (_, i) => {
      const t = i + 1;
      return {
        month: t,
        cost: monthlyCost * t,
        value: expectedMonthlyValue * t,
        net: (expectedMonthlyValue - monthlyCost) * t,
      };
    });
    // Value and cost both accrue linearly, so the net is positive from month one
    // whenever value exceeds cost, and never otherwise.
    const breakeven = monthlyCost >= expectedMonthlyValue ? null : 1;

    toolStore.setActiveTool("roi", { solution, monthlyCost, expectedMonthlyValue, months: m, series });
    return {
      success: true,
      netOverHorizon: (expectedMonthlyValue - monthlyCost) * m,
      monthlyNet: expectedMonthlyValue - monthlyCost,
      breakevenMonth: breakeven,
      instruction: "The chart is on screen. Say the numbers out loud — these are their figures, not ours.",
    };
  },

  async market_insights({ category, region }) {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (region) qs.set("region", region);

    const r = await getCatalog<{ items: Solution[] }>(`/api/catalog?${qs.toString()}`);
    if (!r.ok) return { success: false, error: `Could not reach the catalogue (${r.error}).` };

    const matches = r.data.items ?? [];
    const prices = matches.map((m) => m.price).filter((p) => p > 0);
    const stats = {
      count: matches.length,
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      currency: matches[0]?.currency || "EUR",
    };

    toolStore.setActiveTool("marketInsights", { category, region, stats, matches });
    return { success: true, ...stats, instruction: "The figures are on screen." };
  },

  async request_demo({ name, solution, email }) {
    toolStore.setActiveTool("demoForm", { solution, name, email });
    return {
      success: true,
      formOpened: true,
      instruction:
        "A form is now on screen. Ask them to fill in their name and email and press send, and stay with them until it is submitted.",
    };
  },

  async show_referral_reward({ code }) {
    toolStore.setActiveTool("reward", { code, discountPercent: 10, commissionPercent: 15 });
    return { success: true, discountPercent: 10, commissionPercent: 15, instruction: "The reward is on screen." };
  },
};
