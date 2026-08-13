import { NextRequest, NextResponse } from "next/server";
import { readApprovalPackage, transitionStatus } from "@/lib/approval-package";
import { writeArtifact } from "@/server/submission-storage";
import { isSafeSubmissionId } from "@/server/submission-storage";
import { sendDeliveredEmail } from "@/lib/demo-feedback-loop";

/**
 * POST /api/production/[submissionId]/deliver
 *
 * 納品処理を行うエンドポイント。
 * production_ready → delivered へ遷移させる。
 *
 * 認証なし（submissionId が推測困難な UUID 相当であることを前提）。
 *
 * Body:
 *   - action: 'deliver'
 *   - domain?: string (納品ドメイン・任意)
 *   - hostingOption?: 'self' | 'kanei' (ホスティング选项)
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
    const { action, domain, hostingOption } = body as {
      action: string;
      domain?: string;
      hostingOption?: "self" | "kanei";
    };

    // バリデーション
    if (action !== "deliver") {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    if (hostingOption && hostingOption !== "self" && hostingOption !== "kanei") {
      return NextResponse.json(
        { ok: false, error: "Invalid hostingOption" },
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

    if (pkg.status !== "production_ready") {
      return NextResponse.json(
        { ok: false, error: `Invalid current status: ${pkg.status}. Expected: production_ready` },
        { status: 400 }
      );
    }

    // ステータス遷移
    const result = await transitionStatus(submissionId, "delivered");
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Failed to transition status" },
        { status: 500 }
      );
    }

    // 納品情報の作成・保存
    const deliveredAt = new Date().toISOString();
    const deliveryInfo = {
      submissionId,
      deliveredAt,
      domain: domain ?? null,
      hostingOption: hostingOption ?? null,
      deliveryUrl: domain ? `https://${domain}` : null,
      packageVersion: "1.0.0",
    };

    try {
      await writeArtifact(
        submissionId,
        "delivery-info.json",
        JSON.stringify(deliveryInfo, null, 2)
      );
    } catch (error) {
      console.error(
        `[Production] Failed to save delivery info for ${submissionId}:`,
        error
      );
      // 保存失敗は致命的ではないので処理継続
    }

    // 社内通知メール（ダミー実装）
    console.log(`[Production] 納品完了: ${submissionId}`);
    console.log(`[Production] ステータス: ${result.status}`);
    console.log(`[Production] 納品情報:`, deliveryInfo);

    // 顧客向け納品確認メール（エラー時でも処理継続）
    try {
      await sendDeliveredEmail(submissionId, deliveryInfo);
      console.log(`[Production] 納品メール送信完了: ${submissionId}`);
    } catch (mailError) {
      console.error(
        `[Production] 納品メール送信エラー (${submissionId}):`,
        mailError
      );
      // メール送信失敗は致命的ではないので処理継続
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      deliveryInfo,
    });
  } catch (error) {
    console.error(`[Production] Error:`, error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
