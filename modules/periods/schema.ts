import { z } from "zod";
import { parseDateInput } from "@/lib/dates";
import { parseLiraToKurus } from "@/lib/money";

export const periodFormSchema = z.object({
  groupId: z.string("Grup seç.").min(1, "Grup seç.").max(40),
  startDate: z.string("Başlangıç tarihi seç.").transform((value, ctx) => {
    const date = parseDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir tarih seç." });
      return z.NEVER;
    }
    return date;
  }),
  // Formdan TL olarak gelir, kuruşa çevrilir.
  price: z.string("Dönem ücretini gir.").transform((value, ctx) => {
    const kurus = parseLiraToKurus(value);
    if (kurus === null || kurus <= 0) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir tutar gir (örn. 4000 ya da 4000,50)." });
      return z.NEVER;
    }
    return kurus;
  }),
});

export type PeriodFormInput = z.infer<typeof periodFormSchema>;
