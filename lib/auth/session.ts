import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/generated/prisma/client";
import { getActiveUserById, type AuthUser } from "@/modules/auth/service";
import { auth } from "./index";

// Aynı istek içinde birden fazla component çağırırsa DB'ye tek sefer gidilir.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  return getActiveUserById(userId);
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Layout'lar için kaba filtre. Rolü uymayan kullanıcı "/" üzerinden
// kendi ana sayfasına gider.
export async function requireRole(roles: readonly Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
