import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/generated/prisma/client";
import type { LoginInput } from "./schema";

export type AuthUser = {
  id: string;
  role: Role;
  email: string | null;
};

// Kullanıcı bulunamadığında da bcrypt çalışsın diye: aksi halde yanıt
// süresinden hangi e-postaların kayıtlı olduğu anlaşılabilir.
const DUMMY_HASH = bcrypt.hashSync("nsworkshop-dummy-password", 12);

export async function verifyCredentials({ email, password }: LoginInput): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true, isActive: true, passwordHash: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !user.isActive || !passwordMatches) {
    return null;
  }

  return { id: user.id, role: user.role, email: user.email };
}

export async function getActiveUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return { id: user.id, role: user.role, email: user.email };
}
