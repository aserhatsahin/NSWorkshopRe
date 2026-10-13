import { formatKurus } from "@/lib/money";
import type { AuditAction } from "./service";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  STUDENT_REGISTERED: "Öğrenci kendi kaydını oluşturdu",
  STUDENT_CREATED: "Öğrenci eklendi",
  STUDENT_UPDATED: "Öğrenci bilgileri güncellendi",
  STUDENT_APPROVED: "Öğrenci kaydı onaylandı",
  STUDENT_STATUS_CHANGED: "Öğrenci durumu değişti",
  STUDENT_PASSWORD_SET: "Öğrenciye giriş şifresi verildi",
  STUDENT_PHOTO_UPDATED: "Öğrenci fotoğrafı yüklendi",
  STUDENT_PHOTO_REMOVED: "Öğrenci fotoğrafı kaldırıldı",
  STUDENT_DELETED: "Kullanılmamış öğrenci kaydı silindi",
  GROUP_DELETED: "Kullanılmamış grup silindi",
  PRODUCT_DELETED: "Kullanılmamış ürün silindi",
  STAFF_DELETED: "Kullanılmamış personel hesabı silindi",
  GROUP_CREATED: "Grup eklendi",
  GROUP_UPDATED: "Grup güncellendi",
  PERIOD_CREATED: "Dönem açıldı",
  PERIOD_CANCELLED: "Dönem iptal edildi",
  PERIOD_PRICE_CORRECTED: "Dönem ücreti düzeltildi",
  ATTENDANCE_MARKED: "Yoklama işaretlendi",
  TRANSACTION_ADDED: "Elle finans kaydı eklendi",
  TRANSACTION_REVERSED: "Finans kaydı ters çevrildi",
  PAYMENT_ADDED: "Ödeme alındı",
  PAYMENT_REVERSED: "Ödeme iptal edildi",
  PRODUCT_CREATED: "Ürün eklendi",
  PRODUCT_UPDATED: "Ürün güncellendi",
  MATERIAL_SOLD: "Malzeme satıldı",
  MATERIAL_RETURNED: "Malzeme iade alındı",
  SETTINGS_UPDATED: "Ayarlar değişti",
  STAFF_CREATED: "Personel eklendi",
  STAFF_UPDATED: "Personel güncellendi",
  STAFF_PASSWORD_RESET: "Personel şifresi değiştirildi",
  PASSWORD_CHANGED: "Kullanıcı kendi şifresini değiştirdi",
  WORKSHOP_SETUP: "İlk kurulum yapıldı",
};

export const AUDIT_CATEGORIES = {
  students: {
    label: "Öğrenci",
    actions: ["STUDENT_REGISTERED", "STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_APPROVED", "STUDENT_STATUS_CHANGED", "STUDENT_PASSWORD_SET", "STUDENT_PHOTO_UPDATED", "STUDENT_PHOTO_REMOVED", "STUDENT_DELETED"],
  },
  lessons: {
    label: "Dönem ve yoklama",
    actions: ["PERIOD_CREATED", "PERIOD_CANCELLED", "PERIOD_PRICE_CORRECTED", "ATTENDANCE_MARKED"],
  },
  finance: {
    label: "Ödeme ve finans",
    actions: ["PAYMENT_ADDED", "PAYMENT_REVERSED", "TRANSACTION_ADDED", "TRANSACTION_REVERSED", "PERIOD_CANCELLED", "PERIOD_PRICE_CORRECTED"],
  },
  materials: {
    label: "Malzeme",
    actions: ["MATERIAL_SOLD", "MATERIAL_RETURNED", "PRODUCT_CREATED", "PRODUCT_UPDATED", "PRODUCT_DELETED"],
  },
  admin: {
    label: "Yönetim",
    actions: ["GROUP_CREATED", "GROUP_UPDATED", "GROUP_DELETED", "STAFF_DELETED", "SETTINGS_UPDATED", "STAFF_CREATED", "STAFF_UPDATED", "STAFF_PASSWORD_RESET", "PASSWORD_CHANGED", "WORKSHOP_SETUP"],
  },
} as const satisfies Record<string, { label: string; actions: readonly AuditAction[] }>;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

export function isAuditCategory(value: unknown): value is AuditCategory {
  return typeof value === "string" && value in AUDIT_CATEGORIES;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "onay bekliyor",
  ACTIVE: "aktif",
  PAUSED: "dondurulmuş",
  LEFT: "ayrıldı",
  ARCHIVED: "arşivlendi",
  PRESENT: "geldi",
  ABSENT: "gelmedi",
  UNMARKED: "işaretsiz",
  COMPLETED: "tamamlandı",
  CANCELLED: "iptal edildi",
};

