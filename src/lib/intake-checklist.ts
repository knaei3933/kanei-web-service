/* ------------------------------------------------------------------ */
/*  インテイク品質チェックリスト + 十分性エビデンス（共有モジュール）     */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    顧客の相談ペイロードから「オペレータ向けの項目別チェックリスト」   */
/*    を決定論的に生成する。管理API（/api/admin/submissions/[id]）と     */
/*    内部レビュー画面（/review/[id]）の両方から使うことで、判定基準の   */
/*    二重管理を防ぐ。                                                  */
/*                                                                      */
/*    さらに「なぜこれで十分か／なぜ不十分か」を説明するエビデンス       */
/*    （buildIntakeEvidence）を提供する。各項目の実際の入力値を抜粋して   */
/*    証拠とし、必須の充足・不足・任意項目の有無を平易な日本語で返す。   */
/*                                                                      */
/*  純粋関数・決定論的（同じ入力 → 同じ出力）。LLM 不使用。              */
/* ------------------------------------------------------------------ */

import type { ConsultIntakeQuality } from "./consult-quality";

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
export type FieldLevel = "empty" | "weak" | "ok";

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
export interface ChecklistItem {
  key: string;
  label: string;
  status: FieldLevel;
  value: string;
  required: boolean;
  reason: string;
}

/** 戦略項目の定義（consult-quality.ts の4項目と同じ） */
const STRATEGY_FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  required: boolean; // true = 空白不可（必須）、false = 空白許容（任意）
}> = [
  { key: "targetCustomer", label: "ターゲット・理想のお客様", required: true },
  { key: "sellingPoints", label: "強み・差別化ポイント", required: true },
  { key: "mustIncludeInfo", label: "必ず掲載したい情報", required: true },
  { key: "desiredImage", label: "伝えたいイメージ", required: false },
];

/**
 * payload から品質チェックリストを生成する。
 * 管理API・レビュー画面の両方から呼ぶ、唯一の真実のソース。
 */
export function buildIntakeChecklist(
  payload: Record<string, unknown>
): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];

  // 戦略項目4件
  for (const field of STRATEGY_FIELDS) {
    const value = asString(payload[field.key]);
    const status = classifyField(value);
    let reason = "";
    if (status === "empty") {
      if (field.required) {
        reason = `必須項目です。空欄のままでは提案を作成できません。`;
      } else {
        reason = `任意項目です。未入力でも提案に進めます。`;
      }
    } else if (status === "weak") {
      if (field.required) {
        reason = `必須項目ですが、記入内容が短すぎるか無効です（${value.length}文字）。具体的に記入が必要です。`;
      } else {
        reason = `記入が短めです（${value.length}文字）。より具体的だと、より良い提案が作成できます。`;
      }
    } else {
      reason = `OK（${value.length}文字）`;
    }
    checklist.push({ key: field.key, label: field.label, status, value, required: field.required, reason });
  }

  // features 項目
  const features = asStringArray(payload.features);
  const featuresValue = features.join(", ");
  let featuresStatus: FieldLevel;
  let featuresReason: string;
  if (features.length === 0) {
    featuresStatus = "empty";
    featuresReason = "必須項目です。必要なページや機能が選択されていません。";
  } else if (features.length === 1) {
    featuresStatus = "weak";
    featuresReason = `選択が少なめです（1項目のみ）。必要な機能を確認してください。`;
  } else {
    featuresStatus = "ok";
    featuresReason = `OK（${features.length}項目選択）`;
  }
  checklist.push({
    key: "features",
    label: "必要ページ・機能",
    status: featuresStatus,
    value: featuresValue,
    required: true,
    reason: featuresReason,
  });

  return checklist;
}

/* ------------------------------------------------------------------ */
/*  十分性エビデンス（Why sufficient / Why not）                       */
/* ------------------------------------------------------------------ */

/** エビデンス1項目（チェックリスト項目に紐づく） */
export interface IntakeEvidenceItem {
  key: string;
  label: string;
  required: boolean;
  status: FieldLevel;
  /** 判定の証拠とした実際の入力値の抜粋（長すぎる場合は縮約） */
  valueExcerpt: string;
  /** この項目に対する平易な日本語の理由 */
  reason: string;
}

/** 任意（オプション）の補強項目の有無を表す行 */
export interface IntakeOptionalItem {
  key: string;
  label: string;
  present: boolean;
  valueExcerpt: string;
}

/** 十分性エビデンスのまとまり */
export interface IntakeEvidence {
  /** インテイク全体の判定（sufficient / insufficient） */
  verdict: "sufficient" | "insufficient";
  /** 判定の1文サマリ（画面上部に大きく出す用） */
  verdictSummary: string;
  /** 必須項目のエビデンス一覧（required=true のチェックリスト項目） */
  requiredItems: IntakeEvidenceItem[];
  /** 必須項目のうち充足（status=ok）の件数 */
  satisfiedRequiredCount: number;
  /** 必須項目のうち不足・薄弱（empty/weak）の件数 */
  gapRequiredCount: number;
  /** 任意項目（参考情報・素材等）の有無一覧 */
  optionalItems: IntakeOptionalItem[];
  /** 任意項目のうち入力ありの件数 */
  optionalPresentCount: number;
  /** 平易な日本語の根拠文（箇条書き）。なぜこの判定になったかを説明する */
  rationale: string[];
}

