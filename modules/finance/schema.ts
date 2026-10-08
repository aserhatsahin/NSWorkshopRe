import { z } from "zod";
import { parseLiraToKurus } from "@/lib/money";

// Formdan TL olarak gelir, kuruşa çevrilir; her zaman pozitiftir.
// İşareti kaydın türü belirler.
export const positiveLiraAmount = z.string("Tutarı gir.").transform((value, ctx) => {
  const kurus = parseLiraToKurus(value);
  if (kurus === null || kurus <= 0) {
    ctx.addIssue({ code: "custom", message: "Geçerli bir tutar gir (örn. 4000 ya da 4000,50)." });
    return z.NEVER;
  }
  return kurus;
});

const reason = z
  .string("Açıklama yaz.")
  .trim()
  .min(3, "Açıklama en az 3 karakter olmalı.")
  .max(200, "Açıklama en fazla 200 karakter olabilir.");

export const MANUAL_ENTRY_KINDS = ["CHARGE", "DISCOUNT", "ADJUSTMENT_UP", "ADJUSTMENT_DOWN"] as const;

export const manualEntrySchema = z.object({
  kind: z.enum(MANUAL_ENTRY_KINDS, "Kayıt türü seç."),
  category: z.enum(["COURSE", "MATERIAL", "OTHER"], "Kategori seç."),
  amount: positiveLiraAmount,
  description: reason,
});

export type ManualEntryInput = z.infer<typeof manualEntrySchema>;

export const reversalSchema = z.object({ reason });

export type ReversalInput = z.infer<typeof reversalSchema>;
