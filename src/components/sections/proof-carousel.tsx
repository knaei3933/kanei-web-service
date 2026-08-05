"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Quote,
  Sparkles,
  Star,
} from "lucide-react";
import { Section } from "../ui/section";

type Story = {
  title: string;
  category: string;
  quote: string;
  name: string;
  metric: string;
  metricLabel: string;
  modules: { label: string; note: string }[];
};

const STORIES: Story[] = [
  {
    title: "問い合わせ導線を再設計した会社案内",
    category: "会社紹介 / 製造業",
    quote:
      "会社概要・沿革・実績・地図を一つに整理しただけで、取引先から「ちゃんとした会社」と評価されるようになりました。お問い合わせ経路が明確になり、営業の説明時間も大幅に短縮できています。",
    name: "製造業 A社（埼玉県）",
    metric: "+23%",
    metricLabel: "お問い合わせ増加",
    modules: [
      { label: "会社概要", note: "沿革・代表メッセージ" },
      { label: "実績紹介", note: "納入先・対応材質" },
      { label: "アクセス", note: "地図・営業時間" },
    ],
  },
  {
    title: "予約完了率を押し上げた美容室サイト",
    category: "予約導線 / 美容室",
    quote:
      "スタッフ紹介と料金表を見やすく整え、予約ボタンを常に定位置に配置。初めての方でもスマホから迷わず予約できるようになり、電話での問い合わせ負担も減りました。",
    name: "美容室 B様（東京都）",
    metric: "+31%",
    metricLabel: "予約完了率",
    modules: [
      { label: "料金表", note: "メニュー別に整理" },
      { label: "スタッフ", note: "写真と得意メニュー" },
      { label: "予約導線", note: "空き状況から1タップ" },
    ],
  },
  {
    title: "資料請求を安定させた法人向けサイト",
    category: "営業支援 / ITコンサル",
    quote:
      "導入事例・お役立ち記事・資料請求を一本の導線に集約。営業担当者が「まずはサイトをご覧ください」と案内できるようになり、資料ダウンロードの数も安定して伸びています。",
    name: "ITコンサル C社（東京都）",
    metric: "+18%",
    metricLabel: "資料DL増加",
    modules: [
      { label: "導入事例", note: "課題と成果の比較" },
      { label: "お役立ち記事", note: "毎月2本更新" },
      { label: "資料請求", note: "フォーム1画面" },
    ],
  },
];

export default function ProofCarousel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => {
    setIndex((next + STORIES.length) % STORIES.length);
  }, []);

  // Autoplay
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % STORIES.length);
    }, 6000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const story = STORIES[index];

  return (
    <Section className="bg-background" id="proof">
      <div className="mx-auto max-w-container">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <Sparkles className="h-4 w-4" />
            成果事例で確かめる
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            「作って終わり」ではない。成果につながる見せ方へ
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            会社紹介・予約・資料請求など、ホームページに求める役割は業種によって異なります。
            左右の矢印で切り替えながら、目的別の成果イメージをご確認ください。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Stage */}
          <div className="relative overflow-hidden rounded-[2rem] border bg-card p-6 shadow-xl sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={story.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.35 }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-950 p-3 text-white">
                    <Quote className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                      {story.category}
                    </div>
                    <div className="text-xl font-bold text-slate-950 sm:text-2xl">
                      {story.title}
                    </div>
                  </div>
                </div>

                {/* Metric highlight */}
                <div className="mb-5 flex items-end gap-4 rounded-[1.5rem] bg-slate-950 p-6 text-white">
                  <div className="text-5xl font-bold leading-none">
                    {story.metric}
                  </div>
                  <div className="pb-1 text-sm text-slate-300">
                    {story.metricLabel}
                  </div>
                </div>

                {/* Quote */}
                <p className="text-lg leading-relaxed text-slate-700">
                  「{story.quote}」
                </p>
                <div className="mt-4 flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {story.name}
                  </span>
                </div>

                {/* Modules */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {story.modules.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-2xl border bg-slate-50 p-4"
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {m.label}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {m.note}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="mt-7 flex items-center justify-between border-t pt-5">
              <div className="flex items-center gap-2">
                {STORIES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={`${i + 1}番目の事例`}
                    className={`h-2 rounded-full transition-all ${
                      i === index
                        ? "w-8 bg-slate-950"
                        : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "自動再生を停止" : "自動再生を開始"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => go(index - 1)}
                  aria-label="前の事例"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => go(index + 1)}
                  aria-label="次の事例"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selector list */}
          <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              目的を選んで切り替え
            </div>
            <div className="space-y-3">
              {STORIES.map((item, i) => (
                <button
                  key={item.title}
                  onClick={() => go(i)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                    i === index
                      ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                      : "border-border bg-background hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div
                        className={`text-xs font-semibold uppercase tracking-[0.26em] ${
                          i === index ? "text-slate-300" : "text-muted-foreground"
                        }`}
                      >
                        {item.category}
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {item.title}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                        i === index
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-border bg-background"
                      }`}
                    >
                      {item.metric}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border bg-muted/30 p-4">
              <div className="text-sm font-semibold">見どころ</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>・矢印・ドット・再生ボタンで事例を切替</li>
                <li>・目的別に成果指標と構成を比較できる</li>
                <li>・お問い合わせ・予約・資料請求の導線を体感</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
