"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { reversalSchema } from "@/modules/finance/schema";
import { paymentFormSchema } from "./schema";
import { createPayment, reversePayment } from "./service";

export async function createPaymentAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = paymentFormSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    mode: formData.get("mode"),
    manualCourse: formData.get("manualCourse") ?? "",
    manualMaterial: formData.get("manualMaterial") ?? "",
    manualOther: formData.get("manualOther") ?? "",
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await createPayment(studentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect(`/students/${studentId}/finance`);
}

export async function reversePaymentAction(
  paymentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reversalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData) };
  }

  try {
    await reversePayment(paymentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values: formValues(formData) };
  }

  refresh();
  return {};
}
