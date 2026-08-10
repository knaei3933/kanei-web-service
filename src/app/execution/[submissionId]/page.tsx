import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Wrench,
  ImagePlus,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { readApprovalPackage } from "@/lib/approval-package";
import {
  imageFallbackStatusLabel,
  generationPriorityLabel,
  type ImageFallbackAssessment,
  type GenerationPriorityLevel,
} from "@/lib/image-fallback";
import { readAiFallbackAssets, type AiFallbackAsset } from "@/lib/ai-fallback-assets";
import { CopyButton } from "./CopyButton";
import { FallbackAssetTracker } from "./FallbackAssetTracker";

// showcase コンポーネントの静的マップ
// 新しい showcase が追加されたらここにエントリを追加
interface ShowcaseEntry {
  loader: () => Promise<{ default: React.ComponentType }>;
  enterpriseName: string;
  businessType: string;
}

const SHOWCASE_MAP: Record<string, ShowcaseEntry> = {
  "20260808-130735-d901b09c": {
    loader: () =>
      import("@/components/sections/izakaya-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト居酒屋",
    businessType: "飲食業",
  },
  "20260809-061637-e59e74cc": {
    loader: () =>
      import("@/components/sections/manufacturing-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "テスト製造株式会社",
    businessType: "製造業",
  },
  "20260808-061647-a4b73e82": {
    loader: () =>
      import("@/components/sections/20260808-061647-a4b73e82-showcase").then((m) => ({ default: m.default })),
    enterpriseName: "Phase2最新検証株式会社",
    businessType: "製造業",
  },
};

interface ExecutionPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

// デモ未生成時のプレースホルダーコンポーネント
function DemoNotGeneratedPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
      <div className="max-w-md text-center px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
          <Sparkles className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900">
          デモはまだ生成されていません
        </h3>
        <p className="text-sm text-slate-600">
          実装が承認され次第、こちらにプレビューが表示されます。
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI画像フォールバック — オペレータ作業ガイド（内部専用）              */
/* ------------------------------------------------------------------ */
/*  Phase G: レビューで確定した AI画像フォールバック方針を実装担当の       */
/*  オペレータがすぐ使える「作業サーフェス」として実行ページに露出する。   */
/*  serverless から画像生成は行わず、ローカルオペレータが codex で仮画像を  */
/*  生成し、実物受領後に差し替える前提。顧客向け画面・メールには出さない。  */
/* ------------------------------------------------------------------ */

/** 生成優先度のバッジ（高=ローズ / 中=アンバー / 低=スレート） */
function PriorityBadge({ priority }: { priority: GenerationPriorityLevel }) {
  const tone =
    priority === "high"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : priority === "medium"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tone}`}
    >
      優先度: {generationPriorityLabel(priority)}
    </span>
  );
}

/** 実践的なオペレータ作業チェックリスト */
function OperatorChecklist({ prefix }: { prefix: string }) {
  const steps: { title: string; body: string }[] = [
    {
      title: "不足カテゴリだけ仮画像を生成する",
      body: "上記の「不足画像カテゴリ」に対してのみ、コマンド例で AI 仮画像を生成します。顧客提供素材（logo-/photo- 等）は作り直しません。",
    },
    {
      title: `${prefix} プレフィックスで保存する`,
      body: `生成物は必ず ${prefix} 付きのファイル名で保存し、メタデータに aiGenerated:true を付けます。AI 生成資産として顧客提供素材と区別します。`,
    },
    {
      title: "実物受領後に差し替える",
      body: "顧客から本素材を受け取ったら、仮画像を本素材で順次差し替えます。仮画像は本公開前に必ずすべて入れ替えます。",
    },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-rose-600" />
        <p className="text-sm font-bold text-foreground">
          オペレータ作業チェックリスト
        </p>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex gap-3 rounded-2xl border border-border bg-white p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * AI画像フォールバックのオペレータガイドパネル（内部専用）。
 * 状態・不足カテゴリ・生成優先順位・codex コマンド例・プロンプト断片・
 * トレーサビリティ規則・作業チェックリストをまとめて表示する。
 * 画像生成そのものは行わず、オペレータがローカルで実行するためのガイド。
 */
function ImageFallbackOperatorPanel({
  fb,
  submissionId,
  fallbackAssets,
}: {
  fb: ImageFallbackAssessment;
  submissionId: string;
  fallbackAssets: AiFallbackAsset[];
}) {
  return (
    <section className="border-t border-rose-200 bg-rose-50/40">
      <div className="mx-auto max-w-container px-4 py-10 sm:py-12">
        {/* 内部専用バナー */}
        <div className="rounded-2xl border border-rose-300 bg-rose-100/70 p-4 text-sm leading-relaxed text-rose-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">
                内部オペレータ専用の作業ガイド（顧客非公開）
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                このパネルは実装担当者向けです。サーバー（Vercel/serverless）からは画像生成を行いません。
                ローカル環境のオペレータが codex で仮画像を生成し、実物受領後に差し替えます。
                以下の内容は顧客向け画面・メールには絶対に出さないでください。
              </p>
            </div>
          </div>
        </div>

        {/* 状態 + 不足カテゴリ */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs font-bold text-muted-foreground">
              フォールバック状態
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {imageFallbackStatusLabel(fb.status)}
            </p>
            {fb.assessedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                評価日時: {fb.assessedAt}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs font-bold text-muted-foreground">
              不足画像カテゴリ
            </p>
            {fb.missingImageCategories.length > 0 ? (
              <p className="mt-1 text-sm text-foreground">
                {fb.missingImageCategories.join("・")}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">該当なし</p>
            )}
          </div>
        </div>

        {/* 判定根拠 */}
        {fb.rationale.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-foreground">判定根拠</p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
              {fb.rationale.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 生成優先順位 */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-bold text-foreground">
              生成優先順位（高い順）
            </p>
          </div>
          <ul className="mt-3 space-y-3">
            {fb.generationPriority.map((target) => (
              <li
                key={target.category}
                className="rounded-2xl border border-border bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={target.priority} />
                  <span className="text-sm font-bold text-foreground">
                    {target.category}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {target.reason}
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-foreground">
                  {target.promptFragment}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 生成経路・コマンド例 */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-bold text-foreground">
              生成経路・コマンド例（コピー実行用）
            </p>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-white p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              経路:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                {fb.generationPath.tool} -m {fb.generationPath.model}
              </code>
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-muted-foreground">
                コマンド例
              </p>
              <CopyButton value={fb.generationPath.exampleCommand} />
            </div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
{fb.generationPath.exampleCommand}
            </pre>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {fb.generationPath.notice}
            </p>
          </div>
        </div>

        {/* プロンプト断片（生成ヒント） */}
        {fb.promptBlocks.length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-bold text-foreground">
              プロンプト断片（生成ヒント）
            </p>
            <ul className="mt-3 space-y-2">
              {fb.promptBlocks.map((block, index) => (
                <li
                  key={index}
                  className="whitespace-pre-wrap rounded-xl border border-border bg-white p-3 text-xs leading-relaxed text-foreground"
                >
                  {block}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* トレーサビリティ規則 */}
        <div className="mt-8 rounded-2xl border border-border bg-white p-4">
          <p className="text-sm font-bold text-foreground">
            トレーサビリティ規則
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {fb.assetTraceability.rule}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            ファイル名プレフィックス:{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
              {fb.assetTraceability.prefix}
            </code>{" "}
            / メタデータフラグ:{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
              {fb.assetTraceability.marker}
            </code>
          </p>
        </div>

        {/* オペレータ作業チェックリスト */}
        <OperatorChecklist prefix={fb.assetTraceability.prefix} />

        {/* 生成資産の追跡レジストリ（Phase H・内部オペレータ専用） */}
        {/* 生成した AI仮画像のメタデータをここに登録・追跡し、実物受領後に差し替え状態を更新する */}
        <FallbackAssetTracker
          submissionId={submissionId}
          initialAssets={fallbackAssets}
          categoryOptions={fb.missingImageCategories}
          prefix={fb.assetTraceability.prefix}
        />
      </div>
    </section>
  );
}

export default async function ExecutionPage({ params }: ExecutionPageProps) {
  const { submissionId } = await params;

  // submissionId のバリデーション（基本的な形式チェック）
  if (!submissionId || typeof submissionId !== "string") {
    notFound();
  }

  // SHOWCASE_MAP にエントリがなければプレースホルダを表示する。
  // ダッシュボードのクイックリンクから開いたときのリンク切れ（404）を防ぐため、
  // 実装が未生成の段階でもページ自体は開けるようにする。
  const showcaseEntry = SHOWCASE_MAP[submissionId];
  const ShowcaseComponent = showcaseEntry
    ? (await showcaseEntry.loader()).default
    : null;
  const enterpriseName = showcaseEntry?.enterpriseName ?? "企業名";
  const businessType = showcaseEntry?.businessType ?? "業種";

  // 承認パッケージを読み込み、AI画像フォールバックが「必要」な案件では
  // オペレータ向けの内部作業ガイドを表示する。
  // 画像生成そのものは serverless では行わず、ローカルオペレータが実行する前提。
  const approvalPackage = await readApprovalPackage(submissionId);
  const imageFallback = approvalPackage?.imageFallback ?? null;
  const showFallbackPanel =
    imageFallback !== null && imageFallback.status !== "not_needed";

  // 生成資産の追跡レジストリ（ai-fallback-assets.json）を読み込む。
  // オペレータが登録した AI仮画像のメタデータ一覧。存在しなければ空。
  const fallbackRegistry = showFallbackPanel
    ? await readAiFallbackAssets(submissionId)
    : null;
  const fallbackAssets = fallbackRegistry?.assets ?? [];

  return (
    <div className="bg-slate-50">
      {/* ============================================================ */}
      {/*  管理バー（実装プレビューであることを示す）                       */}
      {/* ============================================================ */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-container items-start gap-3 px-4 py-3 sm:items-center">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 sm:mt-0" />
          <p className="text-sm leading-relaxed text-amber-900">
            これはご相談内容をもとに作成した
            <span className="font-bold">実装プレビュー</span>
            です。
            実際の制作では、デザイン・原稿・写真をさらに詰めてまいります。
            <span className="hidden sm:inline">
              {" "}
              （受領 ID: <span className="font-mono">{submissionId}</span>）
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ヘッダー（戻るリンク）                                          */}
      {/* ============================================================ */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-container px-4 py-3">
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                トップに戻る
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{enterpriseName}</span>
              <span className="text-slate-300">/</span>
              <span>{businessType}</span>
              <span className="text-slate-300">/</span>
              <span>実装プレビュー</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  メインコンテンツ（動的 showcase コンポーネント）                    */}
      {/* ============================================================ */}
      {ShowcaseComponent ? (
        <ShowcaseComponent />
      ) : (
        <DemoNotGeneratedPlaceholder />
      )}

      {/* ============================================================ */}
      {/*  AI画像フォールバック — オペレータ作業ガイド（内部専用）            */}
      {/* ============================================================ */}
      {/*  画像が不足している案件でのみ表示。既存のプレビューフローは維持し、  */}
      {/*  内部ガイドは顧客向けコンテンツと明確に区別して下部に置く。          */}
      {showFallbackPanel && imageFallback && (
        <ImageFallbackOperatorPanel
          fb={imageFallback}
          submissionId={submissionId}
          fallbackAssets={fallbackAssets}
        />
      )}

      {/* ============================================================ */}
      {/*  フッターコメント                                               */}
      {/* ============================================================ */}
      <footer className="border-t bg-slate-100">
        <div className="mx-auto max-w-container px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            この実装プレビューはブリーフにもとづき自動生成されました。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            最終的なサイトとはデザイン・原稿・写真が異なる場合があります。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/review/${submissionId}`}>
                <ExternalLink className="mr-2 h-3 w-3" />
                元の相談を確認
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 動的レンダリングを指定（実行時に決定するため）
export const dynamic = "force-dynamic";
