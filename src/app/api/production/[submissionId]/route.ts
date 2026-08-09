import { NextRequest, NextResponse } from "next/server";
import { readApprovalPackage, transitionStatus } from "@/lib/approval-package";
import { isSafeSubmissionId } from "@/server/submission-storage";

/**
 * POST /api/production/[submissionId]
 *
 * 本制作を開始するエンドポイント。
 * customer_approved → production_ready へ遷移させる。
 *
 * 認証なし（submissionId が推測困難な UUID 相当であることを前提）。
 *
 * Body:
 *   - action: 'start_production'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;

  // パストラバーサル対策
  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body as { action: string };

    // バリデーション
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
        { ok: false, error: `Invalid current status: ${pkg.status}. Expected: customer_approved` },
        { status: 400 }
      );
    }

    // ステータス遷移
    const result = await transitionStatus(submissionId, "production_ready");
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Failed to transition status" },
        { status: 500 }
      );
    }

    // 社内通知メール（ダミー実装）
    console.log(`[Production] 本制作を開始します: ${submissionId}`);
    console.log(`[Production] ステータス: ${result.status}`);
    // TODO: sendProductionStartedEmail(submissionId, pkg);

    return NextResponse.json({
      ok: true,
      status: result.status,
      message: "本制作を開始します",
    });
  } catch (error) {
    console.error(`[Production] Error:`, error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
