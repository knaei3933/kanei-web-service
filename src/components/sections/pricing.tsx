"use client";

import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

const tiers = [
  {
    name: "スタンダード",
    price: "10,000",
    description: "1~5ページの企業サイトに最適",
    features: [
      "最大5ページ制作",
      "レスポンシブデザイン",
      "お問い合わせフォーム",
      "Google Analytics連携",
      "SSL自動設定",
      "月2回まで更新対応",
      "サーバー代込み",
    ],
    highlighted: false,
  },
  {
    name: "ビジネス",
    price: "20,000",
    description: "ブログ・複数ページに対応",
    badge: "人気",
    features: [
      "最大20ページ制作",
      "ブログ機能",
      "SEO対策（構造化マークアップ）",
      "Google Analytics + Search Console",
      "SNS連携（OGP設定）",
      "月4回まで更新対応",
      "サーバー代込み",
      "優先サポート",
    ],
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "35,000",
    description: "EC・多言語など高度なニーズに",
    features: [
      "ページ数無制限",
      "ブログ + EC機能",
      "多言語対応（日本語/英語/韓国語）",
      "カスタムドメインメール",
      "月8回まで更新対応",
      "サーバー代込み",
      "専任担当者",
      "24時間以内の対応",
    ],
    highlighted: false,
  },
];

export default function Pricing({ className }: { className?: string }) {
  return (
    <Section className={className}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            シンプルな料金体系
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            初期費用は<strong>0円</strong>。ドメイン取得費（年間約1,500円）のみお客様負担。
            <br />
            すべて月額で、追加費用なし。
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative rounded-3xl border p-8 ${
                tier.highlighted
                  ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                  : "bg-card"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    <Crown className="h-3 w-3" />
                    {tier.badge}
                  </span>
                </div>
              )}
              <h3 className="mb-2 text-xl font-bold">{tier.name}</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                {tier.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">¥{tier.price}</span>
                <span className="text-muted-foreground"> / 月</span>
              </div>
              <ul className="mb-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        tier.highlighted ? "text-primary" : "text-emerald-500"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={tier.highlighted ? "default" : "outline"}
              >
                無料相談
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
