"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Send,
  Check,
  Mail,
  Phone,
  Clock,
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

/** 2-2. 配色イメージ */
const COLOR_SCHEMES = [
  { value: "blue", label: "青系", desc: "信頼・清潔・ビジネス", dot: "bg-blue-500" },
  { value: "white", label: "白・グレー系", desc: "シンプル・スタイリッシュ・モダン", dot: "bg-gray-300 border border-gray-400" },
  { value: "warm", label: "暖色系", desc: "オレンジ・赤・黄（親しみ・温かみ・活力）", dot: "bg-orange-500" },
  { value: "green", label: "緑系", desc: "自然・癒し・健康", dot: "bg-green-500" },
  { value: "dark", label: "黒・ダーク系", desc: "高級感・洗練・IT", dot: "bg-gray-800" },
  { value: "none", label: "特に指定なし", desc: "お任せします", dot: "bg-gradient-to-br from-pink-400 via-yellow-400 to-blue-400" },
];

/** 2-3. 参考サイトのラベル */
const REF_SITE_LABELS = [
  { key: "refSite1", label: "競合他社のホームページ" },
  { key: "refSite2", label: "デザインの参考にしたいサイト" },
  { key: "refSite3", label: "この部分のレイアウトが好き" },
  { key: "refSite4", label: "色使いが参考になるサイト" },
  { key: "refSite5", label: "その他" },
] as const;

/** 2-4. リニューアル時の課題 */
const CURRENT_ISSUES = [
  "デザインが古い",
  "スマホで見にくい",
  "更新ができない・放置している",
  "問い合わせが来ない",
  "競合と比べて見劣りする",
  "検索で出てこない",
];

/** 3-1. サイトの主な目的 */
const SITE_PURPOSES = [
  "会社の信頼性をアピールしたい",
  "サービス・商品を知ってもらいたい",
  "問い合わせ・予約を増やしたい",
  "実績・施工事例を見せたい",
  "採用情報を掲載したい",
  "ブランドイメージを向上させたい",
  "SNSと連携したい",
];

/** 3-2. 必要なページ・機能 */
const FEATURE_OPTIONS = [
  "会社案内（代表挨拶・沿革・アクセス）",
  "サービス・メニュー・料金表",
  "実績・施工事例・ギャラリー",
  "お問い合わせフォーム",
  "電話番号・アクセスの目立つ表示",
  "料金表・コース一覧",
  "スタッフ紹介",
  "ブログ・お知らせ",
  "よくある質問（FAQ）",
  "予約・お申し込み導線（外部サービスへのリンク）",
  "Googleマップ埋め込み",
  "SNS連携（Instagram・LINE・X）",
];

/** 3-3. 公開希望時期 */
const TIMING_OPTIONS = [
  { value: "asap", label: "できるだけ早く（1〜2週間）" },
  { value: "1month", label: "1ヶ月以内" },
  { value: "3months", label: "3ヶ月以内" },
  { value: "no-rush", label: "特に急ぎではない" },
];

/** 4-1. 予算プラン（詳細説明付き） */
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

/** 5-2. ロゴデータ */
const LOGO_OPTIONS = [
  { value: "yes", label: "ロゴデータあり" },
  { value: "no", label: "ロゴデータなし（作成をお願いしたい）" },
  { value: "unnecessary", label: "ロゴは不要" },
];

/* ------------------------------------------------------------------ */
/*  フォームStateの型                                                    */
/* ------------------------------------------------------------------ */

interface FormData {
  // Step 1
  businessType: string;
  currentWebsite: string;
  noWebsite: boolean;
  companyName: string;
  // Step 2
  desiredImage: string;
  colorScheme: string;
  refSite1: string;
  refSite2: string;
  refSite3: string;
  refSite4: string;
  refSite5: string;
  currentIssues: string[];
  currentIssuesOther: string;
  // Step 3
  sitePurpose: string[];
  sitePurposeOther: string;
  features: string[];
  featuresOther: string;
  timing: string;
  // Step 4
  budget: string;
  annualPayment: string;
  // Step 5
  message: string;
  hasLogo: string;
  // Step 6
  name: string;
  email: string;
  phone: string;
  enterpriseName: string;
}

const INITIAL_DATA: FormData = {
  businessType: "",
  currentWebsite: "",
  noWebsite: false,
  companyName: "",
  desiredImage: "",
  colorScheme: "",
  refSite1: "",
  refSite2: "",
  refSite3: "",
  refSite4: "",
  refSite5: "",
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
  hasLogo: "",
  name: "",
  email: "",
  phone: "",
  enterpriseName: "",
};

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

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-4 block text-base font-semibold text-foreground">
      {children}
      {required && <RequiredMark />}
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

const inputClass =
  "mt-1 block w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

/* ------------------------------------------------------------------ */
/*  メインページ                                                        */
/* ------------------------------------------------------------------ */

