# NSWorkshop

Küçük bir resim atölyesi için öğrenci, ders, ödeme ve malzeme takip sistemi.
~70-80 öğrenci, tek atölye. Roller: OWNER, STAFF, STUDENT.

Git akışı için @docs/git-workflow.md

## Stack

Next.js 15 (App Router) · TypeScript strict · PostgreSQL · Prisma · Auth.js v5 · Tailwind + shadcn/ui · Zod · Vitest

## Komutlar

```bash
npm run dev              # geliştirme sunucusu
npm run build            # production build
npm run lint             # eslint
npm run test             # vitest
npx prisma migrate dev   # şema değişikliğini uygula
npx prisma studio        # veritabanını görsel incele
npx prisma generate      # client'ı yeniden üret
```

## Klasör yapısı

```
src/
  app/(auth)|(owner)|(staff)|(student)/   # route grupları
  lib/auth|permissions|db/
  modules/<alan>/{service,schema,actions}.ts
  components/
```

Her `modules/<alan>/` klasöründe üç dosya: `service.ts` (iş mantığı + Prisma),
`schema.ts` (Zod), `actions.ts` (Server Action: guard + service çağrısı).

## Değişmez kurallar

Bunlar projenin temelidir, istisnası yoktur:

1. **UI katmanı Prisma'ya doğrudan dokunmaz.** Server Component veya Client
   Component içinde `prisma.*` çağrısı yasak. Her şey service üzerinden geçer.

2. **Borç hiçbir zaman kolonda tutulmaz.** Öğrencinin borcu her zaman
   `FinancialTransaction` toplamından hesaplanır. `StudentProfile` üzerine
   `balance`, `debt` gibi bir alan eklenmez.

3. **Finans defteri append-only.** `FinancialTransaction` üzerinde UPDATE ve
   DELETE yapılmaz. Hatalı kayıt silinmez; ters işaretli yeni bir kayıt yazılır
   ve `reversedTransactionId` ile orijinaline bağlanır.

4. **Para her yerde kuruş (Int).** `4000 TL` = `400000`. Float veya Decimal
   kullanılmaz. Gösterim sırasında formatlanır, saklanırken hep integer.
   Yüzde hesaplarında aşağı yuvarlanır (`Math.floor`).

5. **Yetki kontrolü service içinde yapılır.** Her service fonksiyonu kendi
   `requirePermission()` çağrısını kendisi yapar. Middleware ve layout guard'ları
   sadece ek katmandır, tek başlarına güvenlik sayılmaz.

6. **Rol JWT'den değil DB'den okunur.** `requirePermission()` kullanıcıyı
   DB'den çekip `isActive` ve güncel `role` alanını doğrular. JWT sadece
   "bu kim" bilgisini taşır.

7. **Çok kayıtlı işlemler tek transaction içinde.** Ödeme, dönem oluşturma,
   malzeme satışı — hepsi `prisma.$transaction()` içinde, audit log dahil.

8. **Finans yazımlarında satır kilidi.** Aynı öğrenci üzerinde eşzamanlı
   yazımı önlemek için transaction başında `SELECT ... FOR UPDATE`.

9. **Geçmiş fiyatlar değişmez.** `StudentPeriod.price` ve
   `MaterialSale.unitPrice` snapshot'tır. Düzeltme gerekirse fark kadar
   `ADJUSTMENT` transaction'ı yazılır, alan sessizce güncellenmez.

10. **Dönem yenileme her zaman manuel.** Otomatik dönem açma yoktur, çünkü
    otomatik dönem = onaysız borç üretmek demektir.

## Yetki matrisi

`lib/permissions/definitions.ts` tek kaynaktır. Özet:

| Yetki | OWNER | STAFF |
|---|:---:|:---:|
| Öğrenci CRUD, onay, durum değiştirme | ✅ | ✅ |
| Dönem oluşturma, fiyat belirleme | ✅ | ✅ |
| Yoklama, ödeme, malzeme satışı | ✅ | ✅ |
| Tek öğrencinin finans geçmişi | ✅ | ✅ |
| **Toplam gelir / toplam alacak / raporlar** | ✅ | ❌ |
| **Borçlular listesi (toplu)** | ✅ | ❌ |
| Personel yönetimi, ADJUSTMENT girme | ✅ | ❌ |

