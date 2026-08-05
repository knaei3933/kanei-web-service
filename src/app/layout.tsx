import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "ホームページ制作 月額10,000円 | 金井貿易株式会社",
  description:
    "ドメイン代だけのプロのホームページ。Next.js・Vercel・Supabaseで構築。ソースコードもデータもすべてお客様のもの。初期費用0円、月額10,000円〜。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
