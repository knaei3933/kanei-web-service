"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Globe,
  Store,
  Scissors,
  HeartPulse,
  Laptop,
  CheckCircle2,
  ExternalLink,
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

const BUSINESS_TYPES = [
  { value: "製造業", icon: Building2 },
  { value: "建設業", icon: Building2 },
  { value: "飲食業", icon: Store },
  { value: "美容室", icon: Scissors },
  { value: "整骨院・接骨院", icon: HeartPulse },
  { value: "IT・コンサルティング", icon: Laptop },
];

const BUDGET_OPTIONS = [
  {
    value: "9800",
    label: "¥9,800/月",
    desc: "基本的な会社案内",
  },
  {
    value: "15000",
    label: "¥15,000/月",
    desc: "ブログ・SNS連携込み",
  },
  {
    value: "20000",
    label: "¥20,000/月",
    desc: "多機能・20ページ",
  },
  {
    value: "unknown",
    label: "わからない",
    desc: "提案をお願いしたい",
  },
];

const DEMO_CARDS = [
  {
    name: "製造業",
    href: "/portfolio/factory.html",
    accent: "from-blue-500 to-blue-700",
    icon: Building2,
  },
  {
    name: "建設業",
    href: "/portfolio/construction.html",
    accent: "from-amber-500 to-orange-700",
    icon: Building2,
  },
  {
    name: "飲食業",
    href: "/portfolio/restaurant.html",
    accent: "from-rose-500 to-red-700",
    icon: Store,
  },
  {
    name: "美容室",
    href: "/portfolio/salon.html",
    accent: "from-pink-400 to-fuchsia-600",
    icon: Scissors,
  },
  {
    name: "整骨院",
    href: "/portfolio/clinic.html",
    accent: "from-emerald-500 to-teal-700",
    icon: HeartPulse,
  },
  {
    name: "ITコンサル",
    href: "/portfolio/consulting.html",
    accent: "from-slate-600 to-slate-800",
    icon: Laptop,
  },
];

const TIMING_OPTIONS = [
  { value: "asap", label: "できるだけ早く（1〜2週間）" },
  { value: "1month", label: "1ヶ月以内" },
  { value: "no-rush", label: "特に急ぎではない" },
];

const FEATURE_OPTIONS = [
  "会社案内（代表挨拶・沿革・アクセス）",
  "サービス・メニュー・料金表",
  "実績・施工事例・ギャラリー",
  "お問い合わせフォーム",
  "ブログ・お知らせ",
  "予約・お申し込み導線",
  "SNS連携（Instagram・LINE）",
];

/* ------------------------------------------------------------------ */
/*  フォームStateの型                                                    */
/* ------------------------------------------------------------------ */

interface FormData {
  // Step1
  businessType: string;
  businessTypeOther: string;
  currentWebsite: string;
  noWebsite: boolean;
  companyName: string;
  // Step2
  budget: string;
  preferredDemo: string;
  timing: string;
  refSite1: string;
  refSite2: string;
  refSite3: string;
  // Step3
  features: string[];
  featuresOther: string;
  message: string;
  // Step4
  name: string;
  email: string;
  phone: string;
  enterpriseName: string;
}

