import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";
import {
  buildExecutionSectionPromptsMarkdown,
  readApprovalPackage,
  readExecutionPromptMarkdown,
  readExecutionSectionPromptsMarkdown,
  readMonetMappingArtifact,
  readExecutionConformanceArtifact,
  type ApprovalStatus,
  type ApprovalPackage,
  type PlanningArtifact,
  type ExecutionHandoff,
  type ApprovalDecision,
  type PlanApprovalDecision,
  type ProductionReadiness,
  type MonetMappingArtifact,
  type ExecutionConformanceArtifact,
} from "@/lib/approval-package";
import { readArtifact } from "@/server/submission-storage";
import {
  imageFallbackStatusLabel,
  type ImageFallbackAssessment,
} from "@/lib/image-fallback";
import {
  readAiFallbackAssets,
  type AiFallbackAsset,
} from "@/lib/ai-fallback-assets";
import {
  fallbackAssetHref,
  isInlineImageContentType,
} from "@/lib/ai-fallback-asset-links";
import {
  readDemoFeedbackHistory,
  type DemoFeedbackHistory,
} from "@/lib/demo-feedback-loop";
import { DEMO_SECTION_OPTIONS, demoSectionName } from "@/lib/demo-sections";
import {
  readLineage,
  type RevisionLineage,
  type RoundEntry,
} from "@/lib/revision-lineage";
import { Gate3ChecklistCard } from "@/components/gate3/Gate3ChecklistCard";
import { FollowupEditForm } from "./FollowupEditForm";
import Gate2InlineActionCard from "./Gate2InlineActionCard";
import {
  formatPayloadForReview,
  SUPPLEMENT_TARGETS,
  supplementTargetCurrentValues,
} from "@/lib/consult-fields";
import { buildIntakeEvidence } from "@/lib/intake-checklist";
import { SupplementRequestForm } from "./SupplementRequestForm";
import Gate1InlineActionCard from "./Gate1InlineActionCard";
import SectionCompletionToggle from "./SectionCompletionToggle";

interface ReviewPageProps {
  params: Promise<{ submissionId: string }> | { submissionId: string };
}

/* ------------------------------------------------------------------ */
/*  ステータス表示メタ                                                   */
/* ------------------------------------------------------------------ */

function statusLabel(status: ApprovalStatus): string {
  switch (status) {
    case "received":
      return "受領済み";
    case "needs_followup":
      return "追加情報待ち";
    case "awaiting_representative_approval":
      return "代表確認待ち（第1ゲート）";
    case "awaiting_plan_approval":
      return "計画承認待ち（第2ゲート）";
    case "approved_for_execution":
      return "実行準備完了";
    case "approved_for_planning":
      return "計画着手承認済み（旧状態）";
    case "demo_generating":
      return "デモ生成中";
    case "demo_deployed":
      return "デモ公開済み（顧客確認待ち）";
    case "demo_revision_ready":
      return "修正要望受領";
    case "demo_revised":
      return "修正版公開済み";
    case "customer_approved":
      return "顧客承認済み（本制作前ヒアリング待ち）";
    case "pre_production_interview":
      return "本制作前ヒアリング中（第3ゲート前）";
    case "pre_production_review":
      return "本制作前最終承認待ち（第3ゲート）";
    case "production_ready":
      return "本制作可能（第3ゲート承認済み）";
    case "delivered":
      return "納品済み";
    case "rejected":
      return "却下";
    default:
      return status;
  }
}

