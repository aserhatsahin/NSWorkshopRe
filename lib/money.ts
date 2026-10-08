const LIRA_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

const formatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

// "4000", "4000,5", "4000.50" -> kuruş. Binlik ayracı kabul edilmez:
// "4.000" yazan kullanıcı 4 TL mi 4000 TL mi demek istedi belli değil.
export function parseLiraToKurus(input: string): number | null {
  const normalized = input.trim();
  if (!LIRA_PATTERN.test(normalized)) {
    return null;
  }
  const [lira, fraction = ""] = normalized.split(/[.,]/);
  const kurus = Number(lira) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kurus) ? kurus : null;
}

export function formatKurus(kurus: number): string {
  return formatter.format(kurus / 100);
}

// Form alanlarını doldurmak için: 400000 -> "4000", 400050 -> "4000,50"
export function kurusToLiraInput(kurus: number): string {
  const lira = Math.trunc(kurus / 100);
  const fraction = Math.abs(kurus % 100);
  return fraction === 0 ? String(lira) : `${lira},${String(fraction).padStart(2, "0")}`;
}
