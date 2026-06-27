const PRE_PRIMARY_SEQUENCE = [
  "play group", "pre nursery", "nursery",
  "junior kg", "jr. kg", "jr kg", "lkg",
  "senior kg", "sr. kg", "sr kg", "ukg",
];

function classRank(name: string): number {
  const normalized = name.trim().toLowerCase();
  const preIndex = PRE_PRIMARY_SEQUENCE.findIndex((p) => normalized.includes(p));
  if (preIndex !== -1) return preIndex;
  const match = normalized.match(/(\d+)/);
  if (match) return PRE_PRIMARY_SEQUENCE.length + parseInt(match[1], 10);
  return Number.MAX_SAFE_INTEGER;
}

export function sortClassesByGrade<T extends { name: string }>(classes: T[]): T[] {
  return [...classes].sort((a, b) => {
    const rankDiff = classRank(a.name) - classRank(b.name);
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  });
}
