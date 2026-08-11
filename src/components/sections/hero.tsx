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
  MapPin,
  Clock,
  Phone,
} from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

type LayoutType =
  | "b2b"
  | "construction"
  | "restaurant"
  | "salon"
  | "clinic"
  | "dark";

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
  layout: LayoutType;
  stats?: string[];
  statsBg?: string;
  galleryImg?: string;
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
    layout: "b2b",
    stats: ["創業40年", "取引先200社", "ISO9001"],
    statsBg: "bg-blue-50",
    galleryImg: "/generated/photos-real/factory-gallery1.jpg",
  },
  {
    name: "東央建設",
    industryLabel: "建設業",
    href: "/portfolio/construction.html",
    navBg: "bg-amber-800",
    navText: "text-white",
    heroImg: "/generated/photos-real/construction-gallery2.jpg",
    heroOverlay: "from-amber-950/85 to-amber-900/30",
    heroTitle: "品質と信頼の建築",
    heroSub: "安心の住宅・土木工事",
    ctaText: "施工実績を見る",
    cards: ["住宅建築", "土木工事", "リフォーム"],
    cardLabel: "施工内容",
    layout: "construction",
    galleryImg: "/generated/photos-real/construction-gallery1.jpg",
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
    layout: "restaurant",
    galleryImg: "/generated/photos-real/restaurant-gallery2.jpg",
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
    layout: "salon",
    galleryImg: "/generated/photos-real/salon-gallery1.jpg",
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
    layout: "clinic",
    stats: ["施術12,000件", "初診無料", "保険対応"],
    statsBg: "bg-emerald-50",
  },
  {
    name: "アクシア",
    industryLabel: "ITコンサル",
    href: "/portfolio/consulting.html",
    navBg: "bg-slate-900",
    navText: "text-white",
    heroImg: "/generated/photos-real/consulting-gallery1.jpg",
    heroOverlay: "from-slate-950/90 to-slate-800/40",
    heroTitle: "DXで事業を加速させる",
    heroSub: "実践的なIT戦略コンサルティング",
    ctaText: "無料相談",
    cards: ["DX推進支援", "システム開発", "クラウド移行"],
    cardLabel: "サービス",
    layout: "dark",
  },
];

/* ──────────────────────────────────────────────
   Mini Navbar (shared)
   ────────────────────────────────────────────── */
