import { z } from "zod";
import { positiveLiraAmount } from "@/modules/finance/schema";

export const MAX_SALE_QUANTITY = 99;

export const productFormSchema = z.object({
  name: z
    .string("Ürün adını yaz.")
    .trim()
    .min(2, "Ürün adı en az 2 karakter olmalı.")
    .max(80, "Ürün adı en fazla 80 karakter olabilir."),
  defaultPrice: positiveLiraAmount,
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const saleFormSchema = z.object({
  productId: z.string("Ürün seç.").min(1, "Ürün seç.").max(40),
  // z.coerce.number() boş metni 0'a çevirdiği için metin olarak doğrulanır.
  quantity: z
    .string("Adet gir.")
    .trim()
    .regex(/^[1-9]\d?$/, `Adet 1 ile ${MAX_SALE_QUANTITY} arasında olmalı.`)
    .transform((value) => Number(value)),
  unitPrice: positiveLiraAmount,
});

export type SaleFormInput = z.infer<typeof saleFormSchema>;

// Satışın deftere yazılacak tutarı (kuruş).
export function saleTotal(sale: { unitPrice: number; quantity: number }): number {
  return sale.unitPrice * sale.quantity;
}
