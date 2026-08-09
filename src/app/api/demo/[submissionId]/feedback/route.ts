import { NextRequest, NextResponse } from "next/server";
import { transitionStatus } from "@/lib/approval-package";
import { writeArtifact } from "@/server/submission-storage";
import { isSafeSubmissionId } from "@/server/submission-storage";

/**
 * POST /api/demo/[submissionId]/feedback
 *
 * デモフィードバックを受け付けるエンドポイント。
 * 認証なし（submissionId が推測困難な UUID 相当であることを前提）。
 *
 * Body:
 *   - action: 'approve' | 'revision'
 *   - rating: number (1-5)
 *   - comment: string
 *   - sections?: string[] (revision時の修正対象セクション・将来的に使用可能)
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
    const { action, rating, comment, sections } = body as {
      action: "approve" | "revision";
      rating: number;
      comment: string;
      sections?: string[];
    };

    // バリデーション
    if (action !== "approve" && action !== "revision") {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { ok: false, error: "Invalid rating" },
        { status: 400 }
      );
    }

    if (typeof comment !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid comment" },
        { status: 400 }
      );
    }

    const feedbackData = {
      action,
      rating,
      comment,
      sections: sections ?? [],
      submittedAt: new Date().toISOString(),
    };

    let newStatus: string;
    let feedbackSaved = false;

    if (action === "approve") {
      // 承認: demo_deployed/demo_revised → customer_approved
      const result = await transitionStatus(submissionId, "customer_approved");
      if (!result) {
        return NextResponse.json(
          { ok: false, error: "Submission not found or invalid transition" },
          { status: 404 }
        );
      }
      newStatus = result.status;

      // メール送信（ダミー実装）
      console.log(
        `[Demo Feedback] Customer approved demo for ${submissionId}`
      );
      console.log(`[Demo Feedback] Rating: ${rating}/5, Comment: ${comment}`);
      // TODO: sendCustomerDemoApprovedEmail(submissionId, feedbackData);
    } else {
      // 修正要望: demo_deployed/demo_revised → demo_revision_ready
      const result = await transitionStatus(
        submissionId,
        "demo_revision_ready"
      );
      if (!result) {
        return NextResponse.json(
          { ok: false, error: "Submission not found or invalid transition" },
          { status: 404 }
        );
      }
      newStatus = result.status;

      // フィードバックを保存
      try {
        await writeArtifact(
          submissionId,
          "demo-feedback.json",
          JSON.stringify(feedbackData, null, 2)
        );
        feedbackSaved = true;
      } catch (error) {
        console.error(
          `[Demo Feedback] Failed to save feedback for ${submissionId}:`,
          error
        );
        // フィードバック保存失敗は致命的ではないので処理継続
      }

      // メール送信（ダミー実装）
      console.log(
        `[Demo Feedback] Customer requested revision for ${submissionId}`
      );
      console.log(`[Demo Feedback] Rating: ${rating}/5, Comment: ${comment}`);
      if (sections && sections.length > 0) {
        console.log(`[Demo Feedback] Sections to revise:`, sections);
      }
      // TODO: sendCustomerFeedbackReceivedEmail(submissionId, feedbackData);
    }

    return NextResponse.json({
      ok: true,
      newStatus,
      feedbackSaved,
    });
  } catch (error) {
    console.error(`[Demo Feedback] Error processing feedback:`, error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
