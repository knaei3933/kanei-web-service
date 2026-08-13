import { timingSafeEqual } from "node:crypto";
import { approvePlan } from "@/lib/approval-package";
import {
  executionHandoffPathFor,
  executionPromptPathFor,
} from "@/lib/approval-package";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions/[id]/approve-plan （計画承認エンドポイント） */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が第2ゲート（計画承認）を行うエンドポイント。                 */
/*    実行ハンドオフ成果物を生成し、status を approved_for_execution    */
/*    へ進める。                                                        */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer *** を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401（構造化 JSON）。              */
/* ------------------------------------------------------------------ */

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  if (!id || id.length === 0) {
    return Response.json(
      { ok: false, error: "submission id が必要です" },
      { status: 400 }
    );
  }

  let body: { memo?: unknown };
  try {
    body = (await request.json()) as { memo?: unknown };
  } catch {
    body = {};
  }
  const memo = typeof body.memo === "string" ? body.memo.trim() : "";

  // 第2ゲート：計画を承認し、実行ハンドオフ成果物を生成
  const updated = await approvePlan(id, {
    memo: memo || undefined,
    decidedBy: "admin",
  });

  if (!updated) {
    return Response.json(
      { ok: false, error: "approval-package.json が見つかりません" },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    submissionId: updated.submissionId,
    status: updated.status,
    customerFacingStatus: updated.customerFacingStatus,
    planApproval: updated.planApproval,
    executionHandoffGenerated: updated.executionHandoff !== null,
    executionHandoffPath: updated.executionHandoff
      ? executionHandoffPathFor(updated.submissionId)
      : null,
    executionPromptPath: updated.executionHandoff
      ? executionPromptPathFor(updated.submissionId)
      : null,
  });
}
