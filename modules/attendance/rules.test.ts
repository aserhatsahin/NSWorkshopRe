import { describe, expect, it } from "vitest";
import { resolveAttendanceChange, type AttendanceChange } from "./rules";

const base: AttendanceChange = {
  periodStatus: "ACTIVE",
  lessonStatusesAfter: ["UNMARKED", "UNMARKED", "UNMARKED", "UNMARKED"],
  hasLaterPeriod: false,
  canReopenPeriod: false,
};

describe("resolveAttendanceChange", () => {
  it("işaretlenmemiş ders varken dönem aktif kalır", () => {
    expect(resolveAttendanceChange({ ...base, lessonStatusesAfter: ["PRESENT", "ABSENT", "PRESENT", "UNMARKED"] })).toEqual({
      ok: true,
      periodStatus: "ACTIVE",
    });
  });

  it("4. ders de işaretlenince dönem tamamlanır", () => {
    expect(resolveAttendanceChange({ ...base, lessonStatusesAfter: ["PRESENT", "PRESENT", "PRESENT", "PRESENT"] })).toEqual({
      ok: true,
      periodStatus: "COMPLETED",
    });
  });

  it("gelmedi de işaret sayılır: ders hakkı yanar, dönem tamamlanır", () => {
    expect(resolveAttendanceChange({ ...base, lessonStatusesAfter: ["ABSENT", "ABSENT", "ABSENT", "ABSENT"] })).toEqual({
      ok: true,
      periodStatus: "COMPLETED",
    });
  });

  it("tamamlanmış dönemde geldi/gelmedi düzeltmesi dönemi tamamlanmış bırakır", () => {
    expect(
      resolveAttendanceChange({
        ...base,
        periodStatus: "COMPLETED",
        hasLaterPeriod: true,
        lessonStatusesAfter: ["PRESENT", "ABSENT", "PRESENT", "PRESENT"],
      }),
    ).toEqual({ ok: true, periodStatus: "COMPLETED" });
  });

  it("sonraki dönem yoksa işareti kaldırmak dönemi yeniden aktif yapar", () => {
    expect(
      resolveAttendanceChange({
        ...base,
        periodStatus: "COMPLETED",
        lessonStatusesAfter: ["PRESENT", "PRESENT", "PRESENT", "UNMARKED"],
      }),
    ).toEqual({ ok: true, periodStatus: "ACTIVE" });
  });

  it("sonraki dönem varsa işareti kaldırmak engellenir", () => {
    expect(
      resolveAttendanceChange({
        ...base,
        periodStatus: "COMPLETED",
        hasLaterPeriod: true,
        lessonStatusesAfter: ["PRESENT", "PRESENT", "PRESENT", "UNMARKED"],
      }),
    ).toEqual({ ok: false, reason: "LATER_PERIOD_EXISTS" });
  });

  it("sonraki dönem olsa da OWNER dönemi yeniden açabilir", () => {
    expect(
      resolveAttendanceChange({
        ...base,
        periodStatus: "COMPLETED",
        hasLaterPeriod: true,
        canReopenPeriod: true,
        lessonStatusesAfter: ["PRESENT", "PRESENT", "PRESENT", "UNMARKED"],
      }),
    ).toEqual({ ok: true, periodStatus: "ACTIVE" });
  });

  it("iptal edilmiş dönemde yoklama değiştirilemez", () => {
    expect(resolveAttendanceChange({ ...base, periodStatus: "CANCELLED" })).toEqual({
      ok: false,
      reason: "PERIOD_CANCELLED",
    });
  });
});
