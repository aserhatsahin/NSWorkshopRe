import { describe, expect, it } from "vitest";
import { addDays, formatDate, nextWeekday, parseDateInput, toDateInput, workshopToday } from "./dates";

describe("parseDateInput", () => {
  it("geçerli tarihi UTC gece yarısına çevirir", () => {
    expect(parseDateInput("2026-10-08")?.toISOString()).toBe("2026-10-08T00:00:00.000Z");
  });

  it.each(["", "08.10.2026", "2026-02-31", "2026-13-01", "2026-10-8"])("%s geçersiz", (input) => {
    expect(parseDateInput(input)).toBeNull();
  });

  it("toDateInput ile geri döner", () => {
    expect(toDateInput(parseDateInput("2026-01-05")!)).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("ay ve yıl sınırını aşar", () => {
    expect(toDateInput(addDays(parseDateInput("2026-12-28")!, 7))).toBe("2027-01-04");
  });

  it("yaz saati geçişinde gün kaydırmaz", () => {
    expect(toDateInput(addDays(parseDateInput("2026-03-28")!, 1))).toBe("2026-03-29");
    expect(toDateInput(addDays(parseDateInput("2026-10-24")!, 7))).toBe("2026-10-31");
  });
});

describe("nextWeekday", () => {
  const thursday = parseDateInput("2026-10-08")!;

  it("aynı günse tarihi olduğu gibi döner", () => {
    expect(toDateInput(nextWeekday(thursday, 4))).toBe("2026-10-08");
  });

  it("sonraki Cumartesi ve Pazartesiyi bulur", () => {
    expect(toDateInput(nextWeekday(thursday, 6))).toBe("2026-10-10");
    expect(toDateInput(nextWeekday(thursday, 1))).toBe("2026-10-12");
  });
});

describe("workshopToday", () => {
  it("UTC'de önceki gün olsa da İstanbul tarihini verir", () => {
    expect(toDateInput(workshopToday(new Date("2026-10-07T22:30:00Z")))).toBe("2026-10-08");
  });
});

describe("formatDate", () => {
  it("Türkçe yazar", () => {
    expect(formatDate(parseDateInput("2026-10-08")!)).toBe("8 Ekim 2026");
  });
});
