/* ------------------------------------------------------------------ */
/*  相談成果物ストレージ — 解決＋公開API＋パスヘルパ                     */
/* ------------------------------------------------------------------ */
/*  環境に応じて filesystem（local/ephemeral）か relay かを解決し、      */
/*  成果物の読み書きを単一の関数群として提供する。                        */
/*  mail 層（src/server/mail/index.ts）と同じ「解決＋公開関数」構成。    */
/*                                                                      */
/*  成果物（ホワイトリスト制）:                                          */
/*    submission.json / brief.json / approval-package.json /            */
/*    omc-plan.json / execution-handoff.json / execution-prompt.md /    */
/*    demo-feedback.json / revision-handoff.json / delivery-info.json / */
/*    interview-request.json / interview-answer.json /                  */
/*    production-readiness.json                                          */
/*                                                                      */
/*  モード解決:                                                        */
/*    - ローカル開発（VERCEL!=1）            → local     (filesystem)    */
/*    - 本番 + リレー設定あり                → relay     (HTTP リレー)   */
/*    - 本番 + リレー未設定                  → ephemeral (/tmp・一時)    */
/*                                                                      */
/*  添付ファイル本体（バイナリ）もこのアダプタを経由する（writeAttachment */
/*  / readAttachment）。テキスト成果物とは files/<savedName> キーで区別。   */
/*  - local : filesystem の data/.../files/<savedName>                    */
/*  - relay : HTTP リレー経由で files/<savedName> へ恒久保存              */
/*  - ephemeral : filesystem の /tmp/.../files/<savedName>（一時）        */
/*  添付の「メタデータ」も引き続き submission.json / approval-package.json  */
/*  に保持されるので、レビュー時には常に参照できる。                      */
/* ------------------------------------------------------------------ */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { filesystemStorage } from "./providers/filesystem";
import { relayStorage, isRelayStorageConfigured } from "./providers/relay";
import type {
  ArtifactFileName,
  StorageMode,
  SubmissionStorageAdapter,
} from "./types";

// 型・定数・検証ヘルパを再エクスポート（呼び出し側の利便性）
export {
  ARTIFACT_FILE_NAMES,
  isArtifactFileName,
  isSafeSubmissionId,
  isSafeAttachmentName,
  isSafeSnapshotKey,
} from "./types";
export type {
  ArtifactFileName,
  StorageMode,
  SubmissionStorageAdapter,
} from "./types";

/** ローカル開発用ルート（プロジェクト内・gitignore 済み） */
const LOCAL_ROOT = join(process.cwd(), "data", "consult-submissions");
/** 本番(serverless)の一時ルート（Vercel では /tmp） */
const EPHEMERAL_ROOT = join(tmpdir(), "consult-submissions");
/** 表示用の論理ルート（local/relay で使う安定した相対パス） */
const LOGICAL_ROOT = "data/consult-submissions";

/** Vercel 本番/ビルド時は VERCEL=1 */
function isServerless(): boolean {
  return process.env.VERCEL === "1";
}

/** 現在の環境での保存モードを解決する */
export function resolveStorageMode(): StorageMode {
  if (!isServerless()) return "local";
  return isRelayStorageConfigured() ? "relay" : "ephemeral";
}

/** モードに応じたアダプタを返す（都度 env を見るので実行時に切り替わる） */
function resolveAdapter(): SubmissionStorageAdapter {
  return resolveStorageMode() === "relay" ? relayStorage : filesystemStorage;
}

/* ------------------------------------------------------------------ */
/*  公開API（読み書き）                                                  */
/* ------------------------------------------------------------------ */

/** 成果物を書き込む（上書き）。リレー未設定等で書けないときは例外を投げる */
export async function writeArtifact(
  submissionId: string,
  fileName: ArtifactFileName,
  content: string
): Promise<void> {
  return resolveAdapter().writeArtifact(submissionId, fileName, content);
}

/** 成果物を読み込む。不在・失敗時は null */
export async function readArtifact(
  submissionId: string,
  fileName: ArtifactFileName
): Promise<string | null> {
  return resolveAdapter().readArtifact(submissionId, fileName);
}

/** 成果物が存在するか */
export async function artifactExists(
  submissionId: string,
  fileName: ArtifactFileName
): Promise<boolean> {
  return resolveAdapter().artifactExists(submissionId, fileName);
}

/* ------------------------------------------------------------------ */
/*  公開API（スナップショット・ラウンド別保存）                          */
/* ------------------------------------------------------------------ */
/*  リビジョンラウンドのスナップショット（componentSource 等）の読み書き。  */
/*  テキスト成果物とは異なり snapshots/<key> キーで扱う。                  */
/*  - local     : data/consult-submissions/<id>/snapshots/<key>.json       */
/*  - relay     : HTTP リレー経由で snapshots/<key> へ恒久保存               */
/*  - ephemeral : /tmp/consult-submissions/<id>/snapshots/<key>.json（一時） */
/* ------------------------------------------------------------------ */