function MiniNavbar({ industry }: { industry: Industry }) {
  return (
    <div
      className={`flex h-6 items-center justify-between px-3 ${industry.navBg} ${industry.navText}`}
    >
      <span className="text-[9px] font-bold tracking-tight">
        {industry.name}
      </span>
      <div className="flex items-center gap-2.5">
        {["事業", "実績", "会社", "問合せ"].map((item) => (
          <span key={item} className="text-[7px] opacity-80">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Mini Footer (shared)
   ────────────────────────────────────────────── */
function MiniFooter({
  industry,
  dark = false,
}: {
  industry: Industry;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-5 items-center justify-between px-3 ${
        dark
          ? "border-t border-slate-700 bg-slate-900"
          : "border-t border-slate-100 bg-slate-50"
      }`}
    >
      <p
        className={`text-[6px] ${
          dark ? "text-slate-500" : "text-slate-400"
        }`}
      >
        © {industry.name} All Rights Reserved.
      </p>
      <p
        className={`text-[6px] ${dark ? "text-slate-600" : "text-slate-300"}`}
      >
       {" "}
        TEL. 03-0000-0000{" "}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   B2B Layout — 製造業（青峰精機）
   ────────────────────────────────────────────── */
function LayoutB2B({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <MiniNavbar industry={industry} />

      {/* Hero with image + overlay */}
      <div className="relative h-[42%] overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}の施設`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${industry.heroOverlay}`} />
        <div className="absolute inset-0 flex items-center justify-between px-3">
          <div className="space-y-0.5">
            <p className="text-[7px] font-light text-white/70">
              {industry.industryLabel}
            </p>
            <h3 className="text-[12px] font-bold leading-tight text-white drop-shadow-md">
              {industry.heroTitle}
            </h3>
            <p className="text-[8px] text-white/90 drop-shadow">
              {industry.heroSub}
            </p>
          </div>
          {/* Stats badges */}
          <div className="flex flex-col gap-1">
            {(industry.stats || []).map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 backdrop-blur-sm"
              >
                <CheckCircle2 className="h-2 w-2 text-blue-300" />
                <span className="text-[7px] font-semibold text-white">
                  {stat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text + Image split */}
      <div className="flex gap-2 px-3 py-2">
        <div className="flex-1">
          <h4 className="mb-1 text-[9px] font-bold text-slate-800">
            {industry.cards[0]}
          </h4>
          <p className="text-[7px] leading-relaxed text-slate-500">
            高精度なCNC旋盤による精密加工。多品種少量生産から量産まで、
            お客様のニーズに柔軟に対応します。
          </p>
          <div className="mt-1.5 flex gap-1">
            <span className="rounded bg-blue-100 px-1 py-0.5 text-[6px] font-medium text-blue-700">
              設備40台
            </span>
            <span className="rounded bg-blue-100 px-1 py-0.5 text-[6px] font-medium text-blue-700">
              許容公差±0.01mm
            </span>
          </div>
        </div>
        {industry.galleryImg && (
          <img
            src={industry.galleryImg}
            alt="工場内観"
            className="h-12 w-16 rounded object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* Feature cards */}
      <div className="flex gap-1.5 px-3 pb-2">
        {industry.cards.map((card, idx) => (
          <div
            key={card}
            className="flex-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-1"
          >
            <div className="mb-0.5 h-0.5 w-3 rounded-full bg-blue-400" style={{ opacity: 1 - idx * 0.2 }} />
            <p className="text-[7px] font-medium text-slate-700">{card}</p>
            <p className="mt-0.5 h-0.5 w-full rounded bg-slate-200" />
            <p className="mt-0.5 h-0.5 w-2/3 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <MiniFooter industry={industry} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Construction Layout — 建設業（東央建設）
   ────────────────────────────────────────────── */
function LayoutConstruction({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <MiniNavbar industry={industry} />

      {/* Hero */}
      <div className="relative h-[40%] overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}の施工例`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${industry.heroOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-[7px] font-light text-white/70">
            {industry.industryLabel}
          </p>
          <h3 className="text-[12px] font-bold leading-tight text-white drop-shadow-md">
            {industry.heroTitle}
          </h3>
          <p className="text-[8px] text-white/90 drop-shadow">
            {industry.heroSub}
          </p>
        </div>
      </div>

      {/* Case studies — 2 column cards */}
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded border border-slate-200 bg-white"
          >
            <div className="h-8 bg-slate-200">
              {industry.galleryImg && (
                <img
                  src={industry.galleryImg}
                  alt={`施工例 ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
            <div className="px-1 py-0.5">
              <p className="text-[6px] font-medium text-slate-600">
                {["新築戸建て工事", "マンション改修"][i]}
              </p>
              <p className="text-[5px] text-slate-400">
                {["東京都〇〇区", "神奈川県〇〇市"][i]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 5-step timeline */}
      <div className="px-3 pb-2">
        <p className="mb-1 text-[7px] font-bold text-amber-800">
          施工の流れ
        </p>
        <div className="flex items-center justify-between gap-0.5">
          {["ヒアリング", "見積り", "着工", "施工", "引き渡し"].map(
            (step, i) => (
              <div key={step} className="flex flex-1 items-center gap-0.5">
                <div className="flex flex-col items-center">
                  <div className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-700 text-[5px] font-bold text-white">
                    {i + 1}
                  </div>
                  <p className="mt-0.5 text-[5px] text-slate-500">{step}</p>
                </div>
                {i < 4 && (
                  <div className="mx-0.5 h-px flex-1 bg-amber-300" />
                )}
              </div>
            )
          )}
        </div>
      </div>

      <MiniFooter industry={industry} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Restaurant Layout — 飲食業（桜庭食堂）
   ────────────────────────────────────────────── */
function LayoutRestaurant({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <MiniNavbar industry={industry} />

      {/* Hero */}
      <div className="relative h-[40%] overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}の料理`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${industry.heroOverlay}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <p className="text-[7px] font-light text-orange-200">
            {industry.industryLabel}
          </p>
          <h3 className="text-[12px] font-bold leading-tight text-white drop-shadow-md">
            {industry.heroTitle}
          </h3>
          <p className="text-[8px] text-white/90 drop-shadow">
            {industry.heroSub}
          </p>
        </div>
      </div>

      {/* Chef intro */}
      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <span className="text-[8px] font-bold text-orange-600">店主</span>
        </div>
        <div className="flex-1">
          <p className="text-[7px] font-semibold text-slate-700">
            佐藤 一郎
          </p>
          <p className="text-[6px] leading-tight text-slate-400">
            二十年の経験で、季節の食材を活かした料理を提供します
          </p>
        </div>
      </div>

      {/* Menu cards */}
      <div className="flex gap-1.5 px-3 pb-2">
        {[
          ["日替ランチ", "¥980"],
          ["宴会コース", "¥4,000"],
          ["季節のコース", "¥5,500"],
        ].map(([name, price], idx) => (
          <div
            key={name}
            className="flex-1 rounded-lg border border-orange-200 bg-orange-50 px-1.5 py-1"
          >
            <div className="mb-0.5 h-4 overflow-hidden rounded bg-orange-200/50">
              {industry.galleryImg && (
                <img
                  src={industry.galleryImg}
                  alt={name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  style={{ filter: `hue-rotate(${idx * 10}deg)` }}
                />
              )}
            </div>
            <p className="text-[6px] font-medium text-slate-700">{name}</p>
            <p className="text-[7px] font-bold text-orange-600">{price}</p>
          </div>
        ))}
      </div>

      <MiniFooter industry={industry} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Salon Layout — 美容室（ルミエール）
   ────────────────────────────────────────────── */
function LayoutSalon({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <MiniNavbar industry={industry} />

      {/* Left-right split hero */}
      <div className="flex h-[45%] overflow-hidden">
        <div className="flex w-1/2 flex-col justify-center bg-gradient-to-br from-pink-50 to-fuchsia-50 px-3">
          <p className="text-[7px] font-light text-pink-400">
            {industry.industryLabel}
          </p>
          <h3 className="text-[11px] font-bold leading-tight text-slate-800">
            {industry.heroTitle}
          </h3>
          <p className="mt-0.5 text-[7px] text-slate-500">
            {industry.heroSub}
          </p>
          <div className="mt-1.5 inline-flex w-fit items-center gap-0.5 rounded-full bg-pink-600 px-1.5 py-0.5 text-[6px] font-semibold text-white">
            {industry.ctaText}
            <ArrowRight className="h-2 w-2" />
          </div>
        </div>
        <div className="w-1/2 overflow-hidden">
          <img
            src={industry.heroImg}
            alt={`${industry.name}のサロン`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>

      {/* Stylist intro */}
      <div className="flex gap-2 px-3 py-1.5">
        {["田中 美咲", "鈴木 健太"].map((name, i) => (
          <div key={name} className="flex flex-1 items-center gap-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-fuchsia-200">
              <span className="text-[6px] font-bold text-pink-600">
                {name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-[6px] font-semibold text-slate-700">
                {name}
              </p>
              <p className="text-[5px] text-slate-400">
                {["ディレクター", "チーフ"][i]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Price cards */}
      <div className="flex gap-1.5 px-3 pb-2">
        {[
          ["カット", "¥5,500"],
          ["カラー", "¥7,700"],
          ["パーマ", "¥8,800"],
        ].map(([name, price]) => (
          <div
            key={name}
            className="flex-1 rounded-lg border border-pink-200 bg-white px-1.5 py-1 text-center"
          >
            <p className="text-[7px] font-medium text-slate-600">{name}</p>
            <p className="text-[8px] font-bold text-pink-600">{price}</p>
          </div>
        ))}
      </div>

      <MiniFooter industry={industry} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Clinic Layout — 整骨院（みらい整骨院）
   ────────────────────────────────────────────── */
function LayoutClinic({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-white">
      <MiniNavbar industry={industry} />

      {/* Stats banner */}
      <div className={`grid grid-cols-3 gap-px ${industry.statsBg || "bg-emerald-50"}`}>
        {(industry.stats || []).map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center bg-white py-1.5"
          >
            <p className="text-[8px] font-bold text-emerald-600">{stat}</p>
            <p className="text-[5px] text-slate-400">
              {["累計施術", "初めての方", "扱い"][i]}
            </p>
          </div>
        ))}
      </div>

      {/* Hero */}
      <div className="relative h-[36%] overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}の施術`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${industry.heroOverlay}`} />
        <div className="absolute inset-0 flex flex-col justify-center px-3">
          <p className="text-[7px] font-light text-white/70">
            {industry.industryLabel}
          </p>
          <h3 className="text-[12px] font-bold leading-tight text-white drop-shadow-md">
            {industry.heroTitle}
          </h3>
          <p className="text-[8px] text-white/90 drop-shadow">
            {industry.heroSub}
          </p>
        </div>
      </div>

      {/* Symptom cards */}
      <div className="flex gap-1.5 px-3 py-2">
        {industry.cards.map((card) => (
          <div
            key={card}
            className="flex-1 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-1.5 py-1 text-center"
          >
            <div className="mx-auto mb-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <p className="text-[6px] font-medium text-emerald-800">{card}</p>
          </div>
        ))}
      </div>

      <MiniFooter industry={industry} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Dark Layout — ITコンサル（アクシア）
   ────────────────────────────────────────────── */
function LayoutDark({ industry }: { industry: Industry }) {
  return (
    <div className="flex h-full flex-col bg-slate-950">
      <MiniNavbar industry={industry} />

      {/* Hero with strong dark overlay */}
      <div className="relative h-[45%] overflow-hidden">
        <img
          src={industry.heroImg}
          alt={`${industry.name}のオフィス`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="absolute inset-0 flex flex-col justify-center px-3">
          <p className="text-[7px] font-light text-slate-400">
            {industry.industryLabel}
          </p>
          <h3 className="text-[12px] font-bold leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              {industry.heroTitle}
            </span>
          </h3>
          <p className="text-[8px] text-slate-300">{industry.heroSub}</p>
          <div className="mt-1 inline-flex w-fit items-center gap-0.5 rounded bg-blue-600 px-1.5 py-0.5 text-[6px] font-semibold text-white">
            {industry.ctaText}
            <ArrowRight className="h-2 w-2" />
          </div>
        </div>
      </div>

      {/* Dark service cards — 2 column */}
      <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
        {industry.cards.map((card, idx) => (
          <div
            key={card}
            className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1.5"
          >
            <div className="mb-0.5 flex items-center gap-0.5">
              <div className="flex h-3 w-3 items-center justify-center rounded bg-blue-600">
                <CheckCircle2 className="h-2 w-2 text-white" />
              </div>
              <p className="text-[7px] font-semibold text-white">{card}</p>
            </div>
            <p className="text-[5px] leading-tight text-slate-400">
              {[
                "既存システムの分析から改善まで一貫支援",
                "要件定義から保守まで幅広く対応",
                "安全なクラウド環境への移行を支援",
              ][idx]}
            </p>
            <div className="mt-0.5 h-0.5 w-full rounded bg-slate-800" />
            <div className="mt-0.5 h-0.5 w-2/3 rounded bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Dark info strip */}
      <div className="flex items-center gap-2 px-3 py-1">
        <span className="flex items-center gap-0.5 text-[5px] text-slate-500">
          <MapPin className="h-2 w-2" /> 東京・大阪
        </span>
        <span className="flex items-center gap-0.5 text-[5px] text-slate-500">
          <Clock className="h-2 w-2" /> 平日9:00-18:00
        </span>
        <span className="flex items-center gap-0.5 text-[5px] text-slate-500">
          <Phone className="h-2 w-2" /> 無料相談
        </span>
      </div>

      <MiniFooter industry={industry} dark />
    </div>
  );
}

/* ──────────────────────────────────────────────
   MiniHomepage — layout dispatcher
   ────────────────────────────────────────────── */
function MiniHomepage({ industry }: { industry: Industry }) {
  switch (industry.layout) {
    case "b2b":
      return <LayoutB2B industry={industry} />;
    case "construction":
      return <LayoutConstruction industry={industry} />;
    case "restaurant":
      return <LayoutRestaurant industry={industry} />;
    case "salon":
      return <LayoutSalon industry={industry} />;
    case "clinic":
      return <LayoutClinic industry={industry} />;
    case "dark":
      return <LayoutDark industry={industry} />;
    default:
      return <LayoutB2B industry={industry} />;
  }
}

/* ──────────────────────────────────────────────
   BrowserMockup
   ────────────────────────────────────────────── */
function BrowserMockup() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % industries.length);
    }, 2500);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paginate = (dir: number) => {
    setCurrent((prev) => {
      const next = prev + dir;
      if (next < 0) return industries.length - 1;
      if (next >= industries.length) return 0;
      return next;
    });
    startTimer();
  };

  const goTo = (index: number) => {
    setCurrent(index);
    startTimer();
  };

  const industry = industries[current];
  const baseUrl = industry.name === "青峰精機"
    ? "seihou-seiki"
    : industry.name === "東央建設"
    ? "touou-kensetsu"
    : industry.name === "桜庭食堂"
    ? "sakuraba-shokudo"
    : industry.name === "ルミエール"
    ? "lumiere-hair"
    : industry.name === "みらい整骨院"
    ? "mirai-seikotsu"
    : "axia-consulting";

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-blue-950/15">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ml-4 flex h-7 flex-1 items-center rounded-full border border-slate-200 bg-white px-3">
          <span className="text-[10px] text-slate-400">
            https://{baseUrl}.example.com
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

      {/* Mini Homepage Display — fixed aspect-ratio container */}
      <a
        href={industry.href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden"
        style={{ aspectRatio: "16 / 10" }}
      >
        {/* Background layer — always rendered to stabilize height */}
        <div className="absolute inset-0">
          <MiniHomepage industry={industries[current]} />
        </div>

        {/* AnimatePresence overlay — absolute positioned, no layout impact */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
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
              { icon: Users, label: "信頼感のある会社" },
              { icon: PhoneCall, label: "問い合わせ導線" },
              { icon: Smartphone, label: "スマホ対応" },
              { icon: SearchCheck, label: "検索対策" },
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
              ["初期費用0円", "導入負担を抑えて始められます"],
              ["ソースコード納品", "将来の移行・管理に備えます"],
              ["解約・移行しやすい", "長期縛らず、続けやすさで選ばれています"],
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
