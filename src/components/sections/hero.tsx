"use client";

import { motion } from "framer-motion";
import {
  Users,
  PhoneCall,
  Smartphone,
  SearchCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

type DemoSite = {
  name: string;
  href: string;
  image: string;
  accent: string;
};

const demoSites: DemoSite[] = [
  {
    name: "製造業",
    href: "/portfolio/factory.html",
    image: "/generated/photos-real/factory-gallery1.jpg",
    accent: "from-blue-500/90 to-blue-700/90",
  },
  {
    name: "建設業",
    href: "/portfolio/construction.html",
    image: "/generated/photos-real/construction-gallery2.jpg",
    accent: "from-amber-500/90 to-orange-700/90",
  },
  {
    name: "飲食業",
    href: "/portfolio/restaurant.html",
    image: "/generated/photos-real/restaurant-gallery1.jpg",
    accent: "from-rose-500/90 to-red-700/90",
  },
  {
    name: "美容室",
    href: "/portfolio/salon.html",
    image: "/generated/photos-real/salon-gallery1.jpg",
    accent: "from-pink-400/90 to-fuchsia-600/90",
  },
  {
    name: "整骨院",
    href: "/portfolio/clinic.html",
    image: "/generated/photos-real/clinic-gallery1.jpg",
    accent: "from-emerald-500/90 to-teal-700/90",
  },
  {
    name: "ITコンサル",
    href: "/portfolio/consulting.html",
    image: "/generated/photos-real/consulting-gallery1.jpg",
    accent: "from-slate-600/90 to-slate-800/90",
  },
];

function BrowserMockup() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-blue-950/15">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 h-7 flex-1 rounded-full border border-slate-200 bg-white" />
        <div className="hidden rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white sm:block">
          実際の完成イメージ
        </div>
      </div>

      {/* Main content: 6業種デモサイトギャラリー */}
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            制作イメージ（クリックで確認）
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 sm:flex">
            <ExternalLink className="h-3 w-3" />
            デモサイト
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {demoSites.map((site, index) => (
            <motion.a
              key={site.name}
              href={site.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
            >
              <img
                src={site.image}
                alt={`${site.name}のホームページ制作例`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* 常時表示のグラデーション + ラベル */}
              <div
                className={`absolute inset-0 bg-gradient-to-t ${site.accent} opacity-30 transition-opacity duration-300 group-hover:opacity-60`}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent px-3 pb-2.5 pt-6">
                <span className="text-xs font-bold text-white drop-shadow sm:text-sm">
                  {site.name}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          すべての業種で実写画像を使用
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <Section className="relative overflow-hidden pb-0 sm:pb-0 md:pb-0">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-container gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            中小企業の信頼を整える ホームページ制作
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            商談につながる、
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 bg-clip-text text-transparent">
              実務向けホームページ制作
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            ただ作るだけではありません。
            <br />
            <strong className="text-foreground">会社の信頼感、問い合わせ導線、更新しやすさまで整えた、公開後に使い続けられるホームページ</strong>を、
            <br className="hidden sm:block" />
            初期費用0円・月額10,000円からご提供します。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            {[
              { icon: Users, label: "信頼感のある会社案内" },
              { icon: PhoneCall, label: "問い合わせ導線の最適化" },
              { icon: Smartphone, label: "スマホ対応" },
              { icon: SearchCheck, label: "検索対策を意識した構成" },
            ].map((tech) => (
              <div key={tech.label} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                <tech.icon className="h-4 w-4 text-blue-600" />
                {tech.label}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-4"
          >
            <Button asChild size="lg">
              <a href="mailto:info@kanei-trade.co.jp?subject=%E3%83%9B%E3%83%BC%E3%83%A0%E3%83%9A%E3%83%BC%E3%82%B8%E5%88%B6%E4%BD%9C%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87">
                まずは無料相談
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#showcase">制作事例を見る</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {[
              ["初期費用0円", "導入時の負担を抑えて始めやすい料金"],
              ["ソースコード納品", "将来の移行や社内管理にも備えやすい"],
              ["解約・移行しやすい", "長期縛りに頼らず、続けやすさで選ばれる設計"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <BrowserMockup />
        </motion.div>
      </div>
    </Section>
  );
}