const METHOD_LABELS: Record<string, string> = { CASH: "nakit", TRANSFER: "havale / EFT", CARD: "kart", OTHER: "diğer" };

type Meta = Record<string, unknown>;

function asRecord(value: unknown): Meta | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Meta) : null;
}

function money(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? formatKurus(value) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function label(map: Record<string, string>, value: unknown): string | null {
  return typeof value === "string" ? (map[value] ?? value) : null;
}

function joinParts(parts: (string | null | false | undefined)[]): string | null {
  const present = parts.filter((part): part is string => Boolean(part));
  return present.length > 0 ? present.join(" · ") : null;
}

// Log'daki ham metadata'yı tek satırlık okunur özete çevirir. Metadata
// serbest JSON olduğu için her alan tipine bakılarak okunur; tanınmayan
// ya da eksik alan özetten sessizce düşer, sayfa bozulmaz.
export function describeAudit(action: string, metadata: unknown): string | null {
  const meta = asRecord(metadata);
  if (!meta) {
    return null;
  }

  switch (action) {
    case "STUDENT_STATUS_CHANGED": {
      const from = label(STATUS_LABELS, meta.from);
      const to = label(STATUS_LABELS, meta.to);
      return from && to ? `${from} → ${to}` : null;
    }
    case "ATTENDANCE_MARKED": {
      const from = label(STATUS_LABELS, meta.from);
      const to = label(STATUS_LABELS, meta.to);
      const before = label(STATUS_LABELS, meta.periodStatusBefore);
      const after = label(STATUS_LABELS, meta.periodStatusAfter);
      return joinParts([from && to ? `${from} → ${to}` : null, before && after && before !== after ? `dönem: ${before} → ${after}` : null]);
    }
    case "PERIOD_CREATED":
      return joinParts([money(meta.price) && `ücret ${money(meta.price)}`]);
    case "PERIOD_CANCELLED": {
      const remaining = typeof meta.remainingLessons === "number" ? `işlenmemiş ${meta.remainingLessons} ders` : null;
      return joinParts([money(meta.refund) && `borçtan düşülen ${money(meta.refund)}`, remaining]);
    }
    case "PERIOD_PRICE_CORRECTED": {
      const from = money(meta.from);
      const to = money(meta.to);
      return from && to ? `${from} → ${to}` : null;
    }
    case "PAYMENT_ADDED":
      return joinParts([money(meta.amount), label(METHOD_LABELS, meta.method)]);
    case "TRANSACTION_ADDED": {
      const amount = typeof meta.amount === "number" ? `${meta.amount > 0 ? "+" : "−"}${formatKurus(Math.abs(meta.amount))}` : null;
      return joinParts([amount]);
    }
    case "PAYMENT_REVERSED":
    case "TRANSACTION_REVERSED":
    case "MATERIAL_RETURNED":
      return joinParts([text(meta.reason) && `neden: ${text(meta.reason)}`]);
    case "MATERIAL_SOLD": {
      const quantity = typeof meta.quantity === "number" ? meta.quantity : null;
      const unit = money(meta.unitPrice);
      return quantity !== null && unit ? `${quantity} adet × ${unit}` : null;
    }
    case "PRODUCT_CREATED":
      return joinParts([text(meta.name), money(meta.defaultPrice)]);
    case "STAFF_CREATED":
    case "STAFF_DELETED":
      return joinParts([text(meta.fullName), text(meta.email)]);
    case "STUDENT_DELETED":
    case "GROUP_DELETED":
    case "PRODUCT_DELETED":
      // Kayıt artık yok; neyin silindiği yalnızca burada yazar.
      return joinParts([text(meta.name)]);
    case "GROUP_UPDATED":
    case "PRODUCT_UPDATED":
    case "STAFF_UPDATED":
      if (typeof meta.isActive === "boolean") {
        return meta.isActive ? "yeniden aktif edildi" : "pasife alındı";
      }
      return null;
    case "SETTINGS_UPDATED": {
      const before = asRecord(meta.before);
      const after = asRecord(meta.after);
      if (!after) {
        return null;
      }
      const change = (key: string, name: string) => {
        const next = money(after[key]);
        const previous = before ? money(before[key]) : null;
        return next && previous !== next ? `${name}: ${previous ?? "—"} → ${next}` : null;
      };
      return joinParts([change("defaultPeriodPrice", "dönem ücreti"), change("debtAlertThreshold", "borç eşiği")]);
    }
    default:
      return null;
  }
}
