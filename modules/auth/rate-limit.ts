import { prisma } from "@/lib/db/prisma";

const MINUTE = 60 * 1000;

export const LOGIN_LIMIT = { maxAttempts: 5, windowMs: 15 * MINUTE } as const;
export const REGISTER_LIMIT = { maxAttempts: 5, windowMs: 60 * MINUTE } as const;

// Bu süreden eski kayıtlar hiçbir pencereye girmez; tablo büyümesin diye silinir.
const RETENTION_MS = 24 * 60 * MINUTE;

type Limit = { maxAttempts: number; windowMs: number };

export function loginKey(email: string): string {
  return `login:${email.trim().toLowerCase()}`;
}

export function registerKey(ip: string): string {
  return `register:${ip}`;
}

export async function isRateLimited(key: string, limit: Limit, now: Date = new Date()): Promise<boolean> {
  const recent = await prisma.authAttempt.count({
    where: { key, createdAt: { gt: new Date(now.getTime() - limit.windowMs) } },
  });
  return recent >= limit.maxAttempts;
}

export async function recordAttempt(key: string, now: Date = new Date()): Promise<void> {
  await prisma.authAttempt.create({ data: { key } });
  await prisma.authAttempt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } } });
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.authAttempt.deleteMany({ where: { key } });
}

// Vercel ve çoğu vekil sunucu istemci adresini bu başlıkta, virgülle
// ayrılmış listenin ilk öğesi olarak iletir.
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
