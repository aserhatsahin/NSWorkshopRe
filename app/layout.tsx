import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/toaster";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  // latin-ext: ş, ğ, ı, İ bu alt kümede; yoksa Türkçe harfler yedek fonta düşer.
  subsets: ["latin", "latin-ext"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// Sayfa boyanmadan önce çalışır; aksi halde gece temasını seçmiş kullanıcı
// her yüklemede bir an gündüz temasını görür. Seçim yoksa cihaz ayarı izlenir.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="gece"&&t!=="gunduz"){t=matchMedia("(prefers-color-scheme: dark)").matches?"gece":"gunduz"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: "NSWorkshop", template: "%s · NSWorkshop" },
  description: "Resim atölyesi öğrenci, ders ve ödeme takibi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      // data-theme'i boyamadan önce THEME_SCRIPT yazar; sunucu çıktısıyla
      // farklı olması beklenen bir durumdur.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
