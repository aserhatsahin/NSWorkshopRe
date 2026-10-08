"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { primaryButton } from "@/components/button-styles";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SelectField } from "@/components/select-field";
import type { FormState } from "@/lib/action-state";
import { formatKurus, parseLiraToKurus } from "@/lib/money";

type ProductOption = { value: string; label: string; price: string };

type SaleFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  products: ProductOption[];
};

export function SaleForm({ action, products }: SaleFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [productId, setProductId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");

  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);
    // Ürün değişince fiyat katalog fiyatına döner; indirim için elle değiştirilebilir.
    setUnitPrice(products.find((product) => product.value === nextProductId)?.price ?? "");
  }

  // React, form action bittiğinde formu sıfırlar; bu da state'e bağlı
  // alanları ekranda boşaltır. Gönderim elle yapılınca sıfırlama olmaz.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const unitKurus = parseLiraToKurus(unitPrice);
  const count = /^[1-9]\d?$/.test(quantity.trim()) ? Number(quantity) : null;
  const total = unitKurus !== null && unitKurus > 0 && count !== null ? unitKurus * count : null;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <SelectField
        label="Ürün"
        name="productId"
        required
        options={products}
        placeholder="Ürün seç"
        value={productId}
        onChange={(event) => handleProductChange(event.target.value)}
        errors={state.fieldErrors?.productId}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Adet"
          name="quantity"
          inputMode="numeric"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          errors={state.fieldErrors?.quantity}
        />
        <FormField
          label="Birim fiyat (TL)"
          name="unitPrice"
          inputMode="decimal"
          required
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          errors={state.fieldErrors?.unitPrice}
        />
      </div>
      <p className="text-sm">
        Borca eklenecek tutar: <strong>{total === null ? "—" : formatKurus(total)}</strong>
      </p>
      <FormMessage state={state} />
      <button type="submit" disabled={isPending} className={`${primaryButton} self-start`}>
        {isPending ? "Kaydediliyor…" : "Satışı kaydet"}
      </button>
    </form>
  );
}
