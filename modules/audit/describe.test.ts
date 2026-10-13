import { describe, expect, it } from "vitest";
import { AUDIT_ACTION_LABELS, AUDIT_CATEGORIES, describeAudit } from "./describe";

describe("describeAudit", () => {
  it("durum değişikliğini Türkçe yazar", () => {
    expect(describeAudit("STUDENT_STATUS_CHANGED", { from: "ACTIVE", to: "PAUSED" })).toBe("aktif → dondurulmuş");
  });

  it("yoklamada dönem durumu değiştiyse onu da belirtir", () => {
    expect(
      describeAudit("ATTENDANCE_MARKED", { from: "UNMARKED", to: "PRESENT", periodStatusBefore: "ACTIVE", periodStatusAfter: "COMPLETED" }),
    ).toBe("işaretsiz → geldi · dönem: aktif → tamamlandı");
    expect(
      describeAudit("ATTENDANCE_MARKED", { from: "PRESENT", to: "ABSENT", periodStatusBefore: "ACTIVE", periodStatusAfter: "ACTIVE" }),
    ).toBe("geldi → gelmedi");
  });

  it("tutarları kuruştan TL'ye çevirir", () => {
    expect(describeAudit("PAYMENT_ADDED", { amount: 180000, method: "CASH" })).toMatch(/1\.800,00 · nakit/);
    expect(describeAudit("PERIOD_PRICE_CORRECTED", { from: 420000, to: 400000 })).toMatch(/4\.200,00 → .*4\.000,00/);
    expect(describeAudit("MATERIAL_SOLD", { quantity: 3, unitPrice: 20000 })).toMatch(/^3 adet × .*200,00$/);
  });

  it("elle kaydın yönünü işaretle gösterir", () => {
    expect(describeAudit("TRANSACTION_ADDED", { amount: 10000 })).toMatch(/^\+.*100,00$/);
    expect(describeAudit("TRANSACTION_ADDED", { amount: -10000 })).toMatch(/^−.*100,00$/);
  });

  it("iptal ve iade nedenini gösterir", () => {
    expect(describeAudit("PAYMENT_REVERSED", { paymentId: "p1", reason: "Yanlış tutar" })).toBe("neden: Yanlış tutar");
  });

  it("dönem iptalinde düşülen tutarı ve kalan dersi yazar", () => {
    expect(describeAudit("PERIOD_CANCELLED", { charged: 420000, refund: 210000, remainingLessons: 2 })).toMatch(
      /borçtan düşülen .*2\.100,00 · işlenmemiş 2 ders/,
    );
  });

  it("aktif/pasif değişikliğini ayırt eder", () => {
    expect(describeAudit("STAFF_UPDATED", { staffUserId: "u1", isActive: false })).toBe("pasife alındı");
    expect(describeAudit("GROUP_UPDATED", { groupId: "g1", isActive: true })).toBe("yeniden aktif edildi");
  });

  it("ayarlarda yalnızca değişen alanı yazar", () => {
    const summary = describeAudit("SETTINGS_UPDATED", {
      before: { defaultPeriodPrice: 400000, debtAlertThreshold: 500000 },
      after: { defaultPeriodPrice: 400000, debtAlertThreshold: 100000 },
    });
    expect(summary).toMatch(/^borç eşiği: .*5\.000,00 → .*1\.000,00$/);
  });

  it("eksik, bozuk ya da tanınmayan metadata'da null döner, hata fırlatmaz", () => {
    expect(describeAudit("PAYMENT_ADDED", null)).toBeNull();
    expect(describeAudit("PAYMENT_ADDED", "metin")).toBeNull();
    expect(describeAudit("PAYMENT_ADDED", { amount: "çok" })).toBeNull();
    expect(describeAudit("STUDENT_STATUS_CHANGED", { from: "ACTIVE" })).toBeNull();
    expect(describeAudit("BILINMEYEN_ISLEM", { a: 1 })).toBeNull();
  });

  it("şifre işlemlerinde hiçbir ayrıntı göstermez", () => {
    expect(describeAudit("STAFF_PASSWORD_RESET", { staffUserId: "u1" })).toBeNull();
    expect(describeAudit("STUDENT_PASSWORD_SET", {})).toBeNull();
    expect(describeAudit("PASSWORD_CHANGED", {})).toBeNull();
  });
});

describe("audit etiketleri", () => {
  it("her işlem en az bir kategoride yer alır", () => {
    const categorized = new Set<string>(Object.values(AUDIT_CATEGORIES).flatMap((category) => [...category.actions]));
    const missing = Object.keys(AUDIT_ACTION_LABELS).filter((action) => !categorized.has(action));
    expect(missing).toEqual([]);
  });
});
