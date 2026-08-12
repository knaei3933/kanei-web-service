"use client";

import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

const tiers = [
  {
    name: "スタンダード",
    price: "10,000",
    description: "名刺代わりの会社案内を整えたい方",
    features: [
      "最大5ページ制作",
      "レスポンシブ対応",
      "お問い合わせフォーム",
      "基本的な検索対策",
      "常時SSL設定",
      "月2回まで更新対応",
      "サーバー・保守込み",
    ],
    highlighted: false,
  },
  {
    name: "ビジネス",
    price: "20,000",
    description: "実績・採用・ブログを育てたい方",
    badge: "おすすめ",
    features: [
      "最大20ページ制作",
      "ブログ / お知らせ機能",
      "検索対策の強化",
      "アクセス解析 + Search Console",
      "SNS連携・OGP設定",
      "月4回まで更新対応",
      "サーバー・保守込み",
      "優先サポート",
    ],
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "35,000",
    description: "多言語・高度機能・継続運用を重視する方",
    features: [
      "ページ数無制限",
      "ブログ + 高度機能相談",
      "多言語対応（日・英・韓）",
      "独自ドメインメール導入",
      "月8回まで更新対応",
      "サーバー・保守込み",
      "専任担当者",
      "優先改善相談",
    ],
    highlighted: false,
  },
];

export default function Pricing({ className }: { className?: string }) {
  return (
    <Section id="pricing" className={className}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            事業規模に合わせて選べる、分かりやすい料金体系
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            初期費用は<strong>0円</strong>。ドメイン取得費（年間約1,500円）のみご負担です。
            <br />
            追加費用は明示し、月額で管理しやすい料金設計にしています。
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
                asChild
              >
                <a href="/consult">
                  このプランで相談する
                </a>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
