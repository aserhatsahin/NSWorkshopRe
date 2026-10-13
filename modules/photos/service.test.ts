import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/errors";
import { ForbiddenError, UnauthenticatedError } from "@/lib/permissions/errors";
import type { AuthUser } from "@/modules/auth/service";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
  findProfile: vi.fn(),
  findPhoto: vi.fn(),
  upsertPhoto: vi.fn(),
  deletePhotos: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/prisma", () => {
  const client = {
    studentProfile: { findUnique: mocks.findProfile },
    studentPhoto: { findUnique: mocks.findPhoto, upsert: mocks.upsertPhoto, deleteMany: mocks.deletePhotos },
    auditLog: { create: mocks.auditCreate },
  };
  return { prisma: { ...client, $transaction: async (run: (tx: typeof client) => unknown) => run(client) } };
});

const { getStudentPhoto, removeStudentPhoto, setOwnPhoto, setStudentPhoto } = await import("./service");

const staff: AuthUser = { id: "staff-1", role: "STAFF", email: "p@example.test" };
const student: AuthUser = { id: "user-a", role: "STUDENT", email: null };
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const stored = { data: jpeg, mimeType: "image/jpeg" };

describe("fotoğraf görme", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findPhoto.mockResolvedValue(stored);
  });

  it("oturumsuz istek reddedilir", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(getStudentPhoto("profile-a")).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("personel her öğrencinin fotoğrafını görür", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);
    await expect(getStudentPhoto("profile-b")).resolves.toEqual(stored);
  });

  it("öğrenci kendi fotoğrafını görür", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-a" });
    await expect(getStudentPhoto("profile-a")).resolves.toEqual(stored);
  });

  it("öğrenci başka öğrencinin fotoğrafını göremez ve fotoğraf hiç okunmaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-a" });

    await expect(getStudentPhoto("profile-b")).resolves.toBeNull();
    expect(mocks.findPhoto).not.toHaveBeenCalled();
  });
});

describe("fotoğraf yükleme", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("öğrenci personel yolundan başkasına fotoğraf yükleyemez ya da kaldıramaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);

    await expect(setStudentPhoto("profile-b", jpeg)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(removeStudentPhoto("profile-b")).rejects.toBeInstanceOf(ForbiddenError);
    expect(mocks.upsertPhoto).not.toHaveBeenCalled();
    expect(mocks.deletePhotos).not.toHaveBeenCalled();
  });

  it("öğrencinin kendi yüklemesi yalnızca oturumdaki profiline yazılır", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-a", status: "ACTIVE" });

    await setOwnPhoto(jpeg);

    expect(mocks.findProfile).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a" } }));
    expect(mocks.upsertPhoto.mock.calls[0][0].where).toEqual({ studentId: "profile-a" });
  });

  it("onay bekleyen öğrenci fotoğraf yükleyemez", async () => {
    mocks.getCurrentUser.mockResolvedValue(student);
    mocks.findProfile.mockResolvedValue({ id: "profile-a", status: "PENDING" });

    await expect(setOwnPhoto(jpeg)).rejects.toBeInstanceOf(DomainError);
    expect(mocks.upsertPhoto).not.toHaveBeenCalled();
  });

  it("JPEG olmayan içerik kaydedilmez", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);
    mocks.findProfile.mockResolvedValue({ id: "profile-b" });

    await expect(setStudentPhoto("profile-b", new TextEncoder().encode("<svg/>"))).rejects.toBeInstanceOf(DomainError);
    expect(mocks.upsertPhoto).not.toHaveBeenCalled();
  });

  it("fotoğraf baytları audit log'a yazılmaz", async () => {
    mocks.getCurrentUser.mockResolvedValue(staff);
    mocks.findProfile.mockResolvedValue({ id: "profile-b" });

    await setStudentPhoto("profile-b", jpeg);

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: { actorId: "staff-1", action: "STUDENT_PHOTO_UPDATED", targetStudentId: "profile-b" },
    });
  });
});