/** スナップショット（JSON テキスト）を書き込む（上書き）。リレー未設定等で書けないときは例外 */
export async function writeSnapshot(
  submissionId: string,
  key: string,
  content: string
): Promise<void> {
  return resolveAdapter().writeSnapshot(submissionId, key, content);
}

/** スナップショットを読み込む。不在・失敗時は null */
export async function readSnapshot(
  submissionId: string,
  key: string
): Promise<string | null> {
  return resolveAdapter().readSnapshot(submissionId, key);
}

/** スナップショットが存在するか */
export async function snapshotExists(
  submissionId: string,
  key: string
): Promise<boolean> {
  return resolveAdapter().snapshotExists(submissionId, key);
}

/* ------------------------------------------------------------------ */
/*  公開API（添付ファイル・バイナリ）                                    */
/* ------------------------------------------------------------------ */
/*  添付ファイル本体（画像・PDF 等）の読み書き。                          */
/*  テキスト成果物とは異なり files/<savedName> キーで扱う。                */
/*  - local     : data/consult-submissions/<id>/files/<savedName>         */
/*  - relay     : HTTP リレー経由で files/<savedName> へ恒久保存           */
/*  - ephemeral : /tmp/consult-submissions/<id>/files/<savedName>（一時） */
/* ------------------------------------------------------------------ */

/** 添付ファイル（バイナリ）を書き込む（上書き）。リレー未設定等で書けないときは例外 */
export async function writeAttachment(
  submissionId: string,
  savedName: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  return resolveAdapter().writeAttachment(submissionId, savedName, bytes, contentType);
}

/** 添付ファイル（バイナリ）を読み込む。不在・失敗時は null */
export async function readAttachment(
  submissionId: string,
  savedName: string
): Promise<Uint8Array | null> {
  return resolveAdapter().readAttachment(submissionId, savedName);
}

/* ------------------------------------------------------------------ */
/*  パス・診断ヘルパ（表示・添付保存用）                                  */
/* ------------------------------------------------------------------ */

/**
 * 添付ファイル等の「ファイルシステム保存用」ディレクトリを返す。
 * 成果物とは異なり、添付は常に filesystem（local または /tmp）に置く。
 */
export function getSubmissionDir(submissionId: string): string {
  const root = isServerless() ? EPHEMERAL_ROOT : LOCAL_ROOT;
  return join(root, submissionId);
}

/** 現在の保存モード（local / relay / ephemeral） */
export function getStorageMode(): StorageMode {
  return resolveStorageMode();
}

/**
 * 保存先の物理ベース（検証・確認用）。
 * - local / ephemeral : 実ディレクトリの絶対パス
 * - relay            : SUBMISSION_STORAGE_RELAY_URL（リレー先 URL）
 */
export function getStorageBase(): string {
  const mode = resolveStorageMode();
  if (mode === "relay") {
    return process.env.SUBMISSION_STORAGE_RELAY_URL ?? "(SUBMISSION_STORAGE_RELAY_URL 未設定)";
  }
  return isServerless() ? EPHEMERAL_ROOT : LOCAL_ROOT;
}

/**
 * 成果物の情報表示用パス。
 * - local / relay : 論理相対パス data/consult-submissions/<id>/<file>
 *   （relay では論理キー。物理バックエンドは getStorageBase/getStorageMode で別途示す）
 * - ephemeral     : 実パス /tmp/consult-submissions/<id>/<file>（一時領域を明示）
 */
export function artifactDisplayPath(
  submissionId: string,
  fileName: ArtifactFileName
): string {
  if (resolveStorageMode() === "ephemeral") {
    return join(EPHEMERAL_ROOT, submissionId, fileName);
  }
  return `${LOGICAL_ROOT}/${submissionId}/${fileName}`;
}

/** 送信1件のディレクトリの情報表示用パス（artifactDisplayPath と同じ規則） */
export function submissionDisplayDir(submissionId: string): string {
  if (resolveStorageMode() === "ephemeral") {
    return join(EPHEMERAL_ROOT, submissionId);
  }
  return `${LOGICAL_ROOT}/${submissionId}`;
}

/**
 * 添付ファイルの情報表示用パス（レビュー・内部確認用）。
 * - local / relay : 論理相対パス data/consult-submissions/<id>/files/<savedName>
 *   （relay では論理キー。物理バックエンドは getStorageBase/getStorageMode で別途示す）
 * - ephemeral     : 実パス /tmp/consult-submissions/<id>/files/<savedName>（一時領域を明示）
 *
 * 保存先の実体（アダプタ経由）と一致する、正直で安定したパス。
 */
export function attachmentDisplayPath(
  submissionId: string,
  savedName: string
): string {
  if (resolveStorageMode() === "ephemeral") {
    return join(EPHEMERAL_ROOT, submissionId, "files", savedName);
  }
  return `${LOGICAL_ROOT}/${submissionId}/files/${savedName}`;
}
