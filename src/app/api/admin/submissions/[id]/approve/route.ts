import { timingSafeEqual } from "node:crypto";
import { readArtifact } from "@/server/submission-storage";
import { approveRepresentativeReview } from "@/lib/approval-package";
import { sendCustomerReviewAcknowledgementEmail } from "@/server/mail";
import type { MailResult } from "@/server/mail/types";

/* ------------------------------------------------------------------ */
/*  /api/admin/submissions/[id]/approve （管理者承認エンドポイント）      */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    管理者が相談内容を確認し、インテイクを承認するエンドポイント。      */
/*    全ての品質チェックリスト項目が "ok" の場合のみ承認を許可し、        */
/*    approval-package.json のステータスを awaiting_plan_approval に      */
/*    更新してお客様へ確認応答メールを送信する。                          */
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

/** unknown を安全に文字列配列として取り出す（空除去・重複排除） */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const s = asString(item);
    if (s.length === 0 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 戦略項目の充実度レベル */
type FieldLevel = "empty" | "weak" | "ok";

/** 戦略項目が「意味のある長さ」とみなす最小文字数（これ未満は薄い） */
const MIN_STRATEGY_LEN = 6;

/** 明らかにテスト/省略/無意味とみなす文字列（正規化して完全一致） */
const FILLER_EXACT: ReadonlySet<string> = new Set([
  "test", "testing", "testtest", "test1", "tst",
  "asdf", "asdfg", "asdfgh", "asdfasdf", "qwer", "qwert", "qwerty",
  "abc", "abcd", "abcde", "xyz", "xxx", "xxxx", "xxxxx",
  "aaa", "aaaa", "aaaaa", "aa", "bb", "cc", "dd",
  "111", "1111", "123", "1234", "12345", "0000", "000",
  "foo", "bar", "baz", "foobar", "hoge", "hogehoge", "piyo", "fuga",
  "dummy", "sample", "example", "temp", "tmp",
  "no", "none", "nothing", "n/a", "na", "null", "undefined",
  "-", "--", "---", "...", "…", ".",
  "テスト", "てすと", "てす", "ほげ", "ほげほげ", "ぴよ",
  "仮", "仮入力", "仮データ", "かり",
  "なし", "無し", "とくになし", "特になし", "特にない", "特にありません",
  "未定", "みてい", "未入力", "未", "不明", "ふめい",
  "わからない", "わからん", "わかんない", "しらない",
  "適当", "てきとう",
  "おまかせ", "お任せ", "任せる", "任せます", "おもうがまま", "おまかせします",
  "考え中", "考えちゅう", "おもいつかない", "思いつかない",
  "ない", "無", "空",
  "테스트", "없음", "미정", "모름", "잘모름", "잘모르겠습니다", "몰라",
  "상관없음", "아무거나", "아무", "대충", "그냥", "몰라요",
]);

/** 表示比較用の正規化（前後空白 + 小文字化） */
function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** 文字列がフィラー（テスト/省略/無意味）かどうか */
function isFiller(text: string): boolean {
  const norm = normalize(text);
  if (norm.length === 0) return false;
  if (FILLER_EXACT.has(norm)) return true;
  const tokens = norm
    .split(/[\s、。，,．.・\/|｜;；:：()（）\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return false;
  if (tokens.length <= 3) {
    const fillerCount = tokens.filter((t) => FILLER_EXACT.has(t)).length;
    if (fillerCount / tokens.length >= 0.6) return true;
  }
  return false;
}

/** 文字列から充実度を分類する */
function classifyField(text: string): FieldLevel {
  const value = asString(text);
  if (value.length === 0) return "empty";
  if (value.length < MIN_STRATEGY_LEN) return "weak";
  if (isFiller(value)) return "weak";
  return "ok";
}

/** 品質チェックリストの1項目 */
interface ChecklistItem {
  key: string;
  label: string;
  status: FieldLevel;
  value: string;
  required: boolean;
}

/** 戦略項目の定義（consult-quality.ts と同じ4項目） */
const STRATEGY_FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  required: boolean;  // true = 空白不可（必須）、false = 空白許容（任意）
}> = [
  { key: "targetCustomer", label: "ターゲット・理想のお客様", required: true },
  { key: "sellingPoints", label: "強み・差別化ポイント", required: true },
  { key: "mustIncludeInfo", label: "必ず掲載したい情報", required: true },
  { key: "desiredImage", label: "伝えたいイメージ", required: false },
];

/** payload から品質チェックリストを生成する */
function buildQualityChecklist(
  payload: Record<string, unknown>
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];

  // 戦略項目4件
  for (const field of STRATEGY_FIELDS) {
    const value = asString(payload[field.key]);
    const status = classifyField(value);
    checklist.push({ key: field.key, label: field.label, status, value, required: field.required });
  }

  // features 項目
  const features = asStringArray(payload.features);
  const featuresValue = features.join(", ");
  const featuresStatus: FieldLevel =
    features.length === 0 ? "empty" : features.length === 1 ? "weak" : "ok";
  checklist.push({
    key: "features",
    label: "必要ページ・機能",
    status: featuresStatus,
    value: featuresValue,
    required: true,
  });

  return checklist;
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
  let body: { memo?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { ok: false, error: "リクエストボディのパースに失敗しました" },
      { status: 400 }
    );
  }

  const memo = asString(body.memo);

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

  // approval-package.json の読み込みは approveRepresentativeReview 内で行われるため
  // ここでは読み込まない（品質チェックは submission.json の payload から判定）

  // 品質チェックリストを生成して全項目が ok か確認
  const payload = asObject(submission.payload);
  const qualityChecklist = buildQualityChecklist(payload);

  const incompleteItems = qualityChecklist
    .filter((item) => item.status !== "ok" && item.required)
    .map((item) => item.label);

  if (incompleteItems.length > 0) {
    return Response.json(
      {
        ok: false,
        error: `必須項目${incompleteItems.length}件が不足しています。follow-upメールを送信するか、不足項目を確認してください。`,
        incompleteItems,
      },
      { status: 400 }
    );
  }

  // 全項目 ok の場合: approveRepresentativeReview で OMC 計画アーティファクトを生成し、
  // ステータスを awaiting_plan_approval へ進める（brief + omc-plan.json も生成される）
  const updated = await approveRepresentativeReview(id, {
    memo: memo || undefined,
    decidedBy: "admin",
  });
  if (!updated) {
    return Response.json(
      { ok: false, error: "approval-package.json が見つかりません" },
      { status: 500 }
    );
  }

  // お客様へ確認応答メールを送信
  const customerEmail =
    asString(payload.email) || asString(payload.contactEmail);
  const customerName = asString(payload.name);
  const companyName = asString(payload.companyName);

  let mailResult: MailResult | null = null;
  if (customerEmail.length > 0) {
    mailResult = await sendCustomerReviewAcknowledgementEmail({
      to: customerEmail,
      customerName: customerName || undefined,
      companyName: companyName || undefined,
      submissionId: id,
    });
  }

  return Response.json({
    ok: true,
    submissionId: id,
    status: updated.status,
    planningArtifactGenerated: updated.planningArtifact !== null,
    mailResult,
  });
}
