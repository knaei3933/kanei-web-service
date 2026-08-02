"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Code2,
  Server,
  ShieldCheck,
  Rocket,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

export default function Hero() {
  return (
    <Section className="relative overflow-hidden pb-0 sm:pb-0 md:pb-0">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 translate-x-1/3 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-container flex-col items-center gap-12 py-16 md:py-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700"
        >
          <Rocket className="h-4 w-4" />
          金井貿易株式会社 — 新サービス
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl text-center text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          ドメイン代だけの、
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 bg-clip-text text-transparent">
            プロのホームページ
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl text-center text-lg text-muted-foreground sm:text-xl"
        >
          月額<strong className="text-foreground">10,000円</strong>で、
          <br className="sm:hidden" />
          制作・サーバー・保守・更新すべて込み。
          <br />
          ソースコードもデータも、すべてお客様のもの。
        </motion.p>

        {/* Tech Stack Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: Code2, label: "Next.js" },
            { icon: Rocket, label: "Vercel" },
            { icon: Server, label: "Supabase" },
            { icon: Globe, label: "Google" },
          ].map((tech) => (
            <div
              key={tech.label}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground"
            >
              <tech.icon className="h-4 w-4" />
              {tech.label}
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button size="lg">
            無料相談をする
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg">
            サンプルを見る
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          {[
            { icon: ShieldCheck, text: "ソースコード所有" },
            { icon: CheckCircle2, text: "初期費用0円" },
            { icon: CheckCircle2, text: "いつでも解約OK" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-1.5">
              <item.icon className="h-4 w-4 text-emerald-500" />
              {item.text}
            </div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}
