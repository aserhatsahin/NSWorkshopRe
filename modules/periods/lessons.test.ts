import { describe, expect, it } from "vitest";
import { parseDateInput, toDateInput } from "@/lib/dates";
import { buildLessonDates } from "./lessons";

describe("buildLessonDates", () => {
  it("aynı günde ardışık 4 hafta üretir", () => {
    const lessons = buildLessonDates(parseDateInput("2026-10-10")!);
    expect(lessons.map((lesson) => lesson.weekNumber)).toEqual([1, 2, 3, 4]);
    expect(lessons.map((lesson) => toDateInput(lesson.lessonDate))).toEqual([
      "2026-10-10",
      "2026-10-17",
      "2026-10-24",
      "2026-10-31",
    ]);
    expect(new Set(lessons.map((lesson) => lesson.lessonDate.getUTCDay()))).toEqual(new Set([6]));
  });

  it("takvim ayını ve yılını aşar", () => {
    const lessons = buildLessonDates(parseDateInput("2026-12-19")!);
    expect(toDateInput(lessons[3].lessonDate)).toBe("2027-01-09");
  });
});
