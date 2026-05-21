const XP_PER_LEVEL = 100;

export type XpProgress = {
  xpInLevel: number;
  progressPercent: number;
  xpToNextLevel: number;
};

export function computeXpProgress(
  totalXp: number,
  currentLevel: number,
): XpProgress {
  const xpForCurrentLevelStart = Math.max(0, currentLevel - 1) * XP_PER_LEVEL;
  const xpInLevel = Math.min(
    XP_PER_LEVEL,
    Math.max(0, totalXp - xpForCurrentLevelStart),
  );
  return {
    xpInLevel,
    progressPercent: xpInLevel / XP_PER_LEVEL,
    xpToNextLevel: XP_PER_LEVEL - xpInLevel,
  };
}
