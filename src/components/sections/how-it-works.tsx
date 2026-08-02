"use client";

import { motion } from "framer-motion";
import { MessageSquare, FileCode2, Rocket, HeartHandshake } from "lucide-react";
import { Section } from "../ui/section";

const steps = [
  {
    icon: MessageSquare,
    title: "ヒアリング",
    description: "会社案内のテキストや写真をお送りいただくだけ。特にご用意いただかなくても、弊社がヒアリングシートで案内します。",
    color: "from-blue-500 to-blue-600",
    step: "01",
  },
  {
    icon: FileCode2,
    title: "デザイン・制作",
    description: "ヒアリング内容をもとに、Next.jsでプロフェッショナルなデザインを制作。初稿を7営業日以内にお届けします。",
    color: "from-emerald-500 to-emerald-600",
    step: "02",
  },
  {
    icon: Rocket,
    title: "公開・運営開始",
    description: "ご確認後、Vercelへデプロイ。独自ドメインの設定も弊社で対応します。公開後も継続的な更新・保守をサポート。",
    color: "from-purple-500 to-purple-600",
    step: "03",
  },
  {
    icon: HeartHandshake,
    title: "長期パートナー",
    description: "月額10,000円で更新・保守・サーバー代すべて込み。テキスト変更や画像差し替えも無料で対応。いつでもお気軽にご相談ください。",
    color: "from-orange-500 to-orange-600",
    step: "04",
  },
];

export default function HowItWorks({ className }: { className?: string }) {
  return (
    <Section className={`bg-muted/30 ${className ?? ""}`}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            かんたん4ステップ
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            お客様はテキストと写真を用意するだけ。
            <br />
            あとはすべて私たちにお任せください。
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-12 hidden h-[calc(100%-2rem)] w-0.5 bg-border lg:block" />
              )}
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
                >
                  <step.icon className="h-7 w-7" />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-bold text-muted-foreground">
                    STEP {step.step}
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
