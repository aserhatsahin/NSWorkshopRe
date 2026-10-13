// Fotoğraf tarayıcıda PHOTO_SIZE piksellik kare JPEG'e küçültülüp gönderilir;
// sunucu yalnızca bu biçimi ve makul bir boyutu kabul eder.
export const PHOTO_SIZE = 320;
export const MAX_PHOTO_BYTES = 300 * 1024;
export const PHOTO_MIME_TYPE = "image/jpeg";

// Prisma Bytes alanı paylaşımsız bir ArrayBuffer üzerindeki diziyi kabul eder.
export type PhotoBytes = Uint8Array<ArrayBuffer>;

export type PhotoCheck = { ok: true } | { ok: false; message: string };

// Dosya adına ya da tarayıcının bildirdiği türe güvenilmez; içeriğin ilk
// baytlarına bakılır (JPEG her zaman FF D8 FF ile başlar).
export function checkPhotoBytes(bytes: Uint8Array): PhotoCheck {
  if (bytes.length === 0) {
    return { ok: false, message: "Fotoğraf seç." };
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Fotoğraf çok büyük. Başka bir fotoğraf dene." };
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return { ok: false, message: "Fotoğraf okunamadı. Başka bir fotoğraf dene." };
  }
  return { ok: true };
}

// Tarayıcı fotoğrafı sürüm numarasıyla önbelleğe alır; fotoğraf değişince adres de değişir.
export function photoUrl(studentId: string, updatedAt: Date): string {
  return `/api/students/${studentId}/photo?v=${updatedAt.getTime()}`;
}
