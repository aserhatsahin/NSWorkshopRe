"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { periodFormSchema } from "./schema";
import { createPeriod } from "./service";

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
