/* ------------------------------------------------------------------ */
/*  デモステータス GET API                                              */
/* ------------------------------------------------------------------ */
/*  デモの現在ステータスとフィードバック履歴を返す。                       */
/*  GET /api/demo/[submissionId]/status                                 */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { readApprovalPackage } from "@/lib/approval-package";
import { isSafeSubmissionId } from "@/server/submission-storage";
import { readDemoFeedbackHistory } from "@/lib/demo-feedback-loop";
import type { DemoFeedbackHistory } from "@/lib/demo-feedback-loop";

/**
 * レスポンス型
 */
interface DemoStatusResponse {
  ok: boolean;
  status: string | null;
  customerFacingStatus: string | null;
  feedbackHistory: Array<{
    round: number;
    rating: number;
    comment: string;
    submittedAt: string;
  }>;
  currentRound: number;
  error?: string;
}

/**
 * GET /api/demo/[submissionId]/status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;

  // submissionId のバリデーション
  if (!isSafeSubmissionId(submissionId)) {
    return NextResponse.json<DemoStatusResponse>(
      {
        ok: false,
        status: null,
        customerFacingStatus: null,
        feedbackHistory: [],
        currentRound: 0,
        error: "不正な submissionId です",
      },
      { status: 400 }
    );
  }

  try {
    // approval-package.json から現在の status を取得
    const approvalPackage = await readApprovalPackage(submissionId);

    if (!approvalPackage) {
      return NextResponse.json<DemoStatusResponse>(
        {
          ok: false,
          status: null,
          customerFacingStatus: null,
          feedbackHistory: [],
          currentRound: 0,
          error: "承認パッケージが見つかりません",
        },
        { status: 404 }
      );
    }

    // demo-feedback.json があれば読み込む
    const feedbackHistoryData = await readDemoFeedbackHistory(submissionId);

    // フィードバック履歴をレスポンス用に整形
    const feedbackHistory = feedbackHistoryData
      ? feedbackHistoryData.history.map((entry) => ({
          round: entry.round,
          rating: entry.feedback.rating,
          comment: entry.feedback.comment,
          submittedAt: entry.submittedAt,
        }))
      : [];

    // 現在のラウンド数（フィードバック回数 + 1、0回なら0）
    const currentRound = feedbackHistoryData
      ? Math.max(0, feedbackHistoryData.history.length)
      : 0;

    return NextResponse.json<DemoStatusResponse>({
      ok: true,
      status: approvalPackage.status,
      customerFacingStatus: approvalPackage.customerFacingStatus,
      feedbackHistory,
      currentRound,
    });
  } catch (error) {
    console.error("[demo status API] error:", error);
    return NextResponse.json<DemoStatusResponse>(
      {
        ok: false,
        status: null,
        customerFacingStatus: null,
        feedbackHistory: [],
        currentRound: 0,
        error:
          error instanceof Error
            ? error.message
            : "予期せぬエラーが発生しました",
      },
      { status: 500 }
    );
  }
}

// 動的レンダリングを指定
export const dynamic = "force-dynamic";
