"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { passwordFormSchema, staffCreateSchema, staffUpdateSchema } from "./schema";
import { createStaff, deleteStaff, resetStaffPassword, setStaffActive, updateStaff } from "./service";

const SECRET_FIELDS = ["password"] as const;

export async function createStaffAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, SECRET_FIELDS);
  const parsed = staffCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let staffId: string;
  try {
    ({ id: staffId } = await createStaff(parsed.data));
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect(`/staff/${staffId}`);
}

export async function updateStaffAction(staffId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = staffUpdateSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateStaff(staffId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Kaydedildi.", values };
}

export async function setStaffActiveAction(staffId: string, isActive: boolean): Promise<FormState> {
  try {
    await setStaffActive(staffId, isActive);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}

export async function resetStaffPasswordAction(
  staffId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordFormSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await resetStaffPassword(staffId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  return { success: "Şifre değiştirildi." };
}

export async function deleteStaffAction(staffId: string): Promise<FormState> {
  try {
    await deleteStaff(staffId);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  redirect("/staff");
}
