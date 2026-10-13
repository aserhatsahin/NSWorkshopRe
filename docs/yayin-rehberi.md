# Yayın Rehberi

Uygulamayı Vercel (uygulama) + Neon (veritabanı) üzerinde yayına almak için
adım adım rehber. Sırayla ilerle; her adım bir öncekine dayanıyor.

Bu rehberdeki adresler ve anahtarlar gizlidir. Hiçbirini sohbete, e-postaya
ya da koda yazma; yalnızca Vercel paneline gir.

## 1. Neon: veritabanı

1. Neon'da proje aç: ad `nsworkshop`, bölge **AWS Europe Central 1 (Frankfurt)**.
   Yalnızca "Postgres database" açık olsun.
2. Proje sayfasında **Connect** düğmesine bas. Açılan pencerede bir bağlantı
   adresi (`postgresql://...` ile başlar) görürsün. İki ayrı adres lazım:
   - **Connection pooling açıkken** görünen adres. İçinde `-pooler` geçer.
     Bu, `DATABASE_URL` olacak.
   - **Connection pooling kapalıyken** görünen adres. İçinde `-pooler` geçmez.
     Bu, `DIRECT_URL` olacak.
3. İkisini de geçici olarak bir not defterine kopyala; 3. adımda Vercel'e
   yapıştıracaksın.

Neden iki adres: uygulama havuzlu adresi kullanır (çok sayıda kısa bağlantıya
dayanır), veritabanı kurulumu ise doğrudan bağlantı ister.

## 2. Gizli anahtarları üret

Mac'te Terminal'i aç ve şu komutu **iki kez** çalıştır. Her çalıştırmada
farklı bir rastgele değer verir:

```bash
openssl rand -base64 32
```

- İlk çıktı `AUTH_SECRET` olacak (oturumları imzalar).
- İkinci çıktı `SETUP_TOKEN` olacak (ilk kurulum sayfasının anahtarı).

İkisini de not defterine ekle.

## 3. Vercel: projeyi aç

1. Vercel'de **Add New → Project** de, GitHub'daki `NSWorkshopRe` deposunu seç.
2. Framework olarak "Next.js" kendiliğinden seçilir. **Build Command** alanını
   aç ve şunu yaz:

   ```
   npm run vercel-build
   ```

   Bu komut canlı yayında önce veritabanı değişikliklerini uygular, sonra
   uygulamayı derler. Deneme (Preview) yayınlarında veritabanına dokunmaz.
3. **Environment Variables** bölümüne şu dört değişkeni ekle:

   | Ad | Değer |
   |---|---|
   | `DATABASE_URL` | Neon'daki havuzlu adres (`-pooler` geçen) |
   | `DIRECT_URL` | Neon'daki doğrudan adres (`-pooler` geçmeyen) |
   | `AUTH_SECRET` | 2. adımdaki ilk değer |
   | `SETUP_TOKEN` | 2. adımdaki ikinci değer |

   Her değişkenin altındaki **Environments** kutusunda yalnızca
   **Production** seçili olsun; "Preview"u kaldır. Preview, henüz
   birleştirilmemiş PR'ların deneme yayınlarıdır ve canlı veritabanına
   bağlanmamalıdır.

   "Import .env" düğmesini **kullanma**; bilgisayarındaki `.env` yerel test
   değerlerini içerir. `SEED_*` ile başlayan değişkenleri de ekleme.
4. **Deploy**'a bas. Birkaç dakika sürer. Bitince Vercel sana
   `nsworkshop-xxx.vercel.app` gibi bir adres verir.

Yayın hata verirse "Build Logs"taki son satırları bana gönder (içinde
adres ya da anahtar varsa onları silerek).

## 4. İlk kurulum: atölye sahibi hesabı

1. Tarayıcıda `https://<vercel-adresin>/setup` adresine git.
2. Formu doldur:
   - **Kurulum anahtarı:** 2. adımdaki `SETUP_TOKEN` değeri.
   - Ad soyad, giriş yapacağın e-posta, en az 8 karakterlik bir şifre.
   - Varsayılan dönem ücreti (sonradan Ayarlar'dan değişir).
3. "Kurulumu tamamla"ya bas. Giriş sayfasına yönlenirsin; az önce
   belirlediğin e-posta ve şifreyle gir.

Bu sayfa yalnızca bir kez çalışır: bir atölye sahibi hesabı oluştuktan sonra
kalıcı olarak kapanır. Kurulumdan sonra Vercel'deki `SETUP_TOKEN`
değişkenini silebilirsin.

## 5. Alan adını bağla

1. Vercel'de proje → **Settings → Domains**. Alan adını yaz (örn.
   `nsatolye.com`) ve ekle. `www.nsatolye.com` için de sorarsa kabul et.
2. Vercel sana girilmesi gereken DNS kayıtlarını gösterir (genellikle bir
   `A` kaydı ve bir `CNAME` kaydı).
3. Alan adını aldığın firmanın panelinde **DNS yönetimi** bölümünü aç ve
   Vercel'in gösterdiği kayıtları aynen gir. Aynı ada ait eski `A` ya da
   `CNAME` kaydı varsa sil.
4. Birkaç dakika ile birkaç saat arasında Vercel'deki uyarı yeşile döner.
   Güvenli bağlantı (https) kendiliğinden kurulur; ayrıca sertifika alma.

## 6. İlk gün yapılacaklar

Giriş yaptıktan sonra, sırasıyla:

1. **Ayarlar:** varsayılan dönem ücreti ve borçlular listesi eşiği.
2. **Gruplar:** gerçek ders gruplarını ekle.
3. **Malzeme:** satılan ürünleri ve fiyatlarını ekle.
4. **Personel:** personel hesaplarını aç, şifrelerini kendin ilet.
5. **Hesabım:** kurulumda yazdığın şifreyi değiştirmek istersen buradan.

## Sonraki yayınlar

GitHub'da `main`'e birleştirilen her PR kendiliğinden yayına çıkar.
Veritabanı değişikliği içeren PR'larda değişiklik yayın sırasında uygulanır.

## Yedekleme

Neon veritabanını kendisi yedekler ve geçmiş bir ana dönmeye izin verir;
süre, kullandığın plana bağlıdır. Finans kaydı tutulduğu için Neon panelinde
"Restore" / "History" süresinin ne kadar olduğuna bir kez bak.

## Bilinen eksikler

- "Şifremi unuttum" yok: unutana atölye sahibi (personel için) ya da
  personel (öğrenci için) yeni şifre verir. Atölye sahibi kendi şifresini
  unutursa veritabanına elle müdahale gerekir.
- Sistem e-posta göndermez.
- Eski programdaki veriler henüz aktarılmadı.
- Öğrenci fotoğrafı yükleme yok.
