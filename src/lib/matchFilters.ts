export const MAJOR_TIERS = ["s", "a", "b", "c"] as const;

export type MajorTier = (typeof MAJOR_TIERS)[number];

export const ALL_MAJOR_TIERS: MajorTier[] = [...MAJOR_TIERS];

export function normalizeTier(
  tier: string | null | undefined,
): string | null {
  const t = tier?.trim().toLowerCase();
  return t ? t : null;
}

export function isMajorTier(tier: string | null | undefined): boolean {
  const t = normalizeTier(tier);
  return t === "s" || t === "a" || t === "b" || t === "c";
}

export function matchesSelectedTiers(
  tier: string | null | undefined,
  selected: ReadonlySet<string>,
): boolean {
  const t = normalizeTier(tier);
  if (!t || !isMajorTier(t)) return false;
  return selected.has(t);
}

/** 全選時再點某一級 → 只留那一級；其餘為一般多選開關。 */
export function toggleMatchTier(
  selected: readonly string[],
  tier: MajorTier,
): MajorTier[] {
  const set = new Set(selected);
  const allOn = MAJOR_TIERS.every((t) => set.has(t));
  if (allOn) return [tier];
  if (set.has(tier)) {
    return MAJOR_TIERS.filter((t) => t !== tier && set.has(t));
  }
  return MAJOR_TIERS.filter((t) => t === tier || set.has(t));
}

export function allMajorTiersSelected(selected: readonly string[]): boolean {
  return MAJOR_TIERS.every((t) => selected.includes(t));
}
