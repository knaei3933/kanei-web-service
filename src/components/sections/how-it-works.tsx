"use client";

import { motion } from "framer-motion";
import { MessageSquare, FileCode2, Rocket, HeartHandshake } from "lucide-react";
import { Section } from "../ui/section";

const steps = [
  {
    icon: MessageSquare,
    title: "ヒアリング",
    description: "資料やメモ書きのみでOK。不明点はこちらで整理します。",
    color: "from-blue-500 to-blue-600",
    step: "01",
  },
  {
    icon: FileCode2,
    title: "構成・デザイン提案",
    description: "業種に合わせて導線とデザインを整理し、初稿をご提示します。",
    color: "from-emerald-500 to-emerald-600",
    step: "02",
  },
  {
    icon: Rocket,
    title: "公開",
    description: "確認後、サーバー反映からドメイン設定まで。公開時点でそのまま使えます。",
    color: "from-purple-500 to-purple-600",
    step: "03",
  },
  {
    icon: HeartHandshake,
    title: "更新・保守サポート",
    description: "公開後も更新・修正を相談しやすい形で継続サポートします。",
    color: "from-orange-500 to-orange-600",
    step: "04",
  },
];

export default function HowItWorks({ className }: { className?: string }) {
  return (
    <Section id="how-it-works" className={`bg-muted/30 ${className ?? ""}`}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            ご相談から公開まで、負担の少ない4ステップ
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            難しい専門知識は不要です。
            <br />
            まずは資料とご希望を共有いただければ、進め方はこちらで整えます。
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
