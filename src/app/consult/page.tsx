"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Send,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Lightbulb,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Palette,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  データ定義                                                          */
/* ------------------------------------------------------------------ */

/** 1-1. 事業種サジェスト（カテゴリ別） */
const BUSINESS_SUGGESTIONS: { category: string; items: string[] }[] = [
  {
    category: "製造・工業系",
    items: ["製造業", "機械加工", "食品製造", "化学", "電子部品", "金属加工"],
  },
  {
    category: "建設・不動産",
    items: ["建設業", "工務店", "不動産", "内装", "リフォーム", "土木"],
  },
  {
    category: "飲食・サービス",
    items: ["飲食業", "美容室", "理美容", "整骨院", "整体", "フィットネス", "学習塾", "保育園"],
  },
  {
    category: "小売・商売",
    items: ["小売業", "ECサイト", "飲食店", "アパレル", "雑貨屋"],
  },
  {
    category: "専門・士業",
    items: ["弁護士", "税理士", "行政書士", "コンサルティング", "IT"],
  },
  {
    category: "その他",
    items: ["その他"],
  },
];

/** 3-2. 配色イメージ */
const COLOR_SCHEMES = [
  { value: "blue", label: "青系", desc: "信頼・清潔・ビジネス", dot: "bg-blue-500" },
  { value: "white", label: "白・グレー系", desc: "シンプル・スタイリッシュ・モダン", dot: "bg-gray-300 border border-gray-400" },
  { value: "warm", label: "暖色系", desc: "オレンジ・赤・黄（親しみ・温かみ・活力）", dot: "bg-orange-500" },
  { value: "green", label: "緑系", desc: "自然・癒し・健康", dot: "bg-green-500" },
  { value: "dark", label: "黒・ダーク系", desc: "高級感・洗練・IT", dot: "bg-gray-800" },
  { value: "none", label: "特に指定なし", desc: "お任せします", dot: "bg-gradient-to-br from-pink-400 via-yellow-400 to-blue-400" },
];

/** 3-3. 参考サイト — 種類（ラベル/タイプ） */
const REF_SITE_TYPES = [
  { value: "competitor", label: "競合他社のサイト" },
  { value: "industry", label: "同業他社のサイト" },
  { value: "design", label: "デザインの参考" },
  { value: "layout", label: "レイアウト・構成の参考" },
  { value: "color", label: "色使いの参考" },
  { value: "image", label: "写真・ビジュアルの参考" },
  { value: "other", label: "その他" },
];

/** 3-3. 参考サイト — どの程度再現してほしいか（3段階） */
const FOLLOW_LEVELS = [
  {
    value: "close",
    label: "かなり忠実に",
    desc: "構成やデザインを近づけたい",
  },
  {
    value: "partial",
    label: "一部だけ取り入れたい",
    desc: "好きな部分だけ参考にしたい",
  },
  {
    value: "inspiration",
    label: "参考程度",
    desc: "雰囲気・方向性だけ参考にしたい",
  },
];

/** 3-4. リニューアル時の課題 */
const CURRENT_ISSUES = [
  "デザインが古い",
  "スマホで見にくい",
  "更新ができない・放置している",
  "問い合わせが来ない",
  "競合と比べて見劣りする",
  "検索で出てこない",
];

/**
 * 4-1. サイトの主な目的 — カテゴリ別（プログレッシブ開示用）
 * すべての選択肢を維持しつつ、カテゴリボタンで1カテゴリ分だけ表示する。
 * 「その他」はカテゴリボタンの一つとして扱い、自由入力とセットで出す。
 */
const SITE_PURPOSE_GROUPS: { key: string; items: string[] }[] = [
  {
    key: "信頼・ブランド",
    items: ["会社の信頼性をアピールしたい", "ブランドイメージを向上させたい"],
  },
  {
    key: "集客・反響",
    items: ["サービス・商品を知ってもらいたい", "問い合わせ・予約を増やしたい"],
  },
  {
    key: "実績・採用",
    items: ["実績・施工事例を見せたい", "採用情報を掲載したい"],
  },
  {
    key: "SNS・連携",
    items: ["SNSと連携したい"],
  },
];

/**
 * 4-2. 必要なページ・機能 — カテゴリ別（プログレッシブ開示用）
 * すべての選択肢を維持しつつ、カテゴリボタンで1カテゴリ分だけ表示する。
 * 「その他」はカテゴリボタンの一つとして扱い、自由入力とセットで出す。
 */
const FEATURE_GROUPS: { key: string; items: string[] }[] = [
  {
    key: "会社情報",
    items: ["会社案内（代表挨拶・沿革・アクセス）", "スタッフ紹介"],
  },
  {
    key: "サービス・料金",
    items: ["サービス・メニュー・料金表", "料金表・コース一覧"],
  },
  {
    key: "実績・発信",
    items: ["実績・施工事例・ギャラリー", "ブログ・お知らせ", "よくある質問（FAQ）"],
  },
  {
    key: "反響・導線",
    items: [
      "お問い合わせフォーム",
      "電話番号・アクセスの目立つ表示",
      "予約・お申し込み導線（外部サービスへのリンク）",
    ],
  },
  {
    key: "連携・地図",
    items: ["Googleマップ埋め込み", "SNS連携（Instagram・LINE・X）"],
  },
];

/** 4-3. 公開希望時期 */
const TIMING_OPTIONS = [
  { value: "asap", label: "できるだけ早く（1〜2週間）" },
  { value: "1month", label: "1ヶ月以内" },
  { value: "3months", label: "3ヶ月以内" },
  { value: "no-rush", label: "特に急ぎではない" },
];

/** 5-1. 予算プラン（詳細説明付き） */
const BUDGET_OPTIONS = [
  {
    value: "9800",
    label: "¥9,800/月",
    desc: "会社案内5〜10ページ・お問い合わせ・月3回更新・サーバー込み",
  },
  {
    value: "15000",
    label: "¥15,000/月",
    desc: "ブログ・SNS連携・20ページ・月5回更新・SEO対策強化",
  },
  {
    value: "20000",
    label: "¥20,000/月",
    desc: "多機能・ページ無制限・月10回更新・カスタム機能対応",
  },
  {
    value: "unknown",
    label: "わからない",
    desc: "ご要望をもとに最適なプランをご提案します",
  },
];

/** 6-2. 素材・資料の準備状況（複数選択可） */
const ASSET_OPTIONS = [
  { value: "logo", label: "ロゴデータ" },
  { value: "photos", label: "写真・画像" },
  { value: "copy", label: "文章・キャッチコピー" },
  { value: "company", label: "会社概要・会社案内の資料" },
  { value: "service", label: "製品・サービスの資料" },
  { value: "none", label: "まだ何もない（すべてお任せ）" },
];

/** 6-2. アップロード素材 — 素材の役割（用途） */
const MATERIAL_ROLES = [
  { value: "logo", label: "ロゴ・マーク" },
  { value: "company", label: "会社案内・会社概要" },
  { value: "product", label: "製品・商品カタログ" },
  { value: "photos", label: "写真・画像（店舗・施工・商品など）" },
  { value: "price", label: "料金表・メニュー表" },
  { value: "copy", label: "文章・キャッチコピー（文案）" },
  { value: "reference", label: "参考資料（デザイン・競合資料など）" },
  { value: "other", label: "その他" },
];

/** 6-2. アップロード素材 — この素材の使い方（3段階） */
const USE_POLICIES = [
  { value: "mustUse", label: "必ず使う", desc: "必ずサイトへ反映してほしい" },
  { value: "useIfSuitable", label: "合えば使う", desc: "デザインに合えば活用してほしい" },
  { value: "referenceOnly", label: "参考だけ", desc: "方向性の参考として扱う" },
];

/** 6-3. 足りない写真・文章の補充について */
const SUPPLEMENT_OPTIONS = [
  { value: "all", label: "足りないものはすべて金井に作成・撮影してほしい" },
  { value: "partial", label: "一部のみ補充してほしい（要相談）" },
  { value: "self", label: "写真・文章はこちらで用意する" },
];

/** 6-3. お送りいただく素材の編集・加工について */
const ALLOW_EDIT_OPTIONS = [
  { value: "yes", label: "編集・加工・トリミングOK" },
  { value: "partial", label: "一部のみ（要相談）" },
  { value: "no", label: "原則としてそのまま使ってほしい" },
];

/* ------------------------------------------------------------------ */
/*  フォームStateの型                                                    */
/* ------------------------------------------------------------------ */

/** 参考サイト1件分の構造化データ */
interface ReferenceSite {
  id: string;
  /** 種類（競合／デザイン参考／レイアウト参考／色参考 ...） */
  type: string;
  /** URL */
  url: string;
  /** 参考にしたい部分 */
  whatToReference: string;
  /** とくに好きな箇所・コンポーネント */
  likedSections: string;
  /** どの程度再現してほしいか（close / partial / inspiration） */
  followLevel: string;
}

/** アップロード素材1件分のメタデータ（JSON安全・Fileオブジェクトは持たない） */
interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  /** 素材の役割（ロゴ／会社案内／商品カタログ／写真／料金・メニュー／文案／参考資料／その他） */
  role: string;
  /** この素材の使い方（mustUse / useIfSuitable / referenceOnly） */
  usePolicy: string;
  /** メモ（任意） */
  memo: string;
}

