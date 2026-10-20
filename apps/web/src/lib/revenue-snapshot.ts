import { prisma } from "@app/db";
import { PLAN_PRICES } from "@/lib/plans";

export type RevenueSnapshot = {
  mrr: number;
  total: number;
  today: number;
  activeSubscriptions: number;
  users: number;
  at: string;
};

/** Current live-revenue snapshot for the central ticker. */
export async function revenueSnapshot(): Promise<RevenueSnapshot> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [growthActive, totalAgg, todayAgg, activeUsers] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT", plan: "GROWTH", OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] } }),
    prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", completedAt: { gte: dayStart } } }),
    prisma.user.count(),
  ]);

  return {
    mrr: growthActive * PLAN_PRICES.GROWTH.EUR.cents,
    total: totalAgg._sum.amount ?? 0,
    today: todayAgg._sum.amount ?? 0,
    activeSubscriptions: growthActive,
    users: activeUsers,
    at: now.toISOString(),
  };
}
