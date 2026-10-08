"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { positiveLiraAmount } from "@/modules/finance/schema";
import { periodFormSchema } from "./schema";
import { cancelPeriod, correctPeriodPrice, createPeriod } from "./service";

export async function createPeriodAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = periodFormSchema.safeParse({
    groupId: formData.get("groupId"),
    startDate: formData.get("startDate"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await createPeriod(studentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect(`/students/${studentId}`);
}

export async function cancelPeriodAction(periodId: string): Promise<FormState> {
  try {
    await cancelPeriod(periodId);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}

export async function correctPeriodPriceAction(
  periodId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = z.object({ price: positiveLiraAmount }).safeParse({ price: formData.get("price") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await correctPeriodPrice(periodId, parsed.data.price);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return {};
}
