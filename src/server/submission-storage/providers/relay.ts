/* ------------------------------------------------------------------ */
/*  Relay プロバイダ（本番 serverless の HTTP リレー経由の恒久保存）     */
/* ------------------------------------------------------------------ */
/*  Vercel/serverless では /tmp がインスタンス単位・エフェメラルで、    */
/*  別リクエスト（別インスタンス）で書いた承認パッケージが読めず、       */
/*  review / approve / plan-approve が壊れる。それを解決するため、       */
/*  成果物を社内 WSL のリレーストレージへ HTTP 経由で恒久保存する。      */
/*                                                                      */
/*  仕組み（mail リレーと同じ二段構え）:                                */
/*    アダプタ → SUBMISSION_STORAGE_RELAY_URL（固定の公開ルート）        */
/*             → /api/submission-storage が                              */
/*               SUBMISSION_STORAGE_RELAY_UPSTREAM_URL（WSL 等）へ転送   */
/*                                                                      */
/*  REST キーバリュー契約:                                              */
/*    [テキスト成果物]                                                   */
/*    書込: PUT  {RELAY_URL}/{submissionId}/{fileName}  body=内容(UTF-8) */
/*    読取: GET  {RELAY_URL}/{submissionId}/{fileName}  → 本文 or 404    */
/*    [バイナリ添付]                                                     */
/*    書込: PUT  {RELAY_URL}/{submissionId}/files/{savedName}            */
/*              body=バイト列 (application/octet-stream)                */
/*    読取: GET  {RELAY_URL}/{submissionId}/files/{savedName} → 本文 or 404*/
/*    認証: Authorization: Bearer {SUBMISSION_STORAGE_RELAY_SECRET}     */
/*                                                                      */
/*  設計:                                                              */
/*    - Node 18+ のグローバル fetch を使い、外部依存を増やさない。       */
/*    - SUBMISSION_STORAGE_RELAY_URL / SECRET が未設定なら               */
/*      isRelayStorageConfigured() が false（このプロバイダは選ばれない）*/
/*    - 書込失敗は例外を投げ、読取失敗は null を返す                     */
/*      （filesystem と揃えて呼び出し側が統一的に扱えるようにする）。   */
/* ------------------------------------------------------------------ */

import type { SubmissionStorageAdapter, ArtifactFileName } from "../types";
import { isSafeSubmissionId, isSafeAttachmentName } from "../types";

/** SUBMISSION_STORAGE_RELAY_URL / SECRET がそろっているか（リレー有効判定） */
export function isRelayStorageConfigured(): boolean {
  const url = process.env.SUBMISSION_STORAGE_RELAY_URL;
  const secret = process.env.SUBMISSION_STORAGE_RELAY_SECRET;
  return Boolean(url && secret);
}

/** リレー呼び出しのタイムアウト（プロキシルートの maxDuration=30 に合わせ余裕を持たせる） */
const UPSTREAM_TIMEOUT_MS = 28_000;

/**
 * 固定公開ルート（SUBMISSION_STORAGE_RELAY_URL）へのキー付き URL を組み立てる。
 * submissionId / fileName は URL 安全にエンコードする。
 */
function buildArtifactUrl(submissionId: string, fileName: string): string {
  const base = (process.env.SUBMISSION_STORAGE_RELAY_URL ?? "").replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(submissionId)}/${encodeURIComponent(fileName)}`;
}

/**
 * 添付ファイル用のキー付き URL を組み立てる。
 * テキスト成果物とは異なり files/<savedName> セグメントを挟む。
 * submissionId / savedName は URL 安全にエンコードする（多バイト文字も含む）。
 */
function buildAttachmentUrl(submissionId: string, savedName: string): string {
  const base = (process.env.SUBMISSION_STORAGE_RELAY_URL ?? "").replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(submissionId)}/files/${encodeURIComponent(savedName)}`;
}

/** 共有シークレット（未設定時は null） */
function relaySecret(): string | null {
  const secret = process.env.SUBMISSION_STORAGE_RELAY_SECRET;
  return typeof secret === "string" && secret.length > 0 ? secret : null;
}

