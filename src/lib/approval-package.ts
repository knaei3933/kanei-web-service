/* ------------------------------------------------------------------ */
/*  承認パッケージ（approval package）モデル + 永続化ヘルパ             */
/* ------------------------------------------------------------------ */
/*  相談1件ごとに作られる「社内レビュー用の統制ドキュメント」。          */
/*  このパッケージが、パイプラインが次の段階へ進んでよいかを決める。     */
/*                                                                      */
/*  Phase 2 の役割（承認ゲート付きパイプライン）:                       */
/*    - 顧客送信 → 品質評価 → 承認パッケージ作成                        */
/*    - 代表者がインテイクを承認すると、OMC 計画アーティファクトを      */
/*      生成し、status を awaiting_plan_approval へ進める（第2ゲート）   */
/*    - 計画を承認すると、実行ハンドオフ成果物（プロンプト/メタデータ/  */
/*      Claude コマンド）を生成し、approved_for_execution へ進める       */
/*    - Claude Code の実行は serverless では行わず、ローカルオペレータ   */
/*      への「実行ハンドオフ」として成果物だけを生成する（正直な設計）   */
/*                                                                      */
/*  保存先（src/server/submission-storage アダプタ経由・環境で切替）:    */
/*    - local     : data/consult-submissions/<id>/approval-package.json */
/*    - relay     : 固定ルート(/api/submission-storage)→WSL リレーへ     */
/*                  HTTP 経由で恒久保存（本番・リレー設定あり）          */
/*    - ephemeral : 本番でリレー未設定時の /tmp（一時・非恒久）          */
/* ------------------------------------------------------------------ */

import type { ConsultIntakeQuality } from "./consult-quality";
import type { PromptStagePreview } from "./prompt-chain";
import { buildPromptChainPreview } from "./prompt-chain";
import {
  writeArtifact,
  readArtifact,
  artifactDisplayPath,
} from "@/server/submission-storage";

/** 承認パッケージのスキーマバージョン（下流ツールの互換性確認用） */
export const APPROVAL_SCHEMA_VERSION = "1.1.0";

/**
 * 承認パッケージの状態。
 *   - received / needs_followup / awaiting_representative_approval: 受領〜代表確認
 *   - awaiting_plan_approval:          代表がインテイクを承認し、計画アーティファクト生成済み・第2ゲート待ち
 *   - approved_for_execution:          計画を承認し、実行ハンドオフ生成済み（実行準備完了）
 *   - approved_for_planning:           Phase 1 の旧状態（後方互換用・新規には出力しない）
 *   - demo_generating:                 Claude Code がデモを生成中
 *   - demo_deployed:                   デモがデプロイ済み・顧客確認待ち
 *   - demo_revision_ready:            顧客フィードバックを受信、Claude Code で修正の準備完了
 *   - demo_revised:                   修正版デモ再デプロイ済み
 *   - customer_approved:              顧客がデモを承認
 *   - production_ready:               本制作開始可能
 *   - delivered:                      納品済み
 *   - rejected:                        却下
 */
export type ApprovalStatus =
  | "received"
  | "needs_followup"
  | "awaiting_representative_approval"
  | "awaiting_plan_approval"
  | "approved_for_execution"
  | "approved_for_planning"
  | "demo_generating"
  | "demo_deployed"
  | "demo_revision_ready"
  | "demo_revised"
  | "customer_approved"
  | "production_ready"
  | "delivered"
  | "rejected";

/** 代表者の判定。未判定時は null。 */
export type RepresentativeDecision = "approve" | "reject" | "hold" | null;

/**
 * 顧客向けの表示状態（完了画面の分岐用）。
 * 内部ステータス（ApprovalStatus）とは別に、顧客に見せる意味だけ持つ。
 * レビューURL やプロンプトチェーン等の内部情報はこれに含めない。
 */
export type CustomerFacingStatus =
  | "followup_requested"
  | "under_internal_review"
  | "demo_ready_for_review"
  | "demo_revision_submitted"
  | "demo_approved";

/** 承認パッケージに含める品質評価（consult-quality の結果と同じ形） */
export type ApprovalIntakeQuality = ConsultIntakeQuality;

/** ビジネス要約（代表者レビュー用） */
export interface ApprovalReviewSummary {
  /** 事業の簡潔な要約 */
  businessSummary: string;
  /** ターゲット層の要約 */
  targetUserSummary: string;
  /** 強み・差別化の要約 */
  strengthsSummary: string[];
  /** 必須掲載情報の要約 */
  mustIncludeSummary: string[];
  /** リスクのある前提・仮定 */
  riskyAssumptions: string[];
}

/** 参考サイト分析（代表者レビュー用） */
export interface ApprovalReferenceAnalysis {
  /** 参考サイトの URL 一覧（未入力カードは除外済み） */
  referenceUrls: string[];
  /** 抽出対象として適格な URL */
  urlsEligibleForExtraction: string[];
  /** 抽出不適格・利用不可の URL（Phase 1 では空。クローラ未実装のため） */
  urlsBlockedOrUnusable: string[];
  /** 希望する再現度（close / partial / inspiration のラベル） */
  requestedFollowStrength: string[];
  /** 抽出対象セクション/部位（likedSections / whatToReference の統合） */
  sectionTargets: string[];
}

/** 素材・資料の準備状況（代表者レビュー用） */
export interface ApprovalMaterialsAnalysis {
  /** 提出された添付ファイル一覧 */
  availableAttachments: Array<{
    originalName: string;
    savedName: string;
    sizeBytes: number;
    kind: string;
  }>;
  /** 顧客が「用意できる」と申告した素材（ラベル） */
  usableAssets: string[];
  /** 推定で不足している素材（ラベル） */
  missingAssets: string[];
}

/** 代表者の承認/却下メタ */
export interface ApprovalDecision {
  /** 判定結果 */
  representativeDecision: RepresentativeDecision;
  /** 判定日時（ISO8601・未判定時は null） */
  decidedAt: string | null;
  /** 判定者（任意入力） */
  decidedBy: string | null;
  /** 判定に添えるメモ（任意） */
  memo: string | null;
}

