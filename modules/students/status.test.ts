import { describe, expect, it } from "vitest";
import { allowedStatusTransitions, canChangeStatus, isStudentStatus } from "./status";

describe("öğrenci durumu geçişleri", () => {
  it("onay (PENDING -> ACTIVE) genel durum değişikliğiyle yapılamaz", () => {
    expect(canChangeStatus("PENDING", "ACTIVE")).toBe(false);
  });

  it("bekleyen kayıt reddedilip arşivlenebilir", () => {
    expect(canChangeStatus("PENDING", "ARCHIVED")).toBe(true);
  });

  it("aktif öğrenci dondurulabilir ve geri alınabilir", () => {
    expect(canChangeStatus("ACTIVE", "PAUSED")).toBe(true);
    expect(canChangeStatus("PAUSED", "ACTIVE")).toBe(true);
  });

  it("aktif öğrenci doğrudan arşivlenemez, önce ayrılmış olmalı", () => {
    expect(canChangeStatus("ACTIVE", "ARCHIVED")).toBe(false);
    expect(canChangeStatus("ACTIVE", "LEFT")).toBe(true);
    expect(canChangeStatus("LEFT", "ARCHIVED")).toBe(true);
  });

  it("ayrılan ya da arşivlenen öğrenci geri dönebilir", () => {
    expect(canChangeStatus("LEFT", "ACTIVE")).toBe(true);
    expect(canChangeStatus("ARCHIVED", "ACTIVE")).toBe(true);
  });

  it("hiçbir durumdan PENDING'e dönülmez ve durum kendine geçmez", () => {
    for (const from of ["PENDING", "ACTIVE", "PAUSED", "LEFT", "ARCHIVED"] as const) {
      expect(allowedStatusTransitions(from)).not.toContain("PENDING");
      expect(canChangeStatus(from, from)).toBe(false);
    }
  });
});

describe("isStudentStatus", () => {
  it("geçerli ve geçersiz değerleri ayırır", () => {
    expect(isStudentStatus("ACTIVE")).toBe(true);
    expect(isStudentStatus("active")).toBe(false);
    expect(isStudentStatus(undefined)).toBe(false);
  });
});
