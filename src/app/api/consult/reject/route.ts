import { NextRequest, NextResponse } from "next/server";
import {
  rejectRepresentativeReview,
  requestSupplements,
  type IntakeSupplementInput,
} from "@/lib/approval-package";

// ファイルシステム（node:fs）で承認パッケージを書き換えるため Node ランタイムを明示
export const runtime = "nodejs";
// 毎回ディスクへ書き込むため動的にする
export const dynamic = "force-dynamic";

/**
 * 受け取った body から「項目別補足要求」を安全に取り出す。
 * JSON なら items 配列を直接、form 送信なら itemsJson（JSON 文字列）を読む。
 * 形式が不正なときは空配列（= 従来通りの単一メモ却下）へ落ちる。
 */
function coerceItems(raw: unknown): IntakeSupplementInput[] {
  if (!Array.isArray(raw)) return [];
  const out: IntakeSupplementInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    const guidance = typeof o.guidance === "string" ? o.guidance.trim() : "";
    if (key.length === 0 || guidance.length === 0) continue;
    const severity =
      o.severity === "reject" || o.severity === "supplement"
        ? (o.severity as "reject" | "supplement")
        : "supplement";
    out.push({
      key,
      guidance,
      severity,
      label: typeof o.label === "string" ? o.label : undefined,
      currentValue:
        typeof o.currentValue === "string" ? o.currentValue : undefined,
    });
  }
  return out;
}

async function parseBody(request: NextRequest): Promise<{
  submissionId: string;
  memo?: string;
  approvedBy?: string;
  redirectTo?: string;
  items: IntakeSupplementInput[];
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return {
      submissionId:
        typeof body.submissionId === "string" ? body.submissionId : "",
      memo: typeof body.memo === "string" ? body.memo : undefined,
      approvedBy:
        typeof body.approvedBy === "string" ? body.approvedBy : undefined,
      redirectTo:
        typeof body.redirectTo === "string" ? body.redirectTo : undefined,
      items: coerceItems(body.items),
    };
  }

  const form = await request.formData();
  const itemsJsonRaw = form.get("itemsJson");
  const itemsJson =
    typeof itemsJsonRaw === "string" ? itemsJsonRaw : "";
  let parsedItems: unknown = null;
  if (itemsJson.length > 0) {
    try {
      parsedItems = JSON.parse(itemsJson);
    } catch {
      parsedItems = null;
    }
  }
  return {
    submissionId:
      typeof form.get("submissionId") === "string"
        ? String(form.get("submissionId"))
        : "",
    memo:
      typeof form.get("memo") === "string" ? String(form.get("memo")) : undefined,
    approvedBy:
      typeof form.get("approvedBy") === "string"
        ? String(form.get("approvedBy"))
        : undefined,
    redirectTo:
      typeof form.get("redirectTo") === "string"
        ? String(form.get("redirectTo"))
        : undefined,
    items: coerceItems(parsedItems),
  };
}

export async function POST(request: NextRequest) {
  const { submissionId, memo, approvedBy, redirectTo, items } =
    await parseBody(request);

  if (!submissionId) {
    return NextResponse.json(
      { ok: false, error: "submissionId is required" },
      { status: 400 }
    );
  }

  // 第1ゲート却下（構造化）:
  //   items が1件でもあれば → requestSupplements で項目別差戻し（needs_followup）
  //   items が空なら        → 従来互換: 単一メモで rejected
  const updated =
    items.length > 0
      ? await requestSupplements(submissionId, items, {
          memo,
          decidedBy: approvedBy,
        })
      : await rejectRepresentativeReview(submissionId, {
          memo,
          decidedBy: approvedBy,
        });

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "approval package not found" },
      { status: 404 }
    );
  }

  if (redirectTo && redirectTo.startsWith("/")) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303);
  }

  // items あり（差戻し）のときは、顧客が次に何をすべきかを明示して返す
  const hasSupplements = items.length > 0;
  return NextResponse.json({
    ok: true,
    submissionId: updated.submissionId,
    status: updated.status,
    customerFacingStatus: updated.customerFacingStatus,
    approval: updated.approval,
    supplementRequests: updated.supplementRequests,
    nextRecommendedAction: hasSupplements
      ? "Customer should revise the flagged intake items"
      : "Send hold/revision instructions internally",
  });
}