/** 文字列を証拠用の抜粋にする（空白正規化・過長なら縮約） */
function excerpt(value: string, max = 60): string {
  const v = value.replace(/\s+/g, " ").trim();
  if (v.length === 0) return "（未入力）";
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

/** FieldLevel を「充足かどうか」に読み替える（ok 以外は実質的な不足） */
function isSatisfied(status: FieldLevel): boolean {
  return status === "ok";
}

/**
 * payload + 品質評価から「なぜ十分か／なぜ不十分か」のエビデンスを構築する。
 * 純粋関数・決定論的。レビュー画面の「インテイク十分性の根拠」セクション用。
 *
 * 判定の主軸は ConsultIntakeQuality.status（ready / needs_followup）。
 * エビデンス（requiredItems）は buildIntakeChecklist の結果から組み立て、
 * 各項目の実際の入力値を抜粋して「なぜそう判断したか」の根拠を示す。
 */
export function buildIntakeEvidence(
  payload: Record<string, unknown>,
  intakeQuality: ConsultIntakeQuality
): IntakeEvidence {
  const checklist = buildIntakeChecklist(payload);
  const sufficient = intakeQuality.status === "ready";

  const requiredItems: IntakeEvidenceItem[] = checklist
    .filter((c) => c.required)
    .map((c) => ({
      key: c.key,
      label: c.label,
      required: true,
      status: c.status,
      valueExcerpt: excerpt(c.value),
      reason: c.reason,
    }));

  const satisfiedRequiredCount = requiredItems.filter((r) =>
    isSatisfied(r.status)
  ).length;
  const gapRequiredCount = requiredItems.length - satisfiedRequiredCount;

  // 任意項目（提案の質を上げるが必須ではない入力）の有無
  const optionalRows: Array<{ key: string; label: string; raw: unknown }> = [
    { key: "referenceSites", label: "参考サイト", raw: payload.referenceSites },
    { key: "assetsStatus", label: "準備済み素材の申告", raw: payload.assetsStatus },
    { key: "colorScheme", label: "配色イメージ", raw: payload.colorScheme },
    { key: "desiredImage", label: "伝えたいイメージ", raw: payload.desiredImage },
    { key: "budget", label: "予算目安", raw: payload.budget },
    { key: "timing", label: "公開希望時期", raw: payload.timing },
    { key: "message", label: "自由メッセージ", raw: payload.message },
    { key: "supplement", label: "不足素材の補充方針", raw: payload.supplement },
    { key: "allowEdit", label: "素材の編集・加工可否", raw: payload.allowEdit },
  ];

  const optionalItems: IntakeOptionalItem[] = optionalRows.map((o) => {
    let valueExcerpt = "（未入力）";
    let present = false;
    if (Array.isArray(o.raw)) {
      const arr = asStringArray(o.raw);
      present = arr.length > 0;
      valueExcerpt = present ? excerpt(arr.join("・")) : "（未入力）";
    } else {
      const s = asString(o.raw);
      present = s.length > 0;
      valueExcerpt = present ? excerpt(s) : "（未入力）";
    }
    return { key: o.key, label: o.label, present, valueExcerpt };
  });
  const optionalPresentCount = optionalItems.filter((o) => o.present).length;

  // 平易な根拠文を組み立てる
  const rationale: string[] = [];

  if (sufficient) {
    rationale.push(
      `必須項目 ${requiredItems.length} 件のうち ${satisfiedRequiredCount} 件が具体的に記入されており、提案作成に必要な情報が揃っていると判断しました。`
    );
    if (gapRequiredCount > 0) {
      const gaps = requiredItems
        .filter((r) => !isSatisfied(r.status))
        .map((r) => `「${r.label}」`)
        .join("・");
      rationale.push(
        `ただし ${gaps} はやや薄いため、提案の精度を上げるために適宜ヒアリングで補うことを想定してください。`
      );
    }
  } else {
    rationale.push(
      `必須項目 ${requiredItems.length} 件のうち ${gapRequiredCount} 件が未入力・あるいは具体性を欠いており、このままでは精度の高い提案を作れません。`
    );
    for (const r of requiredItems.filter((r) => !isSatisfied(r.status))) {
      rationale.push(
        `「${r.label}」: ${r.reason}（現在の入力: ${r.valueExcerpt}）`
      );
    }
  }

  if (optionalPresentCount === 0) {
    rationale.push(
      "参考サイト・素材・配色・予算等の任意項目は未入力です。これらは必須ではありませんが、揃うほど提案の方向性が確実になります。"
    );
  } else {
    const presentLabels = optionalItems
      .filter((o) => o.present)
      .map((o) => `「${o.label}」`)
      .join("・");
    rationale.push(
      `任意項目のうち ${presentLabels} の入力があり、これらは提案の解像度を上げる追加材料として活用できます。`
    );
  }

  // 品質評価自身の理由（スコア境界の補足等）があれば併記
  for (const r of intakeQuality.reasons) {
    if (r) rationale.push(`（品質評価メモ）${r}`);
  }

  const verdictSummary = sufficient
    ? "このインテイクは提案作成に十分な情報を持っています（進行可能）。"
    : "このインテイクは提案作成に必要な情報が不足しています（追加確認が必要）。";

  return {
    verdict: sufficient ? "sufficient" : "insufficient",
    verdictSummary,
    requiredItems,
    satisfiedRequiredCount,
    gapRequiredCount,
    optionalItems,
    optionalPresentCount,
    rationale,
  };
}
