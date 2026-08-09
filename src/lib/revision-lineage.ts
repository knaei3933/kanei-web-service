/* ------------------------------------------------------------------ */
/*  Revision Lineage — リビジョンラウンドの系譜インデックス              */
/* ------------------------------------------------------------------ */
/*  全ラウンドのメタデータを保持し、round↔commit↔snapshotKey 相関を提供 */
/*  小さく保ち（componentSource は含まない）、復元/再利用の「目次」として */
/*  機能する。lineage は再生成可能な派生物であり、真の SoT は git と snapshots */
/* ------------------------------------------------------------------ */

import {
  writeArtifact,
  readArtifact,
  artifactExists,
} from "@/server/submission-storage";

/** ラウンドの種類 */
export type RoundKind = "initial" | "revision" | "restore" | "reuse";

/** 単一ラウンドのメタデータ */
export interface RoundEntry {
  /** ラウンド番号（0 = 初回生成、1..N = revision の回数） */
  round: number;
  /** ラウンドの種類 */
  kind: RoundKind;
  /** 人間向けラベル（管理画面表示用） */
  label: string;
  /** スナップショットキー（snapshots/<key>.json への参照） */
  snapshotKey: string;
  /** componentSource が snapshot にあるか */
  hasComponentSource: boolean;
  /** git commit SHA（フル） */
  commitSha: string | null;
  /** git commit SHA（短縮・7文字） */
  shortSha: string | null;
  /** git コミットメッセージ */
  commitMessage: string | null;
  /** git コミット日時（ISO 8601） */
  committedAt: string | null;
  /** キャプチャ日時（ISO 8601） */
  capturedAt: string;
  /** その時点の approval-package.status */
  status: string;
  /** その時点の customerFacingStatus */
  customerFacingStatus: string | null;
  /** 基点ラウンド（restore/reuse の場合のみ） */
  parentRound: number | null;
  /** バリアントタグ（例: "A" / "B"） */
  variantTag: string | null;
  /** このラウンドを導いた feedback（revision の場合） */
  feedback: {
    rating: number;
    comment: string;
    submittedAt: string;
  } | null;
  /** そのラウンドの修正指示（revision の場合） */
  revisionPrompt: string | null;
  /** 現行ラウンドか（常に1件のみ true） */
  isCurrent: boolean;
  /** 備考（バックフィル時の "backfilled-inferred" 等） */
  notes: string;
}

/** revision-lineage.json の構造 */
export interface RevisionLineage {
  /** スキーマバージョン */
  schemaVersion: string;
  /** submissionId */
  submissionId: string;
  /** ターゲットコンポーネント名（例: "izakaya-showcase"） */
  targetComponent: string | null;
  /** コンポーネントパス（例: "src/components/sections/izakaya-showcase.tsx"） */
  componentPath: string | null;
  /** 現行ラウンド番号 */
  currentRound: number;
  /** 全ラウンドのメタデータ配列（昇順） */
  rounds: RoundEntry[];
}

/** revision-lineage.json のファイル名 */
const LINEAGE_FILE_NAME = "revision-lineage.json" as const;
const SCHEMA_VERSION = "1.0.0";

/** ラウンド番号からラベルを生成 */
function roundToLabel(round: number, kind: RoundKind): string {
  if (kind === "initial") return "初回生成";
  if (kind === "revision") return `修正 ${round} 回目`;
  if (kind === "restore") return `復元 (round ${round})`;
  if (kind === "reuse") return `再利用 (round ${round})`;
  return `ラウンド ${round}`;
}

/** 初期状態の lineages を作成 */
export function createInitialLineage(submissionId: string): RevisionLineage {
  return {
    schemaVersion: SCHEMA_VERSION,
    submissionId,
    targetComponent: null,
    componentPath: null,
    currentRound: -1,
    rounds: [],
  };
}

/** revision-lineage.json を読み込む。不在の場合は初期状態を返す */
export async function readLineage(
  submissionId: string
): Promise<RevisionLineage> {
  const raw = await readArtifact(submissionId, LINEAGE_FILE_NAME);
  if (!raw) {
    return createInitialLineage(submissionId);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    // 基本的な構造検証
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "schemaVersion" in parsed &&
      "submissionId" in parsed &&
      "rounds" in parsed &&
      Array.isArray(parsed.rounds)
    ) {
      return parsed as RevisionLineage;
    }
    // 構造が不正な場合は初期状態を返す
    console.warn(`[revision-lineage] 構造が不正なため初期状態を返します: ${submissionId}`);
    return createInitialLineage(submissionId);
  } catch (err) {
    console.error(`[revision-lineage] パースエラー: ${submissionId}`, err);
    return createInitialLineage(submissionId);
  }
}

