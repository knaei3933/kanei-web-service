import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Target,
  Award,
  LayoutList,
  Phone,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { decodeDraft, getDraftStyle } from "@/lib/draft";

export const metadata: Metadata = {
  title: "ホームページ初稿プレビュー | 金井ホームページ制作",
  description:
    "ご相談内容をもとに自動生成した、お客様別のホームページ初稿（ファーストドラフト）のプレビューです。",
};

// searchParams は実行時に決まるため動的レンダリング
export const dynamic = "force-dynamic";

/** searchParams の d（文字列 or 文字列配列）を安全に取り出してデコード */
function readDraft(
  d: string | string[] | undefined
): ReturnType<typeof decodeDraft> {
  const value = Array.isArray(d) ? d[0] : d;
  if (typeof value !== "string" || value.length === 0) return null;
  return decodeDraft(value);
}

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const draft = readDraft(sp.d);

  // --------------------------------------------------------------
  //  フォールバック：データが無い/壊れている場合
  // --------------------------------------------------------------
  if (!draft) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <AlertCircle className="h-9 w-9 text-amber-600" />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          プレビューを表示できません
        </h1>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          初稿プレビューのリンクが正しくないか、有効期限が切れています。
          <br />
          お手数ですが、もう一度お申し込みフォームから送信をお願いいたします。
        </p>
        <Link
          href="/consult"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
        >
          相談フォームへ
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // --------------------------------------------------------------
  //  表示用データの組み立て
  // --------------------------------------------------------------
  const style = getDraftStyle(draft.styleKey);
  const displayCompany =
    draft.companyName || draft.enterpriseName || "（事業体名未設定）";
  const heroTitle = draft.desiredImage || style.defaultHeroTitle;
  const heroDescriptor = draft.businessType
    ? `${displayCompany}｜${draft.businessType}`
    : displayCompany;
  const hasStrengths = draft.strengths.length > 0;
  const hasMustInclude = draft.mustInclude.length > 0;
  const hasFeatures = draft.features.length > 0;
  // 構成案が空のときは業種の標準構成を見出しとして表示
  const serviceChips =
    hasFeatures || hasMustInclude
      ? [...draft.features, ...draft.mustInclude]
      : style.defaultServices;

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  AI 生成の注記バー（要件：初稿であることを明示）              */}
      {/* ============================================================ */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:items-center">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
          <p className="text-sm leading-relaxed text-amber-900">
            これは<span className="font-bold">ご相談内容をもとに AI が自動生成した初稿（ファーストドラフト）</span>です。
            実際の制作では、デザイン・原稿・写真をさらに詰めてまいります。
            <span className="hidden sm:inline">
              {" "}
              （受領 ID: <span className="font-mono">{draft.submissionId || "—"}</span>）
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Hero（業種テーマ）                                            */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        {/* ベース濃色背景 */}
        <div className="absolute inset-0 bg-slate-950" />
        {/* 業種テーマのグラデーションオーバーレイ */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.heroGradient}`}
        />
        {/* 装飾ブロブ */}
        <div className="pointer-events-none absolute -right-24 -top-24 z-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 z-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${style.accentBar}`} />
              {style.label}
            </span>
            <p className="mt-5 text-sm font-medium text-white/70">
              {heroDescriptor}
            </p>
            <h1 className="mt-2 text-balance text-3xl font-bold leading-tight text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              {draft.targetCustomer
                ? `理想のお客様：${draft.targetCustomer}に向けた、信頼感のあるホームページをご提案します。`
                : style.defaultHeroSub}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className={`inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold shadow-lg transition-opacity hover:opacity-90 ${style.buttonClass}`}
              >
                {style.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ターゲット                                                   */}
      {/* ============================================================ */}
      {draft.targetCustomer && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Target className={`h-7 w-7 ${style.accentText}`} />
            </div>
            <div>
              <p className={`mb-2 text-sm font-bold ${style.accentText}`}>
                ターゲット・理想のお客様
              </p>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                {draft.targetCustomer}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                この層に響く言葉選び・導線・デザインで構成します。
                初稿では、まず一番伝えたいメッセージを中心に組み立てました。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  強み・差別化                                                  */}
      {/* ============================================================ */}
      <section className={`${style.sectionTint} border-y border-border`}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mb-10 flex items-center gap-3">
            <Award className={`h-7 w-7 ${style.accentText}`} />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              選ばれる理由・強み
            </h2>
          </div>

          {hasStrengths ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {draft.strengths.map((point, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${style.buttonClass} text-sm font-bold`}
                    >
                      {i + 1}
                    </span>
                    <div className={`h-1 w-8 rounded-full ${style.accentBar}`} />
                  </div>
                  <p className="text-base font-semibold leading-relaxed text-foreground">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="leading-relaxed text-muted-foreground">
              強み・差別化の記入がなかったため、ヒアリングで掘り起こした上で
              見出しを作成します。たとえば「創業年数／資格・認証／対応エリア／
              価格／独自の技術」などを強みとして打ち出します。
            </p>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  サイト構成案（必要なページ・機能 / 必ず載せたい情報）         */}
      {/* ============================================================ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="mb-10 flex items-center gap-3">
          <LayoutList className={`h-7 w-7 ${style.accentText}`} />
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            想定するサイト構成
          </h2>
        </div>

        {/* 構成チャップス */}
        <div className="mb-8">
          <p className="mb-4 text-sm font-semibold text-muted-foreground">
            ページ・機能
          </p>
          <div className="flex flex-wrap gap-2.5">
            {serviceChips.map((chip, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${style.accentBar}`} />
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* 必ず載せたい情報 */}
        <div>
          <p className="mb-4 text-sm font-semibold text-muted-foreground">
            必ず載せたい情報
          </p>
          {hasMustInclude ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {draft.mustInclude.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${style.accentText}`} />
                  <span className="leading-relaxed text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="leading-relaxed text-muted-foreground">
              必須掲載情報の指定がなかったため、業種の標準構成
              （会社概要・サービス内容・お問い合わせ・アクセス）を基本にします。
            </p>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA / お問い合わせ                                           */}
      {/* ============================================================ */}
      <section id="contact" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.heroGradient}`}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            まずはお気軽にご相談ください
          </h2>
          <p className="mb-10 leading-relaxed text-white/80">
            この初稿をベースに、デザイン・原稿・写真を整えてまいります。
            ご不明点やご要望がございましたら、お気軽にお電話・メールにてご連絡ください。
          </p>

          <div className="mx-auto mb-10 flex max-w-xl flex-col items-stretch justify-center gap-4 sm:flex-row">
            {draft.phone && (
              <a
                href={`tel:${draft.phone.replace(/[^0-9+-]/g, "")}`}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Phone className="h-5 w-5" />
                <span className="font-semibold">{draft.phone}</span>
              </a>
            )}
            {draft.email && (
              <a
                href={`mailto:${draft.email}`}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Mail className="h-5 w-5" />
                <span className="break-all font-semibold">{draft.email}</span>
              </a>
            )}
          </div>

          <a
            href="/consult"
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3 font-semibold shadow-lg transition-opacity hover:opacity-90 ${style.buttonClass}`}
          >
            もう一度相談内容を送る
            <ArrowRight className="h-4 w-4" />
          </a>

          <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5" />
            このページはAIが生成した初稿です。最終的な制作物とは異なります。
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                     */}
      {/* ============================================================ */}
      <footer className="border-t border-border bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-semibold text-foreground">
            {displayCompany}
          </p>
          <p className="text-xs text-muted-foreground">
            初稿プレビュー by 金井ホームページ制作 — AI生成ファーストドラフト
          </p>
        </div>
      </footer>
    </div>
  );
}
