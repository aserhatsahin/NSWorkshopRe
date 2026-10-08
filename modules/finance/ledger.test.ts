import { describe, expect, it } from "vitest";
import { summarizeDebt } from "./debt";
import { buildReversal, isValidLedgerAmount, withRunningBalance, type ReversibleEntry } from "./ledger";

function entry(overrides: Partial<ReversibleEntry> & Pick<ReversibleEntry, "type" | "amount">): ReversibleEntry {
  return { id: "tx-1", category: "COURSE", reversedTransactionId: null, ...overrides };
}

describe("isValidLedgerAmount", () => {
  it.each(["PERIOD_FEE", "MATERIAL_SALE", "MANUAL_CHARGE", "PAYMENT_REVERSAL"] as const)(
    "%s yalnızca pozitif olabilir",
    (type) => {
      expect(isValidLedgerAmount(type, 100)).toBe(true);
      expect(isValidLedgerAmount(type, -100)).toBe(false);
    },
  );

  it.each(["PAYMENT", "DISCOUNT", "MATERIAL_RETURN"] as const)("%s yalnızca negatif olabilir", (type) => {
    expect(isValidLedgerAmount(type, -100)).toBe(true);
    expect(isValidLedgerAmount(type, 100)).toBe(false);
  });

  it("ADJUSTMENT iki yönde de olabilir", () => {
    expect(isValidLedgerAmount("ADJUSTMENT", 100)).toBe(true);
    expect(isValidLedgerAmount("ADJUSTMENT", -100)).toBe(true);
  });

  it("sıfır ve kesirli tutar hiçbir tipte geçerli değil", () => {
    expect(isValidLedgerAmount("ADJUSTMENT", 0)).toBe(false);
    expect(isValidLedgerAmount("PERIOD_FEE", 0)).toBe(false);
    expect(isValidLedgerAmount("PERIOD_FEE", 10.5)).toBe(false);
  });
});

describe("buildReversal", () => {
  it("ödemeyi PAYMENT_REVERSAL ile, satışı MATERIAL_RETURN ile ters çevirir", () => {
    expect(buildReversal(entry({ type: "PAYMENT", amount: -150000 }))).toEqual({
      type: "PAYMENT_REVERSAL",
      category: "COURSE",
      amount: 150000,
      reversedTransactionId: "tx-1",
    });
    expect(buildReversal(entry({ type: "MATERIAL_SALE", amount: 25000, category: "MATERIAL" })).type).toBe(
      "MATERIAL_RETURN",
    );
  });

  it.each([
    ["PERIOD_FEE", 400000],
    ["MANUAL_CHARGE", 5000],
    ["DISCOUNT", -20000],
    ["ADJUSTMENT", 1234],
    ["ADJUSTMENT", -1234],
  ] as const)("%s (%i) ters işaretli ADJUSTMENT ile ters çevrilir", (type, amount) => {
    const reversal = buildReversal(entry({ type, amount }));
    expect(reversal.type).toBe("ADJUSTMENT");
    expect(reversal.amount).toBe(-amount);
  });

  it("ürettiği kayıt işaret kuralına her zaman uyar", () => {
    const originals = [
      entry({ type: "PERIOD_FEE", amount: 400000 }),
      entry({ type: "MATERIAL_SALE", amount: 25000 }),
      entry({ type: "MANUAL_CHARGE", amount: 5000 }),
      entry({ type: "PAYMENT", amount: -150000 }),
      entry({ type: "DISCOUNT", amount: -20000 }),
      entry({ type: "ADJUSTMENT", amount: -700 }),
    ];
    for (const original of originals) {
      const reversal = buildReversal(original);
      expect(isValidLedgerAmount(reversal.type, reversal.amount), original.type).toBe(true);
    }
  });

  it("ters kayıt tekrar ters çevrilemez", () => {
    expect(() => buildReversal(entry({ type: "ADJUSTMENT", amount: -400000, reversedTransactionId: "tx-0" }))).toThrow();
  });
});

describe("ters kayıt sonrası bakiye", () => {
  const fee = { id: "fee", type: "PERIOD_FEE", category: "COURSE", amount: 400000, reversedTransactionId: null } as const;
  const sale = { id: "sale", type: "MATERIAL_SALE", category: "MATERIAL", amount: 60000, reversedTransactionId: null } as const;
  const payment = { id: "pay", type: "PAYMENT", category: "COURSE", amount: -150000, reversedTransactionId: null } as const;

  it("ödeme ters çevrilince borç ödeme öncesine döner", () => {
    const beforePayment = summarizeDebt([fee, sale]);
    const afterReversal = summarizeDebt([fee, sale, payment, buildReversal(payment)]);
    expect(afterReversal).toEqual(beforePayment);
  });

  it("dönem ücreti ters çevrilince yalnızca kurs borcu düşer", () => {
    expect(summarizeDebt([fee, sale, payment, buildReversal(fee)])).toEqual({
      course: -150000,
      material: 60000,
      other: 0,
      total: -90000,
    });
  });

  it("her kayıt ters çevrilince bakiye sıfırlanır", () => {
    const all = [fee, sale, payment];
    expect(summarizeDebt([...all, ...all.map(buildReversal)]).total).toBe(0);
  });
});

describe("withRunningBalance", () => {
  it("her kaydın yanına o ana kadarki toplamı yazar", () => {
    expect(withRunningBalance([{ amount: 400000 }, { amount: -150000 }, { amount: 60000 }]).map((row) => row.balance)).toEqual([
      400000, 250000, 310000,
    ]);
  });
});