/** revision-lineage.json を書き込む */
export async function writeLineage(
  submissionId: string,
  lineage: RevisionLineage
): Promise<void> {
  await writeArtifact(submissionId, LINEAGE_FILE_NAME, JSON.stringify(lineage, null, 2));
}

/** 新しいラウンドエントリを追加 */
export interface AppendRoundParams {
  /** ラウンド番号 */
  round: number;
  /** ラウンドの種類 */
  kind: RoundKind;
  /** git commit SHA（フル・オプション） */
  commitSha?: string | null;
  /** git commit SHA（短縮・オプション） */
  shortSha?: string | null;
  /** git コミットメッセージ（オプション） */
  commitMessage?: string | null;
  /** git コミット日時（ISO 8601・オプション） */
  committedAt?: string | null;
  /** 基点ラウンド（restore/reuse の場合） */
  parentRound?: number | null;
  /** バリアントタグ */
  variantTag?: string | null;
  /** このラウンドを導いた feedback */
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: string;
  } | null;
  /** そのラウンドの修正指示 */
  revisionPrompt?: string | null;
  /** 備考 */
  notes?: string;
  /** componentSource が snapshot にあるか */
  hasComponentSource?: boolean;
  /** その時点の status */
  status: string;
  /** その時点の customerFacingStatus */
  customerFacingStatus?: string | null;
  /** ターゲットコンポーネント名（初回のみ） */
  targetComponent?: string | null;
  /** コンポーネントパス（初回のみ） */
  componentPath?: string | null;
}

/**
 * 新しいラウンドエントリを追加して lineage を更新
 * 既存の全ラウンドの isCurrent を false にし、新しいラウンドを current にする
 */
export async function appendRound(
  submissionId: string,
  params: AppendRoundParams
): Promise<RevisionLineage> {
  const lineage = await readLineage(submissionId);

  // 現行ラウンドを false にする
  for (const round of lineage.rounds) {
    round.isCurrent = false;
  }

  // snapshotKey を生成（variantTag がある場合は付与）
  const snapshotKey = params.variantTag
    ? `round-${params.round}-${params.variantTag}`
    : `round-${params.round}`;

  // 新しいラウンドエントリを作成
  const newRound: RoundEntry = {
    round: params.round,
    kind: params.kind,
    label: roundToLabel(params.round, params.kind),
    snapshotKey,
    hasComponentSource: params.hasComponentSource ?? false,
    commitSha: params.commitSha ?? null,
    shortSha: params.shortSha ?? null,
    commitMessage: params.commitMessage ?? null,
    committedAt: params.committedAt ?? null,
    capturedAt: new Date().toISOString(),
    status: params.status,
    customerFacingStatus: params.customerFacingStatus ?? null,
    parentRound: params.parentRound ?? null,
    variantTag: params.variantTag ?? null,
    feedback: params.feedback ?? null,
    revisionPrompt: params.revisionPrompt ?? null,
    isCurrent: true,
    notes: params.notes ?? "",
  };

  lineage.rounds.push(newRound);
  lineage.currentRound = params.round;

  // 初回のみ targetComponent と componentPath を設定
  if (params.kind === "initial") {
    lineage.targetComponent = params.targetComponent ?? null;
    lineage.componentPath = params.componentPath ?? null;
  }

  await writeLineage(submissionId, lineage);
  return lineage;
}

/**
 * 指定したラウンドを現行にする（isCurrent を付け替え）
 * 主に復元/再利用時に使用
 */
export async function setCurrent(
  submissionId: string,
  round: number
): Promise<RevisionLineage> {
  const lineage = await readLineage(submissionId);

  // 全ラウンドの isCurrent を false にする
  for (const r of lineage.rounds) {
    r.isCurrent = false;
  }

  // 指定ラウンドを true にする
  const targetRound = lineage.rounds.find((r) => r.round === round);
  if (!targetRound) {
    throw new Error(`ラウンド ${round} が見つかりません`);
  }

  targetRound.isCurrent = true;
  lineage.currentRound = round;

  await writeLineage(submissionId, lineage);
  return lineage;
}

/** revision-lineage.json が存在するか */
export async function lineageExists(submissionId: string): Promise<boolean> {
  return artifactExists(submissionId, LINEAGE_FILE_NAME);
}