const INITIAL_DATA: FormData = {
  businessType: "",
  businessTypeOther: "",
  currentWebsite: "",
  noWebsite: false,
  companyName: "",
  budget: "",
  preferredDemo: "",
  timing: "",
  refSite1: "",
  refSite2: "",
  refSite3: "",
  features: [],
  featuresOther: "",
  message: "",
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

/* ラジオカード（大きく押しやすい） */
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

  const toggleFeature = (feature: string) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  /* ---- バリデーション ---- */
  const isValid = useMemo(() => {
    // Step1
    if (!data.businessType) return false;
    if (data.businessType === "その他" && !data.businessTypeOther.trim())
      return false;
    if (!data.noWebsite && !data.currentWebsite.trim()) {
      // URLは任意だが「お持ちでない」にチェックがない場合は空でもOK（任意項目）
      // → 任意なので空でも通す
    }
    if (!data.companyName.trim()) return false;
    // Step2
    if (!data.budget) return false;
    if (!data.preferredDemo) return false;
    if (!data.timing) return false;
    // Step3
    if (data.features.length === 0) return false;
    if (data.features.includes("その他") && !data.featuresOther.trim())
      return false;
    // Step4
    if (!data.name.trim()) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return false;
    if (!data.phone.trim()) return false;
    return true;
  }, [data]);

  /* ---- 送信 ---- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    // 開発段階: コンソールにJSON出力
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
            所要時間 約3分
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
          {/*  Step 1: 基本情報                                             */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={1} title="基本情報" />

            {/* 1. 事業種 */}
            <div className="mb-10">
              <FieldLabel required>事業種</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {BUSINESS_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  return (
                    <RadioCard
                      key={bt.value}
                      checked={data.businessType === bt.value}
                      onClick={() => update("businessType", bt.value)}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {bt.value}
                      </span>
                    </RadioCard>
                  );
                })}
                <RadioCard
                  checked={data.businessType === "その他"}
                  onClick={() => update("businessType", "その他")}
                >
                  その他
                </RadioCard>
              </div>
              {data.businessType === "その他" && (
                <input
                  type="text"
                  value={data.businessTypeOther}
                  onChange={(e) => update("businessTypeOther", e.target.value)}
                  placeholder="事業種をご記入ください"
                  className={inputClass}
                />
              )}
            </div>

            {/* 2. 現在のホームページ */}
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

            {/* 3. 事業体名 */}
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
          {/*  Step 2: ご希望                                              */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={2} title="ご希望" />

            {/* 4. ご予算 */}
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
                      <span className="block text-xs text-muted-foreground">
                        {opt.desc}
                      </span>
                    </span>
                  </RadioCard>
                ))}
              </div>
            </div>

            {/* 5. ご希望のイメージ（デモカード選択） */}
            <div className="mb-10">
              <FieldLabel required>
                ご希望のイメージ（クリックで選択）
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {DEMO_CARDS.map((card) => {
                  const Icon = card.icon;
                  const selected = data.preferredDemo === card.name;
                  return (
                    <div key={card.name} className="relative">
                      <button
                        type="button"
                        onClick={() => update("preferredDemo", card.name)}
                        className={`group relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition-all ${
                          selected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {/* 背景グラデーション */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-90`}
                        />
                        {/* 選択チェック */}
                        {selected && (
                          <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md">
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </div>
                        )}
                        <div className="relative z-[1] flex flex-col items-center gap-2 text-white">
                          <Icon className="h-7 w-7 drop-shadow" />
                          <span className="text-sm font-bold drop-shadow">
                            {card.name}
                          </span>
                        </div>
                      </button>
                      {/* デモリンク */}
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1 text-xs text-primary hover:underline"
                      >
                        デモを見る
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6. 公開希望時期 */}
            <div className="mb-10">
              <FieldLabel required>公開希望時期</FieldLabel>
              <div className="grid gap-3">
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

            {/* 7. 参考にしたいサイト */}
            <div>
              <FieldLabel>参考にしたいサイト（任意）</FieldLabel>
              <div className="space-y-3">
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    競合他社
                  </span>
                  <input
                    type="url"
                    value={data.refSite1}
                    onChange={(e) => update("refSite1", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    デザインの参考
                  </span>
                  <input
                    type="url"
                    value={data.refSite2}
                    onChange={(e) => update("refSite2", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    その他
                  </span>
                  <input
                    type="url"
                    value={data.refSite3}
                    onChange={(e) => update("refSite3", e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/*  Step 3: ニーズ詳細                                           */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={3} title="ニーズ詳細" />

            {/* 8. 必要なページ・機能 */}
            <div className="mb-10">
              <FieldLabel required>必要なページ・機能（複数選択可）</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {FEATURE_OPTIONS.map((feature) => (
                  <CheckCard
                    key={feature}
                    checked={data.features.includes(feature)}
                    onClick={() => toggleFeature(feature)}
                  >
                    {feature}
                  </CheckCard>
                ))}
                <CheckCard
                  checked={data.features.includes("その他")}
                  onClick={() => toggleFeature("その他")}
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
                  className={inputClass}
                />
              )}
            </div>

            {/* 9. ご質問・ご要望 */}
            <div>
              <FieldLabel>ご質問・ご要望（任意）</FieldLabel>
              <textarea
                value={data.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="ご自由にお書きください"
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/*  Step 4: お客様情報                                           */}
          {/* ============================================================ */}
          <SectionCard>
            <StepHeader step={4} title="お客様情報" />

            {/* 10. お名前 */}
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

            {/* 11. メールアドレス */}
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

            {/* 12. 電話番号 */}
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

            {/* 13. 企業名 */}
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
