"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { reversalSchema } from "@/modules/finance/schema";
import { productFormSchema, saleFormSchema } from "./schema";
import { createProduct, returnMaterialSale, sellMaterial, setProductActive, updateProduct } from "./service";

function readProductForm(formData: FormData) {
  return productFormSchema.safeParse({
    name: formData.get("name"),
    defaultPrice: formData.get("defaultPrice"),
  });
}

export async function createProductAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await createProduct(parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect("/products");
}

export async function updateProductAction(
  productId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readProductForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateProduct(productId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Kaydedildi.", values };
}

export async function setProductActiveAction(productId: string, isActive: boolean): Promise<FormState> {
  try {
    await setProductActive(productId, isActive);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}

export async function sellMaterialAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = saleFormSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await sellMaterial(studentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect(`/students/${studentId}/finance`);
}

export async function returnMaterialSaleAction(
  saleId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reversalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData) };
  }

  try {
    await returnMaterialSale(saleId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values: formValues(formData) };
  }

  refresh();
  return {};
}