/** Relay プロバイダの実装 */
export const relayStorage: SubmissionStorageAdapter = {
  name: "relay",

  async writeArtifact(submissionId, fileName, content): Promise<void> {
    if (!isSafeSubmissionId(submissionId)) {
      throw new Error(`不正な submissionId です: ${submissionId}`);
    }
    const secret = relaySecret();
    const url = process.env.SUBMISSION_STORAGE_RELAY_URL;
    if (!url || !secret) {
      throw new Error(
        "SUBMISSION_STORAGE_RELAY_URL / SECRET が未設定のためリレー書き込みできません。"
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(buildArtifactUrl(submissionId, fileName), {
        method: "PUT",
        headers: {
          // JSON も Markdown も UTF-8 プレーンテキストとして扱う
          "content-type": "text/plain; charset=utf-8",
          authorization: `Bearer ${secret}`,
        },
        body: content,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `リレーへの成果物書き込みに失敗しました（HTTP ${res.status}）: ${detail.slice(0, 200)}`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("リレーへの成果物書き込みに失敗")) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`リレーへの成果物書き込みに失敗しました: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  },

  async readArtifact(submissionId, fileName): Promise<string | null> {
    if (!isSafeSubmissionId(submissionId)) return null;
    const secret = relaySecret();
    const url = process.env.SUBMISSION_STORAGE_RELAY_URL;
    if (!url || !secret) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(buildArtifactUrl(submissionId, fileName), {
        method: "GET",
        headers: {
          authorization: `Bearer ${secret}`,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      // 404 は「無いもの」として扱う
      if (res.status === 404) return null;
      if (!res.ok) {
        // それ以外のエラーも filesystem と揃えて null 扱い（パイプラインを止めない）
        return null;
      }
      return await res.text();
    } catch {
      // ネットワークエラー等も null 扱い（呼び出し側は notFound/404 へ映射）
      return null;
    } finally {
      clearTimeout(timer);
    }
  },

  async artifactExists(submissionId, fileName): Promise<boolean> {
    // 小さなテキスト成果物なので readArtifact の成否で判定する
    const content = await relayStorage.readArtifact(submissionId, fileName);
    return content !== null;
  },

  async writeAttachment(submissionId, savedName, bytes, contentType): Promise<void> {
    if (!isSafeSubmissionId(submissionId)) {
      throw new Error(`不正な submissionId です: ${submissionId}`);
    }
    if (!isSafeAttachmentName(savedName)) {
      throw new Error(`不正な添付ファイル名です: ${savedName}`);
    }
    const secret = relaySecret();
    const url = process.env.SUBMISSION_STORAGE_RELAY_URL;
    if (!url || !secret) {
      throw new Error(
        "SUBMISSION_STORAGE_RELAY_URL / SECRET が未設定のためリレー書き込みできません。"
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(buildAttachmentUrl(submissionId, savedName), {
        method: "PUT",
        headers: {
          // バイナリ本体。contentType が空なら octet-stream にフォールバック
          "content-type": contentType || "application/octet-stream",
          authorization: `Bearer ${secret}`,
        },
        body: Buffer.from(bytes),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `リレーへの添付ファイル書き込みに失敗しました（HTTP ${res.status}）: ${detail.slice(0, 200)}`
        );
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("リレーへの添付ファイル書き込みに失敗")
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`リレーへの添付ファイル書き込みに失敗しました: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  },

  async readAttachment(submissionId, savedName): Promise<Uint8Array | null> {
    if (!isSafeSubmissionId(submissionId)) return null;
    if (!isSafeAttachmentName(savedName)) return null;
    const secret = relaySecret();
    const url = process.env.SUBMISSION_STORAGE_RELAY_URL;
    if (!url || !secret) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const res = await fetch(buildAttachmentUrl(submissionId, savedName), {
        method: "GET",
        headers: {
          authorization: `Bearer ${secret}`,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      // 404 は「無いもの」として扱う
      if (res.status === 404) return null;
      if (!res.ok) {
        // それ以外のエラーも filesystem と揃えて null 扱い（パイプラインを止めない）
        return null;
      }
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      // ネットワークエラー等も null 扱い（呼び出し側は notFound/404 へ映射）
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};
