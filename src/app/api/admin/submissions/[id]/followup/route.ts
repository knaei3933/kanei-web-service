import { timingSafeEqual } from "node:crypto";
import { readArtifact, writeArtifact } from "@/server/submission-storage";
import { sendCustomerFollowupEmail } from "@/server/mail";
import type { MailResult } from "@/server/mail/types";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions/[id]/followup （フォローアップメール送信）    */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が選択した項目について、お客様へフォローアップメールを        */
/*    送信するエンドポイント。approval-package.json のステータスを       */
/*    needs_followup に更新し、followupHistory に履歴を追記する。        */
/*                                                                      */
/*  認証:                                                              */
/*    Authorization: Bearer *** を定時間比較で検証。         */
/*    ADMIN_SECRET 未設定・不一致時は 401（構造化 JSON）。              */
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

/** 戦略項目の定義（consult-quality.ts の label → question マッピング） */
const STRATEGY_FIELD_MAP: ReadonlyArray<{
  label: string;
  question: string;
}> = [
  {
    label: "ターゲット・理想のお客様",
    question:
      "どんな層のお客様に見てもらいたいか、年齢・性別・業種・地域などで具体的に教えてください。",
  },
  {
    label: "強み・差別化ポイント",
    question:
      "他社にはない、御社ならではの強みや差別化ポイントを教えてください。",
  },
  {
    label: "必ず掲載したい情報",
    question:
      "ホームページに必ず掲載したい情報（料金表・アクセス・施工事例・保有資格など）を教えてください。",
  },
  {
    label: "伝えたいイメージ",
    question:
      "伝えたいイメージや雰囲気（例：清潔感、高級感、親しみやすさ、力強さ）を教えてください。",
  },
];

/** フォローアップ履歴の1件 */
interface FollowupHistoryEntry {
  timestamp: string;
  type: "followup";
  selectedItems: string[];
  customMessage: string;
  mailResult: MailResult | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = authorizeAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  if (!id || id.length === 0) {
    return Response.json(
      { ok: false, error: "submission id が必要です" },
      { status: 400 }
    );
  }

  // リクエストボディをパース
  let body: { selectedItems?: unknown; customMessage?: unknown; sendMail?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "リクエストボディのパースに失敗しました" },
      { status: 400 }
    );
  }

  const selectedItemsRaw = Array.isArray(body.selectedItems) ? body.selectedItems : [];
  const selectedItems: string[] = selectedItemsRaw
    .map((item) => asString(item))
    .filter((s) => s.length > 0);
  const customMessage = asString(body.customMessage);
  const sendMail = body.sendMail === true;

  // submission.json を読み込み
  const submissionRaw = await readArtifact(id, "submission.json");
  if (submissionRaw === null) {
    return Response.json(
      { ok: false, error: "submission が見つかりません" },
      { status: 404 }
    );
  }

  let submission: Record<string, unknown> = {};
  try {
    submission = JSON.parse(submissionRaw) as Record<string, unknown>;
  } catch {
    return Response.json(
      { ok: false, error: "submission.json のパースに失敗しました" },
      { status: 500 }
    );
  }

  const payload = asObject(submission.payload);
  const customerEmail =
    asString(payload.email) || asString(payload.contactEmail);
  const customerName = asString(payload.name);
  const companyName = asString(payload.companyName);

  // selectedItems のラベルから followupQuestions を構築
  const followupQuestions: string[] = [];
  for (const selectedItem of selectedItems) {
    const match = STRATEGY_FIELD_MAP.find((f) => f.label === selectedItem);
    if (match) {
      followupQuestions.push(match.question);
    }
  }

  // customMessage があれば followupQuestions に追加
  if (customMessage.length > 0) {
    followupQuestions.push(customMessage);
  }

  // メール送信
  let mailResult: MailResult | null = null;
  if (sendMail && customerEmail.length > 0) {
    mailResult = await sendCustomerFollowupEmail({
      to: customerEmail,
      customerName: customerName || undefined,
      companyName: companyName || undefined,
      submissionId: id,
      requestedItems: selectedItems,
      followupQuestions,
    });
  }

  // approval-package.json を読み込み・更新
  const approvalRaw = await readArtifact(id, "approval-package.json");
  let approvalPackage: Record<string, unknown> = {};
  if (approvalRaw !== null) {
    try {
      approvalPackage = JSON.parse(approvalRaw) as Record<string, unknown>;
    } catch {
      approvalPackage = {};
    }
  }

  // ステータスを needs_followup に更新
  approvalPackage.status = "needs_followup";

  // followupHistory に追記
  const historyEntry: FollowupHistoryEntry = {
    timestamp: new Date().toISOString(),
    type: "followup",
    selectedItems,
    customMessage,
    mailResult,
  };
  const existingHistory = Array.isArray(approvalPackage.followupHistory)
    ? (approvalPackage.followupHistory as unknown[])
    : [];
  approvalPackage.followupHistory = [...existingHistory, historyEntry];

  // 保存
  try {
    await writeArtifact(id, "approval-package.json", JSON.stringify(approvalPackage, null, 2));
  } catch {
    return Response.json(
      { ok: false, error: "approval-package.json の保存に失敗しました" },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    mailResult,
    updatedStatus: "needs_followup",
  });
}
