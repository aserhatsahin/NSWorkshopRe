"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { settingsFormSchema } from "./schema";
import { updateSettings } from "./service";

export async function updateSettingsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = settingsFormSchema.safeParse({
    defaultPeriodPrice: formData.get("defaultPeriodPrice"),
    debtAlertThreshold: formData.get("debtAlertThreshold"),
    defaultStudentPassword: formData.get("defaultStudentPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateSettings(parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Ayarlar kaydedildi.", values };
}
