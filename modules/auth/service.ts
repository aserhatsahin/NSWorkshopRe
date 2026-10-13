import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/generated/prisma/client";
import { clearAttempts, isRateLimited, LOGIN_LIMIT, loginKey, recordAttempt } from "./rate-limit";
import type { LoginInput } from "./schema";
import { parseLoginIdentifier } from "./username";

export type AuthUser = {
  id: string;
  role: Role;
  email: string | null;
};

// Kullanıcı bulunamadığında da bcrypt çalışsın diye: aksi halde yanıt
// süresinden hangi e-postaların kayıtlı olduğu anlaşılabilir.
const DUMMY_HASH = bcrypt.hashSync("nsworkshop-dummy-password", 12);

async function verifyCredentials({ identifier, password }: LoginInput): Promise<AuthUser | null> {
  const parsed = parseLoginIdentifier(identifier);
  const user = await prisma.user.findUnique({
    where: parsed.kind === "email" ? { email: parsed.value } : { username: parsed.value },
    select: { id: true, role: true, email: true, isActive: true, passwordHash: true },
  });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !user.isActive || !passwordMatches) {
    return null;
  }

  return { id: user.id, role: user.role, email: user.email };
}

// Girişin tek kapısı (Auth.js authorize buradan geçer). Sınır hesap
// başınadır (e-posta ya da kullanıcı adı): art arda hatalı denemeden sonra doğru şifre de bir süre
// kabul edilmez, böylece şifre deneme yanılmayla bulunamaz.
export async function authenticate(input: LoginInput): Promise<AuthUser | null> {
  const key = loginKey(input.identifier);
  if (await isRateLimited(key, LOGIN_LIMIT)) {
    return null;
  }

  const user = await verifyCredentials(input);
  if (user) {
    await clearAttempts(key);
  } else {
    await recordAttempt(key);
  }
  return user;
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
