/* ------------------------------------------------------------------ */
/*  ファイルシステム プロバイダ（local 開発 / ephemeral /tmp 共用）      */
/* ------------------------------------------------------------------ */
/*  ローカル開発と、本番でリレー未設定時の /tmp 保存を兼ねる。          */
/*  保存ルートは環境で切り替える:                                       */
/*    - ローカル開発: <cwd>/data/consult-submissions/                  */
/*    - 本番(serverless): /tmp/consult-submissions/ （一時・非恒久）    */
/*                                                                      */
/*  既存の consult route / approval-package が使っていた「VERCEL=1 で   */
/*  /tmp、それ以外は data/」のルートロジックをここに集約した。          */
/*                                                                      */
/*  設計:                                                              */
/*    - 成果物はすべて UTF-8 テキストとして読み書きする。               */
/*    - submissionId / fileName は検証してからパス合成（トラバーサル対策）*/
/*    - 読み取り失敗（不在含む）は例外を投げず null を返す。            */
/* ------------------------------------------------------------------ */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SubmissionStorageAdapter, ArtifactFileName } from "../types";
import { isSafeSubmissionId, isArtifactFileName } from "../types";

/** ローカル開発用の成果物ルート（gitignore 済み・プロジェクト内） */
const LOCAL_ROOT = join(process.cwd(), "data", "consult-submissions");
/** 本番(serverless)でリレー未設定時の一時ルート（os.tmpdir() は Vercel で /tmp） */
const EPHEMERAL_ROOT = join(tmpdir(), "consult-submissions");

/** Vercel 本番/ビルド時は VERCEL=1（安全な判定方法） */
function isServerless(): boolean {
  return process.env.VERCEL === "1";
}

/** 現在の環境での成果物ルート */
function rootDir(): string {
  return isServerless() ? EPHEMERAL_ROOT : LOCAL_ROOT;
}

/** 成果物の実パスを組み立てる（検証済み前提） */
function realPath(submissionId: string, fileName: ArtifactFileName): string {
  return join(rootDir(), submissionId, fileName);
}

/**
 * submissionId / fileName を検証する。
 * 不正な場合は例外を投げる（呼び出し側でパイプライン判断）。
 */
function assertKey(submissionId: string, fileName: ArtifactFileName): void {
  if (!isSafeSubmissionId(submissionId)) {
    throw new Error(`不正な submissionId です: ${submissionId}`);
  }
  if (!isArtifactFileName(fileName)) {
    throw new Error(`許可されていない成果物ファイル名です: ${fileName}`);
  }
}

/** ファイルシステム プロバイダの実装 */
export const filesystemStorage: SubmissionStorageAdapter = {
  name: "filesystem",

  async writeArtifact(submissionId, fileName, content): Promise<void> {
    assertKey(submissionId, fileName);
    // 成果物ディレクトリを保証（consult route が mkdir 済みの場合もあるが冪等）
    await mkdir(join(rootDir(), submissionId), { recursive: true });
    await writeFile(realPath(submissionId, fileName), content, "utf8");
  },

  async readArtifact(submissionId, fileName): Promise<string | null> {
    assertKey(submissionId, fileName);
    try {
      return await readFile(realPath(submissionId, fileName), "utf8");
    } catch {
      // 不在・読み取り失敗は「無いもの」として扱う（呼び出し側は null を 404 等へ映射）
      return null;
    }
  },

  async artifactExists(submissionId, fileName): Promise<boolean> {
    assertKey(submissionId, fileName);
    try {
      await access(realPath(submissionId, fileName));
      return true;
    } catch {
      return false;
    }
  },
};
