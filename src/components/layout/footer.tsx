import { Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card px-4 py-12">
      <div className="mx-auto max-w-container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="mb-3 text-lg font-bold">
              金井貿易株式会社
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              韓国の製造設備輸入貿易を核に、ITサービスの展開も始めました。
            </p>
          </div>

          {/* Service */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">サービス</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>ホームページ制作</li>
              <li>ECサイト構築</li>
              <li>多言語サイト</li>
              <li>保守・更新サポート</li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">会社情報</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>設立: 2021年</li>
              <li>資本金: 500万円</li>
              <li>本社: 埼玉県</li>
              <li>事業: 貿易・ITサービス</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">お問い合わせ</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                info@kanei-trade.co.jp
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                048-XXX-XXXX
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} 金井貿易株式会社　無断転載を禁じます。
        </div>
      </div>
    </footer>
  );
}
