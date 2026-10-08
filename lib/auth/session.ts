import { cache } from "react";
import { redirect } from "next/navigation";
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
