import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SanpoLab",
  description: "散歩の写真から、今日の主役の裏面を語る",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