/* ------------------------------------------------------------------ */
/*  Phase 2: OMC 計画アーティファクト + 計画承認 + 実行ハンドオフ        */
/* ------------------------------------------------------------------ */

/** 計画アーティファクトのスキーマバージョン */
export const PLANNING_SCHEMA_VERSION = "1.0.0";

/** 実行ハンドオフのスキーマバージョン */
export const EXECUTION_HANDOFF_SCHEMA_VERSION = "1.0.0";

/** 計画1ステージ分（OMC 計画アーティファクトの構成要素） */
export interface PlanningStage {
  /** ステージ識別子（機械処理用） */
  id: string;
  /** 表示名（日本語） */
  title: string;
  /** このステージの目的（日本語） */
  objective: string;
  /** このステージへの入力（日本語の箇条書き） */
  inputs: string[];
  /** このステージが出力する成果物（日本語の箇条書き） */
  outputs: string[];
  /** Claude Code 実行を伴うステージか */
  involvesExecution: boolean;
}

/**
 * OMC 計画アーティファクト。
 * 代表者がインテイクを承認したときに【決定論的に】生成される（LLM 不使用）。
 * 第2ゲート（計画承認）で代表者に提示し、承認されると実行ハンドオフへ受け継がれる。
 */
export interface PlanningArtifact {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 生成方式（LLM 不使用・決定論的であることの明示） */
  generatedBy: "deterministic-planner";
  /** 計画の前提となるブリーフ要点（brief.json のヘッドライン・内部確認用） */
  briefSnapshot: {
    businessSummary: string;
    targetUserSummary: string;
    strengths: string[];
    mustInclude: string[];
    referenceUrls: string[];
  };
  /** 段階別の実行/生成計画 */
  stages: PlanningStage[];
  /** 厳密なステージ順序（stages の id を実行順に列挙） */
  orderedStageIds: string[];
  /** 実行前に満たすべき前提 */
  prerequisites: string[];
  /** 未解決のブロッカー（代表者・オペレータが確認すべき点） */
  blockers: string[];
  /** 計画策定の根拠メモ */
  rationale: string[];
}

/** 計画承認（第2ゲート）の判定メタ。ApprovalDecision と同じ形。 */
export interface PlanApprovalDecision {
  representativeDecision: RepresentativeDecision;
  decidedAt: string | null;
  decidedBy: string | null;
  memo: string | null;
}

/**
 * 実行ハンドオフ成果物（内部専用）。
 * 計画を承認したときに生成する。serverless のリクエストハンドラからは
 * Claude Code を実行せず、ローカルオペレータへ引き渡すための
 * 「プロンプト・メタデータ・コマンド」だけを格納する。
 *
 * プロンプト本文（execution-prompt.md）は別ファイルのため、このオブジェクトには
 * 含めない（レビューページは readExecutionPromptMarkdown で別途読み込む）。
 */
export interface ExecutionHandoff {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 実行方式（serverless では実行せずローカルオペレータへ引き渡す） */
  handoffMode: "local-operator";
  /** 作業ディレクトリ（ローカル実行を想定） */
  workingDirectory: string;
  /** コピー実行用の Claude Code コマンドテキスト（内部専用・顧客非公開） */
  claudeCommand: string;
  /** 実行プロンプトファイルの表示パス（submission フォルダ内） */
  promptFilePath: string;
  /** ハンドオフメタデータファイルの表示パス */
  metadataFilePath: string;
  /** 計画アーティファクトファイルの表示パス */
  planFilePath: string;
  /** ブリーフファイルの表示パス */
  briefFilePath: string;
  /** 実行前に満たす前提 */
  prerequisites: string[];
  /** 重要事項（serverless 非実行・内部専用など） */
  notices: string[];
  /** ハンドオフ元の計画ステージ順序 */
  plannedStageIds: string[];
}

/** 承認パッケージ本体 */
export interface ApprovalPackage {
  schemaVersion: string;
  submissionId: string;
  receivedAt: string;
  /** 内部ステータス（パイプライン統制用） */
  status: ApprovalStatus;
  /** 顧客向け表示状態（完了画面分岐用） */
  customerFacingStatus: CustomerFacingStatus;
  /** 内部レビューページ URL（社内のみ・顧客には出さない） */
  reviewUrl: string | null;
  /** 品質評価 */
  intakeQuality: ApprovalIntakeQuality;
  /** ビジネス要約 */
  reviewSummary: ApprovalReviewSummary;
  /** 参考サイト分析 */
  referenceAnalysis: ApprovalReferenceAnalysis;
  /** 素材分析 */
  materialsAnalysis: ApprovalMaterialsAnalysis;
  /** 内部向けプロンプトチェーンプレビュー（社内のみ） */
  promptChainPreview: PromptStagePreview[];
  /** 代表者の判定（インテイク承認ゲート） */
  approval: ApprovalDecision;
  /** OMC 計画アーティファクト（代表承認後に生成・未生成時は null） */
  planningArtifact: PlanningArtifact | null;
  /** 計画承認（第2ゲート）の判定 */
  planApproval: PlanApprovalDecision;
  /** 実行ハンドオフ（計画承認後に生成・内部専用・未生成時は null） */
  executionHandoff: ExecutionHandoff | null;
}

/** buildApprovalPackage に渡す、保存済みファイルの軽量メタデータ */
export interface ApprovalSavedFile {
  originalName: string;
  savedName: string;
  sizeBytes: number;
  type: string;
}

/* ------------------------------------------------------------------ */
/*  保存ルート（consult route と同じロジックを再現）                    */
/* ------------------------------------------------------------------ */

/* 成果物の保存先・表示パスは src/server/submission-storage アダプタが
   環境別（local / relay / ephemeral）に解決する。このファイルでは
   ルートを持たず、writeArtifact / readArtifact / artifactDisplayPath
   経由で扱う。 */

/**
 * 実行ハンドオフで使う「ローカル実行」前提の表示ルート。
 * serverless では Claude Code を実行しないため、ハンドオフのパス・コマンドは
 * 常にローカルクローンを前提とした相対パスで表記する。
 */
const LOCAL_DISPLAY_ROOT = "data/consult-submissions";

