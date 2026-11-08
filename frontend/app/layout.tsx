import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font; no request to Google Fonts at runtime.
// Sans is the interface; Serif is the voice (narration, hint, takeaway).
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-noto-serif-jp",
});

export const metadata: Metadata = {
  title: "SanpoLab",
  description: "散歩の写真から、今日の主役の裏面を語る",
  applicationName: "SanpoLab",
  // Home-screen install on iOS (which ignores the manifest's display/icons)
  appleWebApp: { capable: true, title: "SanpoLab", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${notoSerifJP.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
