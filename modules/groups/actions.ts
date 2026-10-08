"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formValues, toErrorMessage, type FormState } from "@/lib/action-state";
import { groupFormSchema } from "./schema";
import { createGroup, setGroupActive, updateGroup } from "./service";

function readGroupForm(formData: FormData) {
  return groupFormSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    label: formData.get("label"),
  });
}

export async function createGroupAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readGroupForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await createGroup(parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  redirect("/groups");
}

export async function updateGroupAction(
  groupId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = readGroupForm(formData);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateGroup(groupId, parsed.data);
  } catch (error) {
    return { error: toErrorMessage(error), values };
  }

  refresh();
  return { success: "Kaydedildi.", values };
}

export async function setGroupActiveAction(groupId: string, isActive: boolean): Promise<FormState> {
  try {
    await setGroupActive(groupId, isActive);
  } catch (error) {
    return { error: toErrorMessage(error) };
  }

  refresh();
  return {};
}
