/**
 * 管理者ログイン後の「元のページへ戻る」フロー（returnTo）のためのヘルパー。
 *
 * /admin/[id] に未認証でアクセスしたとき、元のパス（クエリ文字列を含む）を
 * クエリとして /admin へ渡し、ログイン成功後に安全に元のパスへ復帰させる。
 *
 * セキュリティ: 外部 URL やプロトコル相対 URL によるオープンリダイレクトを防ぐため、
 * 受け取った returnTo が「同じオリジンの内部パス」かどうかを厳密に判定する。
 */

/** returnTo のクエリパラメータ名。 */
export const RETURN_TO_PARAM = "returnTo";

/**
 * 受け取った値が「安全な内部パス（同じオリジン）」かを判定する。
 *
 * 次の条件をすべて満たす場合のみ true を返す:
 * - 空でない文字列である
 * - `/` で始まる（相対パス・完全な外部 URL を拒否）
 * - `//` や `/\` で始まらない（プロトコル相対 URL の回避。
 *   ブラウザはバックスラッシュをスラッシュに正規化することがあるため両方を弾く）
 * - 先頭が `スキーム:` の形式ではない（http:, https:, javascript:, data: など）
 *
 * 不正な値のときは false を返し、呼び出し側で /admin へフォールバックする。
 */
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  // 必ず `/` で始まること。相対パスや完全な外部 URL は拒否する。
  if (!value.startsWith("/")) return false;
  // `//` または `/\` で始まる値はプロトコル相対 URL に解釈される危険があるため拒否。
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  // 先頭が「スキーム:」の形式なら拒否（javascript:, data:, http: など）。
  // value は `/` 始まりなので通常はマッチしないが、念のための二重チェック。
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  return true;
}

/**
 * returnTo を安全なパスに正規化する。安全ならそのまま、不正なら /admin を返す。
 */
export function safeReturnPath(value: unknown): string {
  return isSafeInternalPath(value) ? value : "/admin";
}

/**
 * 指定パス（pathname + search）を returnTo クエリとして付与した /admin URL を作る。
 * 詳細ページの認可ガードで、未認証ユーザーをログイン画面へ送るときに使う。
 */
export function buildLoginUrlWithReturn(currentPathWithSearch: string): string {
  return `/admin?${RETURN_TO_PARAM}=${encodeURIComponent(currentPathWithSearch)}`;
}
