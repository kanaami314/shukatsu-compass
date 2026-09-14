import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "就活コンパス",
  description: "企業・選考・説明会・予定の一括管理",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

