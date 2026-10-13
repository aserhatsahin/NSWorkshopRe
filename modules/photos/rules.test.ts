import { describe, expect, it } from "vitest";
import { checkPhotoBytes, MAX_PHOTO_BYTES, photoUrl } from "./rules";

const jpeg = (length: number) => {
  const bytes = new Uint8Array(length);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};

describe("checkPhotoBytes", () => {
  it("JPEG başlığı taşıyan ve sınırı aşmayan veriyi kabul eder", () => {
    expect(checkPhotoBytes(jpeg(40_000))).toEqual({ ok: true });
    expect(checkPhotoBytes(jpeg(MAX_PHOTO_BYTES))).toEqual({ ok: true });
  });

  it("boş veriyi reddeder", () => {
    expect(checkPhotoBytes(new Uint8Array())).toMatchObject({ ok: false });
  });

  it("sınırı aşan veriyi reddeder", () => {
    expect(checkPhotoBytes(jpeg(MAX_PHOTO_BYTES + 1))).toMatchObject({ ok: false });
  });

  it("JPEG olmayan içeriği, adı ya da türü ne olursa olsun reddeder", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const html = new TextEncoder().encode("<script>alert(1)</script>");
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="x()"/>');
    for (const bytes of [png, html, svg]) {
      expect(checkPhotoBytes(bytes)).toMatchObject({ ok: false });
    }
  });
});

describe("photoUrl", () => {
  it("fotoğraf değişince adres de değişir", () => {
    const first = photoUrl("s1", new Date("2026-10-13T10:00:00Z"));
    const second = photoUrl("s1", new Date("2026-10-13T10:05:00Z"));
    expect(first).toMatch(/^\/api\/students\/s1\/photo\?v=\d+$/);
    expect(first).not.toBe(second);
  });
});
