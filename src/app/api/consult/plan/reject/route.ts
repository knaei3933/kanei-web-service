import { NextRequest, NextResponse } from "next/server";
import { rejectPlan } from "@/lib/approval-package";

// ファイルシステム（node:fs）で承認パッケージを書き換えるため Node ランタイムを明示
export const runtime = "nodejs";
// 毎回ディスクへ書き込むため動的にする
export const dynamic = "force-dynamic";

/**
 * 第2ゲート（計画承認）の差し戻し Route Handler。
 *
 * 代表者が計画を差し戻したときに呼ばれる。
 * 計画アーティファクト・実行ハンドオフを取り下げ、status を
 * awaiting_representative_approval に戻す。
 * 代表者が再承認すれば新しい計画が再生成される（再計画ループ）。
 */

async function parseBody(request: NextRequest): Promise<{
  submissionId: string;
  memo?: string;
  approvedBy?: string;
  redirectTo?: string;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      submissionId: typeof body.submissionId === "string" ? body.submissionId : "",
      memo: typeof body.memo === "string" ? body.memo : undefined,
      approvedBy: typeof body.approvedBy === "string" ? body.approvedBy : undefined,
      redirectTo: typeof body.redirectTo === "string" ? body.redirectTo : undefined,
    };
  }

  const form = await request.formData();
  return {
    submissionId: typeof form.get("submissionId") === "string" ? String(form.get("submissionId")) : "",
    memo: typeof form.get("memo") === "string" ? String(form.get("memo")) : undefined,
    approvedBy: typeof form.get("approvedBy") === "string" ? String(form.get("approvedBy")) : undefined,
    redirectTo: typeof form.get("redirectTo") === "string" ? String(form.get("redirectTo")) : undefined,
  };
}

export async function POST(request: NextRequest) {
  const { submissionId, memo, approvedBy, redirectTo } = await parseBody(request);

  if (!submissionId) {
    return NextResponse.json({ ok: false, error: "submissionId is required" }, { status: 400 });
  }

  // 第2ゲート差し戻し：計画を取り下げて代表確認待ちに戻す。
  const updated = await rejectPlan(submissionId, {
    memo,
    decidedBy: approvedBy,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "approval package not found" }, { status: 404 });
  }

  if (redirectTo && redirectTo.startsWith("/")) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  return NextResponse.json({
    ok: true,
    submissionId: updated.submissionId,
    status: updated.status,
    customerFacingStatus: updated.customerFacingStatus,
    planApproval: updated.planApproval,
    nextRecommendedAction: "Plan sent back; awaiting representative re-approval",
  });
}
