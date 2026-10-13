"use server";

import { refresh } from "next/cache";
import { toErrorMessage, type FormState } from "@/lib/action-state";
import { MAX_PHOTO_BYTES, type PhotoBytes } from "./rules";
import { removeOwnPhoto, removeStudentPhoto, setOwnPhoto, setStudentPhoto } from "./service";

async function readPhoto(formData: FormData): Promise<PhotoBytes | string> {
  const file = formData.get("photo");
  if (!(file instanceof Blob) || file.size === 0) {
    return "Fotoğraf seç.";
  }
  // Belleğe almadan önce boyuta bakılır; içerik kontrolü service'te yapılır.
  if (file.size > MAX_PHOTO_BYTES) {
    return "Fotoğraf çok büyük. Başka bir fotoğraf dene.";
  }
  return new Uint8Array(await file.arrayBuffer());
}

async function run(work: () => Promise<void>, success: string): Promise<FormState> {
  try {
    await work();
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
  refresh();
  return { success };
}

export async function setStudentPhotoAction(studentId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const photo = await readPhoto(formData);
  if (typeof photo === "string") {
    return { error: photo };
  }
  return run(() => setStudentPhoto(studentId, photo), "Fotoğraf kaydedildi.");
}

export async function removeStudentPhotoAction(studentId: string): Promise<FormState> {
  return run(() => removeStudentPhoto(studentId), "Fotoğraf kaldırıldı.");
}

export async function setOwnPhotoAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const photo = await readPhoto(formData);
  if (typeof photo === "string") {
    return { error: photo };
  }
  return run(() => setOwnPhoto(photo), "Fotoğraf kaydedildi.");
}

export async function removeOwnPhotoAction(): Promise<FormState> {
  return run(() => removeOwnPhoto(), "Fotoğraf kaldırıldı.");
}
