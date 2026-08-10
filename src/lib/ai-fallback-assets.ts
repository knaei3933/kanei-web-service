/* ------------------------------------------------------------------ */
/*  AIフォールバック資産の追跡レジストリ（Phase H）                       */
/* ------------------------------------------------------------------ */
/*  ローカルオペレータが codex で生成した「AI仮画像」を、顧客提供素材と     */
/*  区別・追跡するための軽量メタデータレジストリ。                         */
/*                                                                        */
/*  保存先: ai-fallback-assets.json（submission-storage の成果物の1つ）。   */
/*  バイナリ本体は保存しない。各アイテムは軽量メタデータのみ。              */
/*                                                                        */
/*  image-fallback.ts のトレーサビリティ規則に従う:                         */
/*    - 生成物は必ず ai-fallback- プレフィックスのファイル名で保存する       */
/*    - メタデータに aiGenerated:true を付与する                           */
/*    - source マーカー = "ai-generated"                                  */
/*                                                                        */
/*  このモジュールはメタデータの読み書きだけを行う。画像生成そのものは       */
/*  serverless では行わず、ローカルオペレータが実行する前提。               */
/* ------------------------------------------------------------------ */

import {
  writeArtifact,
  readArtifact,
  isSafeSubmissionId,
  isSafeAttachmentName,
} from "@/server/submission-storage";
import { AI_FALLBACK_ASSET_PREFIX } from "@/lib/image-fallback";

/* ------------------------------------------------------------------ */
/*  型定義                                                              */
/* ------------------------------------------------------------------ */

/**
 * 資産の状態。
 * - generated : 仮画像として生成済み・実物受頍待ち（まだ差し替えていない）
 * - replaced  : 顧客提供の本素材で差し替え済み
 */
export type AiFallbackAssetStatus = "generated" | "replaced";

/**
 * AIフォールバック資産1件の軽量メタデータ。
 * バイナリ本体は含まない。
 */
export interface AiFallbackAsset {
  /** 資産ID（submission 内で一意・a1, a2, ... の連番） */
  id: string;
  /** カテゴリ名（例: メインビジュアル（ヒーロー）・ロゴプレースホルダ） */
  category: string;
  /** 保存ファイル名（必ず ai-fallback- プレフィックス付き） */
  savedName: string;
  /** 生成元マーカー（AIフォールバック資産であることを示す固定値） */
  source: "ai-generated";
  /** トレーサビリティフラグ（image-fallback.ts の規則に従い常に true） */
  aiGenerated: true;
  /** 状態（generated=仮画像 / replaced=差し替え済み） */
  status: AiFallbackAssetStatus;
  /** 生成日時（ISO8601） */
  createdAt: string;
  /** 差し替え日時（status=replaced のときのみ・ISO8601） */
  replacedAt?: string;
  /** 自由備考（任意・差し替え先ファイル名やメモ等） */
  note?: string;
  /**
   * 保存したバイナリの MIME タイプ（任意）。
   * アップロード経路でバイナリ本体も保存したときだけ入る。
   * プレビュー（インライン表示）で content-type を復元するために使う。
   */
  contentType?: string;
  /**
   * オペレータがアップロードした元のファイル名（任意）。
   * ダウンロード時のファイル名復元や、保存名との対応確認に使う。
   */
  originalName?: string;
}

/**
 * 1 submission あたりの追跡レジストリ。
 * ai-fallback-assets.json に JSON として保存される。
 */
export interface AiFallbackAssetRegistry {
  /** スキーマバージョン */
  schemaVersion: string;
  /** submission ID */
  submissionId: string;
  /** 追跡対象の資産一覧（生成順） */
  assets: AiFallbackAsset[];
  /** 最終更新日時（ISO8601） */
  updatedAt: string;
}

/** appendAiFallbackAsset への入力（id/createdAt/source 等は自動で埋める） */
export interface AiFallbackAssetInput {
  category: string;
  savedName: string;
  note?: string;
  /** バイナリ本体も保存したときの MIME タイプ（任意） */
  contentType?: string;
  /** オペレータがアップロードした元のファイル名（任意） */
  originalName?: string;
}