interface FormData {
  // Step 1
  businessType: string;
  currentWebsite: string;
  noWebsite: boolean;
  companyName: string;
  // Step 2
  targetCustomer: string;
  sellingPoints: string;
  mustIncludeInfo: string;
  avoidItems: string;
  currentSiteIssues: string;
  // Step 3
  desiredImage: string;
  colorScheme: string;
  referenceSites: ReferenceSite[];
  currentIssues: string[];
  currentIssuesOther: string;
  // Step 4
  sitePurpose: string[];
  sitePurposeOther: string;
  features: string[];
  featuresOther: string;
  timing: string;
  // Step 5
  budget: string;
  annualPayment: string;
  // Step 6
  message: string;
  assetsStatus: string[];
  /** アップロード素材のメタデータ一覧（Fileオブジェクトは含まない） */
  attachments: Attachment[];
  /** 足りない素材の補充について（all / partial / self） */
  supplement: string;
  /** 既存素材の編集・加工について（yes / partial / no） */
  allowEdit: string;
  // Step 7
  name: string;
  email: string;
  phone: string;
  enterpriseName: string;
}

/* ------------------------------------------------------------------ */
/*  送信結果（API レスポンスのうち完了画面で使う部分）                    */
/* ------------------------------------------------------------------ */

/** メール送信1件の結果（API の MailResult から必要な分だけ） */
interface MailResultLite {
  /** 実行したプロバイダ名（"log" / "smtp"） */
  provider: string;
  /** 宛先一覧 */
  accepted: string[];
  /** メッセージID（ログ時は null） */
  messageId: string | null;
  /** 送信結果ステータス */
  status: "sent" | "logged" | "error";
  /** エラー時の理由 */
  error?: string;
  /** ログプロバイダの保存先パス */
  artifactPath?: string;
}

/** 完了画面で表示するメール送信サマリ */
interface MailSummary {
  /** 解決されたプロバイダ（"log" | "smtp" | "relay"） */
  provider: string;
  /** プロバイダ選定の理由（UI 表示用） */
  providerReason: string;
  /** 社内通知の結果 */
  internal: MailResultLite | null;
  /** お客様ご案内メールの結果 */
  customer: MailResultLite | null;
}

/** API から返るインテイク品質評価（完了画面を提案完成/追加情報依頼で切り替える） */
interface ConsultQualityLite {
  /** ready: 提案完成 / needs_followup: 追加情報依頼 */
  status: "ready" | "needs_followup";
  /** 0〜100 のスコア */
  score: number;
  /** 減点理由（社内確認用） */
  reasons: string[];
  /** お客様にお願いする追加入力項目 */
  requestedItems: string[];
  /** お客様への具体的な質問 */
  followupQuestions: string[];
}

/**
 * プロバイダ名から完了画面のバッジ（ラベル + 色）を安全に組み立てる。
 * 未知のプロバイダ名が来ても崩れないように default で受け止める。
 */
function providerBadge(provider: string): { label: string; className: string } {
  switch (provider) {
    case "smtp":
      return { label: "SMTP（実配送）", className: "bg-emerald-100 text-emerald-700" };
    case "relay":
      return { label: "リレー経由（実配送）", className: "bg-emerald-100 text-emerald-700" };
    case "log":
      return { label: "ログ記録モード", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: provider || "不明", className: "bg-slate-100 text-slate-700" };
  }
}

/** 空の参考サイトカードを生成 */
const createEmptyRefSite = (id: string): ReferenceSite => ({
  id,
  type: "",
  url: "",
  whatToReference: "",
  likedSections: "",
  followLevel: "",
});

const INITIAL_REFERENCE_SITES: ReferenceSite[] = [
  createEmptyRefSite("ref-1"),
];

const INITIAL_DATA: FormData = {
  businessType: "",
  currentWebsite: "",
  noWebsite: false,
  companyName: "",
  targetCustomer: "",
  sellingPoints: "",
  mustIncludeInfo: "",
  avoidItems: "",
  currentSiteIssues: "",
  desiredImage: "",
  colorScheme: "",
  referenceSites: INITIAL_REFERENCE_SITES,
  currentIssues: [],
  currentIssuesOther: "",
  sitePurpose: [],
  sitePurposeOther: "",
  features: [],
  featuresOther: "",
  timing: "",
  budget: "",
  annualPayment: "",
  message: "",
  assetsStatus: [],
  attachments: [],
  supplement: "",
  allowEdit: "",
  name: "",
  email: "",
  phone: "",
  enterpriseName: "",
};

/** 参考サイトカードの最大数 */
const MAX_REFERENCE_SITES = 8;

/**
 * ウィザードの7ステップ定義。
 * 既存のSectionCard（Step 1〜7）とタイトルを完全に一致させる。
 * 進捗UI・ステップジャンプ・不足ヒントのマッピングはすべてこの定義を正とする。
 */
const STEPS: { id: number; title: string }[] = [
  { id: 1, title: "事業について" },
  { id: 2, title: "ターゲットと伝えたいこと" },
  { id: 3, title: "どんなホームページにしたいか" },
  { id: 4, title: "サイトの目的と機能" },
  { id: 5, title: "ご予算について" },
  { id: 6, title: "制作素材のご準備" },
  { id: 7, title: "お客様情報" },
];

