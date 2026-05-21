const XP_PER_LEVEL = 100;

export function computeHouseRank(
  members: { id: string; total_xp: number }[],
  profileId: string,
): number {
  const sorted = [...members].sort((a, b) => b.total_xp - a.total_xp);
  const idx = sorted.findIndex((m) => m.id === profileId);
  return idx === -1 ? sorted.length : idx + 1;
}

export function isTopPercentRank(rank: number, memberCount: number): boolean {
  if (memberCount <= 0) return false;
  const topSlots = Math.max(1, Math.ceil(memberCount * 0.05));
  return rank <= topSlots;
}

export type XpTier = "elite" | "roommate";

export function computeXpTier(rank: number, memberCount: number): XpTier {
  if (memberCount > 0 && rank === 1) return "elite";
  return "roommate";
}

export function financialReliabilityPercent(
  debts: { settled_at: string | null }[],
): number {
  if (debts.length === 0) return 100;
  const settled = debts.filter((d) => d.settled_at != null).length;
  return Math.round((settled / debts.length) * 100);
}

export { XP_PER_LEVEL };