/** 現在のスキーマバージョン */
const SCHEMA_VERSION = "1.0.0";

/** source マーカーの固定値 */
const SOURCE_MARKER = "ai-generated" as const;

/* ------------------------------------------------------------------ */
/*  内部ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** 空のレジストリを生成する */
function emptyRegistry(submissionId: string): AiFallbackAssetRegistry {
  return {
    schemaVersion: SCHEMA_VERSION,
    submissionId,
    assets: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 既存資産の id（"a1", "a2", ...）から次の連番 id を決める。
 * 衝突を避けるため、未使用の番号を探す。単一オペレータ前提なので十分。
 */
function nextAssetId(assets: AiFallbackAsset[]): string {
  const used = new Set(assets.map((a) => a.id));
  let n = 1;
  while (used.has(`a${n}`)) n += 1;
  return `a${n}`;
}

/**
 * パース結果をレジストリとして安全に扱えるか検証し、整える。
 * 不正な形状のときは null を返す（呼び出し側は「無いもの」として扱う）。
 */
function normalizeRegistry(
  raw: unknown,
  submissionId: string
): AiFallbackAssetRegistry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.assets)) return null;

  const assets: AiFallbackAsset[] = [];
  for (const item of obj.assets) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    if (
      typeof a.id !== "string" ||
      typeof a.category !== "string" ||
      typeof a.savedName !== "string" ||
      typeof a.createdAt !== "string"
    ) {
      continue;
    }
    const status: AiFallbackAssetStatus =
      a.status === "replaced" ? "replaced" : "generated";
    assets.push({
      id: a.id,
      category: a.category,
      savedName: a.savedName,
      source: SOURCE_MARKER,
      aiGenerated: true,
      status,
      createdAt: a.createdAt,
      ...(typeof a.replacedAt === "string" ? { replacedAt: a.replacedAt } : {}),
      ...(typeof a.note === "string" && a.note.length > 0
        ? { note: a.note }
        : {}),
      // Phase Q: バイナリ本体も保存した資産向けのプレビュー用メタデータ。
      // 古いエントリ（pre-Phase-Q）には無い項目なので、文字列のときだけ復元する。
      ...(typeof a.contentType === "string" && a.contentType.length > 0
        ? { contentType: a.contentType }
        : {}),
      ...(typeof a.originalName === "string" && a.originalName.length > 0
        ? { originalName: a.originalName }
        : {}),
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    submissionId,
    assets,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

/** 入力文字列を安全に整える（前後空白・長さ制限） */
function clampText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/* ------------------------------------------------------------------ */
/*  公開関数                                                            */
/* ------------------------------------------------------------------ */

/**
 * 追跡レジストリを読み込む。
 * @param submissionId 受領 ID
 * @returns レジストリ（不在・パース失敗時は null）
 */
export async function readAiFallbackAssets(
  submissionId: string
): Promise<AiFallbackAssetRegistry | null> {
  if (!isSafeSubmissionId(submissionId)) return null;

  try {
    const raw = await readArtifact(submissionId, "ai-fallback-assets.json");
    if (!raw) return null;
    return normalizeRegistry(JSON.parse(raw), submissionId);
  } catch {
    return null;
  }
}

/**
 * 生成したAIフォールバック資産をレジストリに追記する。
 * savedName は必ず ai-fallback- プレフィックス付きであること。
 *
 * @param submissionId 受領 ID
 * @param input 追記する資産の入力
 * @returns 追記された資産（保存に失敗したときは例外を投げる）
 */
export async function appendAiFallbackAsset(
  submissionId: string,
  input: AiFallbackAssetInput
): Promise<AiFallbackAsset> {
  if (!isSafeSubmissionId(submissionId)) {
    throw new Error(`不正な submissionId: ${submissionId}`);
  }

  // category: 空禁止・長さ制限
  const category = clampText(input.category, 100);
  if (!category) {
    throw new Error("category が空です。");
  }

  // savedName: ai-fallback- プレフィックス必須・安全なファイル名であること
  const savedName = clampText(input.savedName, 255);
  if (!savedName) {
    throw new Error("savedName が空です。");
  }
  if (!savedName.startsWith(AI_FALLBACK_ASSET_PREFIX)) {
    throw new Error(
      `savedName は ${AI_FALLBACK_ASSET_PREFIX} プレフィックスで始まる必要があります: ${savedName}`
    );
  }
  if (!isSafeAttachmentName(savedName)) {
    throw new Error(`安全でないファイル名です: ${savedName}`);
  }

  const note = input.note ? clampText(input.note, 1000) : undefined;
  // MIME タイプ・元ファイル名は任意。プレビュー/ダウンロードの復元に使う。
  const contentType =
    typeof input.contentType === "string" && input.contentType.length > 0
      ? input.contentType.trim().slice(0, 255)
      : undefined;
  const originalName =
    typeof input.originalName === "string" && input.originalName.length > 0
      ? clampText(input.originalName, 255)
      : undefined;

  const existing = (await readAiFallbackAssets(submissionId)) ?? emptyRegistry(submissionId);

  const asset: AiFallbackAsset = {
    id: nextAssetId(existing.assets),
    category,
    savedName,
    source: SOURCE_MARKER,
    aiGenerated: true,
    status: "generated",
    createdAt: new Date().toISOString(),
    ...(note ? { note } : {}),
    ...(contentType ? { contentType } : {}),
    ...(originalName ? { originalName } : {}),
  };

  existing.assets.push(asset);
  existing.updatedAt = new Date().toISOString();

  await writeArtifact(
    submissionId,
    "ai-fallback-assets.json",
    JSON.stringify(existing, null, 2)
  );

  return asset;
}

/**
 * 指定資産を「差し替え済み」にする（実物を受領して本素材と入れ替えた）。
 *
 * @param submissionId 受領 ID
 * @param assetId 資産 ID
 * @param note 任意の備考（差し替え先ファイル名等）
 * @returns 更新後のレジストリ（該当資産がないときは null）
 */
export async function markAiFallbackAssetReplaced(
  submissionId: string,
  assetId: string,
  note?: string
): Promise<AiFallbackAssetRegistry | null> {
  if (!isSafeSubmissionId(submissionId)) return null;

  const registry = await readAiFallbackAssets(submissionId);
  if (!registry) return null;

  const target = registry.assets.find((a) => a.id === assetId);
  if (!target) return null;

  target.status = "replaced";
  target.replacedAt = new Date().toISOString();
  if (note && note.trim()) {
    target.note = clampText(note, 1000);
  }
  registry.updatedAt = new Date().toISOString();

  await writeArtifact(
    submissionId,
    "ai-fallback-assets.json",
    JSON.stringify(registry, null, 2)
  );

  return registry;
}

/**
 * 指定資産をレジストリから取り除く（誤登録の修正等）。
 *
 * @param submissionId 受領 ID
 * @param assetId 資産 ID
 * @returns 更新後のレジストリ（該当資産がないときは null）
 */
export async function removeAiFallbackAsset(
  submissionId: string,
  assetId: string
): Promise<AiFallbackAssetRegistry | null> {
  if (!isSafeSubmissionId(submissionId)) return null;

  const registry = await readAiFallbackAssets(submissionId);
  if (!registry) return null;

  const before = registry.assets.length;
  registry.assets = registry.assets.filter((a) => a.id !== assetId);
  if (registry.assets.length === before) return null;

  registry.updatedAt = new Date().toISOString();

  await writeArtifact(
    submissionId,
    "ai-fallback-assets.json",
    JSON.stringify(registry, null, 2)
  );

  return registry;
}

// プレビュー/ダウンロード用 href ヘルパ（Phase Q）は、サーバー専用依存を含まない
// 純粋なヘルパのため client-safe モジュールへ分離した:
//   @/lib/ai-fallback-asset-links （fallbackAssetHref / isInlineImageContentType /
//   AiFallbackAssetHrefMode）
// クライアントコンポーネントから import すると node:fs 系がバンドルに混入するため。
