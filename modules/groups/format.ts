export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

// Hafta Pazartesi başlar; dayOfWeek ise 0=Pazar saklanır.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type GroupLike = { dayOfWeek: number; startTime: string; endTime: string; label: string | null };

export function formatGroupSchedule(group: Omit<GroupLike, "label">): string {
  return `${DAY_NAMES[group.dayOfWeek] ?? "?"} ${group.startTime}–${group.endTime}`;
}

export function formatGroupName(group: GroupLike): string {
  return group.label?.trim() || formatGroupSchedule(group);
}

export function compareGroups(a: Omit<GroupLike, "label">, b: Omit<GroupLike, "label">): number {
  const dayDifference = ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7);
  return dayDifference !== 0 ? dayDifference : a.startTime.localeCompare(b.startTime);
}
