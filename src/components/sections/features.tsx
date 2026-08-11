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
      "業種別の完成例を見ながら相談できるので、完成形のイメージが固まりやすく、不安を減らせます。",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: ShieldCheck,
    title: "中小企業でも信頼感が伝わる構成",
    description:
      "会社情報や実績を整理し、初見でも「ちゃんとした会社」に見える情報設計を整えます。",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: FolderGit2,
    title: "ソースコード納品で将来も安心",
    description:
      "自社資産として保有できる前提で整えるため、解約や移行時もスムーズに進められます。",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: HeartHandshake,
    title: "更新・保守まで任せやすい",
    description:
      "公開後もお知らせ更新や軽微修正など、継続的な運用サポートを受けられます。",
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
