# NSWorkshop — Teknik Plan

## 1. Stack

| Katman | Seçim | Neden |
|---|---|---|
| Framework | Next.js 15 (App Router) | Tek uygulama, server + client aynı yerde |
| Dil | TypeScript (strict) | Finans mantığında tip güvenliği kritik |
| DB | PostgreSQL | Decimal desteği, transaction garantisi |
| ORM | Prisma | Şema-first, migration yönetimi kolay |
| Auth | Auth.js (NextAuth v5) | Credentials provider yeterli |
| UI | Tailwind + shadcn/ui | Hızlı, mobil uyumlu |
| Form | react-hook-form + Zod | Zod şemaları backend'de de kullanılacak |
| Hosting | Vercel + Neon/Supabase (Postgres) | Basit deploy, MVP'ye uygun |

Microservice yok, tek repo, tek deploy. 70-80 öğrenci için fazlasıyla yeterli.

---

## 2. Klasör Yapısı

```text
src/
  app/
    (auth)/login/
    (owner)/            → OWNER-only sayfalar (dashboard, raporlar, personel)
    (staff)/            → OWNER + STAFF ortak sayfalar
    (student)/          → STUDENT paneli
    api/                → sadece gerektiğinde (çoğu iş Server Action ile)
  lib/
    auth/               → Auth.js config, session helpers
    permissions/        → yetki tanımları ve guard fonksiyonları
    db/                 → prisma client singleton
  modules/
    students/
    periods/
    attendance/
    finance/            → ledger, borç hesaplama
    payments/           → ödeme + allocation
    materials/
    audit/
  components/
```

Her `modules/*` klasöründe aynı üçlü:

```text
service.ts     → iş mantığı (Prisma'ya burada dokunulur)
schema.ts      → Zod validasyonları
actions.ts     → Server Action'lar (auth guard + service çağrısı)
```

**Kural:** UI katmanı asla Prisma'ya doğrudan dokunmaz, hep service üzerinden geçer.

---

## 3. Authentication

