import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, type Permission } from "./definitions";

const OWNER_ONLY: Permission[] = [
  "finance.viewGlobal",
  "finance.viewDebtors",
  "finance.adjust",
  "reports.view",
  "staff.manage",
];

const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

describe("hasPermission", () => {
  it("OWNER her yetkiye sahip", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("OWNER", permission), permission).toBe(true);
    }
  });

  it.each(OWNER_ONLY)("STAFF %s yetkisine sahip değil", (permission) => {
    expect(hasPermission("STAFF", permission)).toBe(false);
  });

  it("STAFF, OWNER'a özel olmayan her yetkiye sahip", () => {
    const shared = ALL_PERMISSIONS.filter((permission) => !OWNER_ONLY.includes(permission));
    for (const permission of shared) {
      expect(hasPermission("STAFF", permission), permission).toBe(true);
    }
  });

  it("STUDENT hiçbir yetkiye sahip değil", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("STUDENT", permission), permission).toBe(false);
    }
  });
});
