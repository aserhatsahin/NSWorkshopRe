import type { NextAuthConfig } from "next-auth";

// Bu dosya proxy.ts tarafından da yüklenir; her istekte çalıştığı için
// Prisma veya bcrypt import etmez. Provider'lar lib/auth/index.ts'te eklenir.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (nextUrl.pathname === "/login") {
        return true;
      }
      return Boolean(auth?.user);
    },
    // JWT sadece "bu kim" bilgisini taşır; rol ve isActive her seferinde
    // DB'den okunur (bkz. lib/auth/session.ts).
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
