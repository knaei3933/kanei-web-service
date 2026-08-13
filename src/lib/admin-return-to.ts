/**
 * 管理者認証（admin_secret）の保存・読み取りヘルパー。
 *
 * sessionStorage はタブごとに独立するため、target="_blank" で開いた
 * 新しいタブでは認証情報が引き継がれない。
 * → document.cookie を使うことで同一オリジン内の全タブで共有する。
 *
 * セキュリティ:
 * - HttpOnly は不可（JS から読むため）だが、SameSite=Lax で CSRF 軽減。
 * - Secure は https 環境でのみ有効。
 * - max-age でブラウザを閉じても一定期間は維持（管理作業の利便性）。
 */

const COOKIE_NAME = "admin_secret";
const MAX_AGE = 8 * 60 * 60; // 8時間（秒）

/** admin_secret をクッキーに保存（全タブで共有）。 */
export function setAdminSecret(value: string): void {
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=${MAX_AGE};SameSite=Lax${isSecure ? ";Secure" : ""}`;
}

/** クッキーから admin_secret を読み取る（なければ null）。 */
export function getAdminSecret(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** admin_secret クッキーを削除（ログアウト時）。 */
export function removeAdminSecret(): void {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
}

/** returnTo のクエリパラメータ名。 */
export const RETURN_TO_PARAM = "returnTo";

/**
 * 受け取った値が「安全な内部パス（同じオリジン）」かを判定する。
 */
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
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
 */
export function buildLoginUrlWithReturn(currentPathWithSearch: string): string {
  return `/admin?${RETURN_TO_PARAM}=${encodeURIComponent(currentPathWithSearch)}`;
}
