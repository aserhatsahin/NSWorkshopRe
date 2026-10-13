import { describe, expect, it } from "vitest";
import { parseDateInput } from "@/lib/dates";
import type { StaffDashboard, StudentRef } from "./lists";
import { buildStaffTasks } from "./tasks";
import { buildTodayGroups, firstNameOf, greetingFor } from "./today";

const morning = { id: "g1", dayOfWeek: 2, startTime: "10:00", endTime: "12:00", label: null };
const evening = { id: "g2", dayOfWeek: 2, startTime: "18:00", endTime: "20:00", label: "Akşam" };

const emptyLists: StaffDashboard = { pendingApproval: [], endingSoon: [], awaitingRenewal: [], noPeriodYet: [] };

function ref(fullName: string): StudentRef {
  return { id: fullName, fullName, defaultGroup: null, photo: null };
}

describe("buildTodayGroups", () => {
  it("dersleri gruba göre toplar ve saat sırasına dizer", () => {
    const groups = buildTodayGroups([
      { status: "UNMARKED", group: evening },
      { status: "PRESENT", group: morning },
      { status: "UNMARKED", group: morning },
      { status: "ABSENT", group: morning },
    ]);

    expect(groups).toEqual([
      { group: morning, total: 3, unmarked: 1 },
      { group: evening, total: 1, unmarked: 1 },
    ]);
  });

  it("ders yoksa boş döner", () => {
    expect(buildTodayGroups([])).toEqual([]);
  });
});

describe("buildStaffTasks", () => {
  it("bekleyen hiçbir şey yoksa yapılacak üretmez", () => {
    const todayGroups = buildTodayGroups([{ status: "PRESENT", group: morning }]);

    expect(buildStaffTasks({ todayGroups, overdueDays: [], lists: emptyLists })).toEqual([]);
  });

  it("bugün işaretlenmemiş öğrencileri gruplar üstünden toplar", () => {
    const todayGroups = buildTodayGroups([
      { status: "UNMARKED", group: morning },
      { status: "UNMARKED", group: evening },
      { status: "PRESENT", group: evening },
    ]);
    const [task] = buildStaffTasks({ todayGroups, overdueDays: [], lists: emptyLists });

    expect(task).toMatchObject({ key: "attendanceToday", count: 2, href: "/attendance" });
  });

  it("eksik yoklamada en eski güne götürür ve tüm günlerin dersini sayar", () => {
    const [task] = buildStaffTasks({
      todayGroups: [],
      overdueDays: [
        { date: parseDateInput("2026-10-10")!, unmarked: 2 },
        { date: parseDateInput("2026-10-03")!, unmarked: 3 },
      ],
      lists: emptyLists,
    });

    expect(task).toMatchObject({ key: "attendanceOverdue", count: 5, href: "/attendance?date=2026-10-03" });
    expect(task.detail).toContain("2 ayrı gün");
  });

  it("yoklamayı öne, haber niteliğindeki listeyi sona koyar", () => {
    const tasks = buildStaffTasks({
      todayGroups: buildTodayGroups([{ status: "UNMARKED", group: morning }]),
      overdueDays: [{ date: parseDateInput("2026-10-06")!, unmarked: 1 }],
      lists: {
        pendingApproval: [ref("A")],
        endingSoon: [],
        awaitingRenewal: [{ ...ref("B"), lastPeriodEnd: parseDateInput("2026-09-26")! }, { ...ref("C"), lastPeriodEnd: parseDateInput("2026-09-26")! }],
        noPeriodYet: [ref("D")],
      },
    });

    expect(tasks.map((task) => [task.key, task.count])).toEqual([
      ["attendanceToday", 1],
      ["attendanceOverdue", 1],
      ["pendingApproval", 1],
      ["awaitingRenewal", 2],
      ["noPeriodYet", 1],
    ]);
  });
});

describe("karşılama", () => {
  it.each([
    [3, "İyi geceler"],
    [9, "Günaydın"],
    [12, "İyi günler"],
    [17, "İyi günler"],
    [18, "İyi akşamlar"],
  ])("saat %i -> %s", (hour, greeting) => {
    expect(greetingFor(hour)).toBe(greeting);
  });

  it("yalnızca ilk adı kullanır", () => {
    expect(firstNameOf("  Nurdan Sibel Yılmaz ")).toBe("Nurdan");
    expect(firstNameOf("")).toBeNull();
    expect(firstNameOf(null)).toBeNull();
  });
});