- Auth.js Credentials provider, `bcrypt` ile hash
- Session strategy: JWT (DB session'a gerek yok bu ölçekte)
- JWT içine `userId`, `role`, `studentProfileId` (varsa) konur
- Öğrenci self sign-up → `User` + `StudentProfile(status: PENDING)` oluşturur, login olabilir ama sadece "onay bekleniyor" ekranını görür

---

## 4. Authorization (en kritik kısım)

Brief'teki en önemli teknik gereksinim: **STAFF genel finans verisine API seviyesinde erişememeli.** Bunu üç katmanda uyguluyoruz:

### Katman 1 — Middleware (kaba filtre)
`middleware.ts` route grubuna göre rol kontrolü yapar. `(owner)/*` altındaki her şey OWNER ister. Bu sadece ilk savunma hattı, tek başına yeterli değil.

### Katman 2 — Permission tanımları
Merkezi bir yerde, tek kaynak:

```ts
// lib/permissions/definitions.ts
export const PERMISSIONS = {
  'student.create':        ['OWNER', 'STAFF'],
  'student.approve':       ['OWNER', 'STAFF'],
  'student.changeStatus':  ['OWNER', 'STAFF'],
  'period.create':         ['OWNER', 'STAFF'],
  'period.setPrice':       ['OWNER', 'STAFF'],
  'attendance.mark':       ['OWNER', 'STAFF'],
  'payment.create':        ['OWNER', 'STAFF'],
  'material.sell':         ['OWNER', 'STAFF'],
  'finance.viewStudent':   ['OWNER', 'STAFF'],   // tek öğrenci bazında
  'finance.viewGlobal':    ['OWNER'],            // toplam gelir/alacak
  'reports.view':          ['OWNER'],
  'staff.manage':          ['OWNER'],
  'finance.adjust':        ['OWNER'],            // ADJUSTMENT / MANUAL_CHARGE
} as const
```

### Katman 3 — Service içi guard (asıl koruma)
Her service fonksiyonu kendi yetkisini kendisi kontrol eder:

```ts
export async function getGlobalFinanceSummary() {
  await requirePermission('finance.viewGlobal')  // yetkisizse throw
  // ...
}
```

Böylece bir Server Action yanlışlıkla açık bırakılsa bile service seviyesinde durur.

**Ek kural:** Global finans sorgularını hesaplayan fonksiyonlar ayrı bir dosyada (`finance/global.service.ts`) tutulur ve STAFF'ın eriştiği sayfalardan import edilmez. Bu, kazara sızıntıyı yapısal olarak zorlaştırır.

---

## 5. Finans Mimarisi

### Borç hesaplama
Borç asla kolonda tutulmaz, her zaman ledger'dan hesaplanır:

```ts
borç = SUM(FinancialTransaction.amount WHERE studentId = X)
```

Kategori bazlı:
```ts
kursBorcu     = SUM(... WHERE category = 'COURSE')
malzemeBorcu  = SUM(... WHERE category = 'MATERIAL')
```

İşaret kuralı: borç **artıranlar pozitif** (PERIOD_FEE, MATERIAL_SALE, MANUAL_CHARGE), **azaltanlar negatif** (PAYMENT, DISCOUNT, REFUND).

### Transaction bütünlüğü
Birden fazla kayıt oluşturan her işlem tek bir DB transaction'ında:

```ts
await prisma.$transaction(async (tx) => {
  const payment = await tx.payment.create(...)
  await tx.paymentAllocation.createMany(...)
  await tx.financialTransaction.createMany(...)  // her allocation için bir kayıt
  await tx.auditLog.create(...)
})
```

Aynı şey dönem oluşturma (StudentPeriod + 4x PeriodLesson + PERIOD_FEE transaction) ve malzeme satışı için de geçerli.

### Ödeme dağıtım algoritması
```text
girdi: tutar, mod (AUTO | COURSE | MATERIAL | MANUAL)

1. mevcut borçları hesapla (kurs, malzeme)
2. toplam ödeme > toplam borç ise → HATA (borçtan fazla ödeme alınmaz)
3. mod'a göre allocation listesi üret:
   AUTO     → önce kurs borcu, artan varsa malzeme
   COURSE   → hepsi kursa (kurs borcunu aşamaz)
   MATERIAL → hepsi malzemeye (malzeme borcunu aşamaz)
   MANUAL   → kullanıcının girdiği dağılım, toplamı tutar'a eşit olmalı
4. her allocation için bir FinancialTransaction(type: PAYMENT, amount: negatif)
```

### Para tipi
Prisma `Decimal`, JS tarafında **hiçbir zaman `number`'a çevrilmez** — `decimal.js` ile işlenir. Float yuvarlama hatası finansal veride kabul edilemez.

---

## 6. Dönem Otomasyonu

`autoRenew` mantığı:

- 4. dersin yoklaması işlendiğinde → dönem `COMPLETED` olur
- `autoRenew = true` ise → yeni `StudentPeriod` otomatik açılır (fiyat: `customPrice ?? Settings.defaultPeriodPrice`), `createdVia = "AUTO_RENEW"`
- `autoRenew = false` ise → dashboard'da "karar bekleyen" listesine düşer

Dashboard listeleri (hepsi query, ayrı tablo yok):

```ts
donemiYakindaBitecekler  // aktif dönem, 3+ ders işlenmiş
donemiBittiHalaAktif     // status ACTIVE, son dönem COMPLETED
aktifAmaDonemiYok        // status ACTIVE, hiç aktif dönem yok
```

**Cron gerekmiyor.** Tetikleyici yoklama girişi olduğu için tamamen event-driven çalışır — bu MVP için büyük sadeleşme.

---

## 7. Audit Log

Merkezi helper, her kritik service içinde çağrılır:

```ts
await logAudit(tx, {
  actorId, action: 'PAYMENT_ADDED',
  targetStudentId, metadata: { amount, allocations }
})
```

Log yazımı ana işlemle aynı transaction'da olur — işlem başarısızsa log da yazılmaz.

---

## 8. Veri Doğrulama

Zod şemaları tek yerde tanımlanır, hem client form validasyonunda hem Server Action girişinde kullanılır. Kritik iş kuralları (borçtan fazla ödeme, allocation toplamı eşitliği, fiyat > 0) **her zaman server tarafında** tekrar kontrol edilir.

---

## 9. Deployment

```text
Vercel (Next.js)  +  Neon/Supabase (Postgres)
```

- `main` branch → production, otomatik deploy
- Migration: `prisma migrate deploy` build adımında
- Env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`
- Yedekleme: Neon/Supabase otomatik günlük backup (finans verisi için şart)
- Hata takibi: Sentry (opsiyonel ama önerilir)

---

## 10. Geliştirme Sırası

Brief'teki sıra doğru, sadece birkaç yere not düşüyorum:

| # | Adım | Not |
|---|---|---|
| 1 | Database schema | Migration + seed (owner hesabı, örnek gruplar, ürünler) |
| 2 | Authentication | Auth.js, login, session |
| 3 | Roles & permissions | **Buradan sonrası bu katmanın üstüne kurulur, atlanmamalı** |
| 4 | Student management | CRUD, onay akışı, durum değiştirme |
| 5 | Lesson groups | Basit CRUD |
| 6 | 4-week periods | Fiyat donması + autoRenew mantığı |
| 7 | Attendance | Dönem tamamlanma tetikleyicisi burada |
| 8 | Financial ledger | Borç hesaplama servisleri |
| 9 | Payments + allocations | En çok test isteyen kısım |
| 10 | Materials | Katalog + satış |
| 11 | Student panel | Salt okunur, basit |
| 12 | Staff panel | Global finans importu olmadığından emin ol |
| 13 | Owner dashboard | Raporlar, toplamlar |
| 14 | Audit logs | Aslında 6-10 arasında paralel yazılmalı, sonda sadece görüntüleme ekranı kalır |
| 15 | Deployment | Erken yap — 4. adımdan sonra staging'e çık |

---

## 11. Test Stratejisi

Her şeyi test etmeye gerek yok, ama şu üçü mutlaka (Vitest ile unit test):

1. **Borç hesaplama** — farklı transaction kombinasyonları
2. **Ödeme dağıtım algoritması** — kısmi ödeme, manuel dağılım, borç aşımı hatası
3. **Permission guard'ları** — STAFF'ın `finance.viewGlobal` çağrısının throw ettiği

---

## 12. İleride (MVP sonrası)

- `workshopId` ekleyerek multi-tenant'a geçiş — Settings tablosu zaten hazır, migration + query filtresi yeterli
- Telafi dersi sistemi — `PeriodLesson`'a `makeupForLessonId` alanı
- Online ödeme / dekont yükleme
- Native mobil — mevcut API'ler üzerine
