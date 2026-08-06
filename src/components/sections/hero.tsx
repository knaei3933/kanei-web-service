"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  PhoneCall,
  Smartphone,
  SearchCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

type Industry = {
  name: string;
  industryLabel: string;
  href: string;
  navBg: string;
  navText: string;
  heroImg: string;
  heroOverlay: string;
  heroTitle: string;
  heroSub: string;
  ctaText: string;
  cards: string[];
  cardLabel: string;
};

const industries: Industry[] = [
  {
    name: "青峰精機",
    industryLabel: "製造業",
    href: "/portfolio/factory.html",
    navBg: "bg-blue-800",
    navText: "text-white",
    heroImg: "/generated/photos-real/factory.jpg",
    heroOverlay: "from-blue-950/80 to-blue-900/30",
    heroTitle: "40年の実績と信頼",
    heroSub: "精密部品の製造・一括請負",
    ctaText: "詳しく見る",
    cards: ["CNC旋盤加工", "品質管理", "ISO9001認証"],
    cardLabel: "主な事業",
  },
  {
    name: "東央建設",
    industryLabel: "建設業",
    href: "/portfolio/construction.html",
    navBg: "bg-amber-800",
    navText: "text-white",
    heroImg: "/generated/photos-real/construction-gallery2.jpg",
    heroOverlay: "from-amber-950/80 to-amber-900/30",
    heroTitle: "品質と信頼の建築",
    heroSub: "安心の住宅・土木工事",
    ctaText: "施工実績を見る",
    cards: ["住宅建築", "土木工事", "リフォーム"],
    cardLabel: "施工内容",
  },
  {
    name: "桜庭食堂",
    industryLabel: "飲食業",
    href: "/portfolio/restaurant.html",
    navBg: "bg-orange-700",
    navText: "text-white",
    heroImg: "/generated/photos-real/restaurant-gallery1.jpg",
    heroOverlay: "from-orange-950/80 to-red-900/30",
    heroTitle: "旬の食材と真心料理",
    heroSub: "地元で愛される和食処",
    ctaText: "メニューを見る",
    cards: ["ランチセット", "宴会コース", "季節料理"],
    cardLabel: "人気メニュー",
  },
  {
    name: "ルミエール",
    industryLabel: "美容室",
    href: "/portfolio/salon.html",
    navBg: "bg-pink-600",
    navText: "text-white",
    heroImg: "/generated/photos-real/salon-gpt.jpg",
    heroOverlay: "from-pink-950/80 to-fuchsia-900/30",
    heroTitle: "あなたの魅力を引き出す",
    heroSub: "上質なヘアサロンワーク",
    ctaText: "予約する",
    cards: ["カット", "カラー", "パーマ"],
    cardLabel: "メニュー",
  },
  {
    name: "みらい整骨院",
    industryLabel: "整骨院",
    href: "/portfolio/clinic.html",
    navBg: "bg-emerald-700",
    navText: "text-white",
    heroImg: "/generated/photos-real/clinic-gallery1.jpg",
    heroOverlay: "from-emerald-950/80 to-teal-900/30",
    heroTitle: "痛みのない毎日へ",
    heroSub: "地域密着の丁寧な施術",
    ctaText: "診察予約",
    cards: ["肩こり・腰痛", "スポーツ障害", "交通事故"],
    cardLabel: "対応症状",
  },
  {
    name: "アクシア",
    industryLabel: "ITコンサル",
    href: "/portfolio/consulting.html",
    navBg: "bg-slate-800",
    navText: "text-white",
    heroImg: "/generated/photos-real/consulting-gallery1.jpg",
    heroOverlay: "from-slate-950/80 to-slate-800/30",
    heroTitle: "DXで事業を加速させる",
    heroSub: "実践的なIT戦略コンサルティング",
    ctaText: "無料相談",
    cards: ["DX推進支援", "システム開発", "クラウド移行"],
    cardLabel: "サービス",
  },
];

