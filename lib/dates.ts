// Ders ve dönem tarihleri saat taşımaz. Hepsi UTC gece yarısı olarak
// saklanır ve UTC olarak okunur; böylece sunucunun saat dilimi tarihi kaydırmaz.

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WORKSHOP_TIME_ZONE = "Europe/Istanbul";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: WORKSHOP_TIME_ZONE });

// "2026-10-08" -> Date. Var olmayan tarihleri (31 Şubat gibi) reddeder.
export function parseDateInput(input: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? date : null;
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// Atölyenin bulunduğu saat dilimine göre bugünün tarihi.
export function workshopToday(now: Date = new Date()): Date {
  return parseDateInput(todayFormatter.format(now))!;
}

// from dahil, haftanın istenen gününe denk gelen ilk tarih.
export function nextWeekday(from: Date, dayOfWeek: number): Date {
  const offset = (dayOfWeek - from.getUTCDay() + 7) % 7;
  return addDays(from, offset);
}
