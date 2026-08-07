import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Target,
  Award,
  LayoutList,
  Layers,
  Phone,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Compass,
  ExternalLink,
  PiggyBank,
  CalendarClock,
} from "lucide-react";
import {
  decodeProposal,
  type MonetUseCaseKey,
} from "@/lib/proposal";
import { getMonetUseCase } from "@/generated/monet-catalog";
import { getDraftStyle, type DraftStyleKey } from "@/lib/draft";

export const metadata: Metadata = {
  title: "ホームページ構成提案 | 金井ホームページ制作",
  description:
    "ご相談内容と実績コンポーネントカタログをもとに作成した、お客様別のホームページ構成提案です。",
};

// searchParams は実行時に決まるため動的レンダリング
export const dynamic = "force-dynamic";

/** searchParams の p（文字列 or 文字列配列）を安全に取り出してデコード */
function readProposal(
  p: string | string[] | undefined
): ReturnType<typeof decodeProposal> {
  const value = Array.isArray(p) ? p[0] : p;
  if (typeof value !== "string" || value.length === 0) return null;
  return decodeProposal(value);
}

/** Monet ユースケースキー → Draft テーマキー（配色の統一用） */
const USE_CASE_TO_STYLE: Record<MonetUseCaseKey, DraftStyleKey> = {
  manufacturing: "factory",
  construction: "construction",
  restaurant: "restaurant",
  salon: "salon",
  clinic: "clinic",
  consulting: "consulting",
};

/** registry category → 日本語表示名（構成カードのタグに使う） */
const CATEGORY_LABELS: Record<string, string> = {
  hero: "ヒーロー",
  stats: "実績の数値",
  "feature-showcase": "特徴・サービス紹介",
  feature: "特徴・サービス",
  "logo-cloud": "取引先・ロゴ",
  testimonial: "お客様の声",
  cta: "アクション喚起",
  "before-after": "ビフォーアフター",
  team: "スタッフ紹介",
  pricing: "料金プラン",
  faq: "よくある質問",
  contact: "お問い合わせ",
  header: "ヘッダー",
  footer: "フッター",
  gallery: "ギャラリー",
  "how-it-works": "使い方・流れ",
  biography: "人物紹介",
};

