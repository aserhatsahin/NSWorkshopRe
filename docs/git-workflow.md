# Git Akışı

## Branch yapısı

Tek kişilik proje olduğu için karmaşık bir model gerekmiyor:

```
main          → her zaman çalışır durumda, deploy edilen kod
feat/xxx      → yeni özellik
fix/xxx       → hata düzeltme
chore/xxx     → bağımlılık, config, temizlik
```

`main`'e doğrudan commit atılmaz. Her iş kendi branch'inde açılır, PR ile
birleşir. Tek kişi olsan bile PR açmanın değeri var: değişikliği birleştirmeden
önce topluca görüyorsun ve geçmişte "bu özellik ne zaman, hangi dosyalarla
geldi" sorusunun cevabı oluyor.

Branch ismi geliştirme sırasındaki adımla eşleşsin:

```
feat/01-prisma-schema
feat/02-auth
feat/03-permissions
feat/04-student-management
```

## Commit mesajları

Conventional Commits kullanılıyor:

```
<tip>(<kapsam>): <özet>

[opsiyonel gövde]
```

Tipler: `feat` `fix` `refactor` `chore` `docs` `test` `style`

Örnekler:

```
feat(finance): ledger'dan borç hesaplama servisi
fix(payments): borçtan fazla ödeme validasyonu transaction içine alındı
refactor(periods): dönem tamamlanma kontrolü service'e taşındı
chore(prisma): PaymentAllocation modeli kaldırıldı
test(finance): reversal sonrası bakiye testi
```

Özet satırı Türkçe, emir kipinde değil bildirme kipinde, 72 karakteri geçmesin.
Ne yapıldığı yazılır, nasıl yapıldığı değil.

## Commit sıklığı

**Bir commit = bir mantıksal değişiklik.** Gün sonunda "bugün yaptıklarım"
diye tek commit atılmaz.

İyi bölünmüş:
```
feat(students): öğrenci oluşturma servisi
feat(students): öğrenci onaylama akışı
test(students): öğrenci durumu geçiş testleri
```

Kötü:
```
öğrenci işleri
düzeltmeler
son hali
```

Commit atmadan önce çalıştır:

```bash
npm run lint && npm run test && npm run build
```

Build kırıkken commit atma. `main`'in her zaman çalışır durumda olması,
bir şey bozulduğunda "en son ne zaman çalışıyordu" sorusunu cevaplanabilir
kılıyor.

## Tipik döngü

```bash
git checkout main
git pull
git checkout -b feat/08-financial-ledger

# ... çalış, ara ara commit at ...
git add src/modules/finance
git commit -m "feat(finance): transaction tipleri ve işaret kuralları"

git push -u origin feat/08-financial-ledger
gh pr create --fill        # veya GitHub arayüzünden
gh pr merge --squash       # birleştir
```

Squash merge kullan: branch içindeki ara commit'ler (`wip`, `typo fix`)
`main`'in geçmişini kirletmesin, her PR tek bir temiz commit olarak insin.

## Claude Code ile commit

Claude Code commit atabilir ama şu iki kural önemli:

1. **Commit mesajını sen onayla.** Otomatik üretilen mesajlar bazen
   "değişiklikleri uygula" gibi anlamsız çıkıyor. Yukarıdaki formata uymuyorsa
   düzelt.

2. **`git push` ve `merge` kararı sende kalsın.** Claude'a commit attırmak
   makul, ama `main`'e ne zaman ineceğine sen karar ver.

Claude'a iş verirken hangi branch'te olduğunu söyle:
"`feat/09-payments` branch'indeyiz, ödeme servisini yaz" gibi.

## .gitignore

Başlangıçta bunlar mutlaka olsun:

```gitignore
node_modules/
.next/
.env
.env.local
.env*.local
CLAUDE.local.md
*.log
.DS_Store
```

`.env` **asla** commit edilmez. Bunun yerine `.env.example` tutulur:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/nsworkshop"
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"
```

Yanlışlıkla `.env` commit ettiysen, dosyayı silmek yetmez — geçmişte duruyor.
O secret'ı iptal edip yenisini üret.

## Migration dosyaları

`prisma/migrations/` klasörü **commit edilir**. Migration geçmişi kod
geçmişinin parçası.

Migration'lar üretildikten sonra elle düzenlenmez. Şema yanlışsa yeni bir
migration üretilir. Bu, `FinancialTransaction`'ın append-only olmasıyla aynı
mantık: geçmiş düzeltilmez, üstüne yazılır.

## Etiketleme

Deploy edilen her sürüme tag at:

```bash
git tag -a v0.1.0 -m "MVP: öğrenci yönetimi + dönemler"
git push --tags
```

Bir şey bozulduğunda "v0.1.0'da çalışıyordu" diyebilmek, 40 commit geriye
tek tek bakmaktan çok daha hızlı.