STAFF'ın genel finansa erişememesi bu projenin en kritik güvenlik
gereksinimidir. Global finans fonksiyonları `modules/finance/global.service.ts`
içinde tutulur ve STAFF'ın eriştiği hiçbir sayfadan import edilmez.

## Dashboard listeleri

OWNER ve STAFF'ta ortak:
- dönemi yakında bitecekler (aktif dönem, 3+ ders işlenmiş)
- dönemi bitmiş ama hâlâ aktif olanlar
- aktif olup aktif dönemi bulunmayanlar

Sadece OWNER'da:
- **borçlular listesi** — eşik tutarın üstünde borcu olan aktif öğrenciler,
  borca göre azalan sıralı. Her satırda borç tutarı ve son ödeme tarihi
  görünür ("iki aydır ödeme yok" bilgisi tek başına borç rakamından daha
  çok şey anlatır). Eşik `Settings` üzerinden değiştirilebilir.

## Finans modeli

```
FinancialTransaction = tek gerçek kaynağı

Borcu ARTIRANLAR (+):  PERIOD_FEE, MATERIAL_SALE, MANUAL_CHARGE, PAYMENT_REVERSAL
Borcu AZALTANLAR (-):  PAYMENT, DISCOUNT, MATERIAL_RETURN
Her iki yönde (±):     ADJUSTMENT

kategori: COURSE | MATERIAL | OTHER
```

Bir ödeme birden fazla transaction üretir (kurs/malzeme dağılımı).
Ayrı bir allocation tablosu **yoktur**, dağılım ledger'ın içindedir.

Değişmez: `SUM(bir ödemenin transaction'ları) === -payment.amount`

Ödeme borçtan fazla olamaz — validasyon ve yazım aynı transaction içinde.

## Dönem kuralları

- 1 dönem = 4 ardışık haftalık ders. Takvim ayı kullanılmaz.
- 4 dersin hiçbiri `UNMARKED` değilse dönem `COMPLETED` olur.
- Bir yoklama tekrar `UNMARKED` yapılırsa: sonraki dönem yoksa dönem `ACTIVE`'e
  döner; sonraki dönem varsa engellenir (sadece OWNER düzeltebilir).
- Dönem bitmesi öğrenciyi otomatik pasif yapmaz. Öğrenci durumu ve dönem
  durumu birbirinden bağımsızdır.
- Telafi dersi yoktur. Gelmeyen öğrencinin ders hakkı yanar.
- **Borç yeni dönem açmayı engellemez.** Borcu olan öğrenciye yeni dönem
  açılabilir, ücreti borcuna eklenir ve borç birikir. Ancak onay ekranında
  birikmiş borç uyarı olarak gösterilir — engelleme değil, görünürlük.
- Ödeme dönem bazında takip edilmez. Ödeme sadece kurs/malzeme kategorisine
  yazılır; "hangi dönemin ücreti kapandı" diye bir kayıt tutulmaz.

## Kod tarzı

- TypeScript strict, `any` kullanılmaz.
- Server Action'lar Zod ile doğrulanır; client tarafı validasyon güvenlik
  sayılmaz, server'da her zaman tekrar kontrol edilir.
- Değişken ve fonksiyon isimleri İngilizce, kullanıcıya görünen metinler
  Türkçe.
- Yorum satırları sadece "neden" için yazılır, "ne yaptığını" anlatmak için
  değil.

## Test

Her şey test edilmez, ama şunlar zorunlu (Vitest):

1. Borç hesaplama — farklı transaction kombinasyonları
2. Ödeme dağıtım algoritması — kısmi ödeme, manuel dağılım, borç aşımı hatası
3. Reversal — ters kayıt sonrası bakiyenin doğru dönmesi
4. Permission guard'ları — STAFF'ın `finance.viewGlobal` çağrısının throw etmesi

## Geliştirme sırası

```
1. Schema    2. Auth    3. Permissions    4. Öğrenci yönetimi
5. Gruplar   6. Dönemler    7. Yoklama    8. Finans defteri
9. Ödemeler  10. Malzeme    11-13. Paneller    14. Audit    15. Deploy
```

3. adım (permissions) atlanmaz — sonraki her şey onun üstüne kurulur.
Audit log 6-10 arası adımlarla paralel yazılır, sona bırakılmaz.
