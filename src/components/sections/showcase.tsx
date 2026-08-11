"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Factory,
  UtensilsCrossed,
  Scissors,
  Hospital,
  Laptop2,
  Sparkles,
  Lock,
  ArrowRight,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { Section } from "../ui/section";

type Layout =
  | "factory"
  | "construction"
  | "restaurant"
  | "salon"
  | "clinic"
  | "consulting";

type Industry = {
  id: string;
  title: string;
  tag: string;
  icon: typeof Building2;
  /** outer card ambient theme */
  theme: string;
  accent: string;
  domain: string;
  status: string;
  cta: string;
  cta2?: string;
  layout: Layout;
  image: string;
  footer: string;
  demoUrl?: string;
  phone?: string;
  /** modal detail content */
  features: string[];
  sections: { title: string; desc: string; icon: string }[];
  highlights: string[];
};

const industries: Industry[] = [
  {
    id: "factory",
    title: "製造業（工場）",
    tag: "製造業 / 法人向け",
    icon: Factory,
    theme: "from-blue-950 via-blue-900 to-slate-950",
    accent: "#2563eb",
    domain: "www.aomine-seiki.co.jp",
    status: "公開中",
    cta: "カタログPDFをダウンロード",
    cta2: "図面・仕様について相談する",
    layout: "factory",
    image: "/generated/photos-real/factory.jpg",
    footer: "© 青峰精機",
    demoUrl: "/portfolio/factory.html",
    phone: "相談受付",
    features: ["製品カタログの掲載", "お問い合わせフォーム", "会社概要・設備紹介", "SEO対策済み"],
    sections: [
      { title: "ヒーロー", desc: "工場の全景写真と企業メッセージで第一印象を構築", icon: "Monitor" },
      { title: "製品紹介", desc: "カテゴリ別の製品一覧とスペック表、カタログPDFダウンロード", icon: "Image" },
      { title: "設備・実績", desc: "製造設備の一覧と導入事例を写真付きで紹介", icon: "Award" },
      { title: "会社情報", desc: "沿革・代表挨拶・アクセス情報で信頼感を演出", icon: "Globe" },
      { title: "お問い合わせ", desc: "フォーム・電話・地図を一画面に集約し、コンバージョンを最大化", icon: "MessageSquare" },
      { title: "スマホ対応", desc: "レスポンシブ対応で現場や外出先からも閲覧可能", icon: "Smartphone" },
    ],
    highlights: ["B2B顧客向けの信頼感演出", "製品情報を論理的に整理", "見積もり依頼の導線強化"],
  },
  {
    id: "construction",
    title: "建設業",
    tag: "編集型 / 会社案内",
    icon: Building2,
    theme: "from-zinc-900 via-neutral-800 to-slate-950",
    accent: "#d4d4d8",
    domain: "www.too-kensetsu.jp",
    status: "公開中",
    cta: "工事の相談をする",
    cta2: "施工事例一覧を見る",
    layout: "construction",
    image: "/generated/photos-real/office.jpg",
    footer: "© 東央建設",
    demoUrl: "/portfolio/construction.html",
    phone: "相談受付",
    features: ["施工事例ギャラリー", "会社概要・沿革", "工事の流れ解説", "スマホ対応"],
    sections: [
      { title: "ヒーロー", desc: "完成写真スライダーとキャッチコピーで施工力をアピール", icon: "Monitor" },
      { title: "施工事例", desc: "現場写真・工期・工事内容をカード形式で一覧表示", icon: "Image" },
      { title: "会社紹介", desc: "代表挨拶・会社沿革・資格・安全方針を掲載", icon: "Globe" },
      { title: "工事の流れ", desc: "見積もり〜着工〜完成までのステップを図解", icon: "ChevronRight" },
      { title: "お問い合わせ", desc: "簡易フォームと電話番号を常に表示", icon: "MessageSquare" },
      { title: "SEO対策", desc: "地域名＋工事種別で検索上位を狙う構造", icon: "Search" },
    ],
    highlights: ["地域密着型の施工実績アピール", "初見の安心感を高める信頼設計", "見積もり依頼の導線最適化"],
  },
  {
    id: "restaurant",
    title: "飲食業",
    tag: "飲食 / 予約導線",
    icon: UtensilsCrossed,
    theme: "from-orange-200 via-amber-100 to-stone-100",
    accent: "#ea580c",
    domain: "www.aoi-dining.jp",
    status: "公開中",
    cta: "空席を確認して予約する",
    cta2: "ランチメニューを見る",
    layout: "restaurant",
    image: "/generated/real-photo-set/restaurant-real.jpg",
    footer: "© 青葉ダイニング",
    demoUrl: "/portfolio/restaurant.html",
    phone: "予約受付",
    features: ["メニュー・料金表", "ネット予約導線", "店舗情報・アクセス", "SNS連携"],
    sections: [
      { title: "ヒーロー", desc: "料理の魅力的な写真と店舗の雰囲気を一目で伝達", icon: "Monitor" },
      { title: "メニュー紹介", desc: "料理写真・料金・アレルギー情報をカテゴリ別に整理", icon: "Image" },
      { title: "予約導線", desc: "外部予約サイトへのボタンと電話番号を即座に表示", icon: "Phone" },
      { title: "店舗情報", desc: "アクセス・営業時間・定休日・席数を視覚的に整理", icon: "MapPin" },
      { title: "お知らせ", desc: "新メニュー・イベント・休業日をお知らせ欄で更新", icon: "Calendar" },
      { title: "スマホ最適化", desc: "来店前のスマホ閲覧に最適化した画面設計", icon: "Smartphone" },
    ],
    highlights: ["料理写真で来店動機を創出", "予約ボタンまで3クリック以内", "Googleマップ連携でアクセス性向上"],
  },
  {
    id: "salon",
    title: "美容室",
    tag: "美容 / 予約導線",
    icon: Scissors,
    theme: "from-rose-100 via-pink-50 to-white",
    accent: "#db2777",
    domain: "www.atelier-ao.jp",
    status: "公開中",
    cta: "ネット予約へ進む",
    cta2: "今週の空き枠を確認",
    layout: "salon",
    image: "/generated/photos-real/salon-gpt.jpg",
    footer: "© アトリエ アオ サロン",
    demoUrl: "/portfolio/salon.html",
    phone: "予約受付",
    features: ["スタイリスト紹介", "ネット予約", "料金メニュー", "SNSギャラリー連携"],
    sections: [
      { title: "ヒーロー", desc: "店内の洗練された空間写真とコンセプトメッセージ", icon: "Monitor" },
      { title: "スタイリスト", desc: "各スタイリストの経歴・得意スタイル・担当メニューを掲載", icon: "Star" },
      { title: "料金メニュー", desc: "カット・カラー・パーマ等のメニューをわかりやすく一覧", icon: "Image" },
      { title: "スタイル集", desc: "SNS Instagram連携で最新スタイルをリアルタイム表示", icon: "Image" },
      { title: "予約導線", desc: "ネット予約ボタンと電話番号をヘッダーに常時表示", icon: "Phone" },
      { title: "アクセス", desc: "Googleマップ埋め込みと駐車場情報を掲載", icon: "MapPin" },
    ],
    highlights: ["スタイリストの個性で選択動機を演出", "Instagram連携で新規集客", "スマホからの予約完了率を最大化"],
  },
  {
    id: "clinic",
    title: "整骨院・接骨院",
    tag: "医療 / 信頼設計",
    icon: Hospital,
    theme: "from-emerald-100 via-white to-cyan-100",
    accent: "#059669",
    domain: "www.midori-seikotsu.jp",
    status: "公開中",
    cta: "当日受付で予約する",
    cta2: "初診の症状相談（無料）",
    layout: "clinic",
    image: "/generated/photos-real/clinic-gpt.jpg",
    footer: "© みどり整骨院",
    demoUrl: "/portfolio/clinic.html",
    phone: "受付案内",
    features: ["症状別メニュー", "オンライン予約", "アクセス・駐車場", "初診安心ガイド"],
    sections: [
      { title: "ヒーロー", desc: "清潔な院内写真と「初診の方へ」の安心メッセージ", icon: "Monitor" },
      { title: "施術メニュー", desc: "症状別の施術内容・料金・所要時間をわかりやすく整理", icon: "Image" },
      { title: "院長紹介", desc: "資格・経験年数・理念を掲載し、信頼感を構築", icon: "Award" },
      { title: "初診ガイド", desc: "初めての方のための流れ・持ち物・保険適用を解説", icon: "ChevronRight" },
      { title: "予約・アクセス", desc: "オンライン予約とGoogleマップ・駐車場情報を常時表示", icon: "MapPin" },
      { title: "スマホ対応", desc: "来院前のスマホ確認に最適化したUI", icon: "Smartphone" },
    ],
    highlights: ["初診の不安を解消する安心設計", "症状から施術まで3クリック", "Googleビジネスプロフィール連携"],
  },
  {
    id: "consulting",
    title: "IT・コンサルティング",
    tag: "法人向け業務支援 / 成長支援",
    icon: Laptop2,
    theme: "from-slate-950 via-slate-900 to-indigo-950",
    accent: "#6366f1",
    domain: "www.north-consulting.jp",
    status: "公開中",
    cta: "相談内容を送る",
    cta2: "サービス資料を見る",
    layout: "consulting",
    image: "/generated/photos-real/consulting-gpt.jpg",
    footer: "© ノースコンサルティング",
    demoUrl: "/portfolio/consulting.html",
    phone: "相談受付",
    features: ["サービス紹介", "導入事例", "会社概要・実績", "お問い合わせフォーム"],
    sections: [
      { title: "ヒーロー", desc: "ダークテーマでプロフェッショナル感を演出するファーストビュー", icon: "Monitor" },
      { title: "サービス一覧", desc: "提供サービスをアイコン＋説明で論理的に整理", icon: "Globe" },
      { title: "導入事例", desc: "業種別の成功事例を定量的な成果とともに紹介", icon: "TrendingUp" },
      { title: "会社情報", desc: "設立背景・ミッション・チーム紹介で差別化を表現", icon: "Globe" },
      { title: "お問い合わせ", desc: "相談フォームと資料ダウンロードの導線を設置", icon: "MessageSquare" },
      { title: "SEO対策", desc: "サービス名＋地域で検索上位を狙う内部構造", icon: "Search" },
    ],
    highlights: ["法人向けの知的プロフェッショナル感", "導入事例で説得力を補強", "資料DL→相談のコンバージョン導線"],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared browser chrome                                              */
/* ------------------------------------------------------------------ */

function BrowserChrome({ item }: { item: Industry }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/5 bg-slate-100/90 px-3.5 py-2.5 backdrop-blur">
      <div className="flex gap-1.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 text-[10px] text-slate-400">
        <Lock className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
        <span className="truncate font-medium text-slate-500">
          {item.domain}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS mock preview                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  業種別プレビュー（6種類完全分岐）                                    */
/* ------------------------------------------------------------------ */

const IMG = {
  factory: "/generated/photos-real/factory.jpg",
  factoryGallery1: "/generated/photos-real/factory-gallery1.jpg",
  constructionGallery1: "/generated/photos-real/construction-gallery1.jpg",
  constructionGallery2: "/generated/photos-real/construction-gallery2.jpg",
  restaurantReal: "/generated/real-photo-set/restaurant-real.jpg",
  restaurantAbout: "/generated/photos-real/restaurant-about.jpg",
  restaurantGallery1: "/generated/photos-real/restaurant-gallery1.jpg",
  salonGpt: "/generated/photos-real/salon-gpt.jpg",
  clinicGpt: "/generated/photos-real/clinic-gpt.jpg",
  consultingGpt: "/generated/photos-real/consulting-gpt.jpg",
} as const;

function FactoryPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-white">
      {/* ナビ: 白背景 + ロゴ「青峰精機」+ メニュー */}
      <nav className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Factory className="h-3.5 w-3.5 text-blue-700" />
          <span className="text-[10px] font-extrabold tracking-tight text-slate-800">青峰精機</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
          <span>製品</span><span>設備</span><span>会社</span><span>お問い合わせ</span>
        </div>
      </nav>

      {/* ヒーロー: factory.jpg フル幅(130px) + ダークブルーオーバーレイ + 統計3つ小バッジ */}
      <div className="relative h-[130px] shrink-0 overflow-hidden">
        <img src={IMG.factory} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-blue-950/60" />
        <div className="absolute inset-x-0 bottom-0 flex gap-1.5 p-2">
          {["設立40年", "社員85名", "ISO9001"].map((s) => (
            <span key={s} className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* コンテンツ: 左テキスト「CNC旋盤」+ 右に factory-gallery1.jpg 小サムネ(60px) */}
      <div className="flex flex-1 items-center gap-2 bg-blue-50/50 px-3 py-2">
        <div className="flex-1">
          <div className="text-[8px] font-bold uppercase tracking-wider text-blue-600">PRODUCT</div>
          <div className="mt-0.5 text-[11px] font-extrabold leading-tight text-slate-800">CNC旋盤</div>
          <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-slate-500">
            高精度加工で多品種少量生産をサポート。φ320mmまで対応。
          </p>
        </div>
        <img
          src={IMG.factoryGallery1}
          alt="工場ギャラリー"
          loading="lazy"
          decoding="async"
          className="h-[60px] w-[60px] shrink-0 rounded-md border border-slate-200 object-cover shadow-sm"
        />
      </div>

      {/* CTA: 青い「お問い合わせ」ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> お問い合わせ
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
          <ArrowRight className="h-2.5 w-2.5" /> カタログDL
        </div>
      </div>
    </div>
  );
}

function ConstructionPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-white">
      {/* ナビ: 白背景 + ロゴ「東央建設」+ TEL番号 */}
      <nav className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-zinc-700" />
          <span className="text-[10px] font-extrabold tracking-tight text-slate-800">東央建設</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-700">
          <Phone className="h-2.5 w-2.5" />
          <span>03-1234-5678</span>
        </div>
      </nav>

      {/* ヒーロー: construction-gallery1.jpg フル幅(130px) + 暗いオーバーレイ + 中央寄せ「品質と信頼の建築」 */}
      <div className="relative h-[130px] shrink-0 overflow-hidden">
        <img
          src={IMG.constructionGallery1}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-neutral-950/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h3 className="text-sm font-extrabold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
            品質と信頼の建築
          </h3>
          <p className="mt-0.5 text-[8px] font-medium text-white/80">創業55年の確かな技術</p>
        </div>
      </div>

      {/* コンテンツ: 左に construction-gallery2.jpg 小サムネ + 右に施工事例テキスト */}
      <div className="flex flex-1 items-center gap-2 bg-neutral-50/60 px-3 py-2">
        <img
          src={IMG.constructionGallery2}
          alt="施工事例"
          loading="lazy"
          decoding="async"
          className="h-[56px] w-[56px] shrink-0 rounded-md border border-slate-200 object-cover shadow-sm"
        />
        <div className="flex-1">
          <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">WORKS</div>
          <div className="mt-0.5 text-[10px] font-bold leading-tight text-slate-800">〇〇ビル新築工事</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[8px] text-slate-500">
            <span>工期: 2024.4〜12</span>
            <span>•</span>
            <span>延床1,200㎡</span>
          </div>
        </div>
      </div>

      {/* CTA: グレー「見積もり相談」ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-zinc-700 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> 見積もり相談
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
          <ArrowRight className="h-2.5 w-2.5" /> 施工事例一覧
        </div>
      </div>
    </div>
  );
}

function RestaurantPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-white">
      {/* ナビ: オレンジアクセント + 「青葉ダイニング」+ 営業時間バッジ */}
      <nav className="flex shrink-0 items-center justify-between border-b border-orange-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-[10px] font-extrabold tracking-tight text-slate-800">青葉ダイニング</span>
        </div>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-600">
          17:00〜24:00 営業中
        </span>
      </nav>

      {/* ヒーロー: restaurant-real.jpg フル幅(130px) + 温かいオレンジオーバーレイ + 「一皿の幸せ」 */}
      <div className="relative h-[130px] shrink-0 overflow-hidden">
        <img
          src={IMG.restaurantReal}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-orange-950/70 via-orange-900/25 to-orange-800/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          <h3 className="text-base font-extrabold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            一皿の幸せ
          </h3>
          <p className="mt-0.5 text-[8px] font-medium text-white/85">季節の食材と職人のこだわり</p>
        </div>
      </div>

      {/* コンテンツ: 左に restaurant-about.jpg 円形(40px) + 料理人名 + 右に restaurant-gallery1.jpg 小サムネ */}
      <div className="flex flex-1 items-center gap-2 bg-orange-50/40 px-3 py-2">
        <img
          src={IMG.restaurantAbout}
          alt="料理人"
          loading="lazy"
          decoding="async"
          className="h-[40px] w-[40px] shrink-0 rounded-full border-2 border-orange-200 object-cover"
        />
        <div className="flex-1">
          <div className="text-[8px] font-bold uppercase tracking-wider text-orange-500">CHEF</div>
          <div className="mt-0.5 text-[10px] font-bold leading-tight text-slate-800">料理人 青葉太郎</div>
          <p className="mt-0.5 line-clamp-1 text-[8px] text-slate-500">京都修業15年・季節のコース</p>
        </div>
        <img
          src={IMG.restaurantGallery1}
          alt="料理"
          loading="lazy"
          decoding="async"
          className="h-[48px] w-[48px] shrink-0 rounded-md border border-orange-100 object-cover shadow-sm"
        />
      </div>

      {/* CTA: オレンジ「予約する」ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-t border-orange-100 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> 予約する
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-orange-600">
          <ArrowRight className="h-2.5 w-2.5" /> メニューを見る
        </div>
      </div>
    </div>
  );
}

function SalonPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-white">
      {/* ナビ: ローズアクセント + セリフロゴ「アトリエアオ」 */}
      <nav className="flex shrink-0 items-center justify-between border-b border-rose-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-[11px] font-serif font-bold tracking-wide text-slate-800">Atelier AO</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
          <span>メニュー</span><span>スタイル</span><span>予約</span>
        </div>
      </nav>

      {/* ヒーロー: 左右スプリット — 左60%タイトル + 右40% salon-gpt.jpg (四角いカット) */}
      <div className="flex h-[130px] shrink-0 overflow-hidden bg-rose-50/40">
        <div className="flex w-[60%] flex-col justify-center px-3">
          <div className="text-[8px] font-bold uppercase tracking-widest text-rose-400">SALON</div>
          <h3 className="mt-0.5 text-[13px] font-serif font-bold leading-tight text-slate-800">
            雑誌で見るような<br />スタイル
          </h3>
          <p className="mt-1 text-[8px] text-slate-500">一人ひとりに似合わせる技術</p>
        </div>
        <div className="w-[40%] overflow-hidden">
          <img
            src={IMG.salonGpt}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* コンテンツ: 料金カード3つ横並び(カット¥5,500 / カラー¥8,800 / パーマ¥7,700) ピンク背景 */}
      <div className="flex flex-1 items-center gap-1.5 bg-rose-50/60 px-3 py-2">
        {[
          { label: "カット", price: "¥5,500" },
          { label: "カラー", price: "¥8,800" },
          { label: "パーマ", price: "¥7,700" },
        ].map((m) => (
          <div key={m.label} className="flex-1 rounded-lg border border-rose-100 bg-white px-1.5 py-1.5 text-center shadow-sm">
            <div className="text-[8px] font-semibold text-rose-400">{m.label}</div>
            <div className="mt-0.5 text-[10px] font-extrabold text-slate-800">{m.price}</div>
          </div>
        ))}
      </div>

      {/* CTA: ピンク「ネット予約」ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-t border-rose-100 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> ネット予約
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-500">
          今週の空き枠
        </div>
      </div>
    </div>
  );
}

function ClinicPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-white">
      {/* ナビ: グリーンアクセント + 「みどり整骨院」 */}
      <nav className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Hospital className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[10px] font-extrabold tracking-tight text-slate-800">みどり整骨院</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
          <span>施術</span><span>初診</span><span>アクセス</span>
        </div>
      </nav>

      {/* 統計バナー3つ(施術12,000件 / 初診無料 / 保険対応) 緑背景 */}
      <div className="flex shrink-0 gap-px bg-emerald-600">
        {[
          { num: "12,000件", label: "施術実績" },
          { num: "初診無料", label: "まずはご相談" },
          { num: "保険対応", label: "安心の料金" },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-emerald-600 px-1 py-1 text-center">
            <div className="text-[10px] font-extrabold leading-none text-white">{s.num}</div>
            <div className="mt-0.5 text-[7px] font-medium text-emerald-100">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ヒーロー: clinic-gpt.jpg フル幅(100px) + グリーンオーバーレイ + 「まずはご相談ください」 */}
      <div className="relative h-[100px] shrink-0 overflow-hidden">
        <img
          src={IMG.clinicGpt}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-emerald-900/45" />
        <div className="absolute inset-0 flex flex-col justify-end p-2.5">
          <h3 className="text-[12px] font-extrabold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            まずはご相談ください
          </h3>
          <p className="mt-0.5 text-[8px] font-medium text-white/85">痛みのない日常を一緒に取り戻しましょう</p>
        </div>
      </div>

      {/* コンテンツ: 症状カード3つ小さく(腰痛 / 肩こり / 膝痛) 緑枠 */}
      <div className="flex flex-1 items-center gap-1.5 bg-emerald-50/40 px-3 py-2">
        {["腰痛", "肩こり", "膝痛"].map((sym) => (
          <div
            key={sym}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-white px-1 py-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-800">{sym}</span>
          </div>
        ))}
      </div>

      {/* CTA: 緑「当日受付」ボタン */}
      <div className="flex shrink-0 items-center gap-2 border-t border-emerald-100 bg-white px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> 当日受付
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-emerald-600">
          初診無料相談
        </div>
      </div>
    </div>
  );
}

function ConsultingPreview({ item }: { item: Industry }) {
  return (
    <div className="flex h-[320px] flex-col overflow-hidden bg-slate-950">
      {/* ナビ: ダーク背景(#0f172a) + 明るいテキスト「ノースコンサルティング」 */}
      <nav className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Laptop2 className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[10px] font-extrabold tracking-tight text-white">ノースコンサルティング</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-300">
          <span>サービス</span><span>事例</span><span>会社</span>
        </div>
      </nav>

      {/* ヒーロー: consulting-gpt.jpg フル幅(130px) + 強いダークオーバーレイ + グラデーションテキスト「ビジネスを加速」 */}
      <div className="relative h-[130px] shrink-0 overflow-hidden">
        <img
          src={IMG.consultingGpt}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="absolute inset-0 flex flex-col justify-center px-3">
          <div className="text-[8px] font-bold uppercase tracking-widest text-indigo-400">CONSULTING</div>
          <h3 className="mt-0.5 bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-base font-extrabold leading-tight text-transparent">
            ビジネスを加速
          </h3>
          <p className="mt-0.5 text-[8px] font-medium text-slate-300">DXとクラウドで次の成長段階へ</p>
        </div>
      </div>

      {/* コンテンツ: ダーク背景カード2つ(DX支援 / クラウド移行) インディゴborder */}
      <div className="flex flex-1 items-center gap-1.5 bg-slate-950 px-3 py-2">
        {[
          { title: "DX支援", desc: "業務プロセスの可視化と自動化" },
          { title: "クラウド移行", desc: "安全なインフラ移行と運用" },
        ].map((c) => (
          <div
            key={c.title}
            className="flex-1 rounded-lg border border-indigo-500/40 bg-slate-900/80 px-2 py-1.5 shadow-sm"
          >
            <div className="text-[10px] font-extrabold text-indigo-300">{c.title}</div>
            <p className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-slate-400">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA: インディゴ「相談する」ボタン + 白テキスト */}
      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-slate-950 px-3 py-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm">
          <Phone className="h-2.5 w-2.5" /> 相談する
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300">
          <ArrowRight className="h-2.5 w-2.5" /> 資料ダウンロード
        </div>
      </div>
    </div>
  );
}

function renderSite(item: Industry) {
  switch (item.layout) {
    case "factory":
      return <FactoryPreview item={item} />;
    case "construction":
      return <ConstructionPreview item={item} />;
    case "restaurant":
      return <RestaurantPreview item={item} />;
    case "salon":
      return <SalonPreview item={item} />;
    case "clinic":
      return <ClinicPreview item={item} />;
    case "consulting":
      return <ConsultingPreview item={item} />;
    default:
      return null;
  }
}


/* ------------------------------------------------------------------ */
/*  Card shell                                                         */
/* ------------------------------------------------------------------ */

function SiteCard({ item, index }: { item: Industry; index: number }) {
  return (
    <motion.a
      href={item.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-black/5 bg-white shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
    >
      {/* category tag chip */}
      <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-slate-700 shadow-sm backdrop-blur">
        <item.icon className="h-3 w-3" style={{ color: item.accent }} />
        {item.tag}
      </div>

      {/* ambient themed wrapper around the browser */}
      <div className={`flex flex-1 bg-gradient-to-br ${item.theme} p-3`}>
        <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl transition-transform duration-300 group-hover:scale-[1.015]">
          <BrowserChrome item={item} />
          <div className="flex-1 overflow-hidden">{renderSite(item)}</div>
        </div>
      </div>
    </motion.a>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export default function Showcase() {
  return (
    <Section id="showcase" className="bg-muted/20">
      <div className="mx-auto max-w-container">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            実写真と完成画面を並べて確認できます
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            写真が先に見えて、<span className="text-blue-600">完成後の雰囲気がすぐ伝わる</span>構成にしました。
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            実写真と完成画面を組み合わせ、業種ごとの仕上がりを具体的に確認できます。
            写真で空気感を伝えたうえで、完成画面で導線や機能を確認できる構成です。
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["製造現場の写真", "/generated/photos-real/factory.jpg"],
            ["飲食店の写真", "/generated/real-photo-set/restaurant-real.jpg"],
            ["美容室の写真", "/generated/photos-real/salon-gpt.jpg"],
            ["クリニックの写真", "/generated/photos-real/clinic-gpt.jpg"],
            ["完成画面", "/generated/photos-real/restaurant2.jpg"],
          ].map(([label, src]) => (
            <div key={label} className="group overflow-hidden rounded-3xl border bg-white shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={src} alt={label} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 backdrop-blur">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {industries.map((item, index) => (
            <SiteCard key={item.id} item={item} index={index} />
          ))}
        </div>

        <div className="mt-10 rounded-3xl border bg-card p-6 shadow-sm">
          <div className="mb-3 text-center text-sm font-semibold text-muted-foreground">
            どの業種でも、公開後に使いやすい3つの共通設計
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["信頼感の構築", "所在地・沿革・代表者・実績・資格を整理し、初見で安心感が伝わる構成"],
              ["問い合わせしやすい導線", "電話・フォーム・地図・予約を一画面に集約し、迷わず次の行動へ進める"],
              ["運用のしやすさ", "お知らせ更新や画像差し替えを、社内で無理なく続けられる設計"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border bg-muted/30 p-4">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
