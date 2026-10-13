"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { signIn } from "@/lib/auth";
import { passwordSchema } from "@/modules/auth/password";
import { clientIpFrom, isRateLimited, recordAttempt, REGISTER_LIMIT, registerKey } from "@/modules/auth/rate-limit";
import { registerSchema, studentFormSchema } from "./schema";
import {
  approveStudent,
  changeStudentStatus,
  createStudent,
  deleteStudent,
  registerStudent,
  resetStudentPasswordToDefault,
  setStudentPassword,
  updateStudent,
} from "./service";
import { isStudentStatus } from "./status";

function readStudentForm(formData: FormData) {
  return studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    username: formData.get("username"),
    customPrice: formData.get("customPrice"),
    defaultGroupId: formData.get("defaultGroupId"),
  });
}

export async function createStudentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = readStudentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // İlk şifre isteğe bağlıdır; boş bırakılırsa varsayılan öğrenci şifresi
  // (tanımlıysa) atanır.
  const rawPassword = formData.get("password");
  let initialPassword: string | undefined;
  if (typeof rawPassword === "string" && rawPassword !== "") {
    const password = passwordSchema.safeParse(rawPassword);
    if (!password.success) {
      return { fieldErrors: { password: z.flattenError(password.error).formErrors }, values };
    }
    initialPassword = password.data;
  }

  let studentId: string;
  try {
    ({ id: studentId } = await createStudent(parsed.data, initialPassword));
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect(`/students/${studentId}`);
}

export async function updateStudentAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readStudentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateStudent(studentId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Kaydedildi.", values };
}

export async function approveStudentAction(studentId: string): Promise<FormState> {
  try {
    await approveStudent(studentId);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}

export async function changeStudentStatusAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const status = formData.get("status");
  if (!isStudentStatus(status)) {
    return { error: "Geçersiz durum." };
  }

  try {
    await changeStudentStatus(studentId, status);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}

export async function registerStudentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // Kayıt herkese açık olduğu için aynı adresten art arda hesap açılması sınırlanır.
  const attemptKey = registerKey(clientIpFrom(await headers()));
  if (await isRateLimited(attemptKey, REGISTER_LIMIT)) {
    return { error: "Bu bağlantıdan çok fazla kayıt denemesi yapıldı. Bir saat sonra tekrar dene.", values };
  }
  await recordAttempt(attemptKey);

  try {
    await registerStudent(parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  try {
    await signIn("credentials", {
      // Şema ikisinden en az birinin dolu olduğunu garanti eder.
      identifier: parsed.data.email ?? parsed.data.username!,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    // signIn başarılıysa redirect için throw eder; o hata yutulmamalı.
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }

  return {};
}

export async function setStudentPasswordAction(
  studentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z.object({ password: passwordSchema }).safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await setStudentPassword(studentId, parsed.data.password);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return { success: "Şifre kaydedildi." };
}

export async function deleteStudentAction(studentId: string): Promise<FormState> {
  try {
    await deleteStudent(studentId);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  redirect("/students");
}

export async function resetStudentPasswordToDefaultAction(studentId: string): Promise<FormState> {
  try {
    await resetStudentPasswordToDefault(studentId);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return { success: "Varsayılan şifre verildi." };
}
