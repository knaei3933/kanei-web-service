import {
  readAttachment,
  readArtifact,
  isSafeSubmissionId,
  isSafeAttachmentName,
} from "@/server/submission-storage";
import { readAiFallbackAssets } from "@/lib/ai-fallback-assets";

/* ------------------------------------------------------------------ */
/*  /api/consult/[submissionId]/attachments/[savedName]                 */
/*  （内部レビュー用・添付ファイル本体のダウンロード）                    */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    /review/[submissionId] 画面から、顧客アップロードの添付ファイル本体  */
/*    （画像・PDF 等）をダウンロードするためのルート。                    */
/*                                                                      */
/*    ストレージプロキシ（/api/submission-storage/.../files/...）とは違い、  */
/*    本ルートは「人（代表者）がブラウザで開く」ことを想定し、Bearer 認証は  */
/*    求めない。認証モデルは /review/[submissionId] 画面と同じ「内部専用・  */
/*    公開リンクなし・ID で難測」方式（submissionId は UUID 相当）。        */
/*                                                                      */
/*    本体の読み出しはアダプタ（readAttachment）経由なので、モードを問わず  */
/*    動く:                                                            */
/*      - local/ephemeral : filesystem（data/ または /tmp）から直接読む    */
/*      - relay           : リレープロキシ経由で上流（WSL）から読む         */
/*                                                                      */
/*    content-type とダウンロード時のファイル名は、2種類のメタデータ       */
/*    から復元する（savedName がどちらに属するかで切り替え）:             */
/*      - 顧客アップロード分 : submission.json の files（type/originalName）*/
/*      - オペレータ生成分   : ai-fallback-assets.json レジストリ            */
/*        （contentType/originalName・Phase Q）                             */
/*                                                                      */
/*  ※ 顧客向けには一切公開しない（内部専用）。                            */
/* ------------------------------------------------------------------ */

// アダプタ経由でファイルシステム / HTTP リレーを読むため Node ランタイム。
export const runtime = "nodejs";
// 毎回ストレージを読むため動的に。
export const dynamic = "force-dynamic";

/** submission.json に保存されている添付メタデータの想定形 */
interface StoredFileMeta {
  savedName?: unknown;
  originalName?: unknown;
  type?: unknown;
}

/**
 * savedName に合致する添付メタデータを探し、content-type とオリジナル
 * ファイル名を復元する。取得できなくてもダウンロード自体は可能なので、
 * 見つからなければ null。
 *
 * 顧客アップロード分（submission.json の files）を先に探し、無ければ
 * オペレータ生成の AIフォールバック資産レジストリ（ai-fallback-assets.json）
 * を探す。Phase Q で追加したバイナリアップロード資産は後者にだけ記録される。
 */
async function findFileMeta(
  submissionId: string,
  savedName: string
): Promise<{ originalName: string; contentType: string } | null> {
  const fromSubmission = await findFileMetaFromSubmission(submissionId, savedName);
  if (fromSubmission) return fromSubmission;
  return findFileMetaFromFallback(submissionId, savedName);
}

/**
 * submission.json の files から顧客アップロード分のメタデータを探す。
 */
async function findFileMetaFromSubmission(
  submissionId: string,
  savedName: string
): Promise<{ originalName: string; contentType: string } | null> {
  const raw = await readArtifact(submissionId, "submission.json");
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const files = (parsed as { files?: unknown })?.files;
  if (!Array.isArray(files)) return null;
  for (const f of files) {
    if (typeof f !== "object" || f === null) continue;
    const meta = f as StoredFileMeta;
    if (meta.savedName === savedName) {
      return {
        originalName:
          typeof meta.originalName === "string" && meta.originalName.length > 0
            ? meta.originalName
            : savedName,
        contentType:
          typeof meta.type === "string" && meta.type.length > 0
            ? meta.type
            : "application/octet-stream",
      };
    }
  }
  return null;
}

/**
 * AIフォールバック資産レジストリ（ai-fallback-assets.json）から、
 * オペレータ生成分のメタデータを探す（Phase Q）。
 * レジストリの contentType / originalName をプレビューの content-type 復元に使う。
 */
async function findFileMetaFromFallback(
  submissionId: string,
  savedName: string
): Promise<{ originalName: string; contentType: string } | null> {
  const registry = await readAiFallbackAssets(submissionId);
  if (!registry) return null;
  const asset = registry.assets.find((a) => a.savedName === savedName);
  if (!asset) return null;
  return {
    originalName:
      typeof asset.originalName === "string" && asset.originalName.length > 0
        ? asset.originalName
        : savedName,
    contentType:
      typeof asset.contentType === "string" && asset.contentType.length > 0
        ? asset.contentType
        : "application/octet-stream",
  };
}

/**
 * Content-Disposition 用の filename 串联立。
 * 多バイト文字（日本語含む）に対応するため filename*（RFC 5987）を使い、
 * 古いクライアント向けに ASCII フォールバックの filename も併記する。
 */
function buildContentDisposition(downloadName: string, inline: boolean): string {
  const encoded = encodeURIComponent(downloadName);
  const ascii = downloadName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/"/g, "'");
  const mode = inline ? "inline" : "attachment";
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

type AttachmentDownloadContext = {
  params: Promise<{ submissionId: string; savedName: string }>;
};

export async function GET(
  request: Request,
  ctx: AttachmentDownloadContext
): Promise<Response> {
  const { submissionId, savedName } = await ctx.params;
  const inline = new URL(request.url).searchParams.get("inline") === "1";

  // 公開エッジで検証（トラバーサル対策）
  if (!isSafeSubmissionId(submissionId)) {
    return Response.json(
      { status: "error", error: "submissionId の形式が不正です。" },
      { status: 400 }
    );
  }
  if (!isSafeAttachmentName(savedName)) {
    return Response.json(
      { status: "error", error: "添付ファイル名の形式が不正です。" },
      { status: 400 }
    );
  }

  // 本体を読み込む（アダプタ経由・local/relay 両対応）
  const bytes = await readAttachment(submissionId, savedName);
  if (!bytes) {
    return Response.json(
      { status: "error", error: "添付ファイルが見つかりません。" },
      { status: 404 }
    );
  }

  // メタデータから content-type とオリジナルファイル名を復元
  const meta = await findFileMeta(submissionId, savedName);
  const contentType = meta?.contentType ?? "application/octet-stream";
  const downloadName = meta?.originalName ?? savedName;

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": buildContentDisposition(downloadName, inline),
      // 内部専用なので検索エンジンに拾わせない
      "x-robots-tag": "noindex, noarchive",
      "cache-control": "no-store",
    },
  });
}
