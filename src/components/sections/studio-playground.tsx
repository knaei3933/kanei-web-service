"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Store,
  Scissors,
  UtensilsCrossed,
  Monitor,
  Smartphone,
  MousePointerClick,
  Check,
  Sparkles,
  ArrowRight,
  PanelTop,
  LayoutGrid,
  FileText,
  CalendarDays,
  MessageSquareMore,
  BadgeCheck,
  Hospital,
} from "lucide-react";
import { Section } from "../ui/section";

const THEMES = [
  { id: "ocean", label: "ブルー", bar: "bg-blue-600", soft: "bg-blue-50", text: "text-blue-700", chip: "bg-blue-100 text-blue-700", border: "border-blue-200" },
  { id: "forest", label: "グリーン", bar: "bg-emerald-600", soft: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
  { id: "sunset", label: "オレンジ", bar: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700", chip: "bg-orange-100 text-orange-700", border: "border-orange-200" },
  { id: "mono", label: "モノトーン", bar: "bg-slate-900", soft: "bg-slate-100", text: "text-slate-700", chip: "bg-slate-200 text-slate-700", border: "border-slate-300" },
] as const;

const PAGES = [
  {
    id: "corporate",
    label: "会社案内",
    icon: Building2,
    eyebrow: "法人向け / 信頼設計",
    headline: "商談につながる会社案内を、その場で確認",
    subhead: "会社概要・事業内容・実績・問い合わせ導線を整理し、提案時にそのまま見せられる構成です。",
    nav: ["会社概要", "事業内容", "実績", "お問い合わせ"],
    cards: [
      { title: "代表メッセージ", note: "信頼を最初に伝える" },
      { title: "沿革", note: "積み重ねを可視化する" },
      { title: "主要取引先", note: "安心材料を並べる" },
    ],
    cta: "無料相談へ進む",
    stats: ["離脱率 -18%", "商談化率 +22%", "電話クリック +31%"],
  },
  {
    id: "shop",
    label: "店舗",
    icon: Store,
    eyebrow: "店舗 / 来店導線",
    headline: "メニュー・営業時間・アクセスを、分かりやすく案内",
    subhead: "初回来店の不安を減らし、予約や来店への一歩を自然に後押しする設計です。",
    nav: ["メニュー", "店舗情報", "アクセス", "予約"],
    cards: [
      { title: "季節のおすすめ", note: "来店前に選びやすく整理" },
      { title: "営業時間", note: "確認負担を下げる" },
      { title: "テイクアウト", note: "用途別導線を作る" },
    ],
    cta: "ネット予約へ進む",
    stats: ["予約率 +29%", "地図クリック +41%", "SNS遷移 +18%"],
  },
  {
    id: "salon",
    label: "サロン",
    icon: Scissors,
    eyebrow: "美容 / 予約最適化",
    headline: "スタッフ・料金・空き状況を分かりやすく整理",
    subhead: "予約の迷いを減らし、初めての方でも指名やネット予約に進みやすい構成です。",
    nav: ["メニュー", "スタッフ", "料金", "予約"],
    cards: [
      { title: "カット", note: "価格の見通しを明確に" },
      { title: "カラー", note: "施術メニューを整理" },
      { title: "ネット予約", note: "最短導線を置く" },
    ],
    cta: "予約する",
    stats: ["予約完了 +33%", "指名率 +21%", "滞在時間 +26%"],
  },
  {
    id: "clinic",
    label: "整骨院",
    icon: Hospital,
    eyebrow: "安心設計",
    headline: "症状別ページで、不安を解消して来院へ導く",
    subhead: "症状別案内、受付時間、院内写真、保険対応、アクセスを整理し、初めての方も安心できる構成です。",
    nav: ["診療案内", "症状別", "料金", "予約"],
    cards: [
      { title: "肩こり・首こり", note: "症状別で案内する" },
      { title: "腰痛・ぎっくり腰", note: "不安を先回りで解消" },
      { title: "当日予約", note: "すぐに行動できる" },
    ],
    cta: "当日受付で予約する",
    stats: ["初診問い合わせ +24%", "電話予約 +16%", "再訪率 +12%"],
  },
  {
    id: "restaurant",
    label: "飲食",
    icon: UtensilsCrossed,
    eyebrow: "飲食 / 来店促進",
    headline: "メニュー・地図・予約を、来店前にしっかり見せる",
    subhead: "写真だけに頼らず、営業時間や席情報まで整理して、来店前の不安を減らす構成です。",
    nav: ["コース", "アラカルト", "店舗情報", "予約"],
    cards: [
      { title: "シェフのお任せ", note: "強みを一番に見せる" },
      { title: "ドリンク", note: "付加価値を伝える" },
      { title: "貸切", note: "予約の幅を広げる" },
    ],
    cta: "席を予約する",
    stats: ["予約率 +29%", "地図クリック +41%", "SNS遷移 +18%"],
  },
] as const;

const DEVICES = [
  { id: "desktop", label: "パソコン", icon: Monitor, max: "max-w-full" },
  { id: "mobile", label: "スマホ", icon: Smartphone, max: "max-w-[300px]" },
] as const;

const SHOWCASE_IMAGES = [
  {
    src: "/generated/photos-real/factory.jpg",
    title: "製造業の画面例",
    note: "信頼・設備・実績を一画面で整理",
    caption: "図面確認から量産まで一貫対応",
    tag: "法人向け / 製造",
  },
  {
    src: "/generated/photos-real/office.jpg",
    title: "建設業の画面例",
    note: "施工事例・資格・対応範囲を整理",
    caption: "公共・民間の案件実績を継続掲載",
    tag: "実績 / 信頼",
  },
  {
    src: "/generated/portfolio-real/restaurant.png",
    title: "飲食業の画面例",
    note: "料理情報と予約導線を分かりやすく配置",
    caption: "季節メニュー / 予約導線",
    tag: "来店導線",
  },
  {
    src: "/generated/portfolio-real/salon.png",
    title: "美容室の画面例",
    note: "スタッフ紹介と予約導線を一本化",
    caption: "スタイリスト指名 / 空き状況を確認",
    tag: "予約最適化",
  },
  {
    src: "/generated/portfolio-real/clinic.png",
    title: "整骨院の画面例",
    note: "症状別案内で不安を解消",
    caption: "症状別ページ / 当日受付対応",
    tag: "安心設計",
  },
  {
    src: "/generated/portfolio-real/consulting.png",
    title: "法人提案の画面例",
    note: "事例・資料案内・問い合わせ導線を整理",
    caption: "導入事例 / 資料案内 / お問い合わせ",
    tag: "提案力",
  },
] as const;

const UI_COMPONENTS = [
  { icon: PanelTop, title: "ファーストビュー", note: "第一印象とCTAを設計" },
  { icon: LayoutGrid, title: "サービス案内", note: "見せたい強みを整理" },
  { icon: FileText, title: "実績紹介", note: "信頼材料を見せる" },
  { icon: CalendarDays, title: "予約・連絡導線", note: "行動導線を最短化" },
  { icon: MessageSquareMore, title: "よくある質問", note: "不安を先回りして解消" },
  { icon: BadgeCheck, title: "料金・案内", note: "比較しやすく誤解を防ぐ" },
] as const;

function CorporatePreview() {
  return (
    <div className="bg-[#f7f8fb]">
      <div className="grid gap-4 px-4 pt-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
          <div className="relative aspect-[16/9] w-full">
            <Image src="/generated/portfolio-real/consulting.png" alt="会社案内の完成イメージ" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">会社案内例</div>
            <div className="absolute bottom-4 left-4 right-4 max-w-xl text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">信頼を最初に伝える</div>
              <h4 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">会社概要・実績・沿革を、<br />商談前に一目で伝える。</h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">代表メッセージ、沿革、取引先、アクセスを整理し、初見の相手にも「ちゃんとした会社」と伝わる構成です。</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
          <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">沿革</div><div className="mt-1 text-sm font-semibold">会社沿革を掲載</div><div className="text-xs text-white/60">対応実績を整理</div></div>
          <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">取引先</div><div className="mt-1 text-sm font-semibold">取引先情報を掲載</div><div className="text-xs text-white/60">法人向けの相談導線</div></div>
          <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">アクセス</div><div className="mt-1 text-sm font-semibold">対応エリアを案内</div><div className="text-xs text-white/60">地図・フォーム・電話</div></div>
          </div>
        </div>
        <div className="space-y-4 pb-4 pr-4">
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">会社の強み</div>
            <div className="mt-1 text-lg font-bold text-slate-950">見積前に、安心材料がそろう</div>
            <div className="mt-4 grid gap-3">
              {[["沿革", "積み重ねを可視化"], ["実績", "事例と写真で伝える"], ["代表挨拶", "人柄と姿勢を伝える"]].map(([title, note]) => (
                <div key={title} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">導線</div>
            <div className="mt-2 grid gap-2">
              <button className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white">無料相談へ進む</button>
              <div className="rounded-full border px-4 py-3 text-center text-sm text-slate-600">会社案内 / 実績 / 問い合わせ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StorePreview() {
  return (
    <div className="bg-[#fbfbf4]">
      <div className="grid gap-4 px-4 pt-4 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
          <div className="relative aspect-[16/10] w-full">
            <Image src="/generated/portfolio-real/restaurant.png" alt="店舗の完成イメージ" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/68 via-slate-950/15 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">店舗例</div>
            <div className="absolute bottom-4 left-4 right-4 max-w-xl text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">店舗 / 来店導線</div>
              <h4 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">商品と営業時間を見せて、<br />来店を後押しする。</h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">おすすめ商品、地図、営業時間、キャンペーンをひと目でまとめ、来店前の不安を減らします。</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">営業時間</div><div className="mt-1 text-sm font-semibold">10:00〜19:00</div><div className="text-xs text-white/60">定休日：水曜</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">アクセス</div><div className="mt-1 text-sm font-semibold">駅徒歩 4分</div><div className="text-xs text-white/60">駐車場あり</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">特典</div><div className="mt-1 text-sm font-semibold">初回 10%OFF</div><div className="text-xs text-white/60">来店特典を表示</div></div>
          </div>
        </div>
        <div className="space-y-4 pb-4 pr-4">
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">おすすめ</div>
            <div className="mt-3 space-y-3">
              {[["今月の人気セット", "¥3,980"], ["季節限定キャンペーン", "NEW"], ["テイクアウト対応", "OK"]].map(([title, meta]) => (
                <div key={title} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    <div className="mt-1 text-xs text-slate-500">写真付き / 迷わず選べる</div>
                  </div>
                  <div className="text-xs font-semibold text-amber-600">{meta}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">来店導線</div>
            <div className="mt-3 grid gap-2">
              <button className="rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm">店舗へ行く</button>
              <div className="rounded-full border px-4 py-3 text-center text-sm text-slate-600">地図 / 営業時間 / 商品一覧</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalonPreview() {
  return (
    <div className="bg-[#fff7fb]">
      <div className="grid gap-4 px-4 pt-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
          <div className="relative aspect-[16/10] w-full">
            <Image src="/generated/portfolio-real/salon.png" alt="美容室の完成イメージ" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/68 via-slate-950/15 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">美容室例</div>
            <div className="absolute bottom-4 left-4 right-4 max-w-xl text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-200">予約特化</div>
              <h4 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">スタッフと料金が見えるから、<br />予約まで迷わない。</h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">スタイリスト、価格、空き状況をまとめ、スマホからでも指名予約しやすい導線にします。</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">カット</div><div className="mt-1 text-sm font-semibold">¥5,500〜</div><div className="text-xs text-white/60">似合わせカット</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">カラー</div><div className="mt-1 text-sm font-semibold">¥7,700〜</div><div className="text-xs text-white/60">透明感カラー</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">予約</div><div className="mt-1 text-sm font-semibold">24時間予約</div><div className="text-xs text-white/60">空き状況を確認</div></div>
          </div>
        </div>
        <div className="space-y-4 pb-4 pr-4">
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">スタイリスト</div>
            <div className="mt-3 space-y-3">
              {[["佐藤 美咲", "トップディレクター"], ["田中 翔太", "チーフ"], ["鈴木 彩花", "スタイリスト"]].map(([name, role]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                    <div className="mt-1 text-xs text-slate-500">{role}</div>
                  </div>
                  <div className="text-xs font-semibold text-pink-600">指名可</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">予約</div>
            <button className="mt-3 w-full rounded-full bg-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-sm">ネット予約へ進む</button>
            <div className="mt-3 rounded-2xl bg-pink-50 px-3 py-3 text-sm text-pink-900">初回カウンセリング / 当日予約 / スマホ最適化</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClinicPreview() {
  return (
    <div className="bg-[#f4fbf8]">
      <div className="grid gap-4 px-4 pt-4 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
          <div className="relative aspect-[16/10] w-full">
            <Image src="/generated/portfolio-real/clinic.png" alt="整骨院の完成イメージ" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/68 via-slate-950/15 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">整骨院例</div>
            <div className="absolute bottom-4 left-4 right-4 max-w-xl text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">安心設計</div>
              <h4 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">症状別に案内して、<br />初めての不安を減らす。</h4>
              <p className="mt-2 text-sm leading-relaxed text-white/80">肩こり、腰痛、スポーツ障害など症状別に分け、受付時間・保険・アクセスをひと目でわかるようにします。</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">診療</div><div className="mt-1 text-sm font-semibold">月〜金 9:00〜20:00</div><div className="text-xs text-white/60">土曜午前対応</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">保険</div><div className="mt-1 text-sm font-semibold">健康保険 / 労災</div><div className="text-xs text-white/60">交通事故対応</div></div>
            <div><div className="text-[10px] uppercase tracking-[0.22em] text-white/60">予約</div><div className="mt-1 text-sm font-semibold">当日受付</div><div className="text-xs text-white/60">電話・フォーム対応</div></div>
          </div>
        </div>
        <div className="space-y-4 pb-4 pr-4">
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">症状別案内</div>
            <div className="mt-3 grid gap-2">
              {[["肩こり・首こり", "デスクワークの不調"], ["腰痛・ぎっくり腰", "急な痛みも相談"], ["スポーツ障害", "部活・競技者向け"]].map(([title, note]) => (
                <div key={title} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="text-sm font-semibold text-slate-900">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">来院導線</div>
            <button className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm">当日受付で予約する</button>
            <div className="mt-3 rounded-2xl bg-emerald-50 px-3 py-3 text-sm text-emerald-900">初診の症状相談 / アクセス / 保険対応を一画面で表示</div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ThemeId = (typeof THEMES)[number]["id"];
type PageId = (typeof PAGES)[number]["id"];
type DeviceId = (typeof DEVICES)[number]["id"];

export default function StudioPlayground() {
  const [themeId, setThemeId] = useState<ThemeId>("ocean");
  const [pageId, setPageId] = useState<PageId>("corporate");
  const [deviceId, setDeviceId] = useState<DeviceId>("desktop");

  const theme = useMemo(() => THEMES.find((t) => t.id === themeId)!, [themeId]);
  const page = useMemo(() => PAGES.find((p) => p.id === pageId)!, [pageId]);
  const device = useMemo(() => DEVICES.find((d) => d.id === deviceId)!, [deviceId]);
  const PageIcon = page.icon;

  return (
    <Section id="playground" className="bg-muted/20">
      <div className="mx-auto max-w-container">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
            <MousePointerClick className="h-4 w-4" />
            完成形
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            納品前に、完成形を業種ごとに確認できます
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            配色、業種テンプレート、パソコン / スマホ表示を切り替えながら、実際にお渡しするサイトの見え方と導線設計を確認できます。
            相談前のイメージ共有から、公開後の導線確認まで使える構成です。
          </p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
          <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-violet-500" />
              構成の考え方
            </div>
            <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">公開後に使いやすい構成を、業種ごとに整理します</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              見た目だけではなく、会社案内・予約・資料請求・アクセス案内まで、実際の運用で必要になる情報の並び方を確認できます。
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {UI_COMPONENTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon className="h-4 w-4 text-blue-600" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-4 text-sm text-slate-200">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ArrowRight className="h-4 w-4 text-cyan-300" />
                事前に確認しやすいポイント
              </div>
              <ul className="mt-3 space-y-1.5 text-slate-300">
                <li>・「完成後のイメージ」がその場で伝わる</li>
                <li>・配色と導線を業種別に比較できる</li>
                <li>・パソコン / スマホの見え方まで確認できる</li>
              </ul>
            </div>
          </div>

          <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">完成イメージ</div>
                <div className="mt-1 text-lg font-bold text-slate-950">納品時の画面イメージ</div>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">6業種</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SHOWCASE_IMAGES.map((img) => (
                <div key={img.src} className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image src={img.src} alt={img.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 50vw, 25vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
                      画面例
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="inline-flex rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
                        {img.tag}
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-slate-900">{img.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">{img.note}</div>
                    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] font-medium leading-relaxed text-slate-600">
                      {img.caption}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="space-y-5 rounded-[2rem] border bg-card p-6 shadow-sm">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                デザインテーマ
              </div>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      themeId === t.id
                        ? `${t.border} ${t.soft} ${t.text} shadow-sm`
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full ${t.bar}`} />
                    {t.label}
                    {themeId === t.id && <Check className="ml-auto h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                業種テンプレート
              </div>
              <div className="space-y-2">
                {PAGES.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPageId(p.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                        pageId === p.id
                          ? "border-slate-900 bg-slate-950 text-white shadow"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="min-w-0">
                        <div>{p.label}</div>
                        <div className={`text-[11px] ${pageId === p.id ? "text-slate-300" : "text-muted-foreground"}`}>
                          {p.eyebrow}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                表示モード
              </div>
              <div className="inline-flex rounded-2xl border bg-background p-1">
                {DEVICES.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDeviceId(d.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        deviceId === d.id
                          ? "bg-slate-950 text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                事前に確認しやすいポイント
              </div>
              <ul className="space-y-1.5">
                <li>・「完成後のイメージ」がその場で伝わる</li>
                <li>・配色と導線を業種別に比較できる</li>
                <li>・パソコン / スマホの見え方まで確認できる</li>
              </ul>
            </div>
          </div>

          <div className="rounded-[2rem] border bg-white p-5 shadow-2xl shadow-slate-950/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <div className="ml-3 flex h-7 flex-1 items-center rounded-full border bg-slate-50 px-3 text-xs text-slate-400">
                preview-example.jp/{page.id}
              </div>
              <span className={`rounded-full ${theme.chip} px-2.5 py-1 text-xs font-semibold`}>
                完成形
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${themeId}-${pageId}-${deviceId}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`mx-auto ${device.max} overflow-hidden rounded-3xl border shadow-inner`}>
                  <div className={`flex items-center justify-between ${theme.bar} px-5 py-4 text-white`}>
                    <div className="flex items-center gap-2">
                      <PageIcon className="h-5 w-5" />
                      <span className="font-bold">{page.label}</span>
                    </div>
                    <div className="hidden gap-4 text-xs sm:flex">
                      {page.nav.map((n) => (
                        <span key={n} className="opacity-90">{n}</span>
                      ))}
                    </div>
                  </div>

                  {page.id === "restaurant" ? (
                    <div className="bg-[#fbf7f1]">
                      <div className="grid gap-4 px-4 pt-4 lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
                          <div className="relative aspect-[16/10] w-full">
                            <Image
                              src="/generated/photos-real/restaurant2.jpg"
                              alt="飲食店の完成イメージ"
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 60vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                            <div className="absolute left-4 top-4 flex items-center gap-2">
                              <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
                                青葉ダイニング
                              </span>
                              <span className="rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
                                ランチ / ディナー
                              </span>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 max-w-xl text-white">
                              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">飲食店の完成イメージ</div>
                              <h4 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
                                旬の鯛のアクアパッツァを、
                                <br />
                                予約前にしっかり見せる。
                              </h4>
                              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/80">
                                写真、営業時間、席数、予約ボタンをひと目で整理し、初めてでも「行ってみたい」と思える構成にします。
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">ランチ</div>
                              <div className="mt-1 text-sm font-semibold">11:30〜14:00</div>
                              <div className="text-xs text-white/60">ラストオーダー 13:30</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">ディナー</div>
                              <div className="mt-1 text-sm font-semibold">17:30〜22:00</div>
                              <div className="text-xs text-white/60">ラストオーダー 21:00</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">アクセス</div>
                              <div className="mt-1 text-sm font-semibold">JRみどり駅 南口 徒歩3分</div>
                              <div className="text-xs text-white/60">駐車場 8台 / 個室あり</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pb-4 pr-4">
                          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">予約</div>
                            <div className="mt-1 text-lg font-bold text-slate-950">空席確認して、そのまま予約</div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">24時間ネット予約・電話・SNSの導線をまとめ、予約の迷いをなくします。</p>
                            <button className="mt-4 w-full rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm">
                              空席を確認して予約する
                            </button>
                          </div>
                          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">注目メニュー</div>
                            <div className="mt-3 space-y-3">
                              {[
                                ["旬の鯛のアクアパッツァ定食", "¥1,500"],
                                ["和牛ハンバーグランチ", "¥1,800"],
                                ["日替わりパスタセット", "¥1,200"],
                              ].map(([name, price]) => (
                                <div key={name} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                                    <div className="mt-1 text-xs text-slate-500">人気 / 写真付き / 予約前に確認</div>
                                  </div>
                                  <div className="text-sm font-bold text-slate-950">{price}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-[1.5rem] border bg-[#fffaf2] p-4 shadow-sm">
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">お知らせ</div>
                            <div className="mt-2 text-sm leading-relaxed text-slate-700">
                              今週のディナーは、季節の魚料理を中心に内容を更新しました。<br />
                              予約前にメニューの写真と価格を確認できます。
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : page.id === "shop" ? (
                    <StorePreview />
                  ) : page.id === "corporate" ? (
                    <CorporatePreview />
                  ) : page.id === "salon" ? (
                    <SalonPreview />
                  ) : page.id === "clinic" ? (
                    <ClinicPreview />
                  ) : (
                    <div className="rounded-[1.5rem] border bg-white px-5 py-10 text-sm text-slate-600">
                      テンプレートを選択してください。
                    </div>
                  )}
                </div>
              </motion.div>

            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  );
}