/** パス区切りを含まない安全な submissionId か（トラバーサル対策） */
function isSafeSubmissionId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * 表示用の承認パッケージパスを返す。
 * レスポンスやメールに載せる「人間が読む用」のパス（アダプタ経由で解決）。
 */
export function approvalPackagePathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "approval-package.json");
}

/** 計画アーティファクト（omc-plan.json）の表示用パス */
export function planningArtifactPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "omc-plan.json");
}

/** 実行プロンプト（execution-prompt.md）の表示用パス */
export function executionPromptPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "execution-prompt.md");
}

/** 実行ハンドオフ（execution-handoff.json）の表示用パス */
export function executionHandoffPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "execution-handoff.json");
}

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** unknown を安全に文字列配列として取り出す（空除去・重複排除） */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = asString(item);
    if (s.length === 0 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 自由テキストを箇条書きに分割（読点・改行・中点等）。重複排除・上限付き */
function splitToItems(text: string, max = 8): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts)).slice(0, max);
}

/** MIMEタイプ/拡張子から大まかな素材種別を判定（consult route と同等） */
function detectFileKind(type: string, name: string): string {
  const lower = name.toLowerCase();
  if (type.startsWith("image/")) return "画像";
  if (type.startsWith("video/")) return "動画";
  if (type.startsWith("audio/")) return "音声";
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (type.includes("word") || /\.(docx?)$/.test(lower)) return "Word";
  if (type.includes("excel") || type.includes("sheet") || /\.(xlsx?|csv)$/.test(lower))
    return "表計算";
  if (type.includes("presentation") || /\.(pptx?)$/.test(lower)) return "プレゼン";
  if (type.includes("zip") || /\.(zip|rar|7z)$/.test(lower)) return "圧縮ファイル";
  if (type.startsWith("text/") || /\.(txt|md|rtf)$/.test(lower)) return "テキスト";
  if (/\.(svg|ai|eps)$/.test(lower)) return "ベクターロゴ";
  if (lower.endsWith(".psd")) return "PSD";
  return type || "ファイル";
}

/** 素材申告（assetsStatus）→ 日本語ラベル */
const ASSET_LABELS: Record<string, string> = {
  logo: "ロゴデータ",
  photos: "写真・画像",
  copy: "文章・キャッチコピー",
  company: "会社概要・会社案内の資料",
  service: "製品・サービスの資料",
  none: "まだ何もない（すべてお任せ）",
};

/** 不足判定のベースとなる標準素材セット */
const STANDARD_MATERIALS: { value: string; label: string }[] = [
  { value: "logo", label: "ロゴデータ" },
  { value: "photos", label: "写真・画像" },
  { value: "copy", label: "文章・キャッチコピー" },
  { value: "company", label: "会社概要・会社案内の資料" },
  { value: "service", label: "製品・サービスの資料" },
];

/** 再現度コード → 日本語ラベル */
const FOLLOW_LEVEL_LABELS: Record<string, string> = {
  close: "かなり忠実に再現",
  partial: "一部だけ取り入れる",
  inspiration: "参考程度（雰囲気・方向性のみ）",
};

/** コード値を日本語ラベルに。未定義コードは空文字。 */
function labelOf(map: Record<string, string>, code: string): string {
  return code && Object.prototype.hasOwnProperty.call(map, code) ? map[code] : "";
}

/* ------------------------------------------------------------------ */
/*  構築                                                                */
/* ------------------------------------------------------------------ */

/** buildApprovalPackage のオプション */
export interface BuildApprovalPackageOptions {
  /** 内部レビューページ URL（社内のみ）。未指定時は null */
  reviewUrl?: string | null;
}

/**
 * 相談ペイロード + 保存ファイル + 品質評価から、承認パッケージを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。外部依存なし。
 *
 * 状態の決定:
 *   - intakeQuality.status === "ready" → awaiting_representative_approval
 *   - それ以外 → needs_followup
 */
