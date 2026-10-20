import { prisma } from "@app/db";
import type { LeadStatus, DemoStatus } from "@app/db";

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

// ── Leads (contact form / CRM) ───────────────────────────────────────────────

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  solutionId?: string;
  userId?: string;
}

export async function createLead(input: LeadInput) {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim();
  if (!name || !email) throw new Error("Name and email are required");
  return prisma.lead.create({
    data: {
      name,
      email,
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      message: input.message?.trim() || null,
      source: input.source?.trim() || null,
      solutionId: input.solutionId || null,
      userId: input.userId || null,
    },
  });
}

export async function listLeads(ownerId?: string) {
  return prisma.lead.findMany({
    where: ownerId ? { OR: [{ ownerId }, { solution: { ownerId } }] } : {},
    orderBy: { createdAt: "desc" },
    include: { solution: { select: { title: true, slug: true } } },
  });
}

export async function setLeadStatus(id: string, status: LeadStatus) {
  return prisma.lead.update({ where: { id }, data: { status } });
}

// ── Saved solutions ──────────────────────────────────────────────────────────

export async function toggleSaved(userId: string, solutionId: string) {
  const existing = await prisma.savedSolution.findUnique({
    where: { userId_solutionId: { userId, solutionId } },
  });
  if (existing) {
    await prisma.savedSolution.delete({ where: { id: existing.id } });
    return { saved: false };
  }
  await prisma.savedSolution.create({ data: { userId, solutionId } });
  return { saved: true };
}

export async function getSavedSolutions(userId: string) {
  const rows = await prisma.savedSolution.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { solution: true },
  });
  return rows.map((r) => r.solution);
}

// ── Saved searches ─────────────────────────────────────────────────────────────

export async function saveSearch(userId: string, name: string, query: string, alerts: boolean) {
  return prisma.savedSearch.create({ data: { userId, name, query, alerts } });
}

export async function getSavedSearches(userId: string) {
  return prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

// ── Demo requests (was viewing requests) ────────────────────────────────────────

export async function requestDemo(userId: string, solutionId: string, note?: string, preferredAt?: Date) {
  return prisma.demoRequest.create({
    data: { userId, solutionId, note: note || null, preferredAt: preferredAt || null },
  });
}

export async function getUserDemoRequests(userId: string) {
  return prisma.demoRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { solution: { select: { title: true, slug: true, vendorName: true } } },
  });
}

export async function setDemoStatus(id: string, status: DemoStatus) {
  return prisma.demoRequest.update({ where: { id }, data: { status } });
}