function MiniHomepage({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col">
      {/* Mini Navbar */}
      <div className={`flex h-6 items-center justify-between px-2 ${industry.navBg} ${industry.navText}`}>
        <span className="text-[9px] font-bold tracking-tight">
          {industry.name}
        </span>
        <div className="flex items-center gap-2">
          {["サービス", "実績", "問合せ"].map((item) => (
            <span key={item} className="text-[8px] opacity-80">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Mini Hero */}
      <div className="relative flex-1 overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}のホームページ例`}
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-r ${industry.heroOverlay}`}
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 space-y-0.5">
          <p className="text-[8px] font-light text-white/70">
            {industry.industryLabel}
          </p>
          <h3 className="text-xs font-bold leading-tight text-white drop-shadow-md sm:text-sm">
            {industry.heroTitle}
          </h3>
          <p className="text-[9px] text-white/90 drop-shadow sm:text-[10px]">
            {industry.heroSub}
          </p>
          <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-white/90 px-1.5 py-0.5 text-[8px] font-semibold text-slate-800">
            {industry.ctaText}
            <ArrowRight className="h-2 w-2" />
          </div>
        </div>
      </div>

      {/* Mini Feature Cards */}
      <div className="flex items-stretch gap-1.5 px-2 py-2">
        <span className="hidden shrink-0 items-center text-[8px] font-medium text-slate-400 sm:flex">
          {industry.cardLabel}
        </span>
        {industry.cards.map((card, idx) => (
          <div
            key={card}
            className="flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 shadow-sm"
          >
            <div className="mb-0.5 h-1 w-3 rounded-full bg-slate-300" style={{ opacity: 1 - idx * 0.15 }} />
            <p className="text-[9px] font-medium text-slate-700">{card}</p>
            <p className="mt-0.5 h-0.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Mini Footer */}
      <div className="flex h-5 items-center justify-center border-t border-slate-100 bg-slate-50">
        <p className="text-[7px] text-slate-400">
          © {industry.name} All Rights Reserved.
        </p>
      </div>
    </div>
  );
}

function BrowserMockup() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % industries.length);
    }, 2000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paginate = (dir: number) => {
    setDirection(dir);
    setCurrent((prev) => {
      const next = prev + dir;
      if (next < 0) return industries.length - 1;
      if (next >= industries.length) return 0;
      return next;
    });
    startTimer(); // リセット
  };

  const goTo = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
    startTimer(); // リセット
  };

  const industry = industries[current];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-blue-950/15">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 flex h-7 flex-1 items-center rounded-full border border-slate-200 bg-white px-3">
          <span className="text-[10px] text-slate-400">
            https://{industry.name === "青峰精機" ? "seihou-seiki" : industry.name === "東央建設" ? "touou-kensetsu" : industry.name === "桜庭食堂" ? "sakuraba-shokudo" : industry.name === "ルミエール" ? "lumiere-hair" : industry.name === "みらい整骨院" ? "mirai-seikotsu" : "axia-consulting"}.example.com
          </span>
        </div>
        <div className="hidden rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white sm:block">
          完成イメージ
        </div>
      </div>

      {/* Industry Switcher Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
          <Sparkles className="h-3 w-3 text-blue-500" />
          業種別デザイン例
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => paginate(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
            aria-label="前の業種"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          {/* Dot navigation */}
          <div className="flex items-center gap-1">
            {industries.map((ind, idx) => (
              <button
                key={ind.name}
                onClick={() => goTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === current
                    ? "w-4 bg-blue-600"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`${ind.industryLabel}を見る`}
              />
            ))}
          </div>
          <button
            onClick={() => paginate(1)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
            aria-label="次の業種"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Mini Homepage Display (clickable) */}
      <a
        href={industry.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ aspectRatio: "16/10" }}
            >
              <MiniHomepage industry={industry} />
            </motion.div>
          </AnimatePresence>

          {/* Hover overlay with external link hint */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-950/0 opacity-0 transition-all duration-300 group-hover:bg-blue-950/10 group-hover:opacity-100">
            <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-lg">
              <ExternalLink className="h-3.5 w-3.5" />
              デモサイトを開く
            </div>
          </div>
        </div>
      </a>

      {/* Bottom info bar */}
      <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 py-2 text-center">
        <span className="text-[11px] font-semibold text-slate-600">
          {industry.industryLabel}
        </span>
        <span className="text-[11px] text-slate-300">/</span>
        <span className="text-[11px] text-slate-400">
          {current + 1} / {industries.length} 業種
        </span>
        <span className="text-[11px] text-slate-300">/</span>
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span className="text-[11px] text-slate-400">実写使用</span>
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

      <div className="mx-auto grid max-w-container gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-24">
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
              <a href="/consult">
                無料で提案を依頼する
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
          className="h-full"
        >
          <BrowserMockup />
        </motion.div>
      </div>
    </Section>
  );
}
