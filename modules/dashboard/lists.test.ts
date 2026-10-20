import { describe, expect, it } from "vitest";
import { parseDateInput, toDateInput } from "@/lib/dates";
import type { AttendanceStatus, PeriodStatus, StudentStatus } from "@/lib/generated/prisma/client";
import { buildStaffDashboard, type DashboardStudent } from "./lists";

const group = { id: "g1", dayOfWeek: 6, startTime: "10:00", endTime: "12:00", label: null };

function period(status: PeriodStatus, start: string, marks: AttendanceStatus[]): DashboardStudent["periods"][number] {
  return {
    id: `${status}-${start}`,
    status,
    startDate: parseDateInput(start)!,
    group,
    lessons: marks.map((mark, index) => ({ weekNumber: index + 1, status: mark })),
  };
}

function student(
  fullName: string,
  periods: DashboardStudent["periods"] = [],
  status: StudentStatus = "ACTIVE",
): DashboardStudent {
  return { id: fullName, fullName, status, defaultGroup: null, photo: null, periods };
}

const names = (items: { fullName: string }[]) => items.map((item) => item.fullName);

describe("buildStaffDashboard", () => {
  it("3 dersi işlenmiş aktif dönemi yakında bitecek sayar", () => {
    const dashboard = buildStaffDashboard([
      student("Üç ders", [period("ACTIVE", "2026-10-03", ["PRESENT", "ABSENT", "PRESENT", "UNMARKED"])]),
      student("İki ders", [period("ACTIVE", "2026-10-03", ["PRESENT", "PRESENT", "UNMARKED", "UNMARKED"])]),
    ]);

    expect(names(dashboard.endingSoon)).toEqual(["Üç ders"]);
    expect(dashboard.awaitingRenewal).toEqual([]);
    expect(dashboard.noPeriodYet).toEqual([]);
  });

  it("dönemi tamamlanmış ve yenisi açılmamış öğrenciyi yenileme bekleyenlere koyar", () => {
    const dashboard = buildStaffDashboard([
      student("Bitmiş", [period("COMPLETED", "2026-09-05", ["PRESENT", "PRESENT", "PRESENT", "PRESENT"])]),
    ]);

    expect(names(dashboard.awaitingRenewal)).toEqual(["Bitmiş"]);
    expect(toDateInput(dashboard.awaitingRenewal[0].lastPeriodEnd)).toBe("2026-09-26");
  });

  it("yenileme bekleyenleri en eski biten dönem başta olacak şekilde sıralar", () => {
    const done: AttendanceStatus[] = ["PRESENT", "PRESENT", "PRESENT", "PRESENT"];
    const dashboard = buildStaffDashboard([
      student("Yeni biten", [period("COMPLETED", "2026-09-05", done)]),
      student("Eski biten", [period("COMPLETED", "2026-06-06", done), period("COMPLETED", "2026-05-02", done)]),
    ]);

    expect(names(dashboard.awaitingRenewal)).toEqual(["Eski biten", "Yeni biten"]);
    expect(toDateInput(dashboard.awaitingRenewal[0].lastPeriodEnd)).toBe("2026-06-27");
  });

  it("yeni dönemi açılmış öğrenci eski tamamlanmış dönemi yüzünden listelenmez", () => {
    const dashboard = buildStaffDashboard([
      student("Yenilenmiş", [
        period("COMPLETED", "2026-09-05", ["PRESENT", "PRESENT", "PRESENT", "PRESENT"]),
        period("ACTIVE", "2026-10-03", ["PRESENT", "UNMARKED", "UNMARKED", "UNMARKED"]),
      ]),
    ]);

    expect(dashboard.awaitingRenewal).toEqual([]);
    expect(dashboard.endingSoon).toEqual([]);
  });

  it("hiç dönemi olmayan aktif öğrenciyi ayrı listeler", () => {
    const dashboard = buildStaffDashboard([student("Dönemsiz")]);

    expect(names(dashboard.noPeriodYet)).toEqual(["Dönemsiz"]);
    expect(dashboard.awaitingRenewal).toEqual([]);
  });

  it("onay bekleyeni ayrı listeler, aktif olmayanları hiçbir takip listesine koymaz", () => {
    const done = [period("COMPLETED", "2026-09-05", ["PRESENT", "PRESENT", "PRESENT", "PRESENT"] as AttendanceStatus[])];
    const dashboard = buildStaffDashboard([
      student("Bekleyen", [], "PENDING"),
      student("Dondurulmuş", done, "PAUSED"),
      student("Ayrılmış", done, "LEFT"),
      student("Arşiv", [], "ARCHIVED"),
    ]);

    expect(names(dashboard.pendingApproval)).toEqual(["Bekleyen"]);
    expect(dashboard.awaitingRenewal).toEqual([]);
    expect(dashboard.noPeriodYet).toEqual([]);
    expect(dashboard.endingSoon).toEqual([]);
  });

  it("bir aktif öğrenci en fazla bir takip listesinde yer alır", () => {
    const dashboard = buildStaffDashboard([
      student("A", [period("ACTIVE", "2026-10-03", ["PRESENT", "PRESENT", "PRESENT", "UNMARKED"])]),
      student("B", [period("COMPLETED", "2026-09-05", ["PRESENT", "PRESENT", "PRESENT", "PRESENT"])]),
      student("C"),
    ]);
    const all = [...names(dashboard.endingSoon), ...names(dashboard.awaitingRenewal), ...names(dashboard.noPeriodYet)];

    expect(all.sort()).toEqual(["A", "B", "C"]);
  });

  it("isimleri Türkçe alfabeye göre sıralar", () => {
    const dashboard = buildStaffDashboard([student("Zeynep"), student("Çağla"), student("Cem"), student("İpek"), student("Irmak")]);

    expect(names(dashboard.noPeriodYet)).toEqual(["Cem", "Çağla", "Irmak", "İpek", "Zeynep"]);
  });
});