export function buildApprovalPackage(
  payloadRaw: unknown,
  submissionId: string,
  savedFiles: ApprovalSavedFile[],
  intakeQuality: ConsultIntakeQuality,
  options: BuildApprovalPackageOptions = {}
): ApprovalPackage {
  const payload = asObject(payloadRaw);
  const receivedAt = new Date().toISOString();

  const businessType = asString(payload.businessType);
  const companyName = asString(payload.companyName) || asString(payload.enterpriseName);
  const targetCustomer = asString(payload.targetCustomer);
  const sellingPoints = splitToItems(asString(payload.sellingPoints));
  const mustInclude = splitToItems(asString(payload.mustIncludeInfo));
  const desiredImage = asString(payload.desiredImage);
  const currentWebsite = asString(payload.currentWebsite);
  const noWebsite = payload.noWebsite === true;

  /* ---- reviewSummary ---- */
  const summaryParts: string[] = [];
  if (businessType) summaryParts.push(`事業種=${businessType}`);
  if (companyName) summaryParts.push(`事業体=${companyName}`);
  summaryParts.push(
    !noWebsite && currentWebsite
      ? `既存HPリニューアル（${currentWebsite}）`
      : "新規ホームページ制作"
  );
  if (desiredImage) summaryParts.push(`イメージ=${desiredImage}`);

  const riskyAssumptions: string[] = [];
  // 品質評価の理由はそのままリスク前提として共有する価値がある
  for (const r of intakeQuality.reasons) {
    if (r) riskyAssumptions.push(r);
  }
  if (!targetCustomer) riskyAssumptions.push("ターゲット層の記述がなく、ペルソナが確定していない。");
  if (sellingPoints.length === 0) riskyAssumptions.push("強み・差別化の記述がなく、訴求軸が不明。");

  const reviewSummary: ApprovalReviewSummary = {
    businessSummary: summaryParts.join(" / "),
    targetUserSummary: targetCustomer || "（ターゲット記述なし）",
    strengthsSummary: sellingPoints,
    mustIncludeSummary: mustInclude,
    riskyAssumptions,
  };

  /* ---- referenceAnalysis ---- */
  const rawReferenceSites = Array.isArray(payload.referenceSites)
    ? payload.referenceSites
    : [];
  const referenceUrls: string[] = [];
  const requestedFollowStrength: string[] = [];
  const sectionTargets: string[] = [];
  const seenUrl = new Set<string>();
  const seenTarget = new Set<string>();
  const seenFollow = new Set<string>();

  for (const raw of rawReferenceSites) {
    const o = asObject(raw);
    const url = asString(o.url);
    if (/^https?:\/\//i.test(url) && !seenUrl.has(url)) {
      seenUrl.add(url);
      referenceUrls.push(url);
    }
    const followLevel = asString(o.followLevel);
    const followLabel = followLevel ? labelOf(FOLLOW_LEVEL_LABELS, followLevel) : "";
    if (followLabel && !seenFollow.has(followLabel)) {
      seenFollow.add(followLabel);
      requestedFollowStrength.push(followLabel);
    }
    for (const t of [
      ...splitToItems(asString(o.whatToReference), 4),
      ...splitToItems(asString(o.likedSections), 4),
    ]) {
      if (!seenTarget.has(t)) {
        seenTarget.add(t);
        sectionTargets.push(t);
      }
    }
  }

  const referenceAnalysis: ApprovalReferenceAnalysis = {
    referenceUrls,
    // Phase 1 では「URL を持つもの」をすべて抽出適格と扱う（クローラ未実装のため詳細判定はしない）
    urlsEligibleForExtraction: referenceUrls,
    urlsBlockedOrUnusable: [],
    requestedFollowStrength,
    sectionTargets,
  };

  /* ---- materialsAnalysis ---- */
  const availableAttachments = savedFiles.map((f) => ({
    originalName: f.originalName,
    savedName: f.savedName,
    sizeBytes: f.sizeBytes,
    kind: detectFileKind(f.type, f.originalName),
  }));

  const assetsStatus = asStringArray(payload.assetsStatus);
  const hasNone = assetsStatus.includes("none");
  const usableAssets = assetsStatus
    .map((v) => labelOf(ASSET_LABELS, v))
    .filter((s) => s.length > 0);
  const providedValues = hasNone ? [] : assetsStatus;
  const missingAssets = STANDARD_MATERIALS.filter(
    (m) => !providedValues.includes(m.value)
  ).map((m) => m.label);

  const materialsAnalysis: ApprovalMaterialsAnalysis = {
    availableAttachments,
    usableAssets,
    missingAssets,
  };

  /* ---- 状態 ---- */
  const isReady = intakeQuality.status === "ready";
  const status: ApprovalStatus = isReady
    ? "awaiting_representative_approval"
    : "needs_followup";
  const customerFacingStatus: CustomerFacingStatus = isReady
    ? "under_internal_review"
    : "followup_requested";

  /* ---- プロンプトチェーンプレビュー ---- */
  const promptChainPreview = buildPromptChainPreview({
    referenceCount: referenceUrls.length,
  });

  return {
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    submissionId,
    receivedAt,
    status,
    customerFacingStatus,
    reviewUrl: options.reviewUrl ?? null,
    intakeQuality,
    reviewSummary,
    referenceAnalysis,
    materialsAnalysis,
    promptChainPreview,
    approval: {
      representativeDecision: null,
      decidedAt: null,
      decidedBy: null,
      memo: null,
    },
    // Phase 2: 計画アーティファクト・計画承認・実行ハンドオフは受領時点では未生成
    planningArtifact: null,
    planApproval: {
      representativeDecision: null,
      decidedAt: null,
      decidedBy: null,
      memo: null,
    },
    executionHandoff: null,
  };
}

/* ------------------------------------------------------------------ */
/*  永続化                                                              */
/* ------------------------------------------------------------------ */

/**
 * 承認パッケージを書き込む（ストレージアダプタ経由）。
 * local は data/ 、relay は HTTP リレー、ephemeral は /tmp へ。
 * 成果物ディレクトリはアダプタ（filesystem/relay）が保証する。
 */
export async function writeApprovalPackage(
  pkg: ApprovalPackage
): Promise<void> {
  await writeArtifact(
    pkg.submissionId,
    "approval-package.json",
    JSON.stringify(pkg, null, 2)
  );
}

/** 読み込んだ生 JSON から計画アーティファクトを正規化する。不在・形式不正時は null。 */
function normalizePlanningArtifact(
  raw: unknown,
  submissionId: string
): PlanningArtifact | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const stagesRaw = Array.isArray(o.stages) ? o.stages : [];
  const stages: PlanningStage[] = stagesRaw
    .map((s) => asObject(s))
    .map((s) => ({
      id: asString(s.id),
      title: asString(s.title),
      objective: asString(s.objective),
      inputs: asStringArray(s.inputs),
      outputs: asStringArray(s.outputs),
      involvesExecution: s.involvesExecution === true,
    }))
    .filter((s) => s.id.length > 0);
  if (stages.length === 0) return null;

  const bs = asObject(o.briefSnapshot);
  const ordered = asStringArray(o.orderedStageIds);
  return {
    schemaVersion: asString(o.schemaVersion) || PLANNING_SCHEMA_VERSION,
    submissionId: asString(o.submissionId) || submissionId,
    generatedAt: asString(o.generatedAt),
    generatedBy: "deterministic-planner",
    briefSnapshot: {
      businessSummary: asString(bs.businessSummary),
      targetUserSummary: asString(bs.targetUserSummary),
      strengths: asStringArray(bs.strengths),
      mustInclude: asStringArray(bs.mustInclude),
      referenceUrls: asStringArray(bs.referenceUrls),
    },
    stages,
    orderedStageIds: ordered.length > 0 ? ordered : stages.map((s) => s.id),
    prerequisites: asStringArray(o.prerequisites),
    blockers: asStringArray(o.blockers),
    rationale: asStringArray(o.rationale),
  };
}

/** 読み込んだ生 JSON から計画承認（第2ゲート）判定を正規化する。 */
function normalizePlanApproval(raw: unknown): PlanApprovalDecision {
  const o = asObject(raw);
  const d = asString(o.representativeDecision);
  const decision: RepresentativeDecision =
    d === "approve" || d === "reject" || d === "hold" ? d : null;
  return {
    representativeDecision: decision,
    decidedAt: typeof o.decidedAt === "string" ? o.decidedAt : null,
    decidedBy: typeof o.decidedBy === "string" ? o.decidedBy : null,
    memo: typeof o.memo === "string" ? o.memo : null,
  };
}

