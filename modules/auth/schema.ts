import { z } from "zod";

// identifier e-posta ya da kullanıcı adı olabilir; hangisi olduğuna
// modules/auth/username.ts içindeki parseLoginIdentifier karar verir.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
