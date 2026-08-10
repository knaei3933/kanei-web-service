import { NextRequest, NextResponse } from "next/server";
import { transitionStatus } from "@/lib/approval-package";
import {
  buildRevisionHandoff,
  appendDemoFeedback,
  type DemoFeedbackData,
} from "@/lib/demo-feedback-loop";
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
 *   - sections?: Array<{ sectionId: string; sectionName: string; feedback: string }>
 *   - referenceImages?: string[]
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
    const { action, rating, comment, sections, referenceImages } = body as {
      action: "approve" | "revision";
      rating: number;
      comment: string;
      sections?: Array<{
        sectionId: string;
        sectionName: string;
        feedback: string;
      }>;
      referenceImages?: string[];
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

    const normalizedSections = Array.isArray(sections)
      ? sections
          .filter(
            (section): section is { sectionId: string; sectionName: string; feedback: string } =>
              !!section &&
              typeof section.sectionId === "string" &&
              typeof section.sectionName === "string" &&
              typeof section.feedback === "string"
          )
          .map((section) => ({
            sectionId: section.sectionId.trim(),
            sectionName: section.sectionName.trim(),
            feedback: section.feedback.trim(),
          }))
          .filter((section) => section.sectionId && section.sectionName)
      : [];

    const normalizedReferenceImages = Array.isArray(referenceImages)
      ? referenceImages
          .filter((url): url is string => typeof url === "string")
          .map((url) => url.trim())
          .filter((url) => url.length > 0)
      : [];

    const submittedAt = new Date().toISOString();
    // demo-feedback-loop が扱う履歴データの形に正規化（action は含めない）
    const feedbackData: DemoFeedbackData = {
      rating,
      comment: comment.trim(),
      sections: normalizedSections,
      referenceImages: normalizedReferenceImages,
      submittedAt,
    };

    let newStatus: string;
    let feedbackSaved = false;
    let revisionRound: number | null = null;

    if (action === "approve") {
      // 承認: demo_deployed/demo_revised → customer_approved
      // （このあと admin が本制作前ヒアリングを起票して pre_production_interview へ進める）
      const result = await transitionStatus(submissionId, "customer_approved");
      if (!result) {
        return NextResponse.json(
          { ok: false, error: "Submission not found or invalid transition" },
          { status: 404 }
        );
      }
      newStatus = result.status;

      console.log(
        `[Demo Feedback] Customer approved demo for ${submissionId}`
      );
      console.log(`[Demo Feedback] Rating: ${rating}/5, Comment: ${comment}`);
      // 承認時は個別の完了通知メールは送らない（デモ完成通知は /deployed コールバックで送信済み）。
      // 次の導線は admin からの本制作前ヒアリングご依頼メール。
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

      // revision-handoff.json を生成（外部 handoff-watch がこれを見て修正版を生成する）。
      // ラウンド番号は履歴件数 + 1 で決まるので、append より先に呼ぶこと。
      try {
        const handoff = await buildRevisionHandoff(submissionId, feedbackData);
        revisionRound = handoff.round;
        // demo-feedback.json の履歴に追記（handoff.round と一致させる）
        await appendDemoFeedback(submissionId, feedbackData, handoff.round);
        feedbackSaved = true;
      } catch (error) {
        console.error(
          `[Demo Feedback] Failed to save revision handoff/feedback for ${submissionId}:`,
          error
        );
        // 成果物保存失敗は致命的ではないので処理継続（ステータス遷移は成功している）
      }

      console.log(
        `[Demo Feedback] Customer requested revision for ${submissionId}`
      );
      console.log(`[Demo Feedback] Rating: ${rating}/5, Comment: ${comment}`);
      if (revisionRound) {
        console.log(`[Demo Feedback] Revision round: ${revisionRound}`);
      }
      if (sections && sections.length > 0) {
        console.log(`[Demo Feedback] Sections to revise:`, sections);
      }
    }

    return NextResponse.json({
      ok: true,
      newStatus,
      feedbackSaved,
      revisionRound,
    });
  } catch (error) {
    console.error(`[Demo Feedback] Error processing feedback:`, error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
