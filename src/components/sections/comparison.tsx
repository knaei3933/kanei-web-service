"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

const comparisons = [
  { label: "初期費用", ours: "0円", wix: "~¥30,000+", wp: "~¥300,000+" },
  { label: "月額費用", ours: "¥10,000~", wix: "¥2,000~¥20,000", wp: "サーバー代+保守費" },
  { label: "ソースコード所有", ours: "○ すべてあなたのもの", wix: "× プラットフォーム依存", wp: "△ 制作会社による" },
  { label: "デザイン自由度", ours: "◎ Next.jsで完全カスタム", wix: "△ テンプレート制限", wp: "△ テーマ依存" },
  { label: "解約後の移行", ours: "○ ZIPで全データ返却", wix: "× データ持ち出し不可", wp: "△ 有料移行が必要" },
  { label: "更新の手間", ours: "弊社が対応（月額込み）", wix: "自分で操作", wp: "制作会社へ有料依頼" },
];

export default function Comparison({ className }: { className?: string }) {
  return (
    <Section className={`bg-muted/30 ${className ?? ""}`}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            なぜ当サービスを選ぶべきか
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            他のサービスとの比較
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-4 text-left text-sm font-medium text-muted-foreground">
                  比較項目
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                    当サービス
                  </span>
                </th>
                <th className="px-4 py-4 text-center text-sm text-muted-foreground">
                  Wix / STUDIO
                </th>
                <th className="px-4 py-4 text-center text-sm text-muted-foreground">
                  WordPress外注
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, index) => (
                <tr
                  key={row.label}
                  className={index % 2 === 0 ? "bg-card/50" : "bg-card"}
                >
                  <td className="px-4 py-4 text-sm font-medium">{row.label}</td>
                  <td className="px-4 py-4 text-center text-sm font-semibold text-primary">
                    {row.ours}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                    {row.wix}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                    {row.wp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </Section>
  );
}

// Also export CTA at the bottom
export function CTA() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          まずは無料相談から
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          ご要望をお聞かせいただくだけ。最適なプランをご提案いたします。
          <br />
          お電話・メール・オンライン会話、すべて対応可能です。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg">
            お問い合わせ
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg">
            0120-XXX-XXX（平日 9:00~18:00）
          </Button>
        </div>
      </div>
    </Section>
  );
}
