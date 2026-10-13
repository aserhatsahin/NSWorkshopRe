"use server";

import { z } from "zod";
import { toErrorMessage, type FormState } from "@/lib/action-state";
import { passwordSchema } from "@/modules/auth/password";
import { changeOwnPassword } from "./service";

const changePasswordSchema = z
  .object({
    currentPassword: z.string("Mevcut şifreni yaz.").min(1, "Mevcut şifreni yaz.").max(200),
    newPassword: passwordSchema,
    confirmPassword: z.string("Yeni şifreni tekrar yaz."),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "İki yeni şifre aynı değil.",
  });

// Şifre alanları hiçbir durumda forma geri gönderilmez.
export async function changeOwnPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await changeOwnPassword(parsed.data.currentPassword, parsed.data.newPassword);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  return { success: "Şifren değiştirildi." };
}