export default function ConsultPage() {
  const [data, setData] = useState<FormData>(INITIAL_DATA);
  const [submitted, setSubmitted] = useState(false);

  /* ---- 更新ヘルパ ---- */
  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const toggleArrayItem = (key: "features" | "currentIssues" | "sitePurpose", item: string) => {
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

  /* ---- バリデーション ---- */
  const isValid = useMemo(() => {
    // Step 1
    if (!data.businessType.trim()) return false;
    if (!data.companyName.trim()) return false;
    // Step 2
    if (!data.desiredImage.trim()) return false;
    // Step 3
    if (data.sitePurpose.length === 0) return false;
    if (data.sitePurpose.includes("その他") && !data.sitePurposeOther.trim()) return false;
    if (data.features.length === 0) return false;
    if (data.features.includes("その他") && !data.featuresOther.trim()) return false;
    if (!data.timing) return false;
    // Step 4
    if (!data.budget) return false;
    // Step 6
    if (!data.name.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return false;
    if (!data.phone.trim()) return false;
    return true;
  }, [data]);

  /* ---- 送信 ---- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const payload = {
      ...data,
      submittedAt: new Date().toISOString(),
    };
    console.log("=== Consult Form Submission ===");
    console.log(JSON.stringify(payload, null, 2));

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------------------------------------------------------- */
  /*  完了画面                                                          */
  /* ---------------------------------------------------------------- */
  if (submitted) {
    return (
      <div className="min-h-[70vh] bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
          <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
              お申し込みありがとうございます
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground">
              2営業日以内に、ご希望に合わせたお見積りをご提案いたします。
              <br />
              ご入力いただいたメールアドレスへご連絡いたしますので、
              しばらくお待ちください。
            </p>

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
            所要時間 約5分
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
          {/* ============================================================ */}
          {/*  Step 1: 事業について                                          */}
          {/* ============================================================ */}
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
                以下から選ぶか、ご自由に入力ください
              </p>
              <div className="mt-3 space-y-4">
                {BUSINESS_SUGGESTIONS.map((group) => (
                  <div key={group.category}>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      {group.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <SuggestTag
                          key={item}
                          label={item}
                          onClick={() => update("businessType", item)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
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

          {/* ============================================================ */}
          {/*  Step 2: どんなホームページにしたいか                            */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={2} title="どんなホームページにしたいか" />

            {/* 2-1. 伝えたいイメージ */}
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

            {/* 2-2. 配色のイメージ */}
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

            {/* 2-3. 参考にしたいサイト */}
            <div className="mb-10">
              <FieldLabel>参考にしたいサイト（任意）</FieldLabel>
              <div className="space-y-3">
                {REF_SITE_LABELS.map((ref) => (
                  <div key={ref.key}>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      {ref.label}
                    </span>
                    <input
                      type="url"
                      value={data[ref.key]}
                      onChange={(e) =>
                        update(ref.key as keyof FormData, e.target.value)
                      }
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 2-4. リニューアル時の課題 */}
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

          {/* ============================================================ */}
          {/*  Step 3: サイトの目的と機能                                      */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={3} title="サイトの目的と機能" />

            {/* 3-1. サイトの主な目的 */}
            <div className="mb-10">
              <FieldLabel required>サイトの主な目的（複数選択可）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {SITE_PURPOSES.map((purpose) => (
                  <CheckCard
                    key={purpose}
                    checked={data.sitePurpose.includes(purpose)}
                    onClick={() => toggleArrayItem("sitePurpose", purpose)}
                  >
                    {purpose}
                  </CheckCard>
                ))}
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

            {/* 3-2. 必要なページ・機能 */}
            <div className="mb-10">
              <FieldLabel required>必要なページ・機能（複数選択可）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {FEATURE_OPTIONS.map((feature) => (
                  <CheckCard
                    key={feature}
                    checked={data.features.includes(feature)}
                    onClick={() => toggleArrayItem("features", feature)}
                  >
                    {feature}
                  </CheckCard>
                ))}
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

            {/* 3-3. 公開希望時期 */}
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

          {/* ============================================================ */}
          {/*  Step 4: ご予算について                                          */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={4} title="ご予算について" />

            {/* 4-1. 予算の目安 */}
            <div className="mb-10">
              <FieldLabel required>ご予算の目安</FieldLabel>
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

            {/* 4-2. 年払い割引 */}
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

          {/* ============================================================ */}
          {/*  Step 5: その他のご要望                                         */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={5} title="その他のご要望" />

            {/* 5-1. ご質問・自由記述 */}
            <div className="mb-10">
              <FieldLabel>ご質問・自由記述（任意）</FieldLabel>
              <textarea
                value={data.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder={`例：「〇〇の機能が入れたいけれど可能か」「今のサイトから〇〇だけ引き継ぎたい」\n「ドメインは持っている」「ロゴデータがある」など、なんでもお書きください`}
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* 5-2. ロゴ・画像データ */}
            <div>
              <FieldLabel>既存のロゴ・画像データの有無（任意）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-3">
                {LOGO_OPTIONS.map((opt) => (
                  <RadioCard
                    key={opt.value}
                    checked={data.hasLogo === opt.value}
                    onClick={() => update("hasLogo", opt.value)}
                  >
                    {opt.label}
                  </RadioCard>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/*  Step 6: お客様情報                                             */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={6} title="お客様情報" />

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

          {/* 送信ボタン */}
          <div className="flex flex-col items-center gap-4 pb-8">
            <Button
              type="submit"
              size="lg"
              disabled={!isValid}
              className={`w-full max-w-md text-lg ${
                !isValid
                  ? "cursor-not-allowed opacity-50"
                  : "hover:scale-[1.02]"
              }`}
            >
              <Send className="mr-2 h-5 w-5" />
              無料で提案を依頼する
            </Button>
            {!isValid && (
              <p className="text-center text-sm text-muted-foreground">
                必須項目（<span className="text-red-500">*</span>）をすべてご入力いただくと送信できます。
              </p>
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
