import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { UnauthenticatedError } from "@/lib/permissions/errors";
import { logAudit } from "@/modules/audit/service";
import { hashPassword } from "@/modules/auth/password";

// Her rol kendi şifresini değiştirebilir; hedef her zaman oturumdaki
// kullanıcıdır, kimlik parametreyle alınmaz.
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  // Mevcut şifre sorulur: açık bırakılmış bir oturumu ele geçiren kişi
  // şifreyi değiştirip hesabın sahibini dışarıda bırakamasın.
  if (!account?.passwordHash || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
    throw new DomainError("Mevcut şifren hatalı.");
  }
  if (currentPassword === newPassword) {
    throw new DomainError("Yeni şifren mevcut şifrenle aynı olamaz.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Şifre ya da hash'i log'a yazılmaz.
    await logAudit(tx, { actorId: user.id, action: "PASSWORD_CHANGED" });
  });
}
