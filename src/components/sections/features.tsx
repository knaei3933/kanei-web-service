"use client";

import { motion } from "framer-motion";
import {
  Eye,
  ShieldCheck,
  FolderGit2,
  HeartHandshake,
} from "lucide-react";
import { Section } from "../ui/section";

const features = [
  {
    icon: Eye,
    title: "完成イメージを先に確認できる",
    description:
      "業種ごとの完成例を見ながら相談できるため、『実際にどんなサイトになるのか分からない』という不安を減らせます。",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: ShieldCheck,
    title: "中小企業でも信頼感が伝わる構成",
    description:
      "会社概要、実績、沿革、アクセス、問い合わせ導線まで整理し、初見でも“ちゃんとした会社”に見える見せ方を設計します。",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: FolderGit2,
    title: "ソースコード納品で将来も安心",
    description:
      "公開後も自社資産として保有できる前提で整えるため、解約や移行が必要になっても進めやすい状態を維持できます。",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: HeartHandshake,
    title: "更新・保守まで任せやすい",
    description:
      "公開して終わりではなく、お知らせ更新、画像差し替え、軽微修正まで継続しやすい運用前提で提供します。",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Features({ className }: { className?: string }) {
  return (
    <Section id="features" className={className}>
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            金井のホームページ制作が選ばれる理由
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            価格の安さだけではなく、完成形の見せ方、公開後の運用、将来の移行まで含めて、
            長く使いやすいホームページとして整えます。
          </p>
        </div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="rounded-3xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`mb-4 inline-flex rounded-2xl p-3 ${feature.bg}`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="mb-3 text-lg font-semibold leading-tight">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
