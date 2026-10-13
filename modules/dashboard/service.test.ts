import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthenticatedError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  query: vi.fn(),
  staffProfile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    staffProfile: { findUnique: mocks.staffProfile },
    studentProfile: { findMany: mocks.query },
    periodLesson: { findMany: mocks.query, groupBy: mocks.query },
  },
}));

const { getStaffDashboard } = await import("./service");

const now = new Date("2026-10-13T12:00:00Z");

describe("pano yetkisi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.query.mockResolvedValue([]);
    mocks.staffProfile.mockResolvedValue({ fullName: "Deneme Personel" });
  });

  it("öğrenci panoyu göremez ve veritabanına gidilmez", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role: "STUDENT", email: null });

    await expect(getStaffDashboard(now)).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("oturum yoksa reddeder", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(getStaffDashboard(now)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it.each(["OWNER", "STAFF"] as const)("%s panoyu görür; içinde finans verisi yoktur", async (role) => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", role, email: null });

    const view = await getStaffDashboard(now);

    expect(view).toEqual({
      viewerName: "Deneme Personel",
      activeStudentCount: 0,
      todayGroups: [],
      overdueDays: [],
      lists: { pendingApproval: [], endingSoon: [], awaitingRenewal: [], noPeriodYet: [] },
    });
  });
});
