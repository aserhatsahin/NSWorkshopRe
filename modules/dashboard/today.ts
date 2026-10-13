import type { AttendanceStatus } from "@/lib/generated/prisma/client";
import { compareGroups } from "@/modules/groups/format";
import type { GroupRef } from "./lists";

export type TodayGroup = { group: GroupRef; total: number; unmarked: number };

// Bugünün dersleri grup grup, ders saatine göre sıralı.
export function buildTodayGroups(lessons: readonly { status: AttendanceStatus; group: GroupRef }[]): TodayGroup[] {
  const groups = new Map<string, TodayGroup>();
  for (const lesson of lessons) {
    const entry = groups.get(lesson.group.id) ?? { group: lesson.group, total: 0, unmarked: 0 };
    entry.total += 1;
    if (lesson.status === "UNMARKED") {
      entry.unmarked += 1;
    }
    groups.set(lesson.group.id, entry);
  }
  return [...groups.values()].sort((a, b) => compareGroups(a.group, b.group));
}

export function greetingFor(hour: number): string {
  if (hour < 5) {
    return "İyi geceler";
  }
  if (hour < 12) {
    return "Günaydın";
  }
  if (hour < 18) {
    return "İyi günler";
  }
  return "İyi akşamlar";
}

// "Nurdan Sibel Yılmaz" -> "Nurdan": karşılamada yalnızca ilk ad kullanılır.
export function firstNameOf(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] || null;
}
