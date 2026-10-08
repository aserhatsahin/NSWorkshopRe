"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { manualEntrySchema, reversalSchema } from "./schema";
import { addManualEntry, reverseTransaction } from "./service";

export async function addManualEntryAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = manualEntrySchema.safeParse({
    kind: formData.get("kind"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await addManualEntry(studentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Kayıt eklendi." };
}

export async function reverseTransactionAction(
  transactionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reversalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: formValues(formData) };
  }

  try {
    await reverseTransaction(transactionId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values: formValues(formData) };
  }

  refresh();
  return {};
}
