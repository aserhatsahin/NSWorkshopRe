import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/modules/auth/service";
import { ForbiddenError, UnauthenticatedError } from "./errors";
import { requirePermission } from "./guard";

const getCurrentUser = vi.hoisted(() => vi.fn<() => Promise<AuthUser | null>>());

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));

const owner: AuthUser = { id: "owner-1", role: "OWNER", email: "owner@example.test" };
const staff: AuthUser = { id: "staff-1", role: "STAFF", email: "staff@example.test" };
const student: AuthUser = { id: "student-1", role: "STUDENT", email: "student@example.test" };

describe("requirePermission", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
  });

  it("STAFF finance.viewGlobal çağırınca throw eder", async () => {
    getCurrentUser.mockResolvedValue(staff);
    await expect(requirePermission("finance.viewGlobal")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("STAFF borçlular listesine ve ADJUSTMENT'a erişemez", async () => {
    getCurrentUser.mockResolvedValue(staff);
    await expect(requirePermission("finance.viewDebtors")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requirePermission("finance.adjust")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("OWNER finance.viewGlobal çağırınca kullanıcıyı döner", async () => {
    getCurrentUser.mockResolvedValue(owner);
    await expect(requirePermission("finance.viewGlobal")).resolves.toEqual(owner);
  });

  it("STAFF tek öğrencinin finans geçmişini görebilir", async () => {
    getCurrentUser.mockResolvedValue(staff);
    await expect(requirePermission("finance.viewStudent")).resolves.toEqual(staff);
  });

  it("STUDENT personel yetkilerini kullanamaz", async () => {
    getCurrentUser.mockResolvedValue(student);
    await expect(requirePermission("payment.create")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("oturum yoksa ya da kullanıcı pasifse UnauthenticatedError fırlatır", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(requirePermission("student.create")).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
