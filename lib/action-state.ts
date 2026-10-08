import { DomainError } from "@/lib/errors";
import { ForbiddenError, UnauthenticatedError } from "@/lib/permissions/errors";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Hata sonrası form sıfırlandığı için girilen değerler geri gönderilir.
  values?: Record<string, string>;
};

// Şifre gibi alanlar hata yanıtıyla tarayıcıya geri gönderilmez.
export function formValues(formData: FormData, omit: readonly string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$")) {
      values[key] = value;
    }
  }
  return values;
}

// Bilinen hataları kullanıcı mesajına çevirir; bilinmeyeni yutmaz, tekrar fırlatır.
export function toErrorMessage(error: unknown): string {
  if (error instanceof DomainError) {
    return error.message;
  }
  if (error instanceof ForbiddenError) {
    return "Bu işlem için yetkin yok.";
  }
  if (error instanceof UnauthenticatedError) {
    return "Oturumun sona ermiş. Tekrar giriş yap.";
  }
  throw error;
}
