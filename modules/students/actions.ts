"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { signIn } from "@/lib/auth";
import { registerSchema, studentFormSchema } from "./schema";
import {
  approveStudent,
  changeStudentStatus,
  createStudent,
  registerStudent,
  updateStudent,
} from "./service";
import { isStudentStatus } from "./status";

function readStudentForm(formData: FormData) {
  return studentFormSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    customPrice: formData.get("customPrice"),
  });
}

export async function createStudentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readStudentForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let studentId: string;
  try {
    ({ id: studentId } = await createStudent(parsed.data));
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
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await registerStudent(parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
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
