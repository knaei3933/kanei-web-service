"use client";

import { motion } from "framer-motion";
import { Code2, Rocket, Database, Globe, GitBranch, ShieldCheck } from "lucide-react";
import { Section } from "../ui/section";

const stacks = [
  {
    icon: Code2,
    title: "高速表示基盤",
    description:
      "表示速度が速く、検索エンジンにも有利です。会社案内、サービス紹介、採用ページなどを1つのサイトで見やすく整理できます。",
  },
  {
    icon: Rocket,
    title: "自動配信基盤",
    description:
      "世界中に近いサーバーから自動で配信されるため、閲覧が軽く、更新してもすぐ公開できます。常時SSLも自動で安全です。",
  },
  {
    icon: Database,
    title: "データ管理基盤",
    description:
      "お問い合わせフォーム、予約希望、資料請求などのデータを保存・管理する基盤です。担当者が見やすい形で蓄積できます。",
  },
  {
    icon: Globe,
    title: "外部連携",
    description:
      "アクセス解析、地図、ドメインメールなど、集客と信頼づくりに必要な仕組みを一つにまとめて整えます。",
  },
  {
    icon: GitBranch,
    title: "履歴管理",
    description:
      "変更履歴をすべて保存できます。誰がいつ何を直したかが残るので、修正ミスを戻しやすく、納品後も安心です。",
  },
  {
    icon: ShieldCheck,
    title: "保守・安全性",
    description:
      "バックアップ、権限管理、データ引き渡しまで含めて運用します。お客様が“自分の資産”として持てる構成です。",
  },
];

export default function Technology() {
  return (
    <Section id="technology">
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            技術の選び方が、運用のしやすさを決めます
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ITに詳しくない方にもわかるよう、難しい単語はできるだけ避けて説明します。
            ただ見た目を整えるだけでなく、公開後に困らないこと、問い合わせしやすいこと、安心して任せられることを重視しています。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stacks.map((stack, index) => (
            <motion.div
              key={stack.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="rounded-3xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
                <stack.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">{stack.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{stack.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border bg-muted/20 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["速い", "ページ表示が軽く、見込み客が途中で離脱しにくい"],
              ["安全", "常時SSL・権限管理・バックアップで安心"],
              ["所有できる", "お客様の資産として引き渡し可能"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-card p-5 shadow-sm">
                <div className="text-lg font-semibold">{title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