function statusTone(status: ApprovalStatus): string {
  switch (status) {
    case "needs_followup":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "awaiting_plan_approval":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "approved_for_execution":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "approved_for_planning":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "pre_production_interview":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "pre_production_review":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "production_ready":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "delivered":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

/**
 * 承認アクション欄の最上部に出す「いまどこにいるか」の1行サマリ。
 * ステータスラベル（バッジ）と組み合わせて、オペレータが現在地を
 * 一目で把握できるようにする。ゲート別の判定履歴はこの下に控えめに並べる。
 */
function approvalStandingSummary(status: ApprovalStatus): string {
  switch (status) {
    case "received":
      return "受領済み・品質判定待ちです。";
    case "needs_followup":
      return "追加情報の入力待ちです（上のフォームで更新してください）。";
    case "awaiting_representative_approval":
      return "第1ゲート（インテイク）の承認待ちです。";
    case "awaiting_plan_approval":
      return "第2ゲート（計画）の承認待ちです。計画を確認して承認 or 差し戻し。";
    case "approved_for_execution":
      return "承認済み・実行準備完了。実行ハンドオフをローカルで実行してください。";
    case "demo_generating":
      return "デモ生成中です。";
    case "demo_deployed":
      return "デモ公開済み・顧客の確認待ちです。";
    case "demo_revision_ready":
      return "修正要望を受領しています。デモを修正して再公開してください。";
    case "demo_revised":
      return "修正版公開済み・顧客の再確認待ちです。";
    case "customer_approved":
      return "顧客承認済み・本制作前ヒアリング待ちです。";
    case "pre_production_interview":
      return "本制作前ヒアリング中（第3ゲート前）。";
    case "pre_production_review":
      return "第3ゲート（本制作前最終承認）待ちです。";
    case "production_ready":
      return "本制作可能です（第3ゲート承認済み）。";
    case "delivered":
      return "納品済みです。";
    case "rejected":
      return "この相談は却下されています。";
    default:
      return statusLabel(status);
  }
}

function isDemoVisibleStatus(status: ApprovalStatus): boolean {
  return [
    "demo_deployed",
    "demo_revised",
    "customer_approved",
    "pre_production_interview",
    "pre_production_review",
    "production_ready",
    "delivered",
  ].includes(status);
}

function isExecutionVisibleStatus(status: ApprovalStatus): boolean {
  return [
    "approved_for_execution",
    "demo_generating",
    "demo_deployed",
    "demo_revision_ready",
    "demo_revised",
    "customer_approved",
    "pre_production_interview",
    "pre_production_review",
    "production_ready",
    "delivered",
  ].includes(status);
}

function reviewRouteGuidance(status: ApprovalStatus): {
  title: string;
  body: string;
  toneClass: string;
} {
  if (isDemoVisibleStatus(status)) {
    return {
      title: "まず /demo を開いてください",
      body:
        "実デモ生成済み。お客様確認は /demo、内部確認は /execution で。",
      toneClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (isExecutionVisibleStatus(status)) {
    return {
      title: "まず /execution を開いてください",
      body:
        "実デモ未生成。/demo はまだ開けません。内部プレビューを確認してください。",
      toneClass: "border-violet-200 bg-violet-50 text-violet-900",
    };
  }

  return {
    title: "まずこの review 画面で承認を進めてください",
    body:
      "実デモ・内部プレビューは制作段階のため未対象。承認後に生成されます。",
    toneClass: "border-amber-200 bg-amber-50 text-amber-900",
  };
}

/* ------------------------------------------------------------------ */
/*  次のアクション メタ（ステータス → やること / 操作先）               */
/* ------------------------------------------------------------------ */

type NextActionContext = {
  adminUrl: string;
  demoUrl: string;
  executionUrl: string;
  reviewUrl: string;
};

type NextActionMeta = {
  /** ① 現在の段階 */
  stage: string;
  /** ② 次にやること */
  nextAction: string;
  /** ③ 開くべきページ / 操作先 のラベル */
  targetLabel: string;
  /** ③ の遷移先 URL */
  href: string;
  /** カードの配色 */
  toneClass: string;
  /** sticky bar 用のコンパクトな行動文（動詞起こし・ヘッダーの状態ラベルと重複させない） */
  actionShort: string;
};

/**
 * ステータスごとに「いま何をすべきか」を1枚のカードにまとめるためのメタを返す。
 * オペレータが迷わず次の操作に進めるよう、段階・やること・開くべきページを明示する。
 * URL はメイン側で計算済みの admin / demo / execution / review を再利用する。
 */
function nextActionMeta(
  status: ApprovalStatus,
  ctx: NextActionContext,
): NextActionMeta {
  switch (status) {
    case "needs_followup":
      return {
        stage: "顧客からの追加情報待ち",
        nextAction:
          "必須項目が揃うまで追加情報の入力を待つ。すべて揃うと自動で代表確認（第1ゲート）へ進む。",
        targetLabel: "追加情報入力フォーム（この画面）",
        href: ctx.reviewUrl,
        toneClass: "border-amber-200 bg-amber-50 text-amber-900",
        actionShort: "追加情報を入力待つ",
      };
    case "awaiting_representative_approval":
      return {
        stage: "第1ゲート（インテイク承認）待ち",
        nextAction:
          "代表がインテイクを承認 or 差し戻し。各セクション末尾の行動支援から直接フォームへ進める。承認すると OMC 計画アーティファクトを自動生成し、第2ゲートへ進む。",
        targetLabel: "承認アクションを開く",
        href: `${ctx.reviewUrl}#approval-actions`,
        toneClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
        actionShort: "代表が承認を判断",
      };
    case "awaiting_plan_approval":
      return {
        stage: "第2ゲート（計画承認）待ち",
        nextAction:
          "計画アーティファクトを確認し、承認 or 差し戻し。承認すると実行ハンドオフ成果物を生成する。",
        targetLabel: "計画アーティファクトと承認アクション（この画面）",
        href: ctx.reviewUrl,
        toneClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
        actionShort: "計画を承認判断",
      };
    case "approved_for_execution":
      return {
        stage: "実行準備完了（実行ハンドオフ生成済み）",
        nextAction:
          "ローカルオペレータが実行ハンドオフのプロンプトを使い、Claude Code でデモを生成する。",
        targetLabel: "実行ハンドオフ / 内部プレビュー",
        href: ctx.executionUrl,
        toneClass: "border-violet-200 bg-violet-50 text-violet-900",
        actionShort: "デモを生成",
      };
    case "demo_generating":
      return {
        stage: "デモ生成中",
        nextAction:
          "オペレータの生成作業を待つ。完了するとデモ公開（顧客確認待ち）へ進む。",
        targetLabel: "内部プレビュー（生成状況確認）",
        href: ctx.executionUrl,
        toneClass: "border-violet-200 bg-violet-50 text-violet-900",
        actionShort: "生成完了を待つ",
      };
    case "demo_deployed":
      return {
        stage: "デモ公開済み（顧客確認待ち）",
        nextAction:
          "顧客にデモ URL を案内し、フィードバック or 承認を待つ。",
        targetLabel: "デモページを開く",
        href: ctx.demoUrl,
        toneClass: "border-blue-200 bg-blue-50 text-blue-900",
        actionShort: "顧客確認を待つ",
      };
    case "demo_revision_ready":
      return {
        stage: "修正要望を受領済み",
        nextAction:
          "デモフィードバック（セクション別修正要望）を確認し、修正してデモを再公開する。",
        targetLabel: "デモフィードバック / デモページ",
        href: ctx.demoUrl,
        toneClass: "border-rose-200 bg-rose-50 text-rose-900",
        actionShort: "修正・再公開",
      };
    case "demo_revised":
      return {
        stage: "修正版公開済み（顧客再確認待ち）",
        nextAction:
          "顧客に修正版デモを再確認してもらい、承認を待つ。",
        targetLabel: "デモページを開く",
        href: ctx.demoUrl,
        toneClass: "border-blue-200 bg-blue-50 text-blue-900",
        actionShort: "顧客再確認を待つ",
      };
    case "customer_approved":
      return {
        stage: "顧客承認済み（本制作前ヒアリング待ち）",
        nextAction:
          "管理画面から本制作前ヒアリングを起票し、顧客へ質問・追加素材を依頼する。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
        actionShort: "ヒアリングを起票",
      };
    case "pre_production_interview":
      return {
        stage: "本制作前ヒアリング中（第3ゲート前）",
        nextAction:
          "ヒアリング回答と追加素材を確認し、本制作準備度を評価する。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
        actionShort: "回答・素材を評価",
      };
    case "pre_production_review":
      return {
        stage: "第3ゲート（本制作前最終承認）待ち",
        nextAction:
          "本制作へ進めるか、最終承認 or 差し戻しを判断する（ADMIN_SECRET が必要）。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-indigo-200 bg-indigo-50 text-indigo-900",
        actionShort: "最終承認を判断",
      };
    case "production_ready":
      return {
        stage: "本制作可能（第3ゲート承認済み）",
        nextAction:
          "本制作を実行する。必要に応じて実行ハンドオフ・素材を最終確認する。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        actionShort: "本制作を実行",
      };
    case "delivered":
      return {
        stage: "納品済み",
        nextAction:
          "完了。必要に応じて事後フォローや、最終デモを確認する。",
        targetLabel: "デモページ（最終確認）",
        href: ctx.demoUrl,
        toneClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
        actionShort: "完了",
      };
    case "received":
      return {
        stage: "受領済み（品質判定待ち）",
        nextAction:
          "自動で品質判定が行われ、追加情報待ち or 代表確認へ進む。",
        targetLabel: "この review 画面で経過確認",
        href: ctx.reviewUrl,
        toneClass: "border-blue-200 bg-blue-50 text-blue-900",
        actionShort: "品質判定を待つ",
      };
    case "rejected":
      return {
        stage: "却下",
        nextAction:
          "この相談は却下済み。差し戻し理由を確認する。",
        targetLabel: "承認アクション（この画面）",
        href: ctx.reviewUrl,
        toneClass: "border-rose-200 bg-rose-50 text-rose-900",
        actionShort: "却下済み",
      };
    case "approved_for_planning":
      return {
        stage: "計画着手承認済み（旧状態）",
        nextAction:
          "レガシー状態。必要に応じて代表確認・計画承認へ誘導する。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-slate-200 bg-slate-50 text-slate-700",
        actionShort: "レガシー状態対応",
      };
    default:
      return {
        stage: statusLabel(status),
        nextAction:
          "このステータスの次アクションは未定義です。管理画面で状況を確認してください。",
        targetLabel: "管理画面を開く",
        href: ctx.adminUrl,
        toneClass: "border-slate-200 bg-slate-50 text-slate-700",
        actionShort: "管理画面で確認",
      };
  }
}

/**
 * ステータスごとの「次のアクション」を1枚の強調カードで出す。
 * ① 現在の段階 / ② 次にやること / ③ 開くべきページ（操作先）を一目で分かるようにする。
 * ページ最上部付近に配置し、オペレータが次の操作に迷わないようにする。
 */
function NextActionCard({ meta }: { meta: NextActionMeta }) {
  return (
    <section className={`mb-6 rounded-3xl border p-5 shadow-sm ${meta.toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-3">
        Next Action
      </p>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-bold opacity-70">段階:</span>
          <span className="text-sm font-bold">{meta.stage}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold opacity-70">次:</span>
          <span className="text-sm">{meta.nextAction}</span>
        </div>
        <Link
          href={meta.href}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold transition hover:bg-white whitespace-nowrap"
        >
          {meta.targetLabel} →
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  表示用小物パーツ                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  badge,
  id,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  /** アンカー遷移先（#xxx）用の id。ルート要素に付与し、
   *  スティッキーバーに隠れないように scroll-mt を確保する。 */
  id?: string;
  children: React.ReactNode;
}) {
  // 内部専用 / 代表専用 のセクションは、オペレータの高速スキャンを妨げないよう
  // デフォルトで折りたたむ。<details> を使うことで JavaScript 不要で開閉できる。
  // 運用必須セクション（概要・品質判定・参考URL/素材分析・追加情報の入力・
  // 計画アーティファクト・承認アクション 等）は、これまで通り常に展開する。
  const defaultCollapsed =
    title.includes("内部専用") || title.includes("代表専用");

  if (defaultCollapsed) {
    return (
      <details id={id} className="group scroll-mt-32 rounded-3xl border border-dashed border-border bg-muted/40">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-6 sm:p-8 [&::-webkit-details-marker]:hidden">
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
          {badge}
        </summary>
        <div className="border-t border-border/60 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section id={id} className="scroll-mt-32 rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */



function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">該当なし</p>;
  }
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

type AttachmentFile = {
  originalName: string;
  savedName: string;
  sizeBytes: number;
  kind: string;
};

function attachmentPreviewMode(kind: string): "image" | "pdf" | "text" | "none" {
  if (kind === "画像") return "image";
  if (kind === "PDF") return "pdf";
  if (kind === "テキスト") return "text";
  return "none";
}

/**
 * 表示優先度（画像 → PDF → テキスト → その他）。
 * 同一優先度の中では ファイル名 で安定ソートする。
 */
function attachmentSortPriority(kind: string): number {
  switch (attachmentPreviewMode(kind)) {
    case "image":
      return 0;
    case "pdf":
      return 1;
    case "text":
      return 2;
    default:
      return 3;
  }
}

/** バイト数を B / KB / MB / GB / TB の読みやすい表記にする */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / Math.pow(1024, exponent);
  const label = units[exponent];
  if (exponent === 0) return `${Math.round(value)} ${label}`;
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${label}`;
}

/** 種別ごとの絵文字・ラベル・バッジ配色 */
function attachmentKindMeta(kind: string): {
  emoji: string;
  label: string;
  badgeClass: string;
} {
  switch (kind) {
    case "画像":
      return {
        emoji: "🖼️",
        label: "画像",
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "PDF":
      return {
        emoji: "📄",
        label: "PDF",
        badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "テキスト":
      return {
        emoji: "📝",
        label: "テキスト",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
    case "動画":
      return {
        emoji: "🎬",
        label: "動画",
        badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
      };
    case "音声":
      return {
        emoji: "🎵",
        label: "音声",
        badgeClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      };
    case "Word":
      return {
        emoji: "📘",
        label: "Word",
        badgeClass: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "表計算":
      return {
        emoji: "📊",
        label: "表計算",
        badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "プレゼン":
      return {
        emoji: "📽️",
        label: "プレゼン",
        badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
      };
    case "圧縮ファイル":
      return {
        emoji: "🗜️",
        label: "圧縮",
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "ベクターロゴ":
    case "PSD":
      return {
        emoji: "🎨",
        label: kind,
        badgeClass: "bg-pink-100 text-pink-700 border-pink-200",
      };
    default:
      return {
        emoji: "📎",
        label: kind || "ファイル",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

function attachmentPreviewHref(submissionId: string, savedName: string): string {
  return `/api/consult/${submissionId}/attachments/${encodeURIComponent(savedName)}?inline=1`;
}

function attachmentDownloadHref(submissionId: string, savedName: string): string {
  return `/api/consult/${submissionId}/attachments/${encodeURIComponent(savedName)}`;
}

function AttachmentPreviewCard({
  submissionId,
  file,
}: {
  submissionId: string;
  file: AttachmentFile;
}) {
  const previewMode = attachmentPreviewMode(file.kind);
  const previewHref = attachmentPreviewHref(submissionId, file.savedName);
  const downloadHref = attachmentDownloadHref(submissionId, file.savedName);
  const meta = attachmentKindMeta(file.kind);

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md">
      {/* ヘッダー：種別アイコン + ファイル名 + バッジ + アクション */}
      <div className="flex flex-col gap-3 border-b border-border/70 bg-accent/50 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-xl"
            aria-hidden="true"
          >
            {meta.emoji}
          </span>
          <div className="min-w-0">
            <p className="break-all font-medium leading-snug text-foreground">
              {file.originalName}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.sizeBytes)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground transition hover:bg-slate-50"
          >
            別タブで表示
          </a>
          <a
            href={downloadHref}
            download
            className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          >
            ダウンロード
          </a>
        </div>
      </div>

      {/* プレビュー本体 */}
      <div className="p-4">
        {previewMode === "image" && (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`${file.originalName} を別タブで開く`}
            className="group block focus:outline-none"
          >
            <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-slate-50 p-3">
              <img
                src={previewHref}
                alt={file.originalName}
                loading="lazy"
                decoding="async"
                className="max-h-[440px] w-full rounded-lg object-contain transition group-hover:opacity-90"
              />
            </div>
          </a>
        )}

        {previewMode === "pdf" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-accent/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span aria-hidden="true">📄</span>
              PDF プレビュー
            </div>
            <iframe
              src={previewHref}
              title={file.originalName}
              className="h-[460px] w-full bg-white"
            />
          </div>
        )}

        {previewMode === "text" && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-accent/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span aria-hidden="true">📝</span>
              テキスト プレビュー
            </div>
            <iframe
              src={previewHref}
              title={file.originalName}
              className="h-[240px] w-full bg-white"
            />
          </div>
        )}

        {previewMode === "none" && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-accent/40 px-4 py-3">
            <span className="text-lg" aria-hidden="true">
              🛈
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              この形式は埋め込みプレビュー非対応です。別タブ表示またはダウンロードで確認してください。
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * 代表者の判定（第1ゲート / 第2ゲート共通）を1行で表示する。
 * 未判定のときは「未判定」を出す。
 * 承認アクション欄では「現在の状況サマリ」を最優先に置くため、
 * 判定履歴は小さく控えめなフラット行として下に並べる。
 */
function DecisionLine({
  decision,
  label,
}: {
  decision: ApprovalDecision | PlanApprovalDecision;
  label: string;
}) {
  const decisionLabel =
    decision.representativeDecision === "approve"
      ? "承認"
      : decision.representativeDecision === "reject"
        ? "却下 / 差し戻し"
        : decision.representativeDecision === "hold"
          ? "保留"
          : "未判定";
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground/80">{label}:</span>
      <span className="font-semibold text-foreground">{decisionLabel}</span>
      {decision.decidedAt && (
        <span className="text-muted-foreground">
          / {decision.decidedAt}
          {decision.decidedBy ? `（${decision.decidedBy}）` : ""}
        </span>
      )}
      {decision.memo && (
        <p className="mt-1 w-full break-words text-foreground/80">
          メモ: {decision.memo}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  計画アーティファクト表示                                              */
/* ------------------------------------------------------------------ */

function PlanningArtifactSection({
  plan,
  submissionId,
  isGate2,
}: {
  plan: PlanningArtifact;
  submissionId: string;
  isGate2: boolean;
}) {
  return (
    <Section
      title="OMC 計画アーティファクト"
      badge={
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          決定論的生成（LLM 不使用）
        </span>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        代表者の第1ゲート承認時に自動生成された、段階別の実行計画。第2ゲート（計画承認）で
        確認します。生成日時: {plan.generatedAt || "不明"}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-bold text-foreground">ブリーフ要点</p>
          <div className="space-y-1.5 rounded-2xl bg-accent p-3 text-sm text-foreground">
            <p>{plan.briefSnapshot.businessSummary || "（要約なし）"}</p>
            <p className="text-muted-foreground">
              ターゲット: {plan.briefSnapshot.targetUserSummary || "（未整理）"}
            </p>
            {plan.briefSnapshot.strengths.length > 0 && (
              <p className="text-muted-foreground">
                強み: {plan.briefSnapshot.strengths.join("・")}
              </p>
            )}
            {plan.briefSnapshot.mustInclude.length > 0 && (
              <p className="text-muted-foreground">
                必須掲載: {plan.briefSnapshot.mustInclude.join("・")}
              </p>
            )}
            {plan.briefSnapshot.referenceUrls.length > 0 && (
              <p className="break-all text-muted-foreground">
                参考URL: {plan.briefSnapshot.referenceUrls.join("・")}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-bold text-foreground">実行前の前提</p>
            <BulletList items={plan.prerequisites} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold text-foreground">ブロッカー・リスク前提</p>
            <BulletList items={plan.blockers} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold text-foreground">計画策定の根拠</p>
            <BulletList items={plan.rationale} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-foreground">
          実行ステップ（厳密な順序: {plan.orderedStageIds.join(" → ")}）
        </p>
        <div className="space-y-3">
          {plan.stages.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-border bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-primary">STEP {index + 1}</p>
                  <h3 className="mt-1 text-base font-bold text-foreground">{stage.title}</h3>
                </div>
                {stage.involvesExecution && (
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    実行を伴う
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-foreground">{stage.objective}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-bold text-muted-foreground">入力</p>
                  <BulletList items={stage.inputs} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-muted-foreground">期待成果物</p>
                  <BulletList items={stage.outputs} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Gate2InlineActionCard
        active={isGate2}
        submissionId={submissionId}
        sectionId="planning-artifact"
        guidance="計画の段階・前提条件・実行ステップを確認してください。問題なければ承認、修正が必要なら差し戻しで第1ゲートに戻ります。"
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  実行ハンドオフ表示（内部専用）                                        */
/* ------------------------------------------------------------------ */

function ExecutionHandoffSection({
  handoff,
  promptMarkdown,
  sectionPromptsMarkdown,
}: {
  handoff: ExecutionHandoff;
  promptMarkdown: string | null;
  sectionPromptsMarkdown: string | null;
}) {
  return (
    <Section
      title="実行ハンドオフ（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-relaxed text-rose-900">
        <p className="font-semibold">このセクションは内部専用です。顧客向け画面・メールには一切出しません。</p>
        <p className="mt-1.5 text-xs">
          本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません。
          ローカル環境のオペレータが、生成されたプロンプト・メタデータ・コマンドを使って
          Claude Code を実行することを想定しています。生成日時: {handoff.generatedAt || "不明"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">ハンドオフ方式</p>
          <p className="rounded-xl bg-accent p-3 text-sm text-foreground">
            {handoff.handoffMode}（ローカルオペレータへ引き渡し）
          </p>
          <p className="mb-1.5 mt-3 text-xs font-semibold text-foreground">作業ディレクトリ</p>
          <p className="rounded-xl bg-accent p-3 font-mono text-sm text-foreground">
            {handoff.workingDirectory}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">成果物ファイル</p>
          <ul className="space-y-1 rounded-xl bg-accent p-3 text-sm">
            <li className="break-all">
              <span className="text-muted-foreground">プロンプト: </span>
              <span className="font-mono text-foreground">{handoff.promptFilePath}</span>
            </li>
            {handoff.sectionPromptsFilePath && (
              <li className="break-all">
                <span className="text-muted-foreground">セクション別プロンプト: </span>
                <span className="font-mono text-foreground">
                  {handoff.sectionPromptsFilePath}
                </span>
              </li>
            )}
            <li className="break-all">
              <span className="text-muted-foreground">メタデータ: </span>
              <span className="font-mono text-foreground">{handoff.metadataFilePath}</span>
            </li>
            <li className="break-all">
              <span className="text-muted-foreground">計画: </span>
              <span className="font-mono text-foreground">{handoff.planFilePath}</span>
            </li>
            <li className="break-all">
              <span className="text-muted-foreground">ブリーフ: </span>
              <span className="font-mono text-foreground">{handoff.briefFilePath}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold text-foreground">Claude Code コマンド（コピー実行用・内部専用）</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-slate-900 p-3 font-mono text-xs text-slate-100">
{handoff.claudeCommand}
        </pre>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">実行前の前提</p>
          <BulletList items={handoff.prerequisites} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">重要事項</p>
          <BulletList items={handoff.notices} />
        </div>
      </div>

      {promptMarkdown && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-foreground">
            実行プロンプト本文（execution-prompt.md・内部専用）
          </p>
          <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-slate-50 p-3 text-[11px] leading-relaxed text-foreground">
{promptMarkdown}
          </pre>
        </div>
      )}

      {sectionPromptsMarkdown && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-foreground">
            セクション別実行プロンプト（execution-section-prompts.md・Phase P・内部専用）
          </p>
          <p className="mb-1.5 text-xs leading-relaxed text-muted-foreground">
            execution-prompt.md を HEADER / HERO / SERVICES … のセクション単位に事前分割した作業ブロック。
            オペレータは該当セクションを取り出して Claude Code に渡せます。
          </p>
          <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-slate-50 p-3 text-[11px] leading-relaxed text-foreground">
{sectionPromptsMarkdown}
          </pre>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  本制作前ヒアリング・再検証（第3ゲート）表示（読み取り専用）          */
/* ------------------------------------------------------------------ */

/**
 * 第3ゲート（本制作前最終承認）の状態を読み取り専用で表示する。
 *
 * 第3ゲートの承認/差し戻しは ADMIN_SECRET が必要なため、この review ページ
 * （認証なし・submissionId のみ）からは実行できない。状態の可視化にとどめ、
 * 実際の操作は管理画面（/admin/[submissionId]）で行う前提。
 */
function readinessTone(readiness: ProductionReadiness): string {
  return readiness.status === "ready"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : "bg-amber-100 text-amber-800 border-amber-200";
}

function PreProductionSection({ pkg }: { pkg: ApprovalPackage }) {
  const interview = pkg.preProductionInterview;
  const readiness = pkg.productionReadiness;
  const questionCount = interview ? interview.questions.length : 0;
  const answerCount = interview?.answers?.length ?? 0;

  return (
    <Section
      title="本制作前ヒアリング・再検証（第3ゲート）"
      badge={
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
          Gate3
        </span>
      }
    >
      {/* 内部判断支援チェックリスト（コンパクト・既存データから派生） */}
      <div className="mb-5">
        <Gate3ChecklistCard
          input={{
            status: pkg.status,
            interview: pkg.preProductionInterview,
            readiness: pkg.productionReadiness,
          }}
        />
      </div>
      {!interview ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          本制作前ヒアリングはまだ開始されていません。顧客がデモを承認
          （customer_approved）したあと、管理画面からヒアリングを開始してください。
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            顧客のヒアリング回答・追加素材・本制作準備度を確認し、第3ゲートで
            本制作へ進めるかを判断します。起票日時: {interview.requestedAt || "不明"}
          </p>

          {/* 状態サマリ（回答数・追加素材・準備度をひと目で） */}
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">回答数</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {answerCount} / {questionCount} 件
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">追加素材</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {interview.additionalMaterialCount} 件
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">本制作準備度</p>
              {readiness ? (
                <p className="mt-1 text-sm font-semibold text-foreground">
                  <span
                    className={
                      readiness.status === "ready"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }
                  >
                    {readiness.status === "ready" ? "進行可能" : "要フォロー"}
                  </span>
                  {" "}（スコア {readiness.score}）
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">未評価</p>
              )}
            </div>
          </div>

          {/* 質問と回答 */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-foreground">ヒアリング回答</p>
            <ul className="space-y-3">
              {interview.questions.map((q) => {
                const answer =
                  interview.answers?.find((a) => a.questionId === q.id)?.text ?? "";
                return (
                  <li key={q.id} className="rounded-2xl bg-accent p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {q.text}
                      {q.required && (
                        <span className="ml-2 rounded border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                          必須
                        </span>
                      )}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {answer ? answer : "（未回答）"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 追加素材 */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">追加素材</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {interview.additionalMaterialCount} 件
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">回答日時</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {interview.answeredAt ?? "（未提出）"}
              </p>
            </div>
          </div>

          {/* 本制作準備度（キャッシュがあれば表示） */}
          {readiness && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-foreground">本制作準備度（再検証）</p>
              <div
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${readinessTone(
                  readiness
                )}`}
              >
                {readiness.status === "ready"
                  ? `進行可能（スコア ${readiness.score}）`
                  : `要フォロー（スコア ${readiness.score}）`}
              </div>
              {readiness.reasons.length > 0 && (
                <div className="mt-3">
                  <BulletList items={readiness.reasons} />
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                評価日時: {readiness.assessedAt || "不明"}
              </p>
            </div>
          )}

          {/* アクションへの案内（認証が必要なため管理画面へ誘導） */}
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
            第3ゲートの承認・差し戻しは管理画面から行います（ADMIN_SECRET が必要）。
            <Link
              href={`/admin/${pkg.submissionId}`}
              className="ml-1 font-bold underline"
            >
              管理画面を開く →
            </Link>
          </div>
        </>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  AI画像フォールバック方針表示（内部専用・コンパクト）                 */
/* ------------------------------------------------------------------ */

/**
 * Phase D の画像フォールバック評価を、内部レビュー用にコンパクトなカードで出す。
 * ステータス・不足画像カテゴリ・内部生成経路（/usr/bin/codex -m gpt-5.5）・
 * 顧客向け注記を一目で分かるようにする。生成経路・運用規則は内部専用。
 */
function ImageFallbackSection({
  fb,
  submissionId,
  assets = [],
}: {
  fb: ImageFallbackAssessment;
  submissionId: string;
  assets?: AiFallbackAsset[];
}) {
  const isNeeded = fb.status !== "not_needed";
  const pending = assets.filter((a) => a.status === "generated");
  const replaced = assets.filter((a) => a.status === "replaced");
  const toneClass =
    fb.status === "recommended"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : fb.status === "allowed"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Section
      title="AI画像フォールバック方針（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${toneClass}`}>
        <p className="font-bold">{imageFallbackStatusLabel(fb.status)}</p>
        <p className="mt-2">
          {isNeeded
            ? "顧客提供素材では画像が足りないため、AI生成の仮画像で運用します。実物受領後に順次差し替えます。"
            : "顧客提供の写真・ロゴで画像は概ね足りています。AI仮画像は不要です。"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">不足画像カテゴリ</p>
          {fb.missingImageCategories.length > 0 ? (
            <BulletList items={fb.missingImageCategories} />
          ) : (
            <p className="text-sm text-muted-foreground">該当なし</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">内部生成経路</p>
          <p className="break-all rounded-2xl bg-accent p-3 font-mono text-sm text-foreground">
            {fb.generationPath.tool} -m {fb.generationPath.model}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            serverless では実行せず、ローカルオペレータが実行します。生成物は{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
              {fb.assetTraceability.prefix}
            </code>{" "}
            プレフィックスで保存し、AI生成資産として顧客提供素材と区別します。
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-accent p-4">
        <p className="text-xs font-bold text-muted-foreground">顧客向け扱い（参考）</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          {fb.customerFacingNote}
        </p>
      </div>

      {/* 追跡中のAIフォールバック資産（内部専用・コンパクトサマリ） */}
      {/* 生成済み資産のうち、まだ仮画像か・差し替え済みかを一目で分かるようにする */}
      {assets.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">
              追跡中のAIフォールバック資産
            </p>
            <p className="text-xs text-muted-foreground">
              仮画像 <span className="font-bold text-amber-700">{pending.length}</span> 件 ／
              差し替え済み <span className="font-bold text-emerald-700">{replaced.length}</span> 件
            </p>
          </div>
          <ul className="space-y-2">
            {assets.map((asset) => {
              const hasBinary = Boolean(asset.contentType);
              const previewHref = fallbackAssetHref(
                submissionId,
                asset.savedName,
                "preview"
              );
              const downloadHref = fallbackAssetHref(
                submissionId,
                asset.savedName,
                "download"
              );
              const inlineImage =
                hasBinary && isInlineImageContentType(asset.contentType);
              return (
                <li
                  key={asset.id}
                  className="rounded-2xl border border-border bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        asset.status === "replaced"
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-amber-200 bg-amber-100 text-amber-800"
                      }`}
                    >
                      {asset.status === "replaced" ? "差し替え済み" : "仮画像（差し替え待ち）"}
                    </span>
                    <span className="font-bold text-foreground">{asset.category}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{asset.id}
                    </span>
                    {hasBinary && (
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                        {asset.contentType}
                      </span>
                    )}
                  </div>

                  {/* インライン画像サムネイル（ブラウザ表示可能な画像のときだけ） */}
                  {inlineImage && (
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block overflow-hidden rounded-xl border border-border bg-slate-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewHref}
                        alt={asset.originalName ?? asset.savedName}
                        loading="lazy"
                        decoding="async"
                        className="max-h-40 w-full object-contain"
                      />
                    </a>
                  )}

                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {asset.savedName}
                  </p>
                  {asset.originalName && asset.originalName !== asset.savedName && (
                    <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
                      元ファイル名: {asset.originalName}
                    </p>
                  )}
                  {asset.note && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {asset.note}
                    </p>
                  )}

                  {/* プレビュー/ダウンロード（バイナリ本体がある資産だけ） */}
                  {hasBinary && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline hover:opacity-80"
                      >
                        プレビュー（別タブ）
                      </a>
                      <a
                        href={downloadHref}
                        download
                        className="font-medium text-primary underline hover:opacity-80"
                      >
                        ダウンロード
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Monetコンポーネントマッピング サマリ（内部専用）                     */
/* ------------------------------------------------------------------ */

/**
 * Monetコンポーネントマッピングアーティファクトを、内部レビュー用に
 * コンパクトなカードで出す。再利用可能・要調整・カスタム実装の分類と
 * 推奨セクション構造を一目で分かるようにする。
 */
function MonetMappingSection({
  mapping,
}: {
  mapping: MonetMappingArtifact;
}) {
  return (
    <Section
      title="Monetコンポーネントマッピング（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
          決定論的生成
        </span>
      }
    >
      <div className="rounded-2xl border border-border bg-accent p-4 text-sm leading-relaxed text-muted-foreground">
        Monetカタログ（{mapping.generatedBy}）から抽出した業種「{mapping.useCaseLabel}」の
        推奨セクション構造とコンポーネント対応付けです。生成日時: {mapping.generatedAt}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">再利用可能</p>
          {mapping.reusable.length > 0 ? (
            <ul className="space-y-1">
              {mapping.reusable.map((c) => (
                <li key={c.id} className="text-sm">
                  <span className="font-semibold text-foreground">{c.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({c.id})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">該当なし</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">カスタム実装が必要</p>
          {mapping.customOnly.length > 0 ? (
            <ul className="space-y-1">
              {mapping.customOnly.map((s) => (
                <li key={s.slot} className="text-sm">
                  <span className="font-semibold text-foreground">{s.slot}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">該当なし</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-bold text-foreground">要調整</p>
        {mapping.needsAdjustment.length > 0 ? (
          <ul className="space-y-1">
            {mapping.needsAdjustment.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-semibold text-foreground">{c.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">({c.id})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">該当なし</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-accent p-4">
        <p className="text-xs font-bold text-muted-foreground">判定根拠</p>
        <BulletList items={mapping.rationale} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  実行準拠性 サマリ（内部専用）                                       */
/* ------------------------------------------------------------------ */

/**
 * 実行準拠性アーティファクトを、内部レビュー用にコンパクトなカードで出す。
 * 禁止されている行為・発明と資産使用ルールを一目で分かるようにする。
 */
function ExecutionConformanceSection({
  conformance,
}: {
  conformance: ExecutionConformanceArtifact;
}) {
  return (
    <Section
      title="実行準拠性（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className="rounded-2xl border border-border bg-accent p-4 text-sm leading-relaxed text-muted-foreground">
        実行時の法令・著作権・資産運用ルールをまとめたものです。
        禁止行為検出: {conformance.forbiddenInventions.length}件、
        資産使用ルール: {conformance.assetUsageRules.length}件。
        生成日時: {conformance.generatedAt}
      </div>

      {conformance.forbiddenInventions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-rose-700">
            禁止されている行為・発明（{conformance.forbiddenInventions.length}件）
          </p>
          <ul className="space-y-2">
            {conformance.forbiddenInventions.map((inv, index) => (
              <li
                key={index}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-3"
              >
                <p className="text-sm font-semibold text-rose-900">
                  {inv.category}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-rose-800/90">
                  {inv.description}
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  該当箇所: {inv.source}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {conformance.assetUsageRules.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-foreground">
            資産使用ルール（{conformance.assetUsageRules.length}件）
          </p>
          <ul className="space-y-2">
            {conformance.assetUsageRules.map((rule, index) => (
              <li
                key={index}
                className="rounded-2xl border border-border bg-white p-3 text-sm"
              >
                <p className="font-semibold text-foreground">{rule.ruleType}</p>
                <p className="mt-1 text-muted-foreground">{rule.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  対象: {rule.assetCategory}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-accent p-4">
        <p className="text-xs font-bold text-muted-foreground">全体要約</p>
        <BulletList items={conformance.rationale} />
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  デモフィードバック サマリ（内部専用・セクション別）                  */
/* ------------------------------------------------------------------ */

/**
 * 顧客がデモページから送信した修正要望（セクション単位）を、内部確認用に
 * まとめる。最新ラウンドの評価・コメント・セクション別の修正/承認内訳・
 * 参考画像URL・修正ラウンド履歴を一目で分かるようにする。
 *
 * データは demo-feedback.json（demo-feedback-loop が管理）。承認（approve）
 * は履歴に追記されないため、履歴の各エントリは「修正要望」ラウンド。
 * したがって「セクションが選択されている＝修正依頼」「選択されていない＝
 * 修正対象外（承認相当）」として内訳を表示する。
 *
 * 内部専用。顧客向け画面・メールには一切出さない。
 */
function DemoFeedbackReviewSection({
  history,
}: {
  history: DemoFeedbackHistory;
}) {
  const latest = history.latest;
  if (!latest) return null;

  const entries = history.history;
  const latestRound =
    entries.length > 0 ? entries[entries.length - 1].round : null;

  const flagged = latest.sections ?? [];
  const flaggedIds = new Set(flagged.map((s) => s.sectionId));
  const approvedSections = DEMO_SECTION_OPTIONS.filter(
    (s) => !flaggedIds.has(s.id)
  );

  return (
    <Section
      title="デモフィードバック サマリ（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className="rounded-2xl border border-border bg-accent p-4 text-sm leading-relaxed text-muted-foreground">
        顧客がデモページから送信した修正要望（セクション単位）の内部確認用サマリです。
        どのセクションが修正依頼で、どのセクションが承認相当かを把握してください。
        顧客向け画面・メールには出しません。
      </div>

      {/* サマリスタッツ（最新ラウンド・評価・送信日時） */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">最新ラウンド</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {latestRound !== null ? `${latestRound} 回目の修正依頼` : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">最新の全体評価</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            <span className="text-amber-500">★</span> {latest.rating} / 5
          </p>
        </div>
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">送信日時</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {latest.submittedAt || "不明"}
          </p>
        </div>
      </div>

      {/* 全体コメント */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-foreground">最新の全体コメント</p>
        {latest.comment ? (
          <p className="whitespace-pre-wrap rounded-2xl bg-accent p-4 text-sm leading-relaxed text-foreground">
            {latest.comment}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">（全体コメントなし）</p>
        )}
      </div>

      {/* セクション別の 修正依頼 / 承認相当 の内訳 */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-rose-700">
            修正依頼あり（{flagged.length}件）
          </p>
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当なし</p>
          ) : (
            <ul className="space-y-2">
              {flagged.map((s) => (
                <li
                  key={s.sectionId}
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-3"
                >
                  <p className="text-sm font-semibold text-rose-900">
                    {demoSectionName(s.sectionId, s.sectionName)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rose-800/90">
                    {s.feedback
                      ? s.feedback
                      : "（箇所のみ指定・詳細コメントなし）"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-emerald-700">
            修正対象外（{approvedSections.length}件・承認相当）
          </p>
          {approvedSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当なし</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {approvedSections.map((s) => (
                <li
                  key={s.id}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            顧客が修正対象として選択しなかった箇所です。特に修正を求めていない＝
            承認相当と解釈できます。
          </p>
        </div>
      </div>

      {/* 参考画像 URL */}
      {(latest.referenceImages?.length ?? 0) > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-foreground">
            参考画像 / スクリーンショット URL
          </p>
          <ul className="space-y-1 text-sm">
            {latest.referenceImages!.map((url) => (
              <li key={url} className="break-all">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline hover:opacity-80"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 修正ラウンド履歴 */}
      {entries.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-foreground">
            修正ラウンド履歴（{entries.length}件）
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {entries.map((e) => (
              <li key={e.round} className="rounded-xl bg-accent px-3 py-2">
                <span className="font-semibold text-foreground">
                  {e.round} 回目
                </span>
                {" / "}
                <span className="text-amber-600">
                  ★ {e.feedback.rating}
                </span>
                {" / "}
                <span>{e.submittedAt}</span>
                {" / "}
                <span>修正依頼 {e.feedback.sections?.length ?? 0} 件</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  デモフィードバック ↔ リビジョンラウンド 対比（内部専用）              */
/* ------------------------------------------------------------------ */

/**
 * 最新のデモフィードバック（セクション別修正要望）と、現行のリビジョン
 * ラウンド（revision-lineage.json）を1箇所で対比する内部確認用ビュー。
 *
 * ねらい: 「どのセクションが修正依頼されたか」「現行リビジョンはどのラウンドか」
 * 「そのフィードバック以降に修正ラウンドが記録されているか」を、オペレータが
 * 一目で追跡できるようにする。
 *
 * 【真実性の制約】ラインデータにはセクション単位の修正完了状態は含まれない
 * （revisionPrompt はテキストの塊）。したがってこのビューは「追跡性・確認支援」
 * であり、自動的な正否判定ではない。特定セクションが修正済みかは主張しない。
 *
 * 内部専用。顧客向け画面・メールには一切出さない。
 */

/**
 * 最新フィードバックの送信日時以降（capturedAt >= submittedAt）に記録された
 * revision ラウンドが存在するかを判定する。
 *
 * タイムスタンプが欠落・非解析可能なときは determinable: false にして、
 * 偽の判定を出さない。truthfulness を優先するため、round 数の比較は副次的な
 * 参考情報にとどめ、存在判定には時刻の実比較のみを用いる。
 */
function revisionRoundAfterFeedback(
  revisionRounds: RoundEntry[],
  feedbackSubmittedAt: string | undefined
): { exists: boolean; determinable: boolean; round: RoundEntry | null } {
  if (!feedbackSubmittedAt) {
    return { exists: false, determinable: false, round: null };
  }
  const fbTs = Date.parse(feedbackSubmittedAt);
  if (!Number.isFinite(fbTs)) {
    return { exists: false, determinable: false, round: null };
  }
  if (revisionRounds.length === 0) {
    return { exists: false, determinable: true, round: null };
  }
  // 最新フィードバック以降の revision ラウンドを抽出し、最新の1件を返す
  const after = revisionRounds
    .filter((r) => {
      const ts = Date.parse(r.capturedAt);
      return Number.isFinite(ts) && ts >= fbTs;
    })
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
  return {
    exists: after.length > 0,
    determinable: true,
    round: after[0] ?? null,
  };
}

function DemoFeedbackRevisionComparisonSection({
  history,
  lineage,
}: {
  history: DemoFeedbackHistory;
  lineage: RevisionLineage;
}) {
  const latest = history.latest;
  if (!latest) return null;

  // フィードバックで修正依頼されたセクション / 修正対象外（承認相当）
  const flagged = latest.sections ?? [];
  const flaggedIds = new Set(flagged.map((s) => s.sectionId));
  const approvedSections = DEMO_SECTION_OPTIONS.filter(
    (s) => !flaggedIds.has(s.id)
  );

  // フィードバック履歴の最新ラウンド番号（1-indexed）
  const entries = history.history;
  const latestFeedbackRound =
    entries.length > 0 ? entries[entries.length - 1].round : null;

  // 現行リビジョンラウンド（isCurrent を優先、なければ currentRound で照合）
  const currentRoundEntry =
    lineage.rounds.find((r) => r.isCurrent) ??
    (lineage.currentRound >= 0
      ? lineage.rounds.find((r) => r.round === lineage.currentRound)
      : undefined);

  // revision 系譜と「フィードバック以降に修正ラウンドがあるか」の判定
  const revisionRounds = lineage.rounds.filter((r) => r.kind === "revision");
  const afterStatus = revisionRoundAfterFeedback(
    revisionRounds,
    latest.submittedAt
  );

  return (
    <Section
      title="デモフィードバック ↔ リビジョンラウンド 対比（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className="rounded-2xl border border-border bg-accent p-4 text-sm leading-relaxed text-muted-foreground">
        最新のデモフィードバックと現行リビジョンラウンドを対比する、オペレータ追跡用ビューです。
        <strong className="text-foreground">自動的な正否判定ではありません</strong>。
        セクション単位の修正完了状態はラインデータから判定できないため、revisionPrompt の全文と
        実画面で最終確認してください。顧客向け画面・メールには出しません。
      </div>

      {/* 3 カラムサマリ: フィードバック / 現行ラウンド / 対比ステータス */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">最新フィードバック</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {latestFeedbackRound !== null
              ? `${latestFeedbackRound} 回目の修正依頼`
              : "修正依頼（ラウンド不明）"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            評価 ★ {latest.rating} / 送信 {latest.submittedAt || "不明"}
          </p>
        </div>
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">現行リビジョン</p>
          {currentRoundEntry ? (
            <>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {currentRoundEntry.label}
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                {currentRoundEntry.snapshotKey}
                {currentRoundEntry.shortSha
                  ? ` · ${currentRoundEntry.shortSha}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="rounded-2xl bg-accent p-4">
          <p className="text-xs font-bold text-muted-foreground">対比ステータス</p>
          {afterStatus.determinable ? (
            <p
              className={`mt-1 text-sm font-semibold ${
                afterStatus.exists ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {afterStatus.exists
                ? "修正ラウンドがフィードバック以降に記録済み"
                : "修正ラウンドはまだ記録されていない"}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              タイムスタンプから判定不可
            </p>
          )}
        </div>
      </div>

      {/* 現行ラウンド 詳細 */}
      {currentRoundEntry && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-foreground">現行ラウンド詳細</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">ラウンド / 種別</p>
              <p className="mt-1 font-semibold text-foreground">
                round {currentRoundEntry.round}（{currentRoundEntry.kind}）
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">snapshotKey</p>
              <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                {currentRoundEntry.snapshotKey}
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">commit</p>
              <p className="mt-1 font-mono text-[11px] text-foreground">
                {currentRoundEntry.shortSha ?? "（コミットなし）"}
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">status</p>
              <p className="mt-1 font-semibold text-foreground">
                {currentRoundEntry.status}
              </p>
            </div>
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">キャプチャ日時</p>
              <p className="mt-1 text-foreground">{currentRoundEntry.capturedAt}</p>
            </div>
            {currentRoundEntry.committedAt && (
              <div className="rounded-2xl bg-accent p-3 text-sm">
                <p className="text-xs font-bold text-muted-foreground">コミット日時</p>
                <p className="mt-1 text-foreground">{currentRoundEntry.committedAt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* セクション対比: 修正依頼 / 修正対象外 */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-rose-700">
            修正依頼あり（{flagged.length}件）
          </p>
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当なし</p>
          ) : (
            <ul className="space-y-2">
              {flagged.map((s) => (
                <li
                  key={s.sectionId}
                  className="rounded-2xl border border-rose-200 bg-rose-50 p-3"
                >
                  <p className="text-sm font-semibold text-rose-900">
                    {demoSectionName(s.sectionId, s.sectionName)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-emerald-700">
            修正対象外（{approvedSections.length}件・承認相当）
          </p>
          {approvedSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">該当なし</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {approvedSections.map((s) => (
                <li
                  key={s.id}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* フィードバック後の修正ラウンド情報（truthful・副次的な件数参考付き） */}
      <div className="mt-5 rounded-2xl border border-border bg-white p-4">
        <p className="text-sm font-bold text-foreground">フィードバック後の修正ラウンド</p>
        {afterStatus.determinable && afterStatus.exists && afterStatus.round ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            最新フィードバック（{latest.submittedAt || "日時不明"}）以降に、
            <strong> {afterStatus.round.label} </strong>
            （round {afterStatus.round.round} / {afterStatus.round.capturedAt}）
            が記録されています。各セクションが実際に修正されたかは、
            revisionPrompt の全文と実画面で確認してください。
          </p>
        ) : afterStatus.determinable && !afterStatus.exists ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            最新フィードバック以降の修正ラウンドは、まだ系譜に記録されていません。
            （revision ラウンド {revisionRounds.length} 件 / フィードバック {entries.length} 件）
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            フィードバック送信日時またはラウンドのキャプチャ日時が取得できないため、
            タイムスタンプによる対比は判定できません。手動で revision-lineage と
            demo-feedback の時系列を照合してください。
            （revision ラウンド {revisionRounds.length} 件 / フィードバック {entries.length} 件）
          </p>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  リビジョンラウンド履歴（内部専用・Phase K トレーサビリティ）          */
/* ------------------------------------------------------------------ */

/**
 * revision-lineage.json の全ラウンドを、内部確認用にコンパクトなカードで出す。
 * 現行ラウンド（round / kind / snapshotKey / shortSha / commitMessage / status /
 * キャプチャ日時）と、全ラウンドの履歴一覧を一目で追えるようにする。
 *
 * フィードバックの有無にかかわらず、ラウンドが1件でもあれば表示する。
 * 真の SoT は git と snapshots であり、lineage は再生成可能な派生物である点に注意。
 *
 * 内部専用。顧客向け画面・メールには一切出さない。
 */
function RevisionLineageSection({ lineage }: { lineage: RevisionLineage }) {
  const rounds = lineage.rounds;
  if (rounds.length === 0) return null;

  // 現行ラウンド（isCurrent を優先、なければ最新）
  const current = rounds.find((r) => r.isCurrent) ?? rounds[rounds.length - 1];

  // 履歴は新しい順で表示
  const ordered = [...rounds].sort((a, b) => b.round - a.round);

  return (
    <Section
      title="リビジョンラウンド履歴（内部専用）"
      badge={
        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
          ⚠ 顧客非公開
        </span>
      }
    >
      <div className="rounded-2xl border border-border bg-accent p-4 text-sm leading-relaxed text-muted-foreground">
        デモ生成・修正の全ラウンドを round ↔ snapshotKey ↔ commit で追跡する、
        オペレータ確認用のビューです。現行ラウンドとコミット対応を確認してください。
        顧客向け画面・メールには出しません。
      </div>

      {/* 現行ラウンド */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-foreground">現行ラウンド</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-accent p-3 text-sm">
            <p className="text-xs font-bold text-muted-foreground">ラウンド / 種別</p>
            <p className="mt-1 font-semibold text-foreground">
              {current.label}（round {current.round}・{current.kind}）
            </p>
          </div>
          <div className="rounded-2xl bg-accent p-3 text-sm">
            <p className="text-xs font-bold text-muted-foreground">snapshotKey</p>
            <p className="mt-1 break-all font-mono text-[11px] text-foreground">
              {current.snapshotKey}
            </p>
          </div>
          <div className="rounded-2xl bg-accent p-3 text-sm">
            <p className="text-xs font-bold text-muted-foreground">commit</p>
            <p className="mt-1 font-mono text-[11px] text-foreground">
              {current.shortSha ?? "（コミットなし）"}
            </p>
            {current.commitMessage && (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {current.commitMessage}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-accent p-3 text-sm">
            <p className="text-xs font-bold text-muted-foreground">status</p>
            <p className="mt-1 font-semibold text-foreground">{current.status}</p>
          </div>
          <div className="rounded-2xl bg-accent p-3 text-sm">
            <p className="text-xs font-bold text-muted-foreground">キャプチャ日時</p>
            <p className="mt-1 text-foreground">{current.capturedAt}</p>
          </div>
          {current.committedAt && (
            <div className="rounded-2xl bg-accent p-3 text-sm">
              <p className="text-xs font-bold text-muted-foreground">コミット日時</p>
              <p className="mt-1 text-foreground">{current.committedAt}</p>
            </div>
          )}
        </div>
      </div>

      {/* 全ラウンド履歴 */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-foreground">
          ラウンド履歴（{ordered.length}件・新しい順）
        </p>
        <ul className="space-y-2">
          {ordered.map((r) => (
            <li
              key={`${r.round}-${r.snapshotKey}`}
              className={`rounded-2xl border p-3 text-sm ${
                r.isCurrent
                  ? "border-rose-200 bg-rose-50"
                  : "border-border bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {r.isCurrent && (
                  <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    現行
                  </span>
                )}
                <span className="font-bold text-foreground">{r.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  round {r.round}・{r.kind}
                </span>
                <span className="break-all font-mono text-[11px] text-muted-foreground">
                  {r.snapshotKey}
                </span>
                {r.shortSha && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    · {r.shortSha}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {r.status} ／ キャプチャ {r.capturedAt}
                {r.committedAt ? ` ／ コミット ${r.committedAt}` : ""}
              </p>
              {r.commitMessage && (
                <p className="mt-0.5 break-all text-xs text-foreground">
                  {r.commitMessage}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  フォローアップの繰り返しループ進捗（needs_followup 時に表示）         */
/* ------------------------------------------------------------------ */

/**
 * needs_followup 状態のとき、追加情報の再提出が「繰り返しループ」であることを
 * 一目で分かるようにする。ラウンド数・直近の更新日時・スコア・次のステップを表示する。
 * データは approval-package の followupRounds / lastFollowupAt / lastFollowupScore から。
 */
function FollowupLoopProgress({
  rounds,
  lastFollowupAt,
  lastFollowupScore,
  currentScore,
}: {
  rounds: number;
  lastFollowupAt: string | null;
  lastFollowupScore: number | null;
  currentScore: number;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-bold text-amber-900">
          フォローアップ {rounds} ラウンド目
        </span>
        <span className="text-amber-800">
          現在のスコア:{" "}
          <span className="font-semibold text-amber-900">{currentScore}</span>
        </span>
        {lastFollowupScore !== null && (
          <span className="text-amber-800">
            前回更新後スコア:{" "}
            <span className="font-semibold text-amber-900">{lastFollowupScore}</span>
          </span>
        )}
        {lastFollowupAt && (
          <span className="text-amber-800">前回の更新: {lastFollowupAt}</span>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-800/90">
        {rounds === 0
          ? "不足している情報を入力して「情報を更新する」を押してください。すべての必須項目が揃うと、自動的に社内レビューへ進みます。"
          : "まだ必須項目が揃っていません。引き続き不足分を補足して更新してください。スコアが基準に達すると、自動的に社内レビューへ進みます。"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  メイン                                                              */
/* ------------------------------------------------------------------ */

export default async function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const submissionId = resolvedParams?.submissionId;

  if (!submissionId) notFound();

  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) notFound();

  // 実行ハンドオフがあるときだけ、プロンプト本文をディスクから読み込む（内部専用）
  const executionPromptMarkdown = pkg.executionHandoff
    ? await readExecutionPromptMarkdown(submissionId)
    : null;

  // セクション別実行プロンプト（execution-section-prompts.md・Phase P・内部専用）も読み込む。
  // execution-prompt.md をセクション単位に事前分割した作業ブロックで、
  // ハンドオフ生成時に一緒に書き出される。不在時は null（ブロックを表示しない）。
  //
  // レガシー後方互換（pre-Phase-P）: Phase P より前に承認されたサブミッションは
  // execution-handoff.json / execution-prompt.md のみで execution-section-prompts.md を持たない。
  // ストレージ読み込みが null のとき、ハンドオフ＋計画アーティファクトが揃っていれば
  // その場で markdown を合成して表示する。ストレージへの書き込みは一切行わない（読み取り専用フォールバック）。
  const executionSectionPromptsMarkdown = pkg.executionHandoff
    ? (await readExecutionSectionPromptsMarkdown(submissionId)) ??
      (pkg.planningArtifact
        ? buildExecutionSectionPromptsMarkdown(pkg, pkg.planningArtifact)
        : null)
    : null;

  // Monetコンポーネントマッピング（monet-mapping.json）を読み込む。
  // 第1ゲート承認後に生成される。存在すれば内部レビュー用にサマリ表示。
  const monetMapping = await readMonetMappingArtifact(submissionId);

  // 実行準拠性（execution-conformance.json）を読み込む。
  // 第2ゲート承認後に生成される。存在すれば内部レビュー用にサマリ表示。
  const executionConformance = await readExecutionConformanceArtifact(submissionId);

  // デモフィードバック履歴（demo-feedback.json）を読み込む。
  // 顧客がデモページから修正要望を送った履歴。存在すれば内部レビュー用にサマリ表示。
  // ステータスによらず過去のフィードバックを確認できるよう、常に読み込みを試みる。
  const demoFeedbackHistory = await readDemoFeedbackHistory(submissionId);

  // リビジョン系譜（revision-lineage.json）を読み込む。
  // 全ラウンドの round↔commit↔snapshotKey 相関。フィードバックとの対比表示に使う。
  // 不在時は空 rounds の初期状態を返すため、存在判定は rounds.length で行う。
  const revisionLineage = await readLineage(submissionId);

  // AIフォールバック資産レジストリ（ai-fallback-assets.json）を読み込む。
  // オペレータが登録した AI仮画像の追跡メタデータ。存在すれば内部レビュー用にサマリ表示。
  const fallbackAssetsRegistry = await readAiFallbackAssets(submissionId);
  const fallbackAssets = fallbackAssetsRegistry?.assets ?? [];

  // needs_followup のとき、顧客が再編集できるように submission.json のペイロードを読み込む
  let initialPayload: Record<string, unknown> = {};
  if (pkg.status === "needs_followup") {
    try {
      const raw = await readArtifact(submissionId, "submission.json");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          parsed.payload &&
          typeof parsed.payload === "object"
        ) {
          initialPayload = parsed.payload as Record<string, unknown>;
        }
      }
    } catch {
      // 読み取り失敗は空オブジェクトでフォールバック
    }
  }

  // 常に payload を読み込んで表示用に使う（needs_followup 以外でも全項目表示のため）
  let payloadForDisplay: Record<string, unknown> = {};
  try {
    const raw = await readArtifact(submissionId, "submission.json");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        parsed.payload &&
        typeof parsed.payload === "object"
      ) {
        payloadForDisplay = parsed.payload as Record<string, unknown>;
      }
    }
  } catch {
    // 読み取り失敗は空オブジェクトでフォールバック
  }

  // 顧客入力フィールドのグループ化表示
  const consultFieldGroups = formatPayloadForReview(payloadForDisplay);

  // インテイク十分性エビデンスの構築
  const intakeEvidence = buildIntakeEvidence(payloadForDisplay, pkg.intakeQuality);

  // 項目別差戻しUI用の「現在の入力値」を抜き出す（複数回呼ばないよう1回だけ計算）
  const supplementCurrentValues = supplementTargetCurrentValues(payloadForDisplay);

  const isGate1 = pkg.status === "awaiting_representative_approval";
  const isGate2 = pkg.status === "awaiting_plan_approval";
  const isApproved = pkg.status === "approved_for_execution";
  const isRejected = pkg.status === "rejected";
  const isNeedsFollowup = pkg.status === "needs_followup";
  const reviewUrl = `/review/${pkg.submissionId}`;
  const demoUrl = `/demo/${pkg.submissionId}`;
  const executionUrl = `/execution/${pkg.submissionId}`;
  const adminUrl = `/admin/${pkg.submissionId}`;
  const canOpenDemo = isDemoVisibleStatus(pkg.status);
  const canOpenExecution = isExecutionVisibleStatus(pkg.status);
  // 品質判定の表示トーン（ready なら進行可能・それ以外は追加確認が必要）
  const intakeReady = pkg.intakeQuality.status === "ready";
  const routeGuidance = reviewRouteGuidance(pkg.status);
  const nextAction = nextActionMeta(pkg.status, {
    adminUrl,
    demoUrl,
    executionUrl,
    reviewUrl,
  });

  // 添付ファイルを表示優先度（画像 → PDF → テキスト → その他）で並び替える
  const sortedAttachments: AttachmentFile[] = [
    ...pkg.materialsAnalysis.availableAttachments,
  ].sort((a, b) => {
    const priorityDiff = attachmentSortPriority(a.kind) - attachmentSortPriority(b.kind);
    if (priorityDiff !== 0) return priorityDiff;
    return a.originalName.localeCompare(b.originalName);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Internal Review</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              相談レビュー #{pkg.submissionId}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              顧客向けには表示しない内部レビュー画面です。品質判定・参考URL整理・
              プロンプトチェーン・計画アーティファクト・計画承認・実行ハンドオフを
              ここで確認します。
            </p>
          </div>
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${statusTone(pkg.status)}`}
          >
            {statusLabel(pkg.status)}
          </div>
        </div>

        {/* スティッキー次アクションバー：どこへ行くかを常時表示 */}
        <div className="sticky top-12 z-40 -mx-4 mb-4 border-b border-border bg-slate-50/95 px-3 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">次の操作</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-foreground">
                {nextAction.actionShort}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs">
              <span className="hidden text-muted-foreground/80 sm:inline">開く:</span>
              <Link
                href={nextAction.href}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
              >
                {nextAction.targetLabel}
                <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <Section title="概要">
            {/* 主要事実を上にコンパクトに並べる */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-accent p-3 sm:col-span-2 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">事業要約</p>
                <p className="mt-1 text-sm leading-normal text-foreground">
                  {pkg.reviewSummary.businessSummary || "未整理"}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:col-span-2 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">ターゲット要約</p>
                <p className="mt-1 text-sm leading-normal text-foreground">
                  {pkg.reviewSummary.targetUserSummary || "未整理"}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">受領日時</p>
                <p className="mt-1 text-sm text-foreground">{pkg.receivedAt}</p>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">顧客向け表示状態</p>
                <p className="mt-1 text-sm text-foreground">
                  {pkg.customerFacingStatus}
                </p>
              </div>
            </div>
            {/* 補足情報（優先度低・目立たせない） */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="font-bold">レビューURL:</span>
              <span className="break-all font-mono text-foreground/70">
                {pkg.reviewUrl || "未設定"}
              </span>
            </div>
          </Section>

          <Section title="品質判定">
            {/* 判定を先頭に・色で状態をひと目で */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className={`rounded-2xl border p-3 sm:p-4 ${
                  intakeReady
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="text-xs font-bold text-muted-foreground">総合判定</p>
                <p
                  className={`mt-1 text-base font-bold ${
                    intakeReady ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {intakeReady ? "進行可能" : "追加確認が必要"}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">品質ステータス</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.status}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">スコア</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.score} / 100
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">理由</p>
                <div className="mt-1">
                  <BulletList items={pkg.intakeQuality.reasons} />
                </div>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">不足項目</p>
                <div className="mt-1">
                  <BulletList items={pkg.intakeQuality.requestedItems} />
                </div>
              </div>
              <div className="rounded-2xl bg-accent p-3 sm:p-4">
                <p className="text-xs font-bold text-muted-foreground">追加入力質問</p>
                <div className="mt-1">
                  <BulletList items={pkg.intakeQuality.followupQuestions} />
                </div>
              </div>
            </div>
          </Section>

          {/* インテイク十分性エビデンス（なぜ十分か／なぜ不十分か） */}
          <Section
            title="インテイク十分性の根拠"
            badge={
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                intakeEvidence.verdict === "sufficient"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }`}>
                {intakeEvidence.verdict === "sufficient" ? "十分" : "不十分"}
              </span>
            }
          >
            <div className="rounded-2xl border border-border bg-accent p-4">
              <p className="text-sm font-bold text-foreground">判定サマリ</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {intakeEvidence.verdictSummary}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-accent p-3">
                <p className="text-xs font-bold text-muted-foreground">必須項目充足数</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {intakeEvidence.satisfiedRequiredCount} / {intakeEvidence.requiredItems.length}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3">
                <p className="text-xs font-bold text-muted-foreground">必須項目不足数</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {intakeEvidence.gapRequiredCount}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-3">
                <p className="text-xs font-bold text-muted-foreground">任意項目入力あり</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {intakeEvidence.optionalPresentCount}
                </p>
              </div>
            </div>

            {/* 必須項目のエビデンス一覧 */}
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-foreground">必須項目のエビデンス</p>
              <div className="space-y-2">
                {intakeEvidence.requiredItems.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-3 ${
                      item.status === "ok"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{item.label}</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          item.status === "ok"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-amber-300 bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "ok" ? "OK" : item.status === "empty" ? "空欄" : "薄弱"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      入力: {item.valueExcerpt}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 任意項目の有無 */}
            {intakeEvidence.optionalItems.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-foreground">任意項目の有無（参考情報）</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {intakeEvidence.optionalItems.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-xl border p-2 ${
                        item.present
                          ? "border-slate-200 bg-white"
                          : "border-dashed border-slate-300 bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.present ? item.valueExcerpt : "（未入力）"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 判定の根拠 */}
            <div className="mt-5 rounded-2xl border border-border bg-accent p-4">
              <p className="text-xs font-bold text-muted-foreground">判定の根拠</p>
              <ul className="mt-2 space-y-1">
                {intakeEvidence.rationale.map((r, i) => (
                  <li key={i} className="text-sm leading-relaxed text-foreground">
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <Gate1InlineActionCard
              active={isGate1}
              guidance="必須項目が十分に揃っているか確認してください。「十分」ならそのまま承認へ進めます。"
              submissionId={pkg.submissionId}
              sectionId="intake-sufficiency"
            />
          </Section>

          {/* 顧客入力フィールド全項目表示 */}
          <Section
            title="顧客入力フィールド（全項目）"
            badge={
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                オペレータ用チェックリスト
              </span>
            }
          >
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              顧客が記入した全項目をステップ別にグループ化して表示します。
              オペレータが一目で入力状況を確認できるように、未入力項目も含めてすべて表示します。
            </p>
            <div className="space-y-6">
              {consultFieldGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-2xl border border-border bg-white p-4"
                >
                  <p className="text-sm font-bold text-foreground">{group.title}</p>
                  <div className="mt-3 space-y-3">
                    {group.fields.map((field) => (
                      <div
                        key={field.key}
                        className={`rounded-xl border p-3 ${
                          field.hasValue
                            ? "border-slate-200 bg-slate-50"
                            : "border-dashed border-rose-200 bg-rose-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {field.label}
                          </span>
                          {!field.hasValue && (
                            <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              未入力
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm">
                          {field.kind === "longtext" ? (
                            <p className="whitespace-pre-wrap break-words text-foreground">
                              {field.value}
                            </p>
                          ) : field.kind === "refsites" && field.refSites ? (
                            <div className="space-y-2">
                              {field.refSites.map((site, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg bg-white p-2 text-xs"
                                >
                                  <p className="font-semibold text-foreground">{site.url}</p>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                                    <span>種類: {site.typeLabel}</span>
                                    <span>再現度: {site.followLevelLabel}</span>
                                  </div>
                                  {site.whatToReference && (
                                    <p className="mt-1 text-foreground">
                                      参考部位: {site.whatToReference}
                                    </p>
                                  )}
                                  {site.likedSections && (
                                    <p className="mt-1 text-foreground">
                                      好きな箇所: {site.likedSections}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : field.kind === "list" ? (
                            <p className="text-foreground">{field.value}</p>
                          ) : field.kind === "boolean" ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                                field.value === "はい"
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : "border-slate-300 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {field.value}
                            </span>
                          ) : field.kind === "code" ? (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-foreground">
                              {field.value}
                            </span>
                          ) : (
                            <p className="text-foreground">{field.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Gate1InlineActionCard
              active={isGate1}
              guidance="未入力項目（赤枠）がないか確認してください。不足があれば差し戻しを検討してください。"
              submissionId={pkg.submissionId}
              sectionId="customer-input-fields"
            />
          </Section>

          {/* needs_followup 時の追加情報入力フォーム（顧客向け） */}
          {isNeedsFollowup && (
            <Section
              title="追加情報の入力"
              badge={
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  追加情報待ち
                </span>
              }
            >
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                送信内容に追加情報が必要です。以下のフォームに不足している情報を入力して
                「情報を更新する」をクリックしてください。すべての必須項目が充足されると、
                自動的に社内レビューへ進みます。
              </p>
              <FollowupLoopProgress
                rounds={pkg.followupRounds}
                lastFollowupAt={pkg.lastFollowupAt}
                lastFollowupScore={pkg.lastFollowupScore}
                currentScore={pkg.intakeQuality.score}
              />
              <FollowupEditForm
                submissionId={pkg.submissionId}
                initialPayload={initialPayload}
                initialScore={pkg.intakeQuality.score}
                requestedItems={pkg.intakeQuality.requestedItems}
                followupQuestions={pkg.intakeQuality.followupQuestions}
                supplementRequests={pkg.supplementRequests}
              />
            </Section>
          )}

          <Section title="参考URL / 素材分析">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 左列：素材（オペレータ優先） */}
              <div className="space-y-3">
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">不足素材</p>
                  <div className="mt-1">
                    <BulletList items={pkg.materialsAnalysis.missingAssets} />
                  </div>
                </div>
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">利用可能素材</p>
                  <div className="mt-1">
                    <BulletList items={pkg.materialsAnalysis.usableAssets} />
                  </div>
                </div>
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">添付ファイル</p>
                  {sortedAttachments.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">添付なし</p>
                  ) : (
                    <ul className="mt-2 space-y-3 text-foreground">
                      {sortedAttachments.map((file) => (
                        <AttachmentPreviewCard
                          key={`${file.savedName}-${file.sizeBytes}`}
                          submissionId={pkg.submissionId}
                          file={file}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {/* 右列：参考情報 */}
              <div className="space-y-3">
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">参考URL</p>
                  <div className="mt-1">
                    <BulletList items={pkg.referenceAnalysis.referenceUrls} />
                  </div>
                </div>
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">抽出対象URL</p>
                  <div className="mt-1">
                    <BulletList items={pkg.referenceAnalysis.urlsEligibleForExtraction} />
                  </div>
                </div>
                <div className="rounded-2xl bg-accent p-3 sm:p-4">
                  <p className="text-xs font-bold text-muted-foreground">抽出したい部位</p>
                  <div className="mt-1">
                    <BulletList items={pkg.referenceAnalysis.sectionTargets} />
                  </div>
                </div>
              </div>
            </div>

            <Gate1InlineActionCard
              active={isGate1}
              guidance="参考URLと素材が制作に足るか確認してください。不足があれば項目別差戻しで補足を依頼できます。"
              submissionId={pkg.submissionId}
              sectionId="reference-materials"
            />
          </Section>

          {/* AI画像フォールバック方針（内部専用・Phase D 評価の可視化） */}
          {pkg.imageFallback && (
            <ImageFallbackSection
              fb={pkg.imageFallback}
              submissionId={pkg.submissionId}
              assets={fallbackAssets}
            />
          )}

          {/* Monetコンポーネントマッピング サマリ（内部専用） */}
          {monetMapping && (
            <MonetMappingSection mapping={monetMapping} />
          )}

          {/* 実行準拠性 サマリ（内部専用） */}
          {executionConformance && (
            <ExecutionConformanceSection conformance={executionConformance} />
          )}

          {/* デモフィードバック サマリ（内部専用・Phase F セクション別承認状況） */}
          {demoFeedbackHistory?.latest && (
            <DemoFeedbackReviewSection history={demoFeedbackHistory} />
          )}

          {/* リビジョンラウンド履歴（内部専用・Phase K トレーサビリティ）
              ラウンドが1件でもあれば表示。フィードバックの有無に依存しない。 */}
          {revisionLineage.rounds.length > 0 && (
            <RevisionLineageSection lineage={revisionLineage} />
          )}

          {/* デモフィードバック ↔ リビジョンラウンド 対比（内部専用・追跡性）
              両方存在時のみ表示: 最新フィードバック + ライン系譜に1件以上のラウンド */}
          {demoFeedbackHistory?.latest &&
            revisionLineage.rounds.length > 0 && (
              <DemoFeedbackRevisionComparisonSection
                history={demoFeedbackHistory}
                lineage={revisionLineage}
              />
            )}

          <Section title="内部プロンプトチェーン（代表専用）">
            <div className="space-y-4">
              {pkg.promptChainPreview.map((stage, index) => (
                <div key={stage.id} className="rounded-2xl border border-border bg-slate-50 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary">STEP {index + 1}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground">{stage.title}</h3>
                    </div>
                    {stage.requiresRepresentativeApprovalBeforeContinue && (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        承認後のみ進行
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{stage.objective}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">入力</p>
                      <BulletList items={stage.inputs} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">期待成果物</p>
                      <BulletList items={stage.expectedOutputs} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 計画アーティファクト（第1ゲート承認後に生成） */}
          {pkg.planningArtifact && (
            <PlanningArtifactSection plan={pkg.planningArtifact} submissionId={pkg.submissionId} isGate2={isGate2} />
          )}

          {/* 実行ハンドオフ（第2ゲート承認後に生成・内部専用） */}
          {pkg.executionHandoff && (
            <ExecutionHandoffSection
              handoff={pkg.executionHandoff}
              promptMarkdown={executionPromptMarkdown}
              sectionPromptsMarkdown={executionSectionPromptsMarkdown}
            />
          )}

          {/* 本制作前ヒアリング・再検証（第3ゲート）— 該当状態のときだけ表示 */}
          {(pkg.preProductionInterview ||
            pkg.status === "customer_approved" ||
            pkg.status === "pre_production_interview" ||
            pkg.status === "pre_production_review" ||
            pkg.status === "production_ready") && (
            <PreProductionSection pkg={pkg} />
          )}

          {/* 承認アクション：ステータス別に切り替え（インライン行動支援のアンカー先） */}
          <Section
            id="approval-actions"
            title="承認アクション"
            badge={
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(pkg.status)}`}>
                {statusLabel(pkg.status)}
              </span>
            }
          >
            {/* 現在の承認状況：スティッキーバーと重複しないよう、決定操作に直結する状態だけ表示 */}
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs text-muted-foreground">現在の状態</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {approvalStandingSummary(pkg.status)}
              </p>
            </div>

            {isGate2 && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
                計画アーティファクトが生成済みです。内容を確認のうえ、第2ゲート（計画承認）で
                進めるか差し戻すかを判断してください。承認すると実行ハンドオフ成果物を生成します。
              </div>
            )}

            {isApproved && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
                計画が承認され、実行ハンドオフ成果物が生成済みです。上記「実行ハンドオフ」セクションの
                プロンプト・コマンドをローカル環境のオペレータが Claude Code で実行します。
              </div>
            )}

            {isRejected && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-900">
                この相談は却下されました。必要に応じて差し戻し理由を確認してください。
              </div>
            )}

            {/* 第1ゲート: awaiting_representative_approval のときだけ表示 */}
            {isGate1 && (
              <div className="space-y-4">
                {/* 項目別差戻し／補足要求（状態管理はクライアントコンポーネント） */}
                {/* インライン行動支援の「項目別に差戻し」アンカー先 */}
                <div id="gate1-supplement" className="scroll-mt-32">
                  <SupplementRequestForm
                    submissionId={pkg.submissionId}
                    targets={SUPPLEMENT_TARGETS.map((t) => ({
                      key: t.key,
                      label: t.label,
                      required: t.required,
                      currentValue: supplementCurrentValues[t.key],
                    }))}
                  />
                </div>

                {/* 従来の承認／却下フォーム */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <form action="/api/consult/approve" method="post" id="gate1-approve" className="scroll-mt-32 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <input type="hidden" name="submissionId" value={pkg.submissionId} />
                    <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                    <input type="hidden" name="approvedBy" value="代表" />
                    <label className="block text-sm font-bold text-emerald-900">
                      第1ゲート承認メモ（インテイク承認）
                    </label>
                    <textarea
                      name="memo"
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-0"
                      placeholder="インテイクを承認し、計画アーティファクトを生成する際の指示メモ"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-emerald-800/80">
                      承認すると、OMC 計画アーティファクト（omc-plan.json）を自動生成し、
                      第2ゲート（計画承認待ち）へ進みます。
                    </p>
                    <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                      インテイクを承認する（計画を生成）
                    </button>
                  </form>

                  <form action="/api/consult/reject" method="post" id="gate1-reject" className="scroll-mt-32 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <input type="hidden" name="submissionId" value={pkg.submissionId} />
                    <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                    <input type="hidden" name="approvedBy" value="代表" />
                    <label className="block text-sm font-bold text-rose-900">却下 / 保留メモ（単一）</label>
                    <textarea
                      name="memo"
                      rows={4}
                      className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-0"
                      placeholder="差し戻し理由や保留メモ"
                    />
                    <p className="mt-2 text-xs leading-relaxed text-rose-800/80">
                      却下すると、status を rejected にします。
                      項目別の差戻しは上の「項目別差戻し／補足要求」をご利用ください。
                    </p>
                    <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
                      却下する（単一メモ）
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 第2ゲート: awaiting_plan_approval のときだけ表示 */}
            {isGate2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <form action="/api/consult/plan/approve" method="post" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-emerald-900">
                    第2ゲート承認メモ（計画承認）
                  </label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-0"
                    placeholder="計画を承認し、実行ハンドオフを生成する際のメモ"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-emerald-800/80">
                    承認すると、実行ハンドオフ成果物（execution-prompt.md /
                    execution-handoff.json）を生成し、実行準備完了へ進みます。
                    Claude Code の実行は行わず、ローカルオペレータへの引き渡し成果物だけを生成します。
                  </p>
                  <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
                    計画を承認する（実行ハンドオフを生成）
                  </button>
                </form>

                <form action="/api/consult/plan/reject" method="post" className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-rose-900">計画差し戻しメモ</label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-0"
                    placeholder="計画を差し戻す理由・修正指示"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-rose-800/80">
                    差し戻すと、計画を取り下げて第1ゲート（代表確認待ち）に戻ります。
                    再承認すれば新しい計画が再生成されます。
                  </p>
                  <button className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
                    計画を差し戻す
                  </button>
                </form>
              </div>
            )}

            {/* ゲート別の判定履歴：コンパクト化 */}
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                判定履歴
              </p>
              <div className="space-y-1">
                <DecisionLine decision={pkg.approval} label="第1ゲート" />
                <DecisionLine decision={pkg.planApproval} label="第2ゲート" />
                <DecisionLine decision={pkg.preProductionApproval} label="第3ゲート" />
              </div>
            </div>
          </Section>

          <div className="flex items-center justify-between gap-3">
            <Link href="/consult" className="text-sm font-medium text-primary hover:underline">
              /consult に戻る
            </Link>
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              トップページへ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