/** category コードを日本語ラベルに。未定義はコード原文。 */
function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export default async function ProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const proposal = readProposal(sp.p);

  // --------------------------------------------------------------
  //  フォールバック：データが無い/壊れている場合
  // --------------------------------------------------------------
  if (!proposal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <AlertCircle className="h-9 w-9 text-amber-600" />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          提案ページを表示できません
        </h1>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          提案ページのリンクが正しくないか、有効期限が切れています。
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
  // カタログから構成案・参考ページを取り出す（URL にはキーしか埋め込んでいない）
  const useCase = getMonetUseCase(proposal.useCaseKey);
  const style = getDraftStyle(USE_CASE_TO_STYLE[useCase.key]);

  const displayCompany =
    proposal.companyName || proposal.enterpriseName || "（事業体名未設定）";
  const heroHeadline = proposal.desiredImage || `${displayCompany} のホームページ構成提案`;
  const heroDescriptor = proposal.businessType
    ? `${displayCompany}｜${proposal.businessType}`
    : displayCompany;

  const hasStrengths = proposal.strengths.length > 0;
  const hasMustInclude = proposal.mustInclude.length > 0;
  const hasFeatures = proposal.features.length > 0;
  const structure = useCase.recommendedStructure;
  const referencePages = useCase.referencePages;

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  提案であることの注記バー                                      */}
      {/* ============================================================ */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:items-center">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
          <p className="text-sm leading-relaxed text-amber-900">
            これはご相談内容をもとに、実績コンポーネントカタログ
            <span className="font-bold">（{useCase.label} 向け）</span>
            を組み合わせて作成した<span className="font-bold">構成提案</span>です。
            実際の制作では、デザイン・原稿・写真をさらに詰めてまいります。
            <span className="hidden sm:inline">
              {" "}
              （受領 ID: <span className="font-mono">{proposal.submissionId || "—"}</span>）
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Hero                                                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.heroGradient}`}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 z-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 z-10 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${style.accentBar}`} />
              {useCase.label}向け構成提案
            </span>
            <p className="mt-5 text-sm font-medium text-white/70">
              {heroDescriptor}
            </p>
            <h1 className="mt-2 text-balance text-3xl font-bold leading-tight text-white sm:text-5xl">
              {heroHeadline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              {useCase.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className={`inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold shadow-lg transition-opacity hover:opacity-90 ${style.buttonClass}`}
              >
                この提案について相談する
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ターゲット                                                  */}
      {/* ============================================================ */}
      {proposal.targetCustomer && (
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
                {proposal.targetCustomer}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                この層に響く構成・導線・訴求順で組み立てました。
                まずは一番伝えたいメッセージを中心に、信頼と行動を促す流れを作ります。
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  推奨サイト構成（カタログの recommendedStructure）            */}
      {/* ============================================================ */}
      <section className={`${style.sectionTint} border-y border-border`}>
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mb-3 flex items-center gap-3">
            <Layers className={`h-7 w-7 ${style.accentText}`} />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              推奨するサイト構成
            </h2>
          </div>
          <p className="mb-10 max-w-3xl leading-relaxed text-muted-foreground">
            {useCase.label}のサイトで成果を出すために必要な区画を、
            上から下への並び順でご提案します。各区画には実績カタログから
            代表的なコンポーネントを当てはめています。
          </p>

          <ol className="space-y-5">
            {structure.map((slot, i) => {
              const section = slot.section;
              return (
                <li
                  key={`${slot.category}-${i}`}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* 番号 */}
                    <div className="flex items-center gap-3 sm:w-40 sm:shrink-0">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${style.buttonClass} text-sm font-bold`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold ${style.accentText}`}
                      >
                        {categoryLabel(slot.category)}
                      </span>
                    </div>

                    {/* 本文 */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-foreground sm:text-lg">
                        {slot.slot}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted-foreground">
                        {slot.rationale}
                      </p>

                      {section && (
                        <div className="mt-4 rounded-xl border border-border bg-accent/40 p-4">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                            参考コンポーネント（実績カタログより）
                          </p>
                          <p className="break-all font-mono text-sm text-foreground">
                            {section.title}
                          </p>
                          {section.styles.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {section.styles.map((s) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                >
                                  #{s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  参考ランディングページ（referencePages）                     */}
      {/* ============================================================ */}
      {referencePages.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mb-10 flex items-center gap-3">
            <ExternalLink className={`h-7 w-7 ${style.accentText}`} />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              参考にした完成例
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {referencePages.map((page) => (
              <div
                key={page.id}
                className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm"
              >
                <p className="text-base font-bold leading-snug text-foreground">
                  {page.title}
                </p>
                {page.sourceUrl && (
                  <a
                    href={page.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 break-all text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {page.sourceUrl}
                  </a>
                )}
                <div className="mt-auto pt-4">
                  {page.styleTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {page.styleTags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      構成要素 {page.sectionIds.length} 区画を参考にしています
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  強み・差別化                                                  */}
      {/* ============================================================ */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="mb-10 flex items-center gap-3">
            <Award className={`h-7 w-7 ${style.accentText}`} />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              選ばれる理由・強み
            </h2>
          </div>

          {hasStrengths ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {proposal.strengths.map((point, i) => (
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
      {/*  必要なページ・機能 / 必ず載せたい情報                         */}
      {/* ============================================================ */}
      {(hasFeatures || hasMustInclude) && (
        <section className={`${style.sectionTint} border-y border-border`}>
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="mb-10 flex items-center gap-3">
              <LayoutList className={`h-7 w-7 ${style.accentText}`} />
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                ご希望のページ・機能
              </h2>
            </div>

            {hasFeatures && (
              <div className="mb-8">
                <p className="mb-4 text-sm font-semibold text-muted-foreground">
                  必要なページ・機能
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {proposal.features.map((chip, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.accentBar}`} />
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasMustInclude && (
              <div>
                <p className="mb-4 text-sm font-semibold text-muted-foreground">
                  必ず載せたい情報
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {proposal.mustInclude.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${style.accentText}`} />
                      <span className="leading-relaxed text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  ご予算・公開希望時期の整理                                    */}
      {/* ============================================================ */}
      {(proposal.budgetLabel || proposal.timingLabel) && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <div className="grid gap-5 sm:grid-cols-2">
            {proposal.budgetLabel && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <PiggyBank className="h-5 w-5" />
                  <span className="text-sm font-semibold">ご予算の目安</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {proposal.budgetLabel}
                </p>
              </div>
            )}
            {proposal.timingLabel && (
              <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                  <span className="text-sm font-semibold">公開希望時期</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {proposal.timingLabel}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

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
            この提案をベースに、一緒に詰めませんか
          </h2>
          <p className="mb-10 leading-relaxed text-white/80">
            構成案・デザインの方向性はご相談内容から自動で組み立てました。
            ここから先は、お客様の声を聞きながら原稿・写真・導線を整えてまいります。
            ご不明点やご要望がございましたら、お気軽にご連絡ください。
          </p>

          <div className="mx-auto mb-10 flex max-w-xl flex-col items-stretch justify-center gap-4 sm:flex-row">
            {proposal.phone && (
              <a
                href={`tel:${proposal.phone.replace(/[^0-9+-]/g, "")}`}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Phone className="h-5 w-5" />
                <span className="font-semibold">{proposal.phone}</span>
              </a>
            )}
            {proposal.email && (
              <a
                href={`mailto:${proposal.email}`}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-white/10 px-6 py-4 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Mail className="h-5 w-5" />
                <span className="break-all font-semibold">{proposal.email}</span>
              </a>
            )}
          </div>

          <Link
            href="/consult"
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3 font-semibold shadow-lg transition-opacity hover:opacity-90 ${style.buttonClass}`}
          >
            もう一度相談内容を送る
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5" />
            この提案はカタログとご相談内容からの自動生成です。最終的な制作物とは異なります。
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
            構成提案 by 金井ホームページ制作 — 実績カタログから自動生成
          </p>
        </div>
      </footer>
    </div>
  );
}
