/* ------------------------------------------------------------------ */
/*  Revision Snapshot — リビジョンラウンドの内容バンドル               */
/* ------------------------------------------------------------------ */
/*  ラウンドごとのスナップショット（componentSource + コピー群）を    */
/*  snapshots/<key>.json に保存する。                                    */
/* ------------------------------------------------------------------ */

import {
  writeSnapshot,
  readSnapshot,
} from "@/server/submission-storage";

/** スナップショットの構造 */
export interface RevisionSnapshot {
  /** スキーマバージョン */
  schemaVersion: string;
  /** submissionId */
  submissionId: string;
  /** スナップショットキー */
  snapshotKey: string;
  /** ラウンド番号 */
  round: number;
  /** ラウンドの種類 */
  kind: string;
  /** キャプチャ日時（ISO 8601） */
  capturedAt: string;
  /** コンポーネントパス（例: "src/components/sections/izakaya-showcase.tsx"） */
  componentPath: string | null;
  /** コンポーネントソース（復元の核） */
  componentSource: string;
  /** git commit SHA（フル） */
  commitSha: string | null;
  /** revision-handoff.json のコピー */
  revisionHandoffCopy: unknown;
  /** feedback のコピー */
  feedbackCopy: unknown;
  /** その時点の approval-package.status スナップショット */
  approvalPackageStatusCopy: string;
}

/** スキーマバージョン */
const SCHEMA_VERSION = "1.0.0";

/**
 * スナップショットをキャプチャして保存
 * @param submissionId submissionId
 * @param key スナップショットキー（例: "round-0", "round-3-A"）
 * @param params スナップショットパラメータ
 */
export interface CaptureSnapshotParams {
  /** ラウンド番号 */
  round: number;
  /** ラウンドの種類 */
  kind: string;
  /** コンポーネントパス */
  componentPath: string | null;
  /** コンポーネントソース */
  componentSource: string;
  /** git commit SHA（フル・オプション） */
  commitSha?: string | null;
  /** revision-handoff.json の内容（オプション） */
  revisionHandoffCopy?: unknown;
  /** feedback の内容（オプション） */
  feedbackCopy?: unknown;
  /** その時点の approval-package.status */
  approvalPackageStatusCopy: string;
}

/**
 * スナップショットをキャプチャして保存
 */
export async function captureSnapshot(
  submissionId: string,
  key: string,
  params: CaptureSnapshotParams
): Promise<RevisionSnapshot> {
  const snapshot: RevisionSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    submissionId,
    snapshotKey: key,
    round: params.round,
    kind: params.kind,
    capturedAt: new Date().toISOString(),
    componentPath: params.componentPath,
    componentSource: params.componentSource,
    commitSha: params.commitSha ?? null,
    revisionHandoffCopy: params.revisionHandoffCopy ?? null,
    feedbackCopy: params.feedbackCopy ?? null,
    approvalPackageStatusCopy: params.approvalPackageStatusCopy,
  };

  await writeSnapshot(submissionId, key, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

/**
 * スナップショットを読み込む。不在の場合は null を返す
 */
export async function readRevisionSnapshot(
  submissionId: string,
  key: string
): Promise<RevisionSnapshot | null> {
  const raw = await readSnapshot(submissionId, key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    // 基本的な構造検証
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "schemaVersion" in parsed &&
      "submissionId" in parsed &&
      "snapshotKey" in parsed
    ) {
      return parsed as RevisionSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}