/** 読み込んだ生 JSON から実行ハンドオフを正規化する。不在・形式不正時は null。 */
function normalizeExecutionHandoff(
  raw: unknown,
  submissionId: string
): ExecutionHandoff | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const cmd = asString(o.claudeCommand);
  if (!cmd) return null;
  return {
    schemaVersion: asString(o.schemaVersion) || EXECUTION_HANDOFF_SCHEMA_VERSION,
    submissionId: asString(o.submissionId) || submissionId,
    generatedAt: asString(o.generatedAt),
    handoffMode: "local-operator",
    workingDirectory: asString(o.workingDirectory) || ".",
    claudeCommand: cmd,
    promptFilePath: asString(o.promptFilePath),
    metadataFilePath: asString(o.metadataFilePath),
    planFilePath: asString(o.planFilePath),
    briefFilePath: asString(o.briefFilePath),
    prerequisites: asStringArray(o.prerequisites),
    notices: asStringArray(o.notices),
    plannedStageIds: asStringArray(o.plannedStageIds),
  };
}

/**
 * 読み込んだ生 JSON を ApprovalPackage の形へ正規化する。
 * 信頼できない入力（古い形式・手編集）でも安全に扱えるように、
 * 必須フィールドを欠損時は安全な既定値で補う。
 */
function normalizeApprovalPackage(
  raw: unknown,
  submissionId: string
): ApprovalPackage | null {
  const o = asObject(raw);
  // 最低限 submissionId が一致していれば復元を試みる
  const id = asString(o.submissionId) || submissionId;

  const status = asString(o.status) as ApprovalStatus;
  const validStatuses: ApprovalStatus[] = [
    "received",
    "needs_followup",
    "awaiting_representative_approval",
    "awaiting_plan_approval",
    "approved_for_execution",
    "approved_for_planning",
    "demo_generating",
    "demo_deployed",
    "demo_revision_ready",
    "demo_revised",
    "customer_approved",
    "production_ready",
    "delivered",
    "rejected",
  ];
  const resolvedStatus: ApprovalStatus = validStatuses.includes(status)
    ? status
    : "received";

  const cfs = asString(o.customerFacingStatus) as CustomerFacingStatus;
  const validCustomerStatuses: CustomerFacingStatus[] = [
    "followup_requested",
    "under_internal_review",
    "demo_ready_for_review",
    "demo_revision_submitted",
    "demo_approved",
  ];
  const resolvedCfs: CustomerFacingStatus = validCustomerStatuses.includes(cfs)
    ? cfs
    : resolvedStatus === "needs_followup"
      ? "followup_requested"
      : "under_internal_review";

  const iqObj = asObject(o.intakeQuality);
  const intakeQuality: ApprovalIntakeQuality = {
    status: iqObj.status === "needs_followup" ? "needs_followup" : "ready",
    score: typeof iqObj.score === "number" ? iqObj.score : 0,
    reasons: asStringArray(iqObj.reasons),
    requestedItems: asStringArray(iqObj.requestedItems),
    followupQuestions: asStringArray(iqObj.followupQuestions),
  };

  const rs = asObject(o.reviewSummary);
  const reviewSummary: ApprovalReviewSummary = {
    businessSummary: asString(rs.businessSummary),
    targetUserSummary: asString(rs.targetUserSummary),
    strengthsSummary: asStringArray(rs.strengthsSummary),
    mustIncludeSummary: asStringArray(rs.mustIncludeSummary),
    riskyAssumptions: asStringArray(rs.riskyAssumptions),
  };

  const ra = asObject(o.referenceAnalysis);
  const referenceAnalysis: ApprovalReferenceAnalysis = {
    referenceUrls: asStringArray(ra.referenceUrls),
    urlsEligibleForExtraction: asStringArray(ra.urlsEligibleForExtraction),
    urlsBlockedOrUnusable: asStringArray(ra.urlsBlockedOrUnusable),
    requestedFollowStrength: asStringArray(ra.requestedFollowStrength),
    sectionTargets: asStringArray(ra.sectionTargets),
  };

  const ma = asObject(o.materialsAnalysis);
  const rawAttachments = Array.isArray(ma.availableAttachments)
    ? ma.availableAttachments
    : [];
  const availableAttachments = rawAttachments
    .map((a) => asObject(a))
    .map((a) => ({
      originalName: asString(a.originalName),
      savedName: asString(a.savedName),
      sizeBytes: typeof a.sizeBytes === "number" ? a.sizeBytes : 0,
      kind: asString(a.kind) || "ファイル",
    }));
  const materialsAnalysis: ApprovalMaterialsAnalysis = {
    availableAttachments,
    usableAssets: asStringArray(ma.usableAssets),
    missingAssets: asStringArray(ma.missingAssets),
  };

  const promptChainPreview = Array.isArray(o.promptChainPreview)
    ? (o.promptChainPreview
        .map((s) => asObject(s))
        .map((s) => ({
          id: asString(s.id),
          title: asString(s.title),
          objective: asString(s.objective),
          inputs: asStringArray(s.inputs),
          expectedOutputs: asStringArray(s.expectedOutputs),
          requiresRepresentativeApprovalBeforeContinue:
            s.requiresRepresentativeApprovalBeforeContinue === true,
        }))
        .filter((s) => s.id.length > 0) as PromptStagePreview[])
    : [];

  const ap = asObject(o.approval);
  const decisionRaw = asString(ap.representativeDecision);
  const representativeDecision: RepresentativeDecision =
    decisionRaw === "approve" || decisionRaw === "reject" || decisionRaw === "hold"
      ? decisionRaw
      : null;

  return {
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    submissionId: id,
    receivedAt: asString(o.receivedAt) || new Date().toISOString(),
    status: resolvedStatus,
    customerFacingStatus: resolvedCfs,
    reviewUrl: typeof o.reviewUrl === "string" ? o.reviewUrl : null,
    intakeQuality,
    reviewSummary,
    referenceAnalysis,
    materialsAnalysis,
    promptChainPreview,
    approval: {
      representativeDecision,
      decidedAt: typeof ap.decidedAt === "string" ? ap.decidedAt : null,
      decidedBy: typeof ap.decidedBy === "string" ? ap.decidedBy : null,
      memo: typeof ap.memo === "string" ? ap.memo : null,
    },
    planningArtifact: normalizePlanningArtifact(o.planningArtifact, id),
    planApproval: normalizePlanApproval(o.planApproval),
    executionHandoff: normalizeExecutionHandoff(o.executionHandoff, id),
  };
}

