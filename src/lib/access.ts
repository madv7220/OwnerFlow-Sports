import { prisma } from "@/lib/prisma";

export type AccessContext = {
  purchasedPickIds: Set<string>;
  purchasedParlayIds: Set<string>;
  subscribedTierIds: Set<string>;
};

export const EMPTY_ACCESS: AccessContext = {
  purchasedPickIds: new Set(),
  purchasedParlayIds: new Set(),
  subscribedTierIds: new Set(),
};

export async function getAccessContext(userId: string | undefined | null): Promise<AccessContext> {
  if (!userId) return EMPTY_ACCESS;

  const [purchases, subs] = await Promise.all([
    prisma.purchase.findMany({ where: { userId }, select: { pickId: true, parlayId: true } }),
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      select: { tierId: true },
    }),
  ]);

  return {
    purchasedPickIds: new Set(purchases.map((p) => p.pickId).filter((x): x is string => !!x)),
    purchasedParlayIds: new Set(purchases.map((p) => p.parlayId).filter((x): x is string => !!x)),
    subscribedTierIds: new Set(subs.map((s) => s.tierId)),
  };
}

export function hasAccess(
  content: { isFree: boolean; tierId: string | null; id: string },
  kind: "pick" | "parlay",
  ctx: AccessContext,
) {
  if (content.isFree) return true;
  if (content.tierId && ctx.subscribedTierIds.has(content.tierId)) return true;
  if (kind === "pick" && ctx.purchasedPickIds.has(content.id)) return true;
  if (kind === "parlay" && ctx.purchasedParlayIds.has(content.id)) return true;
  return false;
}
