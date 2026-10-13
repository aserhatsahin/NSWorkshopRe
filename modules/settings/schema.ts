import { z } from "zod";
import { parseLiraToKurus } from "@/lib/money";
import { positiveLiraAmount } from "@/modules/finance/schema";

export const settingsFormSchema = z.object({
  defaultPeriodPrice: positiveLiraAmount,
  // 0 geçerlidir: borcu olan herkes listelenir.
  debtAlertThreshold: z.string("Eşik tutarını gir.").transform((value, ctx) => {
    const kurus = parseLiraToKurus(value);
    if (kurus === null) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir tutar gir (örn. 5000)." });
      return z.NEVER;
    }
    return kurus;
  }),
});

export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
