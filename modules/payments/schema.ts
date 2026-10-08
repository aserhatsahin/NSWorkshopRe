import { z } from "zod";
import { parseLiraToKurus } from "@/lib/money";
import { positiveLiraAmount } from "@/modules/finance/schema";
import { ALLOCATION_MODES } from "./allocation";

export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "OTHER"] as const;

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Nakit",
  TRANSFER: "Havale / EFT",
  CARD: "Kart",
  OTHER: "Diğer",
};

// Elle dağılım alanları: boş bırakılan 0 sayılır.
const splitAmount = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? "0" : value),
  z.string().transform((value, ctx) => {
    const kurus = parseLiraToKurus(value);
    if (kurus === null) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir tutar gir." });
      return z.NEVER;
    }
    return kurus;
  }),
);

export const paymentFormSchema = z.object({
  amount: positiveLiraAmount,
  method: z.enum(PAYMENT_METHODS, "Ödeme yöntemi seç."),
  mode: z.enum(ALLOCATION_MODES, "Dağıtım şekli seç."),
  manualCourse: splitAmount,
  manualMaterial: splitAmount,
  manualOther: splitAmount,
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(200, "Not en fazla 200 karakter olabilir.").nullable(),
  ),
});

export type PaymentFormInput = z.infer<typeof paymentFormSchema>;
