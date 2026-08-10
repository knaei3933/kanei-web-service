import Link from "next/link";
import { notFound } from "next/navigation";
import {
  readApprovalPackage,
  readExecutionPromptMarkdown,
  type ApprovalStatus,
  type ApprovalPackage,
  type PlanningArtifact,
  type ExecutionHandoff,
  type ApprovalDecision,
  type PlanApprovalDecision,
  type ProductionReadiness,
} from "@/lib/approval-package";
import { readArtifact } from "@/server/submission-storage";
import { FollowupEditForm } from "./FollowupEditForm";

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
      title: "実際のデモホームページを開けます",
      body:
        "この案件は実デモが生成済みです。お客様確認用は /demo/[submissionId] を開き、内部確認用は /execution/[submissionId] を使ってください。",
      toneClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (isExecutionVisibleStatus(status)) {
    return {
      title: "まだ実デモは未生成です",
      body:
        "この段階では /demo/[submissionId] はまだ開けません。まず確認すべきページは内部プレビュー /execution/[submissionId] です。",
      toneClass: "border-violet-200 bg-violet-50 text-violet-900",
    };
  }

  return {
    title: "まだデモ制作前の段階です",
    body:
      "この案件はレビュー・承認段階のため、実デモも内部プレビューもまだ主対象ではありません。まずこの review 画面と admin 画面で承認を進めてください。",
    toneClass: "border-amber-200 bg-amber-50 text-amber-900",
  };
}