/** バイト数を読みやすいサイズ表記に変換 */
const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 || value >= 100 ? 0 : 1)} ${units[i]}`;
};

/** MIMEタイプと拡張子から大まかな種別ラベルを生成 */
const getFileKindLabel = (type: string, name: string): string => {
  const lower = name.toLowerCase();
  if (type.startsWith("image/")) return "画像";
  if (type.startsWith("video/")) return "動画";
  if (type.startsWith("audio/")) return "音声";
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (type.includes("word") || /\.(docx?)$/.test(lower)) return "Word";
  if (
    type.includes("excel") ||
    type.includes("sheet") ||
    /\.(xlsx?|csv)$/.test(lower)
  )
    return "表計算";
  if (type.includes("presentation") || /\.(pptx?)$/.test(lower))
    return "プレゼン";
  if (type.includes("zip") || /\.(zip|rar|7z)$/.test(lower))
    return "圧縮ファイル";
  if (type.startsWith("text/") || /\.(txt|md|rtf)$/.test(lower))
    return "テキスト";
  return type || "ファイル";
};

/** 重複排除用のキー（ファイル名・サイズ・更新日時） */
const attachmentKey = (a: {
  name: string;
  size: number;
  lastModified: number;
}): string => `${a.name}|${a.size}|${a.lastModified}`;

/* ------------------------------------------------------------------ */
/*  小物パーツ                                                          */
/* ------------------------------------------------------------------ */

function RequiredMark() {
  return <span className="ml-1 text-red-500 font-bold">*</span>;
}

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-md">
        {step}
      </div>
      <h2 className="text-xl font-bold text-foreground sm:text-2xl">
        Step {step} <span className="text-muted-foreground">—</span> {title}
      </h2>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-10">
      {children}
    </section>
  );
}

/**
 * ウィザードの進捗ヘッダー。
 * 現在位置（Step N / 全7ステップ）・残りステップ数・進捗バー・
 * クリック可能なステップタブを1箇所にまとめる。各ステップは
 * 必須項目が残っていなければ完了（✓）扱いで表示する。
 */
function StepProgress({
  currentStep,
  missingByStep,
  onSelect,
}: {
  currentStep: number;
  missingByStep: number[];
  onSelect: (step: number) => void;
}) {
  const total = STEPS.length;
  const remaining = total - currentStep;
  const currentMeta = STEPS.find((s) => s.id === currentStep);
  const progressPct = Math.round((currentStep / total) * 100);

  return (
    <div className="rounded-3xl border border-border bg-accent/40 p-4 sm:p-6">
      {/* サマリ行：現在位置と残り */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">
          Step <span className="text-primary">{currentStep}</span>/{total}
          <span className="ml-2 font-normal text-muted-foreground">
            {currentMeta?.title}
          </span>
        </p>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">
            残り{remaining}ステップ
          </p>
        )}
      </div>

      {/* 進捗バー */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ステップタブ（クリックで直接移動） */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s) => {
          const isActive = s.id === currentStep;
          const missing = missingByStep[s.id - 1] ?? 0;
          const isComplete = missing === 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={isActive ? "step" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-2 py-1.5 text-left transition-all ${
                isActive
                  ? "bg-white shadow-sm ring-2 ring-primary/30"
                  : "hover:bg-white/70"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-muted-foreground ring-1 ring-border"
                }`}
              >
                {isComplete && !isActive ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  s.id
                )}
              </span>
              <span className="hidden sm:block">
                <span
                  className={`block text-[11px] font-bold ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="mb-4 block text-base font-semibold text-foreground">
      {children}
      {required && <RequiredMark />}
      {hint && (
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

/* ラジオカード */
function RadioCard({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
        checked
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-white hover:border-primary/40 hover:bg-accent"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          checked ? "border-primary bg-primary" : "border-muted-foreground/40"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
      <span className="text-sm font-medium text-foreground sm:text-base">
        {children}
      </span>
    </button>
  );
}

/* チェックボックスカード */
function CheckCard({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
        checked
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-white hover:border-primary/40 hover:bg-accent"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          checked ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="text-sm font-medium text-foreground sm:text-base">
        {children}
      </span>
    </button>
  );
}

/* めくり・タグ型チェックボックス（複数選択） */
function CheckboxTag({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition ${
        selected
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-white text-muted-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

/* サジェストバッジ */
function SuggestTag({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      {label}
    </button>
  );
}

/* 入力フィールドの基本クラス（mt-1 なし） */
const fieldClass =
  "block w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

/* ラベル直下で使う入力クラス（mt-1 付き） */
const inputClass = `mt-1 ${fieldClass}`;

/* 参考サイト1枚のカード */
function ReferenceSiteCard({
  index,
  site,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  site: ReferenceSite;
  onChange: (field: keyof ReferenceSite, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-accent/30 p-5 sm:p-6">
      {/* ヘッダー：番号 + 削除 */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {index}
          </span>
          <span className="text-sm font-bold text-foreground">
            参考サイト {index}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
        )}
      </div>

      {/* 種類 */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          このサイトの役割（種類）
        </span>
        <select
          value={site.type}
          onChange={(e) => onChange("type", e.target.value)}
          className={fieldClass}
        >
          <option value="">参考の種類を選択してください</option>
          {REF_SITE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* URL */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          参考サイトのURL
        </span>
        <input
          type="url"
          value={site.url}
          onChange={(e) => onChange("url", e.target.value)}
          placeholder="https://..."
          className={fieldClass}
        />
      </div>

      {/* 参考にしたい部分 */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          このサイトのどこを参考にしたいか
        </span>
        <textarea
          value={site.whatToReference}
          onChange={(e) => onChange("whatToReference", e.target.value)}
          placeholder="例：トップページの導線、料金表の見せ方、写真の使い方、スマホの使い勝手 ..."
          rows={2}
          className={`${fieldClass} resize-y`}
        />
      </div>

      {/* 好きな箇所・コンポーネント */}
      <div className="mb-4">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          とくに好きな箇所・コンポーネント（任意）
        </span>
        <input
          type="text"
          value={site.likedSections}
          onChange={(e) => onChange("likedSections", e.target.value)}
          placeholder="例：メインビジュアル、お問い合わせボタン、実績のスライダー、フッター ..."
          className={fieldClass}
        />
      </div>

      {/* 再現度（3段階） */}
      <div>
        <span className="mb-2 block text-xs font-medium text-muted-foreground">
          どの程度再現してほしいか
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {FOLLOW_LEVELS.map((lvl) => {
            const active = site.followLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => onChange("followLevel", lvl.value)}
                className={`rounded-xl border-2 px-3 py-2 text-center transition-all ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <span
                  className={`block text-xs font-bold sm:text-sm ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  {lvl.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                  {lvl.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* アップロード素材の品質ガイド（日本語の指定書） */
function UploadSpecGuide() {
  return (
    <details className="group rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-amber-900 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        <Lightbulb className="h-4 w-4 shrink-0" />
        素材データをより良く活かすためのヒント
        <span className="text-xs font-normal text-amber-700/80">
          （対応形式・推奨サイズ・あると助かるもの・取り扱い）
        </span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
            写真・画像
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>対応形式：JPG / PNG / WebP / HEIC</li>
            <li>推奨サイズ：横1,200px以上（メインビジュアルは横1,920px以上で鮮明になります）</li>
            <li>明るく・ピントの合った写真を推奨します</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Palette className="h-3.5 w-3.5 text-amber-600" />
            ロゴ・マーク
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>推奨：ベクターデータ（SVG / PDF / AI / EPS）</li>
            <li>なければ背景透過のPNG（高解像度）でも構いません</li>
            <li>白黒・カラーの両方があると助かります</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <FileText className="h-3.5 w-3.5 text-amber-600" />
            文書・資料
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>対応形式：PDF / Word / Excel / PowerPoint</li>
            <li>Googleドキュメントの共有リンクでもOKです</li>
            <li>会社案内・パンフレット・料金表があると非常に参考になります</li>
          </ul>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            あると助かる素材
          </p>
          <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>名刺・チラシ・パンフレット・会社案内</li>
            <li>商品写真・施工事例・店内・スタッフの写真</li>
            <li>代表挨拶・沿革・キャッチコピー・原稿</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-amber-800/80">
        ※
        お預かりしたデータはご提案の目的でのみ使用します。機密情報はマスキングのうえ送付いただくか、事前にご相談ください。
      </p>
    </details>
  );
}

/* アップロード素材1件のカード（参考サイトカードと同じデザイン言語） */
function AttachmentCard({
  index,
  attachment,
  onChange,
  onRemove,
}: {
  index: number;
  attachment: Attachment;
  onChange: (field: keyof Attachment, value: string) => void;
  onRemove: () => void;
}) {
  const kind = getFileKindLabel(attachment.type, attachment.name);
  return (
    <div className="rounded-2xl border-2 border-border bg-accent/30 p-5 sm:p-6">
      {/* ヘッダー：番号＋ファイル情報＋削除 */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {index}
          </span>
          <div className="min-w-0">
            <p className="break-all text-sm font-bold text-foreground">
              {attachment.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-medium text-foreground ring-1 ring-border">
                {kind}
              </span>
              <span>{formatFileSize(attachment.size)}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
          削除
        </button>
      </div>

      {/* 役割（用途） */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          この素材の役割（用途）
        </span>
        <select
          value={attachment.role}
          onChange={(e) => onChange("role", e.target.value)}
          className={fieldClass}
        >
          <option value="">用途を選択してください</option>
          {MATERIAL_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* 使い方（3段階） */}
      <div className="mb-3">
        <span className="mb-2 block text-xs font-medium text-muted-foreground">
          この素材の使い方
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          {USE_POLICIES.map((p) => {
            const active = attachment.usePolicy === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange("usePolicy", p.value)}
                className={`rounded-xl border-2 px-3 py-2 text-center transition-all ${
                  active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <span
                  className={`block text-xs font-bold sm:text-sm ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  {p.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                  {p.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* メモ */}
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          メモ（任意）
        </span>
        <input
          type="text"
          value={attachment.memo}
          onChange={(e) => onChange("memo", e.target.value)}
          placeholder="例：トップのメインビジュアルに使いたい、料金表の〇〇の部分 ..."
          className={fieldClass}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  送信ステータス表示パーツ                                              */
/* ------------------------------------------------------------------ */

/** メール/提案の送信ステータス（3とおり） */
type DeliveryStatus = "sent" | "logged" | "error";

/** ステータスごとの表示メタ（アイコン・色・タグラベル） */
const STATUS_META: Record<
  DeliveryStatus,
  { Icon: typeof CheckCircle2; color: string; bg: string; ring: string; tag: string }
> = {
  sent: {
    Icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    tag: "送信済み",
  },
  logged: {
    Icon: Inbox,
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-100",
    tag: "記録済み",
  },
  error: {
    Icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    tag: "要対応",
  },
};

/** 送信ステータスを1行で表示する */
function StatusRow({
  status,
  label,
  detail,
}: {
  status: DeliveryStatus;
  label: string;
  detail?: string;
}) {
  const m = STATUS_META[status];
  const Icon = m.Icon;
  return (
    <div className={`flex items-start gap-3 rounded-xl ${m.bg} px-4 py-3 ring-1 ${m.ring}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${m.color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${m.color}`}
          >
            {m.tag}
          </span>
        </div>
        {detail && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  メインページ                                                        */
/* ------------------------------------------------------------------ */

export default function ConsultPage() {
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  // Step 1: 選択中の事業カテゴリ（デフォルトは「製造・工業系」を開く）
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<string>("製造・工業系");
  // Step 2 チェックボックス選択（送信時にテキストと結合）
  const [targetCheckboxes, setTargetCheckboxes] = useState<string[]>([]);
  const [strengthCheckboxes, setStrengthCheckboxes] = useState<string[]>([]);
  const [infoCheckboxes, setInfoCheckboxes] = useState<string[]>([]);
  const [siteIssueCheckboxes, setSiteIssueCheckboxes] = useState<string[]>([]);
  // Step 2 カテゴリ選択（プログレッシブ開示用）
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<string>("年齢");
  const [selectedStrengthCategory, setSelectedStrengthCategory] = useState<string>("技術・品質");
  const [selectedInfoCategory, setSelectedInfoCategory] = useState<string>("基本");
  // Step 4 カテゴリ選択（プログレッシブ開示用）
  const [selectedPurposeCategory, setSelectedPurposeCategory] = useState<string>("信頼・ブランド");
  const [selectedFeatureCategory, setSelectedFeatureCategory] = useState<string>("会社情報");
  const [submitted, setSubmitted] = useState(false);

  /* ウィザードの現在ステップ（1..7）。1画面に1ステップだけ表示する。 */
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = STEPS.length;

  /* ステップ移動時にページ先頭へ戻す（次のステップを最初から見せる） */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const goToStep = (step: number) =>
    setCurrentStep((prev) => Math.min(totalSteps, Math.max(1, step)));
  const goNext = () => goToStep(currentStep + 1);
  const goPrev = () => goToStep(currentStep - 1);

  /* 参考サイト追加用のIDカウンタ */
  const refIdCounter = useRef(1);

  /* 素材追加用のIDカウンタ */
  const attachmentIdCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  /* アップロードされた File 本体を保持するマップ（JSON安全なメタデータとは別管理）。
     キーは attachmentKey(name|size|lastModified) でメタデータと対応付ける。 */
  const fileMapRef = useRef<Map<string, File>>(new Map());

  /* 送信中フラグ（二重送信防止）とエラーメッセージ */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* 送信成功時に API から返ってきた、レビューゲートの状態。
     Phase 1 では提案/ドラフトを自動生成せず、この状態で完了画面を分岐する。
     needs_followup → 追加情報依頼 / awaiting_representative_approval → 内部レビュー中 */
  const [reviewStatus, setReviewStatus] = useState<
    "needs_followup" | "awaiting_representative_approval" | null
  >(null);

  /* 送信成功時に API から返ってきた、顧客向け表示状態 */
  const [customerFacingStatus, setCustomerFacingStatus] = useState<
    "followup_requested" | "under_internal_review" | null
  >(null);

  /* 送信成功時に API から返ってきた、メール送信サマリ（実プロバイダ状態） */
  const [mail, setMail] = useState<MailSummary | null>(null);

  /* 送信成功時に API から返ってきた、インテイク品質評価（完了画面の切替用） */
  const [consultQuality, setConsultQuality] =
    useState<ConsultQualityLite | null>(null);

  /* ---- 更新ヘルパ ---- */
  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggleArrayItem = (
    key: "features" | "currentIssues" | "sitePurpose",
    item: string
  ) => {
    setData((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(item)
          ? arr.filter((f) => f !== item)
          : [...arr, item],
      };
    });
  };

  /* 素材・資料のトグル（「まだ何もない」は排他） */
  const toggleAsset = (value: string) => {
    setData((prev) => {
      const arr = prev.assetsStatus;
      if (value === "none") {
        return { ...prev, assetsStatus: arr.includes("none") ? [] : ["none"] };
      }
      const withoutNone = arr.filter((v) => v !== "none");
      return {
        ...prev,
        assetsStatus: withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value],
      };
    });
  };

  /* 参考サイトの操作 */
  const updateRefSite = (
    id: string,
    field: keyof ReferenceSite,
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      referenceSites: prev.referenceSites.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const addRefSite = () => {
    if (data.referenceSites.length >= MAX_REFERENCE_SITES) return;
    refIdCounter.current += 1;
    setData((prev) => ({
      ...prev,
      referenceSites: [
        ...prev.referenceSites,
        createEmptyRefSite(`ref-${refIdCounter.current}`),
      ],
    }));
  };

  const removeRefSite = (id: string) => {
    setData((prev) => ({
      ...prev,
      referenceSites: prev.referenceSites.filter((s) => s.id !== id),
    }));
  };

  /* ---- アップロード素材の操作 ---- */
  /* ファイル選択/ドロップを受け取ってメタデータを追加（重複は自動で除外） */
  const handleFileList = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // File 本体を ref のマップへ保持（JSON安全なメタデータとは別管理）。
    // 重複キーは同じ File で上書きされるだけなので reducer の外で安全に処理できる。
    Array.from(files).forEach((file) => {
      fileMapRef.current.set(attachmentKey(file), file);
    });
    setData((prev) => {
      const seen = new Set(prev.attachments.map(attachmentKey));
      const added: Attachment[] = [];
      Array.from(files).forEach((file) => {
        const key = attachmentKey(file);
        if (seen.has(key)) return;
        seen.add(key);
        attachmentIdCounter.current += 1;
        added.push({
          id: `att-${attachmentIdCounter.current}`,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          role: "",
          usePolicy: "useIfSuitable",
          memo: "",
        });
      });
      if (added.length === 0) return prev;
      return { ...prev, attachments: [...prev.attachments, ...added] };
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileList(e.target.files);
    /* 同じファイルを連続で選べるよう入力をリセット */
    e.target.value = "";
  };

  const updateAttachment = (
    id: string,
    field: keyof Attachment,
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      attachments: prev.attachments.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    }));
  };

  const removeAttachment = (id: string) => {
    // メタデータと一緒に File 本体もマップから破棄
    const target = data.attachments.find((a) => a.id === id);
    if (target) fileMapRef.current.delete(attachmentKey(target));
    setData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  };

  /* ---- バリデーション ---- */
  // 未入力の必須項目を一覧で返す。isValid はこの配列から派生させるので、
  // バリデーション判定と送信ボタン下の案内が絶対にずれない（二重管理しない）。
  // 各項目に step を付与することで、ウィザードの進捗UI・ステップ別ヒントも
  // この配列を唯一の真実のソースとして派生させる（第二の検証系は作らない）。
  const missingRequirements = useMemo<
    { step: number; label: string }[]
  >(() => {
    const items: { step: number; label: string }[] = [];
    // Step 1
    if (!data.businessType.trim()) items.push({ step: 1, label: "事業種" });
    if (!data.companyName.trim()) items.push({ step: 1, label: "事業体名" });
    // Step 2（チェックボックス or 自由入力があれば有効）
    if (!data.targetCustomer.trim() && targetCheckboxes.length === 0)
      items.push({ step: 2, label: "ターゲット・理想のお客様" });
    if (!data.sellingPoints.trim() && strengthCheckboxes.length === 0)
      items.push({ step: 2, label: "強み・差別化ポイント" });
    if (!data.mustIncludeInfo.trim() && infoCheckboxes.length === 0)
      items.push({ step: 2, label: "必ず載せたい情報" });
    // Step 3
    if (!data.desiredImage.trim())
      items.push({ step: 3, label: "伝えたいイメージ" });
    // Step 4
    if (data.sitePurpose.length === 0) {
      items.push({ step: 4, label: "サイトの主な目的" });
    } else if (data.sitePurpose.includes("その他") && !data.sitePurposeOther.trim()) {
      items.push({ step: 4, label: "サイトの主な目的（その他）" });
    }
    if (data.features.length === 0) {
      items.push({ step: 4, label: "必要なページ・機能" });
    } else if (data.features.includes("その他") && !data.featuresOther.trim()) {
      items.push({ step: 4, label: "必要なページ・機能（その他）" });
    }
    if (!data.timing) items.push({ step: 4, label: "公開希望時期" });
    // Step 5
    if (!data.budget) items.push({ step: 5, label: "ご予算の目安" });
    // Step 7
    if (!data.name.trim()) items.push({ step: 7, label: "お名前" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      items.push({ step: 7, label: "メールアドレス" });
    if (!data.phone.trim()) items.push({ step: 7, label: "電話番号" });
    return items;
  }, [data, targetCheckboxes, strengthCheckboxes, infoCheckboxes]);

  const isValid = missingRequirements.length === 0;

  /* ステップ別の未入力件数（進捗UIの完了表示に使う）。配列添字 = step - 1。 */
  const missingByStep = useMemo(() => {
    const counts = new Array(STEPS.length).fill(0);
    for (const m of missingRequirements) {
      counts[m.step - 1] = (counts[m.step - 1] ?? 0) + 1;
    }
    return counts;
  }, [missingRequirements]);

  /* 現在のステップの未入力必須項目（ナビの直下にコンパクトなヒントを出す）。 */
  const currentStepMissing = useMemo(
    () => missingRequirements.filter((m) => m.step === currentStep),
    [missingRequirements, currentStep]
  );

  /* ---- 送信 ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 最終ステップ以外では Enter / 送信 = 「次のステップへ」と同じ挙動にする。
    // これにより未入力でもステップを進められ、キーボード操作も自然に保たれる。
    // 実際の送信（API呼び出し）はステップ7でのみ走る。
    if (currentStep < totalSteps) {
      goNext();
      return;
    }
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // 未入力の参考サイトカードは送信データから除外
    const meaningfulReferenceSites = data.referenceSites.filter(
      (s) =>
        s.url.trim() ||
        s.type ||
        s.whatToReference.trim() ||
        s.likedSections.trim() ||
        s.followLevel
    );

    // 添付素材はJSON安全なメタデータだけを送信（Fileオブジェクトは含めない）
    const safeAttachments = data.attachments.map(
      ({ id, name, type, size, lastModified, role, usePolicy, memo }) => ({
        id,
        name,
        type,
        size,
        lastModified,
        role,
        usePolicy,
        memo,
      })
    );

    // Step 2: チェックボックス選択と自由入力を結合
    const combinedTarget = [...targetCheckboxes, data.targetCustomer].filter(Boolean).join(" / ");
    const combinedStrength = [...strengthCheckboxes, data.sellingPoints].filter(Boolean).join(" / ");
    const combinedInfo = [...infoCheckboxes, data.mustIncludeInfo].filter(Boolean).join(" / ");
    const combinedSiteIssues = [...siteIssueCheckboxes, data.currentSiteIssues].filter(Boolean).join(" / ");

    const payload = {
      ...data,
      targetCustomer: combinedTarget,
      sellingPoints: combinedStrength,
      mustIncludeInfo: combinedInfo,
      currentSiteIssues: combinedSiteIssues,
      referenceSites: meaningfulReferenceSites,
      attachments: safeAttachments,
      submittedAt: new Date().toISOString(),
    };

    // FormData を構築。ブラウザ標準の FormData を使うため globalThis で参照する
    // （このファイル内の interface FormData との名前衝突を避けるため）。
    const fd = new globalThis.FormData();
    // 構造化ペイロードは安全な文字列フィールドとして1つにまとめる
    fd.append("payload", JSON.stringify(payload));
    // メタデータに対応する File 本体を添付（raw File は JSON とは別管理）
    data.attachments.forEach((att) => {
      const file = fileMapRef.current.get(attachmentKey(att));
      if (file) fd.append("files", file, file.name);
    });

    try {
      const res = await fetch("/api/consult", { method: "POST", body: fd });

      if (!res.ok) {
        // サーバーから日本語メッセージが返ってくればそれを使う
        let message =
          "送信に失敗しました。しばらく経ってからもう一度お試しください。";
        try {
          const body = await res.json();
          if (typeof body?.error === "string" && body.error.length > 0) {
            message = body.error;
          }
        } catch {
          // JSON 以外のレスポンスは既定メッセージを使う
        }
        throw new Error(message);
      }

      // 成功 — 開発確認用にレスポンスをコンソールへ出力
      const result = await res.json().catch(() => null);
      console.log("=== Consult Submission Saved ===", result);

      // レビューゲートの状態を保持（完了画面の分岐に使う）。
      // Phase 1 では提案/ドラフトは自動生成せず null 扱いなので読み捨てる。
      const rs = result?.reviewStatus;
      setReviewStatus(
        rs === "needs_followup" || rs === "awaiting_representative_approval"
          ? rs
          : null
      );
      const cfs = result?.customerFacingStatus;
      setCustomerFacingStatus(
        cfs === "followup_requested" || cfs === "under_internal_review"
          ? cfs
          : null
      );

      // メール送信サマリを保持（実プロバイダの状態を完了画面に反映）
      if (
        result &&
        result.mail &&
        typeof result.mail === "object" &&
        typeof (result.mail as { provider?: unknown }).provider === "string"
      ) {
        setMail(result.mail as MailSummary);
      } else {
        setMail(null);
      }

      if (
        result &&
        result.consultQuality &&
        typeof result.consultQuality === "object" &&
        typeof (result.consultQuality as { status?: unknown }).status === "string"
      ) {
        setConsultQuality(result.consultQuality as ConsultQualityLite);
      } else {
        setConsultQuality(null);
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      // ネットワークエラー等は err.message が空のことがあるので既定文で補う
      const fallback =
        "送信に失敗しました。しばらく経ってからもう一度お試しください。";
      const message =
        err instanceof Error && err.message ? err.message : fallback;
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  完了画面                                                          */
  /* ---------------------------------------------------------------- */
  if (submitted) {
    // Phase 1: 提案/ドラフトは自動生成せずレビューゲートで止める。
    // needs_followup → 追加情報依頼 / awaiting_representative_approval → 内部レビュー中
    const requiresFollowup = reviewStatus === "needs_followup";

    // メール送信結果の表示用ディテール（実プロバイダ状態から組み立てる）
    const internalDetail = mail?.internal
      ? mail.internal.status === "sent"
        ? "相談受領の通知を金井へ送信しました。"
        : mail.internal.status === "logged"
          ? "受領内容をシステムへ記録しました（テスト環境のため実配送はしていません）。"
          : mail.internal.error ?? "通知の送信に失敗しました。"
      : "通知の結果を取得できませんでした。";
    const customerDetail = mail?.customer
      ? mail.customer.status === "sent"
        ? requiresFollowup
          ? `追加情報のお願いメールをお送りしました${
              mail.customer.accepted[0] ? `（${mail.customer.accepted[0]}）` : ""
            }。`
          : `ご案内メールをお送りしました${
              mail.customer.accepted[0] ? `（${mail.customer.accepted[0]}）` : ""
            }。`
        : mail.customer.status === "logged"
          ? requiresFollowup
            ? "追加情報のお願いメールをシステムへ記録しました（テスト環境のため実配送はしていません）。"
            : "ご案内メールをシステムへ記録しました（テスト環境のため実配送はしていません）。"
          : mail.customer.error ??
            (requiresFollowup
              ? "追加情報のお願いメールを送信できませんでした。"
              : "ご案内メールを送信できませんでした。")
      : requiresFollowup
        ? "追加情報のお願いメール結果を取得できませんでした。"
        : "ご案内メールの結果を取得できませんでした。";

    return (
      <div className="min-h-[70vh] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm sm:p-12">
            <div
              className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                requiresFollowup ? "bg-amber-100" : "bg-emerald-100"
              }`}
            >
              <CheckCircle2
                className={`h-12 w-12 ${requiresFollowup ? "text-amber-600" : "text-emerald-600"}`}
              />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
              {requiresFollowup ? "追加情報をお願いしています" : "ご相談を受け付けました"}
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground">
              {requiresFollowup ? (
                <>
                  ご入力内容は受け付けましたが、このままでは精度の高いご提案を作るための情報が不足しています。
                  <br />
                  ご入力いただいたメールアドレスへ追加情報のお願いをお送りしましたので、ご確認をお願いいたします。
                </>
              ) : (
                <>
                  ご入力いただいた内容は無事に受け取りました。
                  <br />
                  担当者が社内で内容を確認したうえで、構成案や今後の進め方について改めてご連絡いたします。今しばらくお待ちください。
                </>
              )}
            </p>

            {requiresFollowup && consultQuality && (
              <div className="mx-auto mb-8 max-w-xl rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-left shadow-sm sm:p-8">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-bold">追加で確認したい内容</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-amber-900/80">
                  より的確なご提案にするため、下記の内容をメールでご返信ください。
                </p>
                {consultQuality.requestedItems.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-amber-900">お願いしたい項目</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-amber-900/80">
                      {consultQuality.requestedItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {consultQuality.followupQuestions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-amber-900">ご返信いただきたい内容</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-amber-900/80">
                      {consultQuality.followupQuestions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 送信ステータス（実プロバイダの状態をそのまま表示） */}
            {mail && (
              <div className="mx-auto mb-8 max-w-xl rounded-3xl border border-border bg-white p-6 text-left shadow-sm sm:p-8">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-foreground">送信ステータス</span>
                  {(() => {
                    const badge = providerBadge(mail.provider);
                    return (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  {mail.providerReason}
                </p>
                <div className="space-y-3">
                  <StatusRow
                    status={mail.internal?.status ?? "error"}
                    label="社内通知（金井へ）"
                    detail={internalDetail}
                  />
                  <StatusRow
                    status={mail.customer?.status ?? "error"}
                    label={requiresFollowup ? "追加情報のお願い（お客様へ）" : "ご案内メール（お客様へ）"}
                    detail={customerDetail}
                  />
                  <StatusRow
                    status={
                      requiresFollowup
                        ? mail.customer?.status === "error"
                          ? "error"
                          : mail.customer?.status ?? "sent"
                        : "sent"
                    }
                    label={requiresFollowup ? "追加ヒアリング判定" : "社内レビュー状況"}
                    detail={
                      requiresFollowup
                        ? "今回は追加情報の確認を優先するため、構成提案の自動生成は保留にしています。"
                        : "ご相談内容は社内で確認中です。確認が整い次第、改めてご連絡いたします。"
                    }
                  />
                </div>
              </div>
            )}

            <div className="mx-auto mb-10 max-w-md space-y-3 rounded-2xl bg-accent p-6 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <a
                  href="mailto:info@kanei-trade.co.jp"
                  className="font-medium text-foreground hover:text-primary"
                >
                  info@kanei-trade.co.jp
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                <a
                  href="tel:080-7424-2898"
                  className="font-medium text-foreground hover:text-primary"
                >
                  080-7424-2898
                </a>
              </div>
            </div>

            <Button asChild size="lg">
              <Link href="/">トップページに戻る</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  フォーム画面                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-[70vh] bg-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {/* ヘッダー */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Clock className="h-4 w-4" />
            所要時間 約8〜10分
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            無料提案申し込みフォーム
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
            以下の項目にお答えいただくと、お客様に最適なホームページのご提案を
            2営業日以内にお送りします。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 進捗ヘッダー（現在のステップ・残り・ステップジャンプ） */}
          <StepProgress
            currentStep={currentStep}
            missingByStep={missingByStep}
            onSelect={goToStep}
          />

          {/* ============================================================ */}
          {/*  Step 1: 事業について                                          */}
          {/* ============================================================ */}
          {currentStep === 1 && (
          <SectionCard>
            <StepHeader step={1} title="事業について" />

            {/* 1-1. 事業種 */}
            <div className="mb-10">
              <FieldLabel required>事業種</FieldLabel>
              <input
                type="text"
                value={data.businessType}
                onChange={(e) => update("businessType", e.target.value)}
                placeholder="例：製造業、飲食業、美容室、建設業、整骨院、..."
                className={inputClass}
              />
              <p className="mt-3 text-sm text-muted-foreground">
                カテゴリを選ぶか、ご自由に入力ください
              </p>

              {/* カテゴリボタン（第一階層） */}
              <div className="mt-3 flex flex-wrap gap-2">
                {BUSINESS_SUGGESTIONS.map((group) => (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => setSelectedBusinessCategory(group.category)}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      selectedBusinessCategory === group.category
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:bg-accent"
                    }`}
                  >
                    {group.category}
                  </button>
                ))}
              </div>

              {/* 選択中のカテゴリの詳細チップ（第二階層） */}
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-2 text-xs font-semibold text-primary">
                  {selectedBusinessCategory}
                </p>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_SUGGESTIONS.find(
                    (g) => g.category === selectedBusinessCategory
                  )?.items.map((item) => (
                    <SuggestTag
                      key={item}
                      label={item}
                      onClick={() => update("businessType", item)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 1-2. 現在のホームページ */}
            <div className="mb-10">
              <FieldLabel>現在のホームページ（任意）</FieldLabel>
              <input
                type="url"
                value={data.currentWebsite}
                onChange={(e) => update("currentWebsite", e.target.value)}
                placeholder="https://example.com"
                disabled={data.noWebsite}
                className={`${inputClass} ${
                  data.noWebsite ? "cursor-not-allowed opacity-50" : ""
                }`}
              />
              <label className="mt-3 flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !data.noWebsite;
                    update("noWebsite", next);
                    if (next) update("currentWebsite", "");
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                    data.noWebsite
                      ? "border-primary bg-primary text-white"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {data.noWebsite && (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  )}
                </button>
                <span className="text-sm font-medium text-foreground">
                  ホームページをお持ちでない
                </span>
              </label>
            </div>

            {/* 1-3. 事業体名 */}
            <div>
              <FieldLabel required>事業体名</FieldLabel>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="例：金井貿易株式会社"
                className={inputClass}
              />
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 2: ターゲットと伝えたいこと（構造化選択式）                */}
          {/* ============================================================ */}
          {currentStep === 2 && (
          <SectionCard>
            <StepHeader step={2} title="ターゲットと伝えたいこと" />

            {/* 2-1. ターゲット層 */}
            <div className="mb-10">
              <FieldLabel required>ターゲット・理想のお客様</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                まず近いカテゴリだけ選んでください。詳細は自由入力で補足できます。
              </p>

              <div className="mb-5 rounded-2xl bg-accent/30 p-4 sm:p-5">
                {/* カテゴリボタン */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { key: "年齢", items: ["20代以下", "30代", "40代", "50代", "60代以上"] },
                    { key: "性別", items: ["男性", "女性", "どちらでも"] },
                    { key: "地域", items: ["地元・近隣", "県内", "全国", "海外・インバウンド"] },
                    { key: "顧客層", items: ["個人（B2C）", "企業（B2B）", "両方"] },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedTargetCategory(cat.key)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedTargetCategory === cat.key
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.key}
                    </button>
                  ))}
                </div>

                {/* 選択カテゴリの詳細チップ */}
                {selectedTargetCategory === "年齢" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">年齢</p>
                    <div className="flex flex-wrap gap-2">
                      {["20代以下", "30代", "40代", "50代", "60代以上"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={targetCheckboxes.includes(label)}
                          onClick={() =>
                            setTargetCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTargetCategory === "性別" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">性別</p>
                    <div className="flex flex-wrap gap-2">
                      {["男性", "女性", "どちらでも"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={targetCheckboxes.includes(label)}
                          onClick={() =>
                            setTargetCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTargetCategory === "地域" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">地域</p>
                    <div className="flex flex-wrap gap-2">
                      {["地元・近隣", "県内", "全国", "海外・インバウンド"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={targetCheckboxes.includes(label)}
                          onClick={() =>
                            setTargetCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTargetCategory === "顧客層" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">顧客層</p>
                    <div className="flex flex-wrap gap-2">
                      {["個人（B2C）", "企業（B2B）", "両方"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={targetCheckboxes.includes(label)}
                          onClick={() =>
                            setTargetCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={data.targetCustomer}
                onChange={(e) => update("targetCustomer", e.target.value)}
                placeholder="例：自動車部品メーカーの購買担当者で、特に品質管理部門の決裁権を持つ30〜50代の方"
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                上記の選択肢に当てはまらない場合や、より詳しいターゲット像があればご記入ください。
              </p>
            </div>

            {/* 2-2. 強み・差別化 */}
            <div className="mb-10">
              <FieldLabel required>最大の強み・差別化ポイント</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                まず近いカテゴリだけ選んでください。詳細は自由入力で補足できます。
              </p>

              <div className="mb-5 rounded-2xl bg-accent/30 p-4 sm:p-5">
                {/* カテゴリボタン */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { key: "技術・品質", items: ["確かな実績・ノウハウ", "特許・独自技術", "業界最高水準の品質", "ISO・認証取得"] },
                    { key: "サービス", items: ["スピード・短納期", "24時間対応", "完全予約制", "アフターサービス充実"] },
                    { key: "価格", items: ["業界最安レベル", "コストパフォーマンス重視", "盛り値なし・明朗会計"] },
                    { key: "立地・設備", items: ["好立地・アクセス便利", "最新設備・設備投資", "広い駐車場"] },
                    { key: "スタッフ", items: ["資格保有スタッフ", "長年のベテラン", "若手育成", "専門チーム体制"] },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedStrengthCategory(cat.key)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedStrengthCategory === cat.key
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.key}
                    </button>
                  ))}
                </div>

                {/* 選択カテゴリの詳細チップ */}
                {selectedStrengthCategory === "技術・品質" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">技術・品質</p>
                    <div className="flex flex-wrap gap-2">
                      {["確かな実績・ノウハウ", "特許・独自技術", "業界最高水準の品質", "ISO・認証取得"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={strengthCheckboxes.includes(label)}
                          onClick={() =>
                            setStrengthCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedStrengthCategory === "サービス" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">サービス</p>
                    <div className="flex flex-wrap gap-2">
                      {["スピード・短納期", "24時間対応", "完全予約制", "アフターサービス充実"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={strengthCheckboxes.includes(label)}
                          onClick={() =>
                            setStrengthCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedStrengthCategory === "価格" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">価格</p>
                    <div className="flex flex-wrap gap-2">
                      {["業界最安レベル", "コストパフォーマンス重視", "盛り値なし・明朗会計"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={strengthCheckboxes.includes(label)}
                          onClick={() =>
                            setStrengthCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedStrengthCategory === "立地・設備" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">立地・設備</p>
                    <div className="flex flex-wrap gap-2">
                      {["好立地・アクセス便利", "最新設備・設備投資", "広い駐車場"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={strengthCheckboxes.includes(label)}
                          onClick={() =>
                            setStrengthCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedStrengthCategory === "スタッフ" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">スタッフ</p>
                    <div className="flex flex-wrap gap-2">
                      {["資格保有スタッフ", "長年のベテラン", "若手育成", "専門チーム体制"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={strengthCheckboxes.includes(label)}
                          onClick={() =>
                            setStrengthCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={data.sellingPoints}
                onChange={(e) => update("sellingPoints", e.target.value)}
                placeholder="例：創業40年の精密機械加工実績、±0.005mmの加工精度で業界トップクラス"
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                選択肢にない独自の強みや、具体的な実績・数字があればご記入ください。
              </p>
            </div>

            {/* 2-3. 必ず載せたい情報 */}
            <div className="mb-10">
              <FieldLabel required>必ずホームページに載せたい情報</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                まず近いカテゴリだけ選んでください。詳細は自由入力で補足できます。
              </p>

              <div className="mb-5 rounded-2xl bg-accent/30 p-4 sm:p-5">
                {/* カテゴリボタン */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { key: "基本", items: ["会社概要・沿革", "代表挨拶", "アクセス・地図", "電話番号"] },
                    { key: "サービス", items: ["サービス・メニュー一覧", "料金表・コース一覧", "施工事例・実績紹介", "よくある質問（FAQ）"] },
                    { key: "信頼性", items: ["保有資格・許認可", "取引先一覧", "スタッフ紹介", "設備紹介"] },
                    { key: "コンバージョン", items: ["お問い合わせフォーム", "電話番号の目立つ表示", "予約・申し込み導線", "SNS連携"] },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedInfoCategory(cat.key)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedInfoCategory === cat.key
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.key}
                    </button>
                  ))}
                </div>

                {/* 選択カテゴリの詳細チップ */}
                {selectedInfoCategory === "基本" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">基本</p>
                    <div className="flex flex-wrap gap-2">
                      {["会社概要・沿革", "代表挨拶", "アクセス・地図", "電話番号"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={infoCheckboxes.includes(label)}
                          onClick={() =>
                            setInfoCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedInfoCategory === "サービス" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">サービス</p>
                    <div className="flex flex-wrap gap-2">
                      {["サービス・メニュー一覧", "料金表・コース一覧", "施工事例・実績紹介", "よくある質問（FAQ）"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={infoCheckboxes.includes(label)}
                          onClick={() =>
                            setInfoCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedInfoCategory === "信頼性" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">信頼性</p>
                    <div className="flex flex-wrap gap-2">
                      {["保有資格・許認可", "取引先一覧", "スタッフ紹介", "設備紹介"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={infoCheckboxes.includes(label)}
                          onClick={() =>
                            setInfoCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedInfoCategory === "コンバージョン" && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">コンバージョン</p>
                    <div className="flex flex-wrap gap-2">
                      {["お問い合わせフォーム", "電話番号の目立つ表示", "予約・申し込み導線", "SNS連携"].map((label) => (
                        <CheckboxTag
                          key={label}
                          selected={infoCheckboxes.includes(label)}
                          onClick={() =>
                            setInfoCheckboxes((prev) =>
                              prev.includes(label)
                                ? prev.filter((v) => v !== label)
                                : [...prev, label]
                            )
                          }
                        >
                          {label}
                        </CheckboxTag>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={data.mustIncludeInfo}
                onChange={(e) => update("mustIncludeInfo", e.target.value)}
                placeholder="例：対応可能エリア一覧、CEマーキング取得状況、導入実績500件以上"
                rows={3}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                選択肢にない情報で必ず載せたいものがあればご記入ください。
              </p>
            </div>

            {/* 2-4. 現在の不満・課題（新規） */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">現在のホームページへの不満・課題</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                現在のWebサイト（またはSNSのみの状況）で気になる点があれば選択してください。
              </p>

              <div className="mb-5 rounded-2xl bg-accent/30 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {["見た目が古い", "スマホで見にくい", "更新が手間", "問い合わせが来ない", "検索で出てこない", "競合より見劣りする", "情報が少なすぎる"].map((label) => (
                    <CheckboxTag
                      key={label}
                      selected={siteIssueCheckboxes.includes(label)}
                      onClick={() =>
                        setSiteIssueCheckboxes((prev) =>
                          prev.includes(label)
                            ? prev.filter((v) => v !== label)
                            : [...prev, label]
                        )
                      }
                    >
                      {label}
                    </CheckboxTag>
                  ))}
                </div>
              </div>

              <textarea
                value={data.currentSiteIssues}
                onChange={(e) => update("currentSiteIssues", e.target.value)}
                placeholder="例：現在のサイトは5年前に制作したままで、スマホ表示が崩れている。問い合わせフォームも使いにくい。"
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* 2-5. 避けたいトーン・デザイン */}
            <div>
              <FieldLabel hint="（任意）">避けたいトーン・デザイン</FieldLabel>
              <textarea
                value={data.avoidItems}
                onChange={(e) => update("avoidItems", e.target.value)}
                placeholder="例：ポップすぎるトーン、原色使い、ギミックの多い動き、堅苦しい印象 ..."
                rows={2}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                「これは避けたい」というご要望があればお知らせください。
              </p>
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 3: どんなホームページにしたいか                          */}
          {/* ============================================================ */}
          {currentStep === 3 && (
          <SectionCard>
            <StepHeader step={3} title="どんなホームページにしたいか" />

            {/* 3-1. 伝えたいイメージ */}
            <div className="mb-10">
              <FieldLabel required>伝えたいイメージ</FieldLabel>
              <textarea
                value={data.desiredImage}
                onChange={(e) => update("desiredImage", e.target.value)}
                placeholder={`例：「清潔感があって信頼できる印象」「親しみやすくて近所の人が入りやすい感じ」\n「高級感があって料金が高く見える」「シンプルでスタイリッシュ」\n「温かみがあって癒される感じ」「力強くて技術力が伝わる」`}
                rows={4}
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* 3-2. 配色のイメージ */}
            <div className="mb-10">
              <FieldLabel>配色のイメージ（任意）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {COLOR_SCHEMES.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.colorScheme === opt.value}
                    onClick={() => update("colorScheme", opt.value)}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`inline-block h-5 w-5 shrink-0 rounded-full ${opt.dot}`}
                      />
                      <span>
                        <span className="block font-semibold">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {opt.desc}
                        </span>
                      </span>
                    </span>
                  </RadioCard>
                ))}
              </div>
            </div>

            {/* 3-3. 参考サイト（構造化） */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">参考にしたいサイト</FieldLabel>

              {/* 説明メモ */}
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="flex items-start gap-2 text-sm leading-relaxed text-blue-800">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    参考URLを記入すると、構成・レイアウトを分析し、より精度の高い提案を作成できます。
                    <span className="font-semibold">URLのみでもOK</span> — ぜひご記入ください。
                  </span>
                </p>
              </div>

              {/* サマリ行: URLのみで十分、詳細はオプション */}
              <p className="mb-4 text-xs text-muted-foreground">
                ※ 参考サイトは<span className="font-semibold">URLのみで十分</span>。どの部分を参考にしたいかがあれば詳細を記入できます（すべて任意）。
              </p>

              {/* 参考サイトカード一覧 */}
              <div className="space-y-4">
                {data.referenceSites.map((site, idx) => (
                  <ReferenceSiteCard
                    key={site.id}
                    index={idx + 1}
                    site={site}
                    onChange={(field, value) =>
                      updateRefSite(site.id, field, value)
                    }
                    onRemove={() => removeRefSite(site.id)}
                    canRemove={data.referenceSites.length > 1}
                  />
                ))}
              </div>

              {/* 追加ボタン */}
              {data.referenceSites.length < MAX_REFERENCE_SITES && (
                <button
                  type="button"
                  onClick={addRefSite}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-white px-4 py-3 text-sm font-semibold text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  参考サイトを追加する（最大{MAX_REFERENCE_SITES}件）
                </button>
              )}
            </div>

            {/* 3-4. リニューアル時の課題 */}
            <div>
              <FieldLabel>
                今のホームページで気になっている点（リニューアルの場合・任意）
              </FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {CURRENT_ISSUES.map((issue) => (
                  <CheckCard
                    key={issue}
                    checked={data.currentIssues.includes(issue)}
                    onClick={() => toggleArrayItem("currentIssues", issue)}
                  >
                    {issue}
                  </CheckCard>
                ))}
                <CheckCard
                  checked={data.currentIssues.includes("その他")}
                  onClick={() => toggleArrayItem("currentIssues", "その他")}
                >
                  その他
                </CheckCard>
              </div>
              {data.currentIssues.includes("その他") && (
                <input
                  type="text"
                  value={data.currentIssuesOther}
                  onChange={(e) => update("currentIssuesOther", e.target.value)}
                  placeholder="自由に入力してください"
                  className={`${inputClass} mt-3`}
                />
              )}
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 4: サイトの目的と機能                                      */}
          {/* ============================================================ */}
          {currentStep === 4 && (
          <SectionCard>
            <StepHeader step={4} title="サイトの目的と機能" />

            {/* 4-1. サイトの主な目的（カテゴリ優先の段階開示） */}
            <div className="mb-10">
              <FieldLabel required>サイトの主な目的（複数選択可）</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                まず近いカテゴリを選んで、当てはまるものを選択してください。
              </p>

              <div className="rounded-2xl bg-accent/30 p-4 sm:p-5">
                {/* カテゴリボタン（第一階層） */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {SITE_PURPOSE_GROUPS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedPurposeCategory(cat.key)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedPurposeCategory === cat.key
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPurposeCategory("その他")}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      selectedPurposeCategory === "その他"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    その他
                  </button>
                </div>

                {/* 選択カテゴリの詳細カード（第二階層・1カテゴリ分だけ表示） */}
                {selectedPurposeCategory === "その他" ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">その他</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CheckCard
                        checked={data.sitePurpose.includes("その他")}
                        onClick={() => toggleArrayItem("sitePurpose", "その他")}
                      >
                        その他
                      </CheckCard>
                    </div>
                    {data.sitePurpose.includes("その他") && (
                      <input
                        type="text"
                        value={data.sitePurposeOther}
                        onChange={(e) => update("sitePurposeOther", e.target.value)}
                        placeholder="自由に入力してください"
                        className={`${inputClass} mt-3`}
                      />
                    )}
                  </div>
                ) : (
                  (() => {
                    const group = SITE_PURPOSE_GROUPS.find(
                      (g) => g.key === selectedPurposeCategory
                    );
                    return (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-primary">
                          {group?.key}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(group?.items ?? []).map((purpose) => (
                            <CheckCard
                              key={purpose}
                              checked={data.sitePurpose.includes(purpose)}
                              onClick={() => toggleArrayItem("sitePurpose", purpose)}
                            >
                              {purpose}
                            </CheckCard>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* 4-2. 必要なページ・機能（カテゴリ優先の段階開示） */}
            <div className="mb-10">
              <FieldLabel required>必要なページ・機能（複数選択可）</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                まず近いカテゴリを選んで、当てはまるものを選択してください。
              </p>

              <div className="rounded-2xl bg-accent/30 p-4 sm:p-5">
                {/* カテゴリボタン（第一階層） */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {FEATURE_GROUPS.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedFeatureCategory(cat.key)}
                      className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                        selectedFeatureCategory === cat.key
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border bg-white text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {cat.key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureCategory("その他")}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                      selectedFeatureCategory === "その他"
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                        : "border-border bg-white text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    その他
                  </button>
                </div>

                {/* 選択カテゴリの詳細カード（第二階層・1カテゴリ分だけ表示） */}
                {selectedFeatureCategory === "その他" ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-primary">その他</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CheckCard
                        checked={data.features.includes("その他")}
                        onClick={() => toggleArrayItem("features", "その他")}
                      >
                        その他
                      </CheckCard>
                    </div>
                    {data.features.includes("その他") && (
                      <input
                        type="text"
                        value={data.featuresOther}
                        onChange={(e) => update("featuresOther", e.target.value)}
                        placeholder="その他必要な機能があればご記入ください"
                        className={`${inputClass} mt-3`}
                      />
                    )}
                  </div>
                ) : (
                  (() => {
                    const group = FEATURE_GROUPS.find(
                      (g) => g.key === selectedFeatureCategory
                    );
                    return (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-primary">
                          {group?.key}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {(group?.items ?? []).map((feature) => (
                            <CheckCard
                              key={feature}
                              checked={data.features.includes(feature)}
                              onClick={() => toggleArrayItem("features", feature)}
                            >
                              {feature}
                            </CheckCard>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* 4-3. 公開希望時期 */}
            <div>
              <FieldLabel required>公開希望時期</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {TIMING_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.timing === opt.value}
                    onClick={() => update("timing", opt.value)}
                  >
                    {opt.label}
                  </RadioCard>
                ))}
              </div>
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 5: ご予算について                                          */}
          {/* ============================================================ */}
          {currentStep === 5 && (
          <SectionCard>
            <StepHeader step={5} title="ご予算について" />

            {/* 5-1. 予算の目安 */}
            <div className="mb-10">
              <FieldLabel required>ご予算の目安</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                一番近いものをひとつお選びください。ぴったりの金額がなくても、近い範囲で構いません。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.budget === opt.value}
                    onClick={() => update("budget", opt.value)}
                  >
                    <span>
                      <span className="block font-bold">{opt.label}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {opt.desc}
                      </span>
                    </span>
                  </RadioCard>
                ))}
              </div>
            </div>

            {/* 5-2. 年払い割引 */}
            <div>
              <FieldLabel>年払い割引のご希望（任意）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <RadioCard
                  checked={data.annualPayment === "interested"}
                  onClick={() => update("annualPayment", "interested")}
                >
                  興味がある
                </RadioCard>
                <RadioCard
                  checked={data.annualPayment === "not-interested"}
                  onClick={() => update("annualPayment", "not-interested")}
                >
                  興味がない
                </RadioCard>
              </div>
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 6: 制作素材のご準備                                       */}
          {/* ============================================================ */}
          {currentStep === 6 && (
          <SectionCard>
            <StepHeader step={6} title="制作素材のご準備" />

            {/* 6-1. ご用意できる素材・資料（ざっくり選択） */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">ご用意できる素材・資料（複数選択可）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {ASSET_OPTIONS.map((opt) => (
                  <CheckCard
                    key={opt.value}
                    checked={data.assetsStatus.includes(opt.value)}
                    onClick={() => toggleAsset(opt.value)}
                  >
                    {opt.label}
                  </CheckCard>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                お手持ちの素材をざっくりお選びください。実際のデータは下の「素材データのアップロード」からお送りいただけます。ないものは金井にてご用意・作成いたします。
              </p>
            </div>

            {/* 6-2. 素材データのアップロード（専用セクション） */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">素材データのアップロード</FieldLabel>
              <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                素材がまだなくてもお申し込みいただけます。アップロードは必須ではありません。
              </p>

              {/* 品質ガイド（折りたたみ・詳細は展開して確認） */}
              <UploadSpecGuide />

              {/* ドロップゾーン */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileList(e.dataTransfer.files);
                }}
                className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                    : "border-border bg-accent/30 hover:border-primary/40"
                }`}
              >
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isDragging
                        ? "bg-primary text-primary-foreground"
                        : "bg-white text-primary ring-1 ring-border"
                    }`}
                  >
                    <Upload className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    クリックして選択、またはここにドラッグ＆ドロップ
                  </span>
                  <span className="text-xs text-muted-foreground">
                    複数ファイルをまとめて追加できます（1ファイル数十MB程度まで推奨）
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.svg,.ai,.eps,.psd"
                  />
                </label>
              </div>

              {/* アップロード済み素材の一覧 */}
              {data.attachments.length > 0 ? (
                <div className="mt-5 space-y-4">
                  <p className="text-sm font-semibold text-foreground">
                    アップロード済みの素材（{data.attachments.length}件）
                  </p>
                  {data.attachments.map((att, idx) => (
                    <AttachmentCard
                      key={att.id}
                      index={idx + 1}
                      attachment={att}
                      onChange={(field, value) =>
                        updateAttachment(att.id, field, value)
                      }
                      onRemove={() => removeAttachment(att.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  ※ 現時点で素材がなくてもお申し込みいただけます。アップロードは必須ではありません。
                </p>
              )}
            </div>

            {/* 6-3. 足りない写真・文章の補充について */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">足りない写真・文章の補充について</FieldLabel>
              <div className="grid gap-3">
                {SUPPLEMENT_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.supplement === opt.value}
                    onClick={() => update("supplement", opt.value)}
                  >
                    {opt.label}
                  </RadioCard>
                ))}
              </div>
            </div>

            {/* 6-3b. お送りいただく素材の編集・加工について */}
            <div className="mb-10">
              <FieldLabel hint="（任意）">お送りいただく素材の編集・加工について</FieldLabel>
              <div className="grid gap-3">
                {ALLOW_EDIT_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.allowEdit === opt.value}
                    onClick={() => update("allowEdit", opt.value)}
                  >
                    {opt.label}
                  </RadioCard>
                ))}
              </div>
            </div>

            {/* 6-4. ご質問・自由記述 */}
            <div>
              <FieldLabel>ご質問・自由記述（任意）</FieldLabel>
              <textarea
                value={data.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder={`例：「〇〇の機能を入れたいけれど可能か」「今のサイトから〇〇だけ引き継ぎたい」\n「ドメインは持っている」など、なんでもお書きください`}
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </div>
          </SectionCard>
          )}

          {/* ============================================================ */}
          {/*  Step 7: お客様情報                                             */}
          {/* ============================================================ */}
          {currentStep === 7 && (
          <SectionCard>
            <StepHeader step={7} title="お客様情報" />

            {/* お名前 */}
            <div className="mb-6">
              <FieldLabel required>お名前</FieldLabel>
              <input
                type="text"
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="例：金井 太郎"
                className={inputClass}
              />
            </div>

            {/* メールアドレス */}
            <div className="mb-6">
              <FieldLabel required>メールアドレス</FieldLabel>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="example@email.com"
                className={inputClass}
              />
            </div>

            {/* 電話番号 */}
            <div className="mb-6">
              <FieldLabel required>電話番号</FieldLabel>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="090-1234-5678"
                className={inputClass}
              />
            </div>

            {/* 企業名 */}
            <div>
              <FieldLabel>企業名（個人事業主の方は屋号）</FieldLabel>
              <input
                type="text"
                value={data.enterpriseName}
                onChange={(e) => update("enterpriseName", e.target.value)}
                placeholder="例：金井貿易株式会社"
                className={inputClass}
              />
            </div>
          </SectionCard>
          )}

          {/* ステップナビゲーション（Prev / Next / 送信） */}
          <div className="flex flex-col gap-3 pb-6 sm:gap-4">
            {/* 現在のステップの不足ヒント（未入力でも進めるので「あとで戻れる」ことを明示） */}
            {/* モバイルコンパクト化：ヒントを1行にまとめ、高さを削減 */}
            {currentStepMissing.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  未入力 {currentStepMissing.length}件・あとで戻れます
                </span>
                <span className="hidden sm:inline text-xs text-amber-700/80">
                  /
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentStepMissing.map((m) => (
                    <span
                      key={m.label}
                      className="inline-flex items-center rounded-full bg-white px-1.5 py-0 text-[10px] font-medium text-amber-700"
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ボタン群：モバイル向け高さ削減 */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={goPrev}
                className={currentStep === 1 ? "invisible" : ""}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">前のステップへ</span>
                <span className="sm:hidden">戻る</span>
              </Button>

              {currentStep < totalSteps ? (
                <Button type="submit" size="default" className="hover:scale-[1.02]">
                  <span className="hidden sm:inline">次のステップへ</span>
                  <span className="sm:hidden">次へ</span>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="default"
                  disabled={!isValid || isSubmitting}
                  className={`${!isValid || isSubmitting ? "cursor-not-allowed opacity-50" : "hover:scale-[1.02]"}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">無料で提案を依頼する</span>
                      <span className="sm:hidden">提案を依頼する</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 送信エラー（最終ステップのみ表示） */}
            {submitError && currentStep === totalSteps && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                {submitError}
              </p>
            )}

            {/* 最終ステップ：全ステップの未入力サマリ（送信可否の判断材料） */}
            {currentStep === totalSteps && !isValid && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    あと{missingRequirements.length}項目で送信できます
                  </p>
                  <span className="text-xs text-amber-700/80">
                    優先度順（上のステップから）
                  </span>
                </div>

                {/* ステップ別のグループ表示（行をクリックで該当ステップへ移動） */}
                <div className="mt-3 space-y-2">
                  {STEPS.map((s) => ({
                    stepId: s.id,
                    title: s.title,
                    items: missingRequirements.filter((m) => m.step === s.id),
                  }))
                    .filter((g) => g.items.length > 0)
                    .map((g) => (
                      <button
                        key={g.stepId}
                        type="button"
                        onClick={() => goToStep(g.stepId)}
                        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-amber-200 transition hover:bg-amber-50/70"
                      >
                        <span className="text-xs font-bold text-amber-900">
                          Step {g.stepId}
                          <span className="ml-1 font-normal text-amber-700/80">
                            「{g.title}」
                          </span>
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          {g.items.map((m) => (
                            <span
                              key={m.label}
                              className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                            >
                              {m.label}
                            </span>
                          ))}
                        </span>
                        <span className="ml-auto hidden text-xs font-semibold text-amber-700 sm:inline">
                          入力する →
                        </span>
                      </button>
                    ))}
                </div>

                <p className="mt-3 text-xs text-amber-700/80">
                  必須項目（<span className="font-bold">*</span>）をすべてご入力いただくと送信できます。行をクリックすると該当ステップへ移動します。
                </p>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              ご入力いただいた情報は、ご提案の目的でのみ使用いたします。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
