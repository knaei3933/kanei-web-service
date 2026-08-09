import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  readApprovalPackage,
  startPreProductionInterview,
  completePreProductionInterview,
  type InterviewQuestion,
  type InterviewAnswer,
} from "@/lib/approval-package";
import { DEFAULT_INTERVIEW_QUESTIONS } from "@/lib/production-readiness";
import { readArtifact, isSafeSubmissionId } from "@/server/submission-storage";
import { sendCustomerPreProductionInterviewEmail } from "@/server/mail";
import type { MailResult } from "@/server/mail/types";

/* ------------------------------------------------------------------ */
/*  /api/consult/[submissionId]/interview （本制作前ヒアリング）         */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    顧客がデモを承認（customer_approved）したあとの「本制作前ヒアリング」*/
/*    を扱う。質問セットの起票（開始）と、顧客の回答受領を行う。          */
/*                                                                      */
/*  POST  — 代表者（admin）がヒアリングを起票・開始する。                 */
/*          customer_approved → pre_production_interview へ遷移。         */
/*          認証: ADMIN_SECRET（Bearer・定時間比較）。                    */
/*          顧客向けヒアリング依頼メールを送信する（sendMail=true の時）。*/
/*                                                                      */
/*  PATCH — 顧客がヒアリングに回答する（認証不要・submissionId が         */
/*          推測困難な UUID 相当であることを前提。demo feedback と同じ    */
/*          セキュリティモデル）。                                        */
/*          pre_production_interview → pre_production_review へ遷移。     */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 文字列を定時間比較する（タイミング攻撃への緩和）。長さが違う場合は比較せず false を返す。 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 管理者認証を検証する。失敗時は 401 Response、成功時は null。 */
function authorizeAdmin(request: Request): Response | null {
  const secret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const authorized =
    typeof secret === "string" && secret.length > 0 && token.length > 0
      ? safeEqual(token, secret)
      : false;
  if (!authorized) {
    return Response.json(
      { ok: false, error: "認証に失敗しました" },
      { status: 401 }
    );
  }
  return null;
}

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** リクエストから公開用の絶対ベース URL（プロトコル + ホスト）を組み立てる */
function absoluteBaseUrl(request: Request): string {
  const headers = request.headers;
  const host =
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    "localhost:3000";
  const isLocal =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

/** リクエストボディから質問セットを正規化する。不正時は null。 */
function normalizeQuestions(raw: unknown): InterviewQuestion[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: InterviewQuestion[] = [];
  for (const item of raw) {
    const o = asObject(item);
    const id = asString(o.id);
    const text = asString(o.text);
    if (!id || !text) return null;
    out.push({
      id,
      text,
      required: o.required === true,
      placeholder: typeof o.placeholder === "string" ? o.placeholder : undefined,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  POST — ヒアリング起票・開始（admin）                                */
/* ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    return Response.json(
      { ok: false, error: "無効な送信 ID です。" },
      { status: 400 }
    );
  }

  // admin 認証（起票は代表者のみ）
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  // ボディ解析（任意: questions / sendMail / decidedBy）
  let body: { questions?: unknown; sendMail?: unknown; decidedBy?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // ボディが空でもデフォルト質問で起票できるようにする
  }

  // 質問セット: 指定がなければデフォルトを使用
  const questions =
    body.questions !== undefined
      ? normalizeQuestions(body.questions)
      : (DEFAULT_INTERVIEW_QUESTIONS as readonly InterviewQuestion[]);

  if (!questions || questions.length === 0) {
    return Response.json(
      { ok: false, error: "ヒアリング質問セットが不正です。" },
      { status: 400 }
    );
  }

  const decidedBy = asString(body.decidedBy) || null;
  const sendMail = body.sendMail === true;

  // 起票前に現在のステータスを確認（より親切なエラーのため）
  const before = await readApprovalPackage(submissionId);
  if (!before) {
    return Response.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }

  let pkg;
  try {
    pkg = await startPreProductionInterview(
      submissionId,
      [...questions],
      decidedBy
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ヒアリングの開始に失敗しました。",
      },
      { status: 400 }
    );
  }
  if (!pkg) {
    return Response.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }

  // 顧客向けヒアリング依頼メール（任意）
  let mailResult: MailResult | null = null;
  const interviewUrl = `${absoluteBaseUrl(request)}/interview/${submissionId}`;
  if (sendMail) {
    const submissionRaw = await readArtifact(submissionId, "submission.json");
    const payload = submissionRaw
      ? asObject(JSON.parse(submissionRaw)).payload
      : null;
    const p = asObject(payload);
    const customerEmail = asString(p.email) || asString(p.contactEmail);
    const customerName = asString(p.name);
    const companyName = asString(p.companyName) || asString(p.enterpriseName);

    if (customerEmail.length > 0) {
      mailResult = await sendCustomerPreProductionInterviewEmail({
        to: customerEmail,
        customerName: customerName || undefined,
        companyName: companyName || undefined,
        submissionId,
        interviewUrl,
        questions: questions.map((q) => q.text),
      });
    } else {
      mailResult = {
        provider: "log",
        accepted: [],
        messageId: null,
        status: "error",
        error: "顧客メールアドレスがないため、ヒアリング依頼メールを送信しませんでした。",
      };
    }
  }

  return Response.json({
    ok: true,
    submissionId,
    status: pkg.status,
    customerFacingStatus: pkg.customerFacingStatus,
    interviewUrl,
    questions,
    mailResult,
  });
}

/* ------------------------------------------------------------------ */
/*  PATCH — 顧客のヒアリング回答（認証不要）                             */
/* ------------------------------------------------------------------ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  const { submissionId } = await params;

  if (!isSafeSubmissionId(submissionId)) {
    return Response.json(
      { ok: false, error: "無効な送信 ID です。" },
      { status: 400 }
    );
  }

  let body: { answers?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "リクエストボディの解析に失敗しました。" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return Response.json(
      { ok: false, error: "回答がありません。" },
      { status: 400 }
    );
  }

  const answers: InterviewAnswer[] = [];
  for (const item of body.answers) {
    const o = asObject(item);
    const questionId = asString(o.questionId);
    const text = asString(o.text);
    if (!questionId) {
      return Response.json(
        { ok: false, error: "回答に質問 ID がありません。" },
        { status: 400 }
      );
    }
    answers.push({ questionId, text });
  }

  // 既存の追加素材数を引き継ぐ（materials ルートが更新した値）
  const before = await readApprovalPackage(submissionId);
  if (!before) {
    return Response.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }
  const additionalMaterialCount =
    before.preProductionInterview?.additionalMaterialCount ?? 0;

  let pkg;
  try {
    pkg = await completePreProductionInterview(
      submissionId,
      answers,
      additionalMaterialCount
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "回答の受領に失敗しました。",
      },
      { status: 400 }
    );
  }
  if (!pkg) {
    return Response.json(
      { ok: false, error: "送信データが見つかりません。" },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    submissionId,
    status: pkg.status,
    customerFacingStatus: pkg.customerFacingStatus,
    answeredCount: answers.length,
  });
}
