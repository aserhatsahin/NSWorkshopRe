// Her grup (ve grubu olmayan öğrenci) kimliğinden türetilen sabit bir
// pigment alır; şemada renk alanı tutulmaz. Yazı rengi zeminle birlikte
// seçilir ki iki temada da okunsun.
const PIGMENTS = [
  "bg-p-blue text-[#f6f1e7]",
  "bg-p-ochre text-[#231f1c]",
  "bg-p-green text-[#f6f1e7]",
  "bg-p-plum text-[#f6f1e7]",
  "bg-p-red text-[#231f1c]",
] as const;

export function pigmentFor(seed: string): string {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.codePointAt(0)!) % 9973;
  }
  return PIGMENTS[hash % PIGMENTS.length];
}

export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0].toLocaleUpperCase("tr")).join("");
}
