import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  readApprovalPackage,
  writeApprovalPackage,
  recordPreProductionApproval,
} from "@/lib/approval-package";
import { assessProductionReadiness } from "@/lib/production-readiness";
import { readDemoFeedbackHistory } from "@/lib/demo-feedback-loop";
import { readArtifact, writeArtifact } from "@/server/submission-storage";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions/[id]/pre-production/approve （第3ゲート）     */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    本制作前ヒアリング・再検証を経た案件について、代表者が「本制作を    */
/*    進めるか」を最終判断するゲート（第3ゲート）。                       */
/*                                                                      */
/*    - approve: pre_production_review → production_ready               */
/*    - reject : pre_production_review → pre_production_interview       */
/*               （回答をリセットして追加ヒアリングへ差し戻し）           */
/*                                                                      */
/*  再検証（assessProductionReadiness）は代表者の判断材料として実行し、   */
/*    結果を approval-package.json の productionReadiness と              */
/*    production-readiness.json にキャッシュする。                        */
/*    ※ needs_followup でも代表者の判断で承認は可能（hard block しない）。*/
/*                                                                      */
/*  認証: ADMIN_SECRET（Bearer・定時間比較）。                            */
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

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function POST(
  request: NextRequest,
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

  let body: { action?: unknown; memo?: unknown; decidedBy?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "リクエストボディの解析に失敗しました" },
      { status: 400 }
    );
  }

  const action = body.action === "approve" || body.action === "reject"
    ? (body.action as "approve" | "reject")
    : null;
  if (!action) {
    return Response.json(
      { ok: false, error: "action は approve または reject で指定してください" },
      { status: 400 }
    );
  }

  const memo = typeof body.memo === "string" ? body.memo : undefined;
  const decidedBy =
    typeof body.decidedBy === "string" ? body.decidedBy : undefined;

  const pkg = await readApprovalPackage(id);
  if (!pkg) {
    return Response.json(
      { ok: false, error: "submission が見つかりません" },
      { status: 404 }
    );
  }

  // ---- 再検証（assessProductionReadiness）----
  // 添付のベース件数 = 現在の総ファイル数 − ヒアリング中の追加素材数
  let totalFiles = 0;
  const submissionRaw = await readArtifact(id, "submission.json");
  if (submissionRaw) {
    try {
      const submission = JSON.parse(submissionRaw) as Record<string, unknown>;
      const files = Array.isArray(submission.files)
        ? (submission.files as unknown[])
        : [];
      totalFiles =
        typeof submission.fileCount === "number"
          ? submission.fileCount
          : files.length;
    } catch {
      // パース失敗時は 0 件扱い
    }
  }
  const additional = pkg.preProductionInterview?.additionalMaterialCount ?? 0;
  const baseAttachmentCount = Math.max(0, totalFiles - additional);

  const feedbackHistory = await readDemoFeedbackHistory(id);
  const readiness = assessProductionReadiness({
    pkg,
    feedbackHistory,
    attachmentCount: baseAttachmentCount,
  });

  // 評価結果をキャッシュ（pkg + 単独成果物）
  pkg.productionReadiness = readiness;
  try {
    await writeArtifact(
      id,
      "production-readiness.json",
      JSON.stringify(readiness, null, 2)
    );
    await writeApprovalPackage(pkg);
  } catch {
    // キャッシュ書き込み失敗でも遷移自体は進める
  }

  // ---- 第3ゲート遷移 ----
  let updated;
  try {
    updated = await recordPreProductionApproval(id, action, { memo, decidedBy });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "本制作前承認の処理に失敗しました",
      },
      { status: 400 }
    );
  }
  if (!updated) {
    return Response.json(
      { ok: false, error: "submission が見つかりません" },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    submissionId: updated.submissionId,
    status: updated.status,
    customerFacingStatus: updated.customerFacingStatus,
    action,
    productionReadiness: readiness,
    // 代表者への注意喚起: 承認したが準備度が要フォローのとき
    warning:
      action === "approve" && readiness.status === "needs_followup"
        ? "本制作準備度が「要フォロー」ですが承認しました。"
        : null,
  });
}
