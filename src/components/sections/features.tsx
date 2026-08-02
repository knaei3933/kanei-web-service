"use client";

import { motion } from "framer-motion";
import { GalleryHorizontalEnd, Pencil, BarChart3, Smartphone, ShieldCheck, Lock } from "lucide-react";
import { Section } from "../ui/section";

const features = [
  {
    icon: GalleryHorizontalEnd,
    title: "業種別テンプレート",
    description: "製造業・建設業・飲食業・サービス業など、業種に最適化されたデザインをご用意。プロのデザイナーが監修したクオリティです。",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Pencil,
    title: "自由にカスタマイズ",
    description: "テキスト・画像・レイアウト、すべて変更可能。Next.jsで構築しているため、SaaSのような制限がありません。",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: BarChart3,
    title: "Google Analytics連携",
    description: "アクセス解析も標準装備。お客様のGoogleアカウントに連携するだけ。日々の訪問者数を自分で確認できます。",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Smartphone,
    title: "スマホ完全対応",
    description: "レスポンシブデザインでスマートフォンからも美しく表示。検索順位にも有利です。",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: ShieldCheck,
    title: "SSL・バックアップ付き",
    description: "Vercelによる自動HTTPS + Supabase自動バックアップ。セキュリティと安全性はお任せください。",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    icon: Lock,
    title: "データはすべてお客様のもの",
    description: "お問い合わせデータも、アクセスログも、すべてお客様の所有。解約時には完全にデータをお引き渡しします。",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Features({ className }: { className?: string }) {
  return (
    <Section className={className}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            すべて込みの月額サービス
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            制作からサーバー、更新、保守まで。追加費用なしでプロフェッショナルなホームページをお届けします。
          </p>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg"
            >
              <div
                className={`mb-4 inline-flex rounded-xl p-3 ${feature.bg}`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
