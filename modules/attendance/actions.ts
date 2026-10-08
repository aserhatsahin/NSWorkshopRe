"use server";

import { refresh } from "next/cache";
import { toErrorMessage, type FormState } from "@/lib/action-state";
import { isAttendanceStatus } from "./rules";
import { markAttendance } from "./service";

export async function markAttendanceAction(
  lessonId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const status = formData.get("status");
  if (!isAttendanceStatus(status)) {
    return { error: "Geçersiz yoklama durumu." };
  }

  try {
    await markAttendance(lessonId, status);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}
