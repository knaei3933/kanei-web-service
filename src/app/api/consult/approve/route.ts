import { NextRequest, NextResponse } from "next/server";
import {
  approveRepresentativeReview,
  planningArtifactPathFor,
} from "@/lib/approval-package";

// ファイルシステム（node:fs）で承認パッケージと計画アーティファクトを書き換えるため Node ランタイムを明示
export const runtime = "nodejs";
// 毎回ディスクへ書き込むため動的にする
export const dynamic = "force-dynamic";

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

  // 第1ゲート：代表者がインテイクを承認する。
  // OMC 計画アーティファクト（omc-plan.json）を生成し、status を
  // awaiting_plan_approval（第2ゲート：計画承認待ち）へ進める。
  const updated = await approveRepresentativeReview(submissionId, {
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
    approval: updated.approval,
    // 計画アーティファクトが生成されたか（第2ゲートの計画承認に進める）
    planningArtifactGenerated: updated.planningArtifact !== null,
    // 計画アーティファクトの保存先（社内確認用）
    planningArtifactPath: updated.planningArtifact
      ? planningArtifactPathFor(updated.submissionId)
      : null,
    nextRecommendedAction: "Generated OMC planning artifact; awaiting plan approval",
  });
}
