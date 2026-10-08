import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Sadece kaba filtre: oturumu olmayanı /login'e yollar. Asıl yetki
// kontrolü service katmanındadır.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
