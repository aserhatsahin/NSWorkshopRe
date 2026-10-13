import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions/definitions";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { checkPhotoBytes, PHOTO_MIME_TYPE, type PhotoBytes } from "./rules";

const NOT_FOUND = "Öğrenci bulunamadı.";

export type StoredPhoto = { data: Uint8Array; mimeType: string };

// Fotoğrafı yalnızca personel/atölye sahibi ve fotoğrafın sahibi öğrenci
// görebilir. Bir öğrenci başka öğrencinin fotoğrafını isteyemez.
export async function getStudentPhoto(studentId: string): Promise<StoredPhoto | null> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }

  if (!hasPermission(user.role, "student.view")) {
    const own = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (own?.id !== studentId) {
      return null;
    }
  }

  return prisma.studentPhoto.findUnique({ where: { studentId }, select: { data: true, mimeType: true } });
}

async function savePhoto(studentId: string, actorId: string, bytes: PhotoBytes): Promise<void> {
  const check = checkPhotoBytes(bytes);
  if (!check.ok) {
    throw new DomainError(check.message);
  }

  await prisma.$transaction(async (tx) => {
    const data = { data: bytes, mimeType: PHOTO_MIME_TYPE };
    await tx.studentPhoto.upsert({ where: { studentId }, create: { studentId, ...data }, update: data });
    await logAudit(tx, { actorId, action: "STUDENT_PHOTO_UPDATED", targetStudentId: studentId });
  });
}

async function deletePhoto(studentId: string, actorId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.studentPhoto.deleteMany({ where: { studentId } });
    if (count > 0) {
      await logAudit(tx, { actorId, action: "STUDENT_PHOTO_REMOVED", targetStudentId: studentId });
    }
  });
}

// Personel herhangi bir öğrencinin fotoğrafını yükleyebilir ya da uygunsuz
// bir fotoğrafı kaldırabilir.
export async function setStudentPhoto(studentId: string, bytes: PhotoBytes): Promise<void> {
  const actor = await requirePermission("student.managePhoto");
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) {
    throw new DomainError(NOT_FOUND);
  }
  await savePhoto(studentId, actor.id, bytes);
}

export async function removeStudentPhoto(studentId: string): Promise<void> {
  const actor = await requirePermission("student.managePhoto");
  await deletePhoto(studentId, actor.id);
}

// Öğrencinin kendi fotoğrafı: kimlik parametreyle alınmaz, oturumdan okunur.
async function requireOwnProfile(): Promise<{ userId: string; studentId: string }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  if (user.role !== "STUDENT" || !profile) {
    throw new DomainError("Bu işlem yalnızca öğrenciler içindir.");
  }
  if (profile.status === "PENDING") {
    throw new DomainError("Fotoğraf eklemek için kaydının onaylanmasını bekle.");
  }
  return { userId: user.id, studentId: profile.id };
}

export async function setOwnPhoto(bytes: PhotoBytes): Promise<void> {
  const { userId, studentId } = await requireOwnProfile();
  await savePhoto(studentId, userId, bytes);
}

export async function removeOwnPhoto(): Promise<void> {
  const { userId, studentId } = await requireOwnProfile();
  await deletePhoto(studentId, userId);
}
