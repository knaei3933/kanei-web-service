import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  readApprovalPackage,
  startPreProductionInterview,
  type InterviewQuestion,
} from "@/lib/approval-package";
import { DEFAULT_INTERVIEW_QUESTIONS } from "@/lib/production-readiness";
import { isSafeSubmissionId } from "@/server/submission-storage";

/**
 * POST /api/production/[submissionId]
 *
 * 本制作を開始するエンドポイント（社内・代表者向け）。
 *
 * 正しいワークフロー:
 *   customer_approved
 *     → pre_production_interview
 *     → pre_production_review
 *     → production_ready
 *     → delivered
 *
 * このエンドポイントは action=start_production を受け取ったとき、
 * customer_approved から「本制作前ヒアリング（pre_production_interview）」を
 * 開始する。production_ready への直接遷移は行わない（旧実装はここで
 * 無効遷移を試みて 500 になっていた）。
 *   - ヒアリングの起票は /api/consult/[submissionId]/interview と同じく
 *     startPreProductionInterview + デフォルト質問セットを使う。
 *   - 顧客回答後に審査（pre_production_review）を経て production_ready へ
 *     進めるのは別ルートの役割。
 *
 * 認証: ADMIN_SECRET（Bearer・定時間比較）。内部向けステータス変更なので必須。
 *
 * Body:
 *   - action: 'start_production'
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 文字列を定時間比較する（タイミング攻撃への緩和）。長さが違う場合は比較せず false を返す。 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 管理者認証を検証する。失敗時は 401 Response、成功時は null。 */
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

/** リクエストから公開用の絶対ベース URL（プロトコル + ホスト）を組み立てる */
function absoluteBaseUrl(request: Request): string {
  const headers = request.headers;
  const host =
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    "localhost:3000";
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  const { submissionId } = await params;

  // パストラバーサル対策
  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  // admin 認証（内部向けステータス変更なので必須）
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  // ボディ解析（action のみ使用）
  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // ボディが空でも後続の action 検証で弾く
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (action !== "start_production") {
    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  }

  // 現在のステータス確認
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) {
    return NextResponse.json(
      { ok: false, error: "Submission not found" },
      { status: 404 }
    );
  }

  if (pkg.status !== "customer_approved") {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid current status: ${pkg.status}. Expected: customer_approved`,
        status: pkg.status,
      },
      { status: 400 }
    );
  }

  // 本制作前ヒアリングを開始（customer_approved → pre_production_interview）。
  // 直接 production_ready へ遷移してはならない（ワークフロー上の無効遷移で 500 になる）。
  const questions = DEFAULT_INTERVIEW_QUESTIONS as readonly InterviewQuestion[];
  let result;
  try {
    result = await startPreProductionInterview(submissionId, [...questions], null);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ヒアリングの開始に失敗しました。",
      },
      { status: 400 }
    );
  }

  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Submission not found" },
      { status: 404 }
    );
  }

  const interviewUrl = `${absoluteBaseUrl(request)}/interview/${submissionId}`;
  console.log(`[Production] 本制作前ヒアリングを開始します: ${submissionId}`);
  console.log(`[Production] ステータス: ${result.status}`);

  return NextResponse.json({
    ok: true,
    submissionId,
    status: result.status,
    customerFacingStatus: result.customerFacingStatus,
    interviewUrl,
    message:
      "本制作前ヒアリングを開始しました。顧客の回答受領後に審査を経て production_ready へ進みます。",
  });
}
