import { getCurrentUser } from "@/lib/auth/session";
import type { AuthUser } from "@/modules/auth/service";
import { hasPermission, type Permission } from "./definitions";
import { ForbiddenError, UnauthenticatedError } from "./errors";

// Her service fonksiyonu ilk iş olarak bunu çağırır. getCurrentUser
// kullanıcıyı DB'den okuduğu için pasife alınan ya da rolü değişen
// kullanıcının eski token'ı burada geçersiz kalır.
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(permission);
  }

  return user;
}
