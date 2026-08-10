/* ------------------------------------------------------------------ */
/*  AIフォールバック資産のプレビュー/ダウンロード用 href ヘルパ（Phase Q）  */
/* ------------------------------------------------------------------ */
/*  登録したバイナリ本体を、内部レビュー/実行ページで開くための URL を      */
/*  組み立てる純粋なヘルパ集。サーバー専用モジュール（ai-fallback-assets）  */
/*  とは依存を分離し、クライアントコンポーネントからも安全に import できる。*/
/*                                                                        */
/*  実体は添付ダウンロードルートと同じ:                                     */
/*    /api/consult/<submissionId>/attachments/<savedName>                 */
/*                                                                        */
/*  - preview : ?inline=1 を付け、ブラウザにインライン表示させる            */
/*  - download: 通常の添付ダウンロード（attachment 扱い）                   */
/*                                                                        */
/*  ここでは URL 文字列を作るだけ。認証モデルは添付ルートに準ずる            */
/*  （submissionId が推測困難・内部専用・顧客非公開）。                       */
/* ------------------------------------------------------------------ */

/** 資産のプレビュー/ダウンロード種別 */
export type AiFallbackAssetHrefMode = "preview" | "download";

/**
 * 指定資産の保存バイナリを開くための href を組み立てる。
 * バイナリ本体が保存されている（contentType 等のメタデータがある）前提。
 *
 * @param submissionId 受領 ID
 * @param savedName 保存ファイル名（ai-fallback- プレフィックス付き）
 * @param mode preview=インライン表示 / download=ダウンロード
 * @returns 添付ルートの URL（?inline=1 の有無で切替）
 */
export function fallbackAssetHref(
  submissionId: string,
  savedName: string,
  mode: AiFallbackAssetHrefMode = "download"
): string {
  const base = `/api/consult/${encodeURIComponent(submissionId)}/attachments/${encodeURIComponent(savedName)}`;
  return mode === "preview" ? `${base}?inline=1` : base;
}

/**
 * contentType から「ブラウザでインライン表示できる画像か」を判定する。
 * プレビューのサムネイル表示可否に使う。
 */
export function isInlineImageContentType(
  contentType: string | undefined
): boolean {
  if (!contentType) return false;
  return /^image\/(png|jpe?g|gif|webp|avif|svg\+xml|bmp|x-icon|vnd\.microsoft\.icon)$/i.test(
    contentType
  );
}
