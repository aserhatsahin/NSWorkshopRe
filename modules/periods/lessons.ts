import { addDays } from "@/lib/dates";

export const LESSONS_PER_PERIOD = 4;

// 1 dönem = aynı günde, ardışık 4 hafta. Takvim ayı kullanılmaz.
export function buildLessonDates(startDate: Date): { weekNumber: number; lessonDate: Date }[] {
  return Array.from({ length: LESSONS_PER_PERIOD }, (_, index) => ({
    weekNumber: index + 1,
    lessonDate: addDays(startDate, index * 7),
  }));
}