/* ------------------------------------------------------------------ */
/*  表示用小物パーツ                                                    */
/* ------------------------------------------------------------------ */

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
    <div className="rounded-2xl bg-accent p-4 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="font-semibold text-foreground">{decisionLabel}</span>
      {decision.decidedAt && (
        <span>
          {" "}
          / {decision.decidedAt}
          {decision.decidedBy ? `（${decision.decidedBy}）` : ""}
        </span>
      )}
      {decision.memo && (
        <p className="mt-2 text-foreground">メモ: {decision.memo}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  計画アーティファクト表示                                              */
/* ------------------------------------------------------------------ */

function PlanningArtifactSection({ plan }: { plan: PlanningArtifact }) {
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

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">ブリーフ要点</p>
          <div className="space-y-2 rounded-2xl bg-accent p-4 text-sm text-foreground">
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
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">実行前の前提</p>
            <BulletList items={plan.prerequisites} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">ブロッカー・リスク前提</p>
            <BulletList items={plan.blockers} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-foreground">計画策定の根拠</p>
            <BulletList items={plan.rationale} />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-bold text-foreground">
          実行ステップ（厳密な順序: {plan.orderedStageIds.join(" → ")}）
        </p>
        <div className="space-y-3">
          {plan.stages.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-border bg-slate-50 p-5">
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
              <p className="mt-3 text-sm leading-relaxed text-foreground">{stage.objective}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold text-muted-foreground">入力</p>
                  <BulletList items={stage.inputs} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold text-muted-foreground">期待成果物</p>
                  <BulletList items={stage.outputs} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  実行ハンドオフ表示（内部専用）                                        */
/* ------------------------------------------------------------------ */

function ExecutionHandoffSection({
  handoff,
  promptMarkdown,
}: {
  handoff: ExecutionHandoff;
  promptMarkdown: string | null;
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-900">
        <p className="font-bold">このセクションは内部専用です。顧客向け画面・メールには一切出しません。</p>
        <p className="mt-2">
          本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません。
          ローカル環境のオペレータが、生成されたプロンプト・メタデータ・コマンドを使って
          Claude Code を実行することを想定しています。生成日時: {handoff.generatedAt || "不明"}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">ハンドオフ方式</p>
          <p className="rounded-2xl bg-accent p-4 text-sm text-foreground">
            {handoff.handoffMode}（ローカルオペレータへ引き渡し）
          </p>
          <p className="mb-2 mt-4 text-sm font-bold text-foreground">作業ディレクトリ</p>
          <p className="rounded-2xl bg-accent p-4 font-mono text-sm text-foreground">
            {handoff.workingDirectory}
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">成果物ファイル</p>
          <ul className="space-y-1 rounded-2xl bg-accent p-4 text-sm">
            <li className="break-all">
              <span className="text-muted-foreground">プロンプト: </span>
              <span className="font-mono text-foreground">{handoff.promptFilePath}</span>
            </li>
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

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-foreground">Claude Code コマンド（コピー実行用・内部専用）</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-border bg-slate-900 p-4 font-mono text-sm text-slate-100">
{handoff.claudeCommand}
        </pre>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">実行前の前提</p>
          <BulletList items={handoff.prerequisites} />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-foreground">重要事項</p>
          <BulletList items={handoff.notices} />
        </div>
      </div>

      {promptMarkdown && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-foreground">
            実行プロンプト本文（execution-prompt.md・内部専用）
          </p>
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border bg-slate-50 p-4 text-xs leading-relaxed text-foreground">
{promptMarkdown}
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

  const isGate1 = pkg.status === "awaiting_representative_approval";
  const isGate2 = pkg.status === "awaiting_plan_approval";
  const isApproved = pkg.status === "approved_for_execution";
  const isRejected = pkg.status === "rejected";
  const isNeedsFollowup = pkg.status === "needs_followup";
  const demoUrl = `/demo/${pkg.submissionId}`;
  const executionUrl = `/execution/${pkg.submissionId}`;
  const adminUrl = `/admin/${pkg.submissionId}`;
  const canOpenDemo = isDemoVisibleStatus(pkg.status);
  const canOpenExecution = isExecutionVisibleStatus(pkg.status);
  const routeGuidance = reviewRouteGuidance(pkg.status);

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

        <section className={`mb-6 rounded-3xl border p-6 shadow-sm ${routeGuidance.toneClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">現在どこを見ればよいか</p>
              <h2 className="mt-2 text-xl font-bold">{routeGuidance.title}</h2>
              <p className="mt-2 text-sm leading-relaxed opacity-90">{routeGuidance.body}</p>
            </div>
            <Link
              href={adminUrl}
              className="inline-flex items-center justify-center rounded-xl border border-current/20 bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white"
            >
              管理画面を開く →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-current/15 bg-white/70 p-4">
              <p className="text-xs font-bold opacity-70">レビュー画面</p>
              <p className="mt-1 text-sm font-semibold">常時確認可能</p>
              <p className="mt-2 break-all font-mono text-xs">/review/{pkg.submissionId}</p>
            </div>
            <div className="rounded-2xl border border-current/15 bg-white/70 p-4">
              <p className="text-xs font-bold opacity-70">内部プレビュー</p>
              <p className="mt-1 text-sm font-semibold">{canOpenExecution ? "現在開けます" : "まだ主対象外です"}</p>
              <p className="mt-2 break-all font-mono text-xs">{executionUrl}</p>
            </div>
            <div className="rounded-2xl border border-current/15 bg-white/70 p-4">
              <p className="text-xs font-bold opacity-70">実際のデモホームページ</p>
              <p className="mt-1 text-sm font-semibold">{canOpenDemo ? "現在開けます" : "まだ未生成で開けません"}</p>
              <p className="mt-2 break-all font-mono text-xs">{demoUrl}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <Section title="概要">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground">受領日時</p>
                <p className="mt-1 text-sm text-foreground">{pkg.receivedAt}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">顧客向け表示状態</p>
                <p className="mt-1 text-sm text-foreground">{pkg.customerFacingStatus}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold text-muted-foreground">事業要約</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {pkg.reviewSummary.businessSummary || "未整理"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">ターゲット要約</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {pkg.reviewSummary.targetUserSummary || "未整理"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">レビューURL</p>
                <p className="mt-1 break-all text-sm text-foreground">
                  {pkg.reviewUrl || "未設定"}
                </p>
              </div>
            </div>
          </Section>

          <Section title="品質判定">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">status</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.status}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">score</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.score}
                </p>
              </div>
              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-bold text-muted-foreground">判定メモ</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pkg.intakeQuality.status === "ready" ? "進行可能" : "追加確認必要"}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">理由</p>
                <BulletList items={pkg.intakeQuality.reasons} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">不足項目</p>
                <BulletList items={pkg.intakeQuality.requestedItems} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">追加入力質問</p>
                <BulletList items={pkg.intakeQuality.followupQuestions} />
              </div>
            </div>
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
              <FollowupEditForm
                submissionId={pkg.submissionId}
                initialPayload={initialPayload}
                initialScore={pkg.intakeQuality.score}
                requestedItems={pkg.intakeQuality.requestedItems}
                followupQuestions={pkg.intakeQuality.followupQuestions}
              />
            </Section>
          )}

          <Section title="参考URL / 素材分析">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">参考URL</p>
                <BulletList items={pkg.referenceAnalysis.referenceUrls} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">抽出対象URL</p>
                <BulletList items={pkg.referenceAnalysis.urlsEligibleForExtraction} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">抽出したい部位</p>
                <BulletList items={pkg.referenceAnalysis.sectionTargets} />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-foreground">利用可能素材</p>
                <BulletList items={pkg.materialsAnalysis.usableAssets} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">不足素材</p>
                <BulletList items={pkg.materialsAnalysis.missingAssets} />
                <p className="mb-2 mt-5 text-sm font-bold text-foreground">添付ファイル</p>
                {sortedAttachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">添付なし</p>
                ) : (
                  <ul className="space-y-4 text-foreground">
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
          </Section>

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
            <PlanningArtifactSection plan={pkg.planningArtifact} />
          )}

          {/* 実行ハンドオフ（第2ゲート承認後に生成・内部専用） */}
          {pkg.executionHandoff && (
            <ExecutionHandoffSection
              handoff={pkg.executionHandoff}
              promptMarkdown={executionPromptMarkdown}
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

          {/* 承認アクション：ステータス別に切り替え */}
          <Section
            title="承認アクション"
            badge={
              <span className="text-xs text-muted-foreground">
                現在: {statusLabel(pkg.status)}
              </span>
            }
          >
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
              <div className="grid gap-6 sm:grid-cols-2">
                <form action="/api/consult/approve" method="post" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-emerald-900">
                    第1ゲート承認メモ（インテイク承認）
                  </label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                    placeholder="インテイクを承認し、計画アーティファクトを生成する際の指示メモ"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-emerald-800/80">
                    承認すると、OMC 計画アーティファクト（omc-plan.json）を自動生成し、
                    第2ゲート（計画承認待ち）へ進みます。
                  </p>
                  <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                    インテイクを承認する（計画を生成）
                  </button>
                </form>

                <form action="/api/consult/reject" method="post" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-rose-900">却下 / 保留メモ</label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                    placeholder="差し戻し理由や保留メモ"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-rose-800/80">
                    却下すると、status を rejected にします。
                  </p>
                  <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700">
                    却下する
                  </button>
                </form>
              </div>
            )}

            {/* 第2ゲート: awaiting_plan_approval のときだけ表示 */}
            {isGate2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <form action="/api/consult/plan/approve" method="post" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-emerald-900">
                    第2ゲート承認メモ（計画承認）
                  </label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                    placeholder="計画を承認し、実行ハンドオフを生成する際のメモ"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-emerald-800/80">
                    承認すると、実行ハンドオフ成果物（execution-prompt.md /
                    execution-handoff.json）を生成し、実行準備完了へ進みます。
                    Claude Code の実行は行わず、ローカルオペレータへの引き渡し成果物だけを生成します。
                  </p>
                  <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                    計画を承認する（実行ハンドオフを生成）
                  </button>
                </form>

                <form action="/api/consult/plan/reject" method="post" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                  <input type="hidden" name="submissionId" value={pkg.submissionId} />
                  <input type="hidden" name="redirectTo" value={`/review/${pkg.submissionId}`} />
                  <input type="hidden" name="approvedBy" value="代表" />
                  <label className="block text-sm font-bold text-rose-900">計画差し戻しメモ</label>
                  <textarea
                    name="memo"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-foreground outline-none ring-0"
                    placeholder="計画を差し戻す理由・修正指示"
                  />
                  <p className="mt-2 text-xs leading-relaxed text-rose-800/80">
                    差し戻すと、計画を取り下げて第1ゲート（代表確認待ち）に戻ります。
                    再承認すれば新しい計画が再生成されます。
                  </p>
                  <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700">
                    計画を差し戻す
                  </button>
                </form>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <DecisionLine decision={pkg.approval} label="第1ゲート判定（インテイク）" />
              <DecisionLine decision={pkg.planApproval} label="第2ゲート判定（計画）" />
              <DecisionLine decision={pkg.preProductionApproval} label="第3ゲート判定（本制作前最終承認）" />
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