/**
 * 指定した submissionId の承認パッケージを読み込む。
 * ファイル不在・形式不正時は null を返す。
 */
export async function readApprovalPackage(
  submissionId: string
): Promise<ApprovalPackage | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  try {
    const raw = await readArtifact(submissionId, "approval-package.json");
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return normalizeApprovalPackage(parsed, submissionId);
  } catch {
    return null;
  }
}

/** 各遷移関数に渡す判定メタ（承認/却下共通） */
export interface UpdateDecisionMeta {
  memo?: string;
  decidedBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Phase 2: 決定論的ビルダ（計画アーティファクト・実行ハンドオフ）     */
/* ------------------------------------------------------------------ */

/** 任意入力文字列を null 許容へ正規化（空白のみは null） */
function trimOptional(v: string | undefined): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** 判定メタから ApprovalDecision / PlanApprovalDecision と同じ形を組み立てる */
function toDecision(
  action: "approve" | "reject",
  at: string,
  meta: UpdateDecisionMeta
): { representativeDecision: RepresentativeDecision; decidedAt: string; decidedBy: string | null; memo: string | null } {
  return {
    representativeDecision: action,
    decidedAt: at,
    decidedBy: trimOptional(meta.decidedBy),
    memo: trimOptional(meta.memo),
  };
}

/**
 * 承認パッケージから OMC 計画アーティファクトを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。LLM 不使用。
 * 代表者がインテイクを承認したときに生成し、第2ゲート（計画承認）で提示する。
 */
export function buildPlanningArtifact(pkg: ApprovalPackage): PlanningArtifact {
  const refUrls = pkg.referenceAnalysis.referenceUrls;
  const refCount = refUrls.length;
  const followStrength = pkg.referenceAnalysis.requestedFollowStrength;
  const missingAssets = pkg.materialsAnalysis.missingAssets;

  const stages: PlanningStage[] = [
    {
      id: "normalize-brief",
      title: "ブリーフ正規化",
      objective:
        "brief.json を読み込み、矛盾・不足・曖昧さを整理し、実装に使える正規化ブリーフを確定する。",
      inputs: ["brief.json", "approval-package.json の reviewSummary"],
      outputs: ["正規化ブリーフ", "確認すべき前提のリスト"],
      involvesExecution: true,
    },
    {
      id: "analyze-references",
      title: "参考サイト分析",
      objective:
        refCount > 0
          ? `参考サイト ${refCount} 件の構成・デザイン・色・写真を分析し、再現度（${
              followStrength.length > 0 ? followStrength.join("・") : "指定なし"
            }）に応じて取り込む部位を決定する。`
          : "参考サイトの指定がないため、業種標準構成と desiredTone から方向性を決定する。",
      inputs:
        refCount > 0 ? refUrls : ["業種標準構成", "desiredTone（brief.json）"],
      outputs: ["抽出対象部位", "配色・ビジュアル方向"],
      involvesExecution: true,
    },
    {
      id: "map-components",
      title: "コンポーネント対応付け",
      objective:
        "顧客の意図を Monet カタログへ対応付け、そのまま再利用できる部分・要調整・要カスタムを分ける。",
      inputs: ["正規化ブリーフ", "Monet カタログ", "抽出対象部位"],
      outputs: ["推奨セクション一覧", "コンポーネント候補", "対応付けの根拠"],
      involvesExecution: true,
    },
    {
      id: "compose-structure",
      title: "構成確定",
      objective:
        "サイトマップ・ページ構成・CTA を確定し、必須掲載情報と必要機能が漏れなく載るようにする。",
      inputs: ["推奨セクション一覧", "brief.json の requiredPagesOrFeatures"],
      outputs: ["サイトマップ", "ページ構成", "CTA 配置"],
      involvesExecution: true,
    },
    {
      id: "implement-site",
      title: "実装",
      objective:
        "コンポーネント組み立て・原稿・画像方針に沿って実装する。不足素材の扱い（ダミー→差し替え）も決める。",
      inputs: ["ページ構成", "コンポーネント候補", "素材状況"],
      outputs: ["実装成果物（ページ/コンポーネント）"],
      involvesExecution: true,
    },
    {
      id: "verify",
      title: "検証",
      objective:
        "成果物が正規化ブリーフ・必須セクション・参照整合・素材運用・コンバージョン目標を満たすか検証する。",
      inputs: ["実装成果物", "最終 URL/ファイル", "期待される成果物"],
      outputs: ["検証レポート", "要件ごとの合否チェックリスト"],
      involvesExecution: true,
    },
  ];

  const prerequisites: string[] = [];
  for (const r of pkg.intakeQuality.reasons) {
    if (r) prerequisites.push(r);
  }
  if (pkg.intakeQuality.status === "needs_followup") {
    prerequisites.push(
      "インテイク品質が needs_followup のため、計画実行前に追加確認が必要な項目がある。"
    );
  }

  const blockers: string[] = [];
  for (const a of pkg.reviewSummary.riskyAssumptions) {
    if (a) blockers.push(a);
  }
  if (missingAssets.length > 0) {
    blockers.push(`未提供素材あり: ${missingAssets.join("・")}`);
  }

  const rationale: string[] = [];
  rationale.push(
    refCount > 0
      ? `参考サイト ${refCount} 件を分析対象とする。`
      : "参考サイトがないため業種標準構成で補完する。"
  );
  rationale.push(
    missingAssets.length === 0
      ? "素材は一通り揃っている想定で計画する。"
      : `未提供素材（${missingAssets.join("・")}）はダミー生成→実物差し替えを想定する。`
  );

  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    submissionId: pkg.submissionId,
    generatedAt: new Date().toISOString(),
    generatedBy: "deterministic-planner",
    briefSnapshot: {
      businessSummary: pkg.reviewSummary.businessSummary,
      targetUserSummary: pkg.reviewSummary.targetUserSummary,
      strengths: pkg.reviewSummary.strengthsSummary,
      mustInclude: pkg.reviewSummary.mustIncludeSummary,
      referenceUrls: refUrls,
    },
    stages,
    orderedStageIds: stages.map((s) => s.id),
    prerequisites,
    blockers,
    rationale,
  };
}

