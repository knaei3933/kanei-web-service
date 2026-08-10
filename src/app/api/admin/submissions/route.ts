import { readdirSync } from "node:fs";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { readArtifact } from "@/server/submission-storage";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions （管理用 一覧取得ルート）                    */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が保存済みの相談データを一覧できるエンドポイント。           */
/*    各 submission の approval-package.json / submission.json を読み、  */
/*    一覧表示に必要なメタ情報だけを集めて返す。                         */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer <ADMIN_SECRET> を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401（構造化 JSON）。              */
/*                                                                      */
/*  一覧の取得元は環境で切り替える（ストレージアダプタと同じ判定）:      */
/*    - local モード（VERCEL !== "1"）                                  */
/*        : data/consult-submissions/ 直下のディレクトリ名を列挙。      */
/*    - relay / ephemeral モード（VERCEL === "1"）                      */
/*        : SUBMISSION_STORAGE_RELAY_URL（/api/submission-storage を     */
/*          指す）のリスティングエンドポイントから一覧 JSON を取得。     */
/*          ※ RELAY_URL/SECRET 未設定（ephemeral）時は空リストを返す。  */
/*                                                                      */
/*  各 submission ごとに:                                              */
/*    1. approval-package.json を読めない（不在・破損）なら除外。       */
/*    2. submission.json から companyName / businessType を直接取得。   */
/*    3. approval-package の status / receivedAt / score を取り出す。   */
/*                                                                      */
/*  並び順: receivedAt の降順（新しいものが先）。                       */
/* ------------------------------------------------------------------ */

// fetch / ファイル I/O を使うため Node ランタイムを明示。
export const runtime = "nodejs";
// 一覧は保存状況に応じて毎回異なる結果になるため動的に。
export const dynamic = "force-dynamic";

/** 一覧レスポンスの1件分 */
interface SubmissionListItem {
  id: string;
  status: string;
  companyName: string;
  receivedAt: string;
  score: number;
  businessType: string;
}

/**
 * 文字列を定時間比較する（タイミング攻撃への緩和）。
 * 長さが違う場合は比較せず false を返す。
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * 管理者認証を検証する。失敗時は 401 Response、成功時は null。
 */
function authorizeAdmin(request: Request): Response | null {
  const secret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  const authorized =
    typeof secret === "string" && secret.length > 0 && token.length > 0
      ? safeEqual(token, secret)
      : false;
  if (!authorized) {
    return Response.json(
      { ok: false, error: "認証に失敗しました" },
      { status: 401 }
    );
  }
  return null;
}

/** unknown を安全に文字列として取り出す（空文字へ正規化） */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * local モード: data/consult-submissions/ 直下のディレクトリ名を列挙する。
 * ルートが無い・読めない場合は空配列を返す。
 */
function listLocalSubmissionIds(): string[] {
  const root = join(process.cwd(), "data", "consult-submissions");
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * relay モード: リレーリスティングエンドポイントから submissionId 一覧を取得する。
 * SUBMISSION_STORAGE_RELAY_URL は既に /api/submission-storage を指しているため、
 * サフィックスは付けずベース URL をそのまま GET する。
 * VERCEL===1 でリレー未設定時は空配列を返す。
 */
async function listRelaySubmissionIds(): Promise<string[]> {
  // Use UPSTREAM_URL directly (tunnel) for listing, not the Vercel proxy
  // because Next.js routes GET /api/submission-storage to [submissionId] dynamic route
  const url = process.env.SUBMISSION_STORAGE_RELAY_UPSTREAM_URL;
  const secret = process.env.SUBMISSION_STORAGE_RELAY_SECRET;
  // 本番でリレー未設定（ephemeral）時は一覧できないので空
  if (!url || !secret) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${secret}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { submissions?: unknown };
    const submissions = data.submissions;
    if (!Array.isArray(submissions)) return [];
    return submissions.map((s) => asString(s)).filter((s) => s.length > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 指定 submission の approval-package.json を読み込み、正規化して返す。
 * 不在・パース失敗時は null。
 */
async function readApprovalObject(
  id: string
): Promise<Record<string, unknown> | null> {
  const raw = await readArtifact(id, "approval-package.json");
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * submission.json から companyName / businessType を取り出す。
 * 不在・パース失敗時は空文字の組を返す。
 */
async function readSubmissionFields(
  id: string
): Promise<{ companyName: string; businessType: string }> {
  const raw = await readArtifact(id, "submission.json");
  if (raw === null) return { companyName: "", businessType: "" };
  try {
    const submission = JSON.parse(raw) as Record<string, unknown>;
    const payload = asObject(submission.payload);
    return {
      companyName:
        asString(payload.companyName) || asString(payload.enterpriseName),
      businessType: asString(payload.businessType),
    };
  } catch {
    return { companyName: "", businessType: "" };
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  // VERCEL===1 なら relay / ephemeral、それ以外は local
  const isServerless = process.env.VERCEL === "1";
  const ids = isServerless
    ? await listRelaySubmissionIds()
    : listLocalSubmissionIds();

  const items = (
    await Promise.all(
      ids.map(async (id): Promise<SubmissionListItem | null> => {
        // approval-package.json を読めない submission は一覧から除外
        const approval = await readApprovalObject(id);
        if (approval === null) return null;

        const status = asString(approval.status);
        const receivedAt = asString(approval.receivedAt);
        const intakeQuality = asObject(approval.intakeQuality);
        const score =
          typeof intakeQuality.score === "number" ? intakeQuality.score : 0;

        // companyName / businessType は submission.json から直接取得
        const { companyName: directCompanyName, businessType } =
          await readSubmissionFields(id);

        // companyName が submission.json に無ければ businessSummary で補完
        let companyName = directCompanyName;
        if (!companyName) {
          const reviewSummary = asObject(approval.reviewSummary);
          companyName = asString(reviewSummary.businessSummary);
        }

        return {
          id,
          status,
          companyName,
          receivedAt,
          score,
          businessType,
        };
      })
    )
  ).filter((item): item is SubmissionListItem => item !== null);

  // receivedAt 降順（新しいものが先）
  items.sort((a, b) => {
    if (a.receivedAt < b.receivedAt) return 1;
    if (a.receivedAt > b.receivedAt) return -1;
    return 0;
  });

  return Response.json({ submissions: items });
}
