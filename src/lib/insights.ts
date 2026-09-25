import type { MemoryRow } from "./queries";

/** Counts dated memories per month for the last 12 months. */
export function monthlyActivity(memories: MemoryRow[]) {
  const months: Array<{ key: string; label: string; count: number }> = [];
  const now = new Date();
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString(undefined, { month: "short" }),
      count: 0,
    });
  }
  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const memory of memories) {
    if (!memory.start_date) continue;
    const key = memory.start_date.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) bucket.count += 1;
  }
  return months;
}

export function byCategory(memories: MemoryRow[]) {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    counts.set(memory.category, (counts.get(memory.category) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function topTopics(memories: MemoryRow[], limit = 8) {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    for (const topic of memory.topics ?? []) {
      const key = topic.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function byYear(memories: MemoryRow[]) {
  const counts = new Map<string, number>();
  for (const memory of memories) {
    if (!memory.start_date) continue;
    const year = memory.start_date.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