/**
 * Claude Code 実行ハンドオフ用のプロンプト（Markdown）を構築する。
 * 内部専用・ローカルオペレータが実行する Claude Code に読ませる。
 * 本番（serverless）のリクエストハンドラからは実行しない。
 */
export function buildExecutionPromptMarkdown(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): string {
  const id = pkg.submissionId;
  const rel = `${LOCAL_DISPLAY_ROOT}/${id}`;
  const lines: string[] = [];
  lines.push(`# 実行ハンドオフプロンプト — ${id}`);
  lines.push("");
  lines.push(
    "> 内部専用ドキュメントです。本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません。"
  );
  lines.push("> ローカル環境のオペレータが Claude Code でこの計画を実行します。");
  lines.push("");
  lines.push("## 前提");
  lines.push("- このプロンプトはリポジトリルートで実行することを想定しています。");
  lines.push(`- ブリーフ: \`${rel}/brief.json\``);
  lines.push(`- 計画: \`${rel}/omc-plan.json\``);
  lines.push(`- 承認パッケージ: \`${rel}/approval-package.json\``);
  lines.push("");
  lines.push("## 事業要件の要点");
  lines.push(`- ${plan.briefSnapshot.businessSummary || "（要約なし）"}`);
  lines.push(`- ターゲット: ${plan.briefSnapshot.targetUserSummary || "（未整理）"}`);
  if (plan.briefSnapshot.strengths.length > 0) {
    lines.push(`- 強み: ${plan.briefSnapshot.strengths.join("・")}`);
  }
  if (plan.briefSnapshot.mustInclude.length > 0) {
    lines.push(`- 必須掲載: ${plan.briefSnapshot.mustInclude.join("・")}`);
  }
  if (plan.briefSnapshot.referenceUrls.length > 0) {
    lines.push(`- 参考サイト: ${plan.briefSnapshot.referenceUrls.join("・")}`);
  }
  lines.push("");
  if (plan.prerequisites.length > 0) {
    lines.push("## 実行前に確認する前提");
    for (const p of plan.prerequisites) lines.push(`- ${p}`);
    lines.push("");
  }
  if (plan.blockers.length > 0) {
    lines.push("## ブロッカー・リスク前提");
    for (const b of plan.blockers) lines.push(`- ${b}`);
    lines.push("");
  }
  lines.push("## 実行ステップ（この順序で進める）");
  plan.stages.forEach((s, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. ${s.title}（${s.id}）`);
    lines.push(s.objective);
    lines.push("");
    lines.push("**入力:**");
    for (const inp of s.inputs) lines.push(`- ${inp}`);
    lines.push("");
    lines.push("**期待成果物:**");
    for (const out of s.outputs) lines.push(`- ${out}`);
  });
  lines.push("");
  lines.push("## 完了条件");
  lines.push(
    "- 最終ステップ（検証）で、要件ごとの合否チェックリストを作成し、不合格項目があれば修正する。"
  );
  lines.push("- 顧客向けに公開する成果物の文言はすべて日本語にすること。");
  lines.push("");
  return lines.join("\n");
}

/**
 * 計画アーティファクトから実行ハンドオフ成果物（メタデータ）を構築する。
 * プロンプト本文は別ファイル（execution-prompt.md）とするため、ここには含めない。
 * 純粋関数・決定論的。
 */
export function buildExecutionHandoff(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): ExecutionHandoff {
  const id = pkg.submissionId;
  const rel = `${LOCAL_DISPLAY_ROOT}/${id}`;
  const promptFilePath = `${rel}/execution-prompt.md`;
  const notices: string[] = [
    "本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません（実行時間・実行環境の制約のため）。",
    "このハンドオフはローカル環境のオペレータが Claude Code で実行することを想定しています。",
    "コマンドはリポジトリルートで実行してください。",
    "顧客向けに公開する文言はすべて日本語にしてください。プロンプト/コマンドの詳細は顧客に公開しないでください（内部専用）。",
  ];

  return {
    schemaVersion: EXECUTION_HANDOFF_SCHEMA_VERSION,
    submissionId: id,
    generatedAt: new Date().toISOString(),
    handoffMode: "local-operator",
    workingDirectory: ".",
    claudeCommand: `claude "${promptFilePath} を読み、記載の計画に従ってローカルで実装を進めてください。brief.json / omc-plan.json を参照し、各ステップを順に進め、最後に検証してください。"`,
    promptFilePath,
    metadataFilePath: `${rel}/execution-handoff.json`,
    planFilePath: `${rel}/omc-plan.json`,
    briefFilePath: `${rel}/brief.json`,
    prerequisites: plan.prerequisites,
    notices,
    plannedStageIds: plan.orderedStageIds,
  };
}

/* ------------------------------------------------------------------ */
/*  Phase 2: ファイル I/O                                               */
/* ------------------------------------------------------------------ */

/** 計画アーティファクトを omc-plan.json へ書き込む（アダプタ経由） */
async function writePlanningArtifactFile(plan: PlanningArtifact): Promise<void> {
  await writeArtifact(
    plan.submissionId,
    "omc-plan.json",
    JSON.stringify(plan, null, 2)
  );
}

/**
 * 実行ハンドオフを構成するファイル群を書き込む。
 *   - execution-prompt.md  : Claude Code に読ませるプロンプト（内部専用）
 *   - execution-handoff.json: ハンドオフのメタデータ + コマンド（内部専用）
 */
async function writeExecutionHandoffFiles(
  submissionId: string,
  handoff: ExecutionHandoff,
  promptMarkdown: string
): Promise<void> {
  // プロンプト本文（Markdown）とメタデータ（JSON）をそれぞれアダプタ経由で書き込む
  await writeArtifact(submissionId, "execution-prompt.md", promptMarkdown);
  await writeArtifact(
    submissionId,
    "execution-handoff.json",
    JSON.stringify(handoff, null, 2)
  );
}

/** 実行プロンプト（Markdown）をディスクから読み込む。不在時は null。 */
export async function readExecutionPromptMarkdown(
  submissionId: string
): Promise<string | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  // アダプタは不在・失敗時に null を返すので try/catch 不要
  return readArtifact(submissionId, "execution-prompt.md");
}

/* ------------------------------------------------------------------ */
/*  Phase 2: 状態遷移                                                   */
/* ------------------------------------------------------------------ */

/**
 * 代表者がインテイクを承認したときの遷移（第1ゲート）。
 * OMC 計画アーティファクトを決定論的に生成して omc-plan.json に書き出し、
 * status を awaiting_plan_approval（第2ゲート：計画承認待ち）へ進める。
 * 該当パッケージが無い場合は null を返す（呼び出し側で 404 へマップ）。
 */
export async function approveRepresentativeReview(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.approval = toDecision("approve", new Date().toISOString(), meta);

  const plan = buildPlanningArtifact(pkg);
  pkg.planningArtifact = plan;
  // 新計画に対する第2ゲートは未判定にリセット
  pkg.planApproval = {
    representativeDecision: null,
    decidedAt: null,
    decidedBy: null,
    memo: null,
  };
  pkg.executionHandoff = null;

  try {
    await writePlanningArtifactFile(plan);
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "awaiting_plan_approval";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者がインテイクを却下したときの遷移。status を rejected にする。
 */
export async function rejectRepresentativeReview(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.approval = toDecision("reject", new Date().toISOString(), meta);
  pkg.status = "rejected";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者が計画を承認したときの遷移（第2ゲート）。
 * 実行ハンドオフ成果物（プロンプトMD・メタデータJSON・Claude コマンド）を
 * 生成して submission フォルダに書き出し、status を approved_for_execution へ進める。
 *
 * 重要: ここでは Claude Code を実行しない。serverless では実行できないため、
 * ローカルオペレータへ「実行ハンドオフ」として引き渡す成果物だけを生成する。
 */
export async function approvePlan(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  // 計画が無い場合は生成して保証（冪等性のため）
  const plan = pkg.planningArtifact ?? buildPlanningArtifact(pkg);
  pkg.planningArtifact = plan;
  pkg.planApproval = toDecision("approve", new Date().toISOString(), meta);

  const handoff = buildExecutionHandoff(pkg, plan);
  const promptMarkdown = buildExecutionPromptMarkdown(pkg, plan);
  pkg.executionHandoff = handoff;

  try {
    await writePlanningArtifactFile(plan);
    await writeExecutionHandoffFiles(submissionId, handoff, promptMarkdown);
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "approved_for_execution";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者が計画を差し戻したときの遷移。
 * 計画を取り下げ、status を awaiting_representative_approval に戻す。
 * 代表者が再承認すれば新しい計画が再生成される（再計画ループ）。
 */
export async function rejectPlan(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.planApproval = toDecision("reject", new Date().toISOString(), meta);
  pkg.planningArtifact = null;
  pkg.executionHandoff = null;
  pkg.status = "awaiting_representative_approval";
  await writeApprovalPackage(pkg);
  return pkg;
}

/* ------------------------------------------------------------------ */
/*  デモ生成・レビューループの状態遷移                                 */
/* ------------------------------------------------------------------ */

/**
 * 内部ステータスから顧客向けステータスへマッピングする。
 * demo_deployed / demo_revised → demo_ready_for_review
 * demo_revision_ready → demo_revision_submitted
 * customer_approved / production_ready → demo_approved
 * その他 → under_internal_review（デフォルト）
 */
export function toCustomerFacingStatus(
  internalStatus: ApprovalStatus
): CustomerFacingStatus {
  switch (internalStatus) {
    case "demo_deployed":
    case "demo_revised":
      return "demo_ready_for_review";
    case "demo_revision_ready":
      return "demo_revision_submitted";
    case "customer_approved":
    case "production_ready":
    case "delivered":
      return "demo_approved";
    default:
      return "under_internal_review";
  }
}

/**
 * 有効なステータス遷移の一覧。
 * キー: 現在のステータス、値: 遷移可能な次のステータスの配列
 */
export const VALID_TRANSITIONS: Map<ApprovalStatus, ApprovalStatus[]> =
  new Map([
    [
      "approved_for_execution",
      ["demo_generating"],
    ],
    [
      "demo_generating",
      ["demo_deployed", "demo_revised"],
    ],
    [
      "demo_deployed",
      ["demo_revision_ready", "customer_approved"],
    ],
    [
      "demo_revision_ready",
      ["demo_generating"],
    ],
    [
      "demo_revised",
      ["demo_revision_ready", "customer_approved"],
    ],
    [
      "customer_approved",
      ["production_ready"],
    ],
    [
      "production_ready",
      ["delivered"],
    ],
  ]);

/**
 * ステータス遷移が有効かどうかを検証する。
 * @param current 現在のステータス
 * @param next 遷移後のステータス
 * @returns 遷移が有効な場合は true、無効な場合は false
 */
export function isValidTransition(
  current: ApprovalStatus,
  next: ApprovalStatus
): boolean {
  const allowed = VALID_TRANSITIONS.get(current);
  return allowed !== undefined && allowed.includes(next);
}

/**
 * ステータス遷移を実行する。遷移が無効な場合は例外を投げる。
 * また、customerFacingStatus も自動的に更新する。
 */
export async function transitionStatus(
  submissionId: string,
  newStatus: ApprovalStatus
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  if (!isValidTransition(pkg.status, newStatus)) {
    throw new Error(
      `無効なステータス遷移: ${pkg.status} → ${newStatus}`
    );
  }

  pkg.status = newStatus;
  pkg.customerFacingStatus = toCustomerFacingStatus(newStatus);
  await writeApprovalPackage(pkg);
  return pkg;
}
