import { timingSafeEqual } from "node:crypto";
import { readArtifact, writeArtifact } from "@/server/submission-storage";
import { sendCustomerFollowupEmail } from "@/server/mail";
import type { MailResult } from "@/server/mail/types";
import type { IntakeSupplementRequest } from "@/lib/approval-package";

/**
 * リクエストから公開用の絶対ベース URL（プロトコル + ホスト）を組み立てる。
 * - Vercel 本番: x-forwarded-proto / x-forwarded-host が設定される
 * - ローカル開発: host が localhost のときは http を使う
 */
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

/**
 * リクエスト body の items（構造化補足要求）を IntakeSupplementRequest に組み立てる。
 * key・guidance が揃っているものだけ残す（形式不正は空配列へ落ちる）。
 * メール本文では label・guidance・currentValue を項目別ブロックとして展開する。
 */
function coerceSupplementItems(
  raw: unknown,
  requestedAt: string
): IntakeSupplementRequest[] {
  if (!Array.isArray(raw)) return [];
  const out: IntakeSupplementRequest[] = [];
  for (const item of raw) {
    const o = asObject(item);
    const key = asString(o.key);
    const guidance = asString(o.guidance);
    if (key.length === 0 || guidance.length === 0) continue;
    const severity: "reject" | "supplement" =
      o.severity === "reject" || o.severity === "supplement"
        ? (o.severity as "reject" | "supplement")
        : "supplement";
    const currentValueRaw = asString(o.currentValue);
    out.push({
      key,
      label: asString(o.label) || key,
      severity,
      guidance,
      currentValue: currentValueRaw.length > 0 ? currentValueRaw : null,
      requestedAt,
      requestedBy: null,
    });
  }
  return out;
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
  /** 構造化補足要求（項目別 label/guidance/currentValue）。未指定時は空配列。 */
  supplementRequests: IntakeSupplementRequest[];
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
  let body: {
    selectedItems?: unknown;
    customMessage?: unknown;
    sendMail?: unknown;
    items?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "リクエストボディのパースに失敗しました" },
      { status: 400 }
    );
  }

  // 処理時刻。構造化補足要求の requestedAt と履歴 timestamp で共通に使う。
  const now = new Date().toISOString();

  const selectedItemsRaw = Array.isArray(body.selectedItems) ? body.selectedItems : [];
  const selectedItems: string[] = selectedItemsRaw
    .map((item) => asString(item))
    .filter((s) => s.length > 0);
  const customMessage = asString(body.customMessage);
  const sendMail = body.sendMail === true;
  // 構造化補足要求（項目別の label/guidance/currentValue）。指定時はメール本文で優先表示。
  const supplementRequests = coerceSupplementItems(body.items, now);

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
  const companyName =
    asString(payload.companyName) || asString(payload.enterpriseName);

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
      followupUrl: `${absoluteBaseUrl(request)}/review/${id}`,
      // 構造化補足要求があれば本文で項目別ブロックとして優先表示
      supplementRequests:
        supplementRequests.length > 0 ? supplementRequests : undefined,
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
    timestamp: now,
    type: "followup",
    selectedItems,
    customMessage,
    supplementRequests,
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
