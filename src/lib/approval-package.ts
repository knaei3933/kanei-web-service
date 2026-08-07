/* ------------------------------------------------------------------ */
/*  承認パッケージ（approval package）モデル + 永続化ヘルパ             */
/* ------------------------------------------------------------------ */
/*  相談1件ごとに作られる「社内レビュー用の統制ドキュメント」。          */
/*  このパッケージが、パイプラインが次の段階へ進んでよいかを決める。     */
/*                                                                      */
/*  Phase 1 の役割:                                                     */
/*    - 顧客送信 → 品質評価 → 承認パッケージ作成 で止める                */
/*    - 代表者がレビューページで内容を確認し、承認/却下する             */
/*    - 自動生成エンジンは持たない（post-approval 自動生成は非ゴール）  */
/*                                                                      */
/*  保存先:                                                              */
/*    - ローカル開発: data/consult-submissions/<submissionId>/          */
/*        approval-package.json                                         */
/*    - Vercel/serverless: /tmp/consult-submissions/<submissionId>/     */
/*        approval-package.json                                         */
/*    （consult route と同じルートロジックを再現。ファイル名だけ         */
/*      approval-package.json を足す。）                                 */
/* ------------------------------------------------------------------ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ConsultIntakeQuality } from "./consult-quality";
import type { PromptStagePreview } from "./prompt-chain";
import { buildPromptChainPreview } from "./prompt-chain";

/** 承認パッケージのスキーマバージョン（下流ツールの互換性確認用） */
export const APPROVAL_SCHEMA_VERSION = "1.0.0";

/**
 * 承認パッケージの状態（Phase 1 で使う5状態）。
 * 将来の拡張（planning_in_progress 等）は Phase 1 では追加しない。
 */
export type ApprovalStatus =
  | "received"
  | "needs_followup"
  | "awaiting_representative_approval"
  | "approved_for_planning"
  | "rejected";

/** 代表者の判定。未判定時は null。 */
export type RepresentativeDecision = "approve" | "reject" | "hold" | null;

/**
 * 顧客向けの表示状態（完了画面の分岐用）。
 * 内部ステータス（ApprovalStatus）とは別に、顧客に見せる意味だけ持つ。
 * レビューURL やプロンプトチェーン等の内部情報はこれに含めない。
 */
export type CustomerFacingStatus = "followup_requested" | "under_internal_review";

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
  /** 代表者の判定 */
  approval: ApprovalDecision;
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

/**
 * Vercel/serverless 環境で動いているか。
 * consult route と同じ判定（VERCEL=1）。
 */
const IS_SERVERLESS = process.env.VERCEL === "1";

/** 送信データの保存ルート（consult route と同じ） */
const SUBMISSIONS_DIR = IS_SERVERLESS
  ? join(tmpdir(), "consult-submissions")
  : join(process.cwd(), "data", "consult-submissions");

/** 表示用ルート（ローカルは相対, Vercel は絶対） */
const DISPLAY_ROOT = IS_SERVERLESS
  ? SUBMISSIONS_DIR
  : "data/consult-submissions";

/** パス区切りを含まない安全な submissionId か（トラバーサル対策） */
function isSafeSubmissionId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * 表示用の承認パッケージパスを返す。
 * レスポンスやメールに載せる「人間が読む用」のパス。
 */
export function approvalPackagePathFor(submissionId: string): string {
  return `${DISPLAY_ROOT}/${submissionId}/approval-package.json`;
}

/** ディスク上の実パスを返す（読み書き用） */
function approvalPackageRealPath(submissionId: string): string {
  return join(SUBMISSIONS_DIR, submissionId, "approval-package.json");
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
  };
}

/* ------------------------------------------------------------------ */
/*  永続化                                                              */
/* ------------------------------------------------------------------ */

/**
 * 承認パッケージをディスクへ書き込む。
 * ディレクトリは作成済みであることを想定（consult route が mkdir 済み）。
 * 未作成でも安全のため mkdir({ recursive: true }) を併用する。
 */
export async function writeApprovalPackage(
  pkg: ApprovalPackage
): Promise<void> {
  const dir = join(SUBMISSIONS_DIR, pkg.submissionId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    approvalPackageRealPath(pkg.submissionId),
    JSON.stringify(pkg, null, 2),
    "utf8"
  );
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
    "approved_for_planning",
    "rejected",
  ];
  const resolvedStatus: ApprovalStatus = validStatuses.includes(status)
    ? status
    : "received";

  const cfs = asString(o.customerFacingStatus) as CustomerFacingStatus;
  const resolvedCfs: CustomerFacingStatus =
    cfs === "under_internal_review" || cfs === "followup_requested"
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
    const raw = await readFile(approvalPackageRealPath(submissionId), "utf8");
    const parsed = JSON.parse(raw);
    return normalizeApprovalPackage(parsed, submissionId);
  } catch {
    return null;
  }
}

/** updateApprovalPackageDecision のメタ */
export interface UpdateDecisionMeta {
  memo?: string;
  decidedBy?: string;
}

/**
 * 代表者の承認/却下をパッケージへ反映する。
 * 該当パッケージが無い場合は null を返す（呼び出し側で 404 等へマップ）。
 * Phase 1 では実行エンジンを呼ばない（状態遷移のみ）。
 */
export async function updateApprovalPackageDecision(
  submissionId: string,
  action: "approve" | "reject",
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  const now = new Date().toISOString();
  const memo = typeof meta.memo === "string" && meta.memo.trim().length > 0
    ? meta.memo.trim()
    : null;
  const decidedBy = typeof meta.decidedBy === "string" && meta.decidedBy.trim().length > 0
    ? meta.decidedBy.trim()
    : null;

  if (action === "approve") {
    pkg.status = "approved_for_planning";
    pkg.approval.representativeDecision = "approve";
  } else {
    pkg.status = "rejected";
    pkg.approval.representativeDecision = "reject";
  }
  pkg.approval.decidedAt = now;
  pkg.approval.decidedBy = decidedBy;
  pkg.approval.memo = memo;

  await writeApprovalPackage(pkg);
  return pkg;
}
