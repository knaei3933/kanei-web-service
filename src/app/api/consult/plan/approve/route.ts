import { NextRequest, NextResponse } from "next/server";
import {
  approvePlan,
  executionHandoffPathFor,
  executionPromptPathFor,
} from "@/lib/approval-package";

// ファイルシステム（node:fs）で実行ハンドオフ成果物を書き出すため Node ランタイムを明示
export const runtime = "nodejs";
// 毎回ディスクへ書き込むため動的にする
export const dynamic = "force-dynamic";

/**
 * 第2ゲート（計画承認）の Route Handler。
 *
 * 代表者が計画アーティファクトを承認したときに呼ばれる。
 * 実行ハンドオフ成果物（execution-prompt.md / execution-handoff.json）を生成して
 * submission フォルダに書き出し、status を approved_for_execution へ進める。
 *
 * 【重要】ここでは Claude Code を実行しない。本番（Vercel/serverless）の
 * リクエストハンドラからは実行時間・実行環境の制約で実行できないため、
 * ローカルオペレータへ引き渡すための「実行ハンドオフ成果物」だけを生成する
 * （正直な実行ハンドオフ設計）。生成されたプロンプト/コマンドは内部専用。
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

  // 第2ゲート：代表者が計画を承認する。
  // 実行ハンドオフ成果物を生成して approved_for_execution へ進める。
  // Claude Code の実行は行わず、ローカルオペレータへのハンドオフ成果物だけを生成する。
  const updated = await approvePlan(submissionId, {
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
    // 実行ハンドオフが生成されたか
    executionHandoffGenerated: updated.executionHandoff !== null,
    // 実行ハンドオフ成果物の保存先（内部専用・社内確認用）
    executionHandoffPath: updated.executionHandoff
      ? executionHandoffPathFor(updated.submissionId)
      : null,
    executionPromptPath: updated.executionHandoff
      ? executionPromptPathFor(updated.submissionId)
      : null,
    nextRecommendedAction: "Generated execution handoff artifacts; ready for local operator",
  });
}
