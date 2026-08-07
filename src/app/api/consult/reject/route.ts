import { NextRequest, NextResponse } from "next/server";
import { updateApprovalPackageDecision } from "@/lib/approval-package";

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

  const updated = await updateApprovalPackageDecision(submissionId, "reject", {
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
    nextRecommendedAction: "Send hold/revision instructions internally",
  });
}
