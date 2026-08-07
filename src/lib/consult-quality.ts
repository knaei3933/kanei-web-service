/* ------------------------------------------------------------------ */
/*  相談インテイク品質評価（サーバー側・決定論的）                       */
/* ------------------------------------------------------------------ */
/*  /api/consult で受け取ったペイロードを機械的に審査し、               */
/*  「このまま提案作成に進めるか、それとも追加ヒアリングが必要か」を     */
/*  判定する。LLM は使わず、完全に決定論的（同じ入力 → 同じ出力）。       */
/*                                                                      */
/*  判定のねらい:                                                       */
/*    - 戦略項目（ターゲット / 強み / 必須情報 / イメージ）が            */
/*      空あるいは短すぎる・フィラーばかりのとき要フォロー              */
/*    - 必要ページ・機能がほぼ選ばれていないとき要フォロー              */
/*    - 上記で薄い上に参考サイトも素材も無い場合はより確実に要フォロー  */
/*                                                                      */
/*  評価結果は API レスポンス・社内通知メール・お客様フォローアップ      */
/*  メール・完了画面のそれぞれで使われる。                               */
/* ------------------------------------------------------------------ */

/** インテイク品質の総合ステータス */
export type ConsultIntakeStatus = "ready" | "needs_followup";

/** 評価オブジェクト（API レスポンスの consultQuality にそのまま載る） */
export interface ConsultIntakeQuality {
  /** ready: 提案生成へ進める / needs_followup: 追加ヒアリングが必要 */
  status: ConsultIntakeStatus;
  /** 0〜100 のスコア。高いほど情報が充実している */
  score: number;
  /** 減点理由（社内確認・デバッグ用。日本語） */
  reasons: string[];
  /** お客様にお願いする追加入力項目（フォローアップメール/UI 用） */
  requestedItems: string[];
  /** お客様への具体的な質問（フォローアップメール/UI 用） */
  followupQuestions: string[];
}

/* ------------------------------------------------------------------ */
/*  設定                                                                */
/* ------------------------------------------------------------------ */

/** 戦略項目が「意味のある長さ」とみなす最小文字数（これ未満は薄い） */
const MIN_STRATEGY_LEN = 6;

/** needs_followup に切り替わるスコアの閾値 */
const FOLLOWUP_THRESHOLD = 60;

/**
 * 戦略項目の定義。
 * label はお客様向け表示、question はフォローアップ時の質問文。
 */
const STRATEGY_FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  question: string;
}> = [
  {
    key: "targetCustomer",
    label: "ターゲット・理想のお客様",
    question:
      "どんな層のお客様に見てもらいたいか、年齢・性別・業種・地域などで具体的に教えてください。",
  },
  {
    key: "sellingPoints",
    label: "強み・差別化ポイント",
    question:
      "他社にはない、御社ならではの強みや差別化ポイントを教えてください。",
  },
  {
    key: "mustIncludeInfo",
    label: "必ずホームページに載せたい情報",
    question:
      "ホームページに必ず掲載したい情報（料金表・アクセス・施工事例・保有資格など）を教えてください。",
  },
  {
    key: "desiredImage",
    label: "伝えたいイメージ",
    question:
      "伝えたいイメージや雰囲気（例：清潔感、高級感、親しみやすさ、力強さ）を教えてください。",
  },
];

/**
 * 明らかにテスト/省略/無意味とみなす文字列（正規化して完全一致）。
 * 日本語・英語・韓国語の典型フィラーを幅広く押さえる。
 */
const FILLER_EXACT: ReadonlySet<string> = new Set([
  // 英語・記号
  "test", "testing", "testtest", "test1", "tst",
  "asdf", "asdfg", "asdfgh", "asdfasdf", "qwer", "qwert", "qwerty",
  "abc", "abcd", "abcde", "xyz", "xxx", "xxxx", "xxxxx",
  "aaa", "aaaa", "aaaaa", "aa", "bb", "cc", "dd",
  "111", "1111", "123", "1234", "12345", "0000", "000",
  "foo", "bar", "baz", "foobar", "hoge", "hogehoge", "piyo", "fuga",
  "dummy", "sample", "example", "temp", "tmp",
  "no", "none", "nothing", "n/a", "na", "null", "undefined",
  "-", "--", "---", "...", "…", ".",
  // 日本語（ひらがな・カタカナ・漢字）
  "テスト", "てすと", "てす", "ほげ", "ほげほげ", "ぴよ",
  "仮", "仮入力", "仮データ", "かり",
  "なし", "無し", "とくになし", "特になし", "特にない", "特にありません",
  "未定", "みてい", "未入力", "未", "不明", "ふめい",
  "わからない", "わからん", "わかんない", "しらない",
  "適当", "てきとう",
  "おまかせ", "お任せ", "任せる", "任せます", "おもうがまま", "おまかせします",
  "考え中", "考えちゅう", "おもいつかない", "思いつかない",
  "ない", "無", "空",
  // 韓国語（フィルター網を広げるため）
  "테스트", "없음", "미정", "모름", "잘모름", "잘모르겠습니다", "몰라",
  "상관없음", "아무거나", "아무", "대충", "그냥", "몰라요",
]);

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

/** 表示比較用の正規化（前後空白 + 小文字化） */
function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 文字列がフィラー（テスト/省略/無意味）かどうか。
 * - 完全一致: 正規化後が FILLER_EXACT に含まれる
 * - 支配的: 短いトークン列の大部分がフィラートークン
 */
function isFiller(text: string): boolean {
  const norm = normalize(text);
  if (norm.length === 0) return false; // 空は別ルートで扱う
  if (FILLER_EXACT.has(norm)) return true;

  // 句読点・記号で分割し、フィラートークンが支配的ならフィラー扱い
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

/** 戦略項目1件の充実度 */
type FieldLevel = "empty" | "weak" | "ok";

/** 文字列から充実度を分類する */
function classifyField(text: string): FieldLevel {
  const value = asString(text);
  if (value.length === 0) return "empty";
  if (value.length < MIN_STRATEGY_LEN) return "weak";
  if (isFiller(value)) return "weak";
  return "ok";
}

/* ------------------------------------------------------------------ */
/*  評価本体                                                            */
/* ------------------------------------------------------------------ */

/**
 * 相談ペイロードと添付ファイル数から、インテイク品質を評価する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。外部依存なし。
 *
 * @param payloadRaw  /api/consult が受け取った構造化ペイロード（JSON）
 * @param attachmentCount  実際に保存できた添付ファイル数
 */
export function assessConsultIntake(
  payloadRaw: unknown,
  attachmentCount: number
): ConsultIntakeQuality {
  const payload =
    payloadRaw !== null &&
    typeof payloadRaw === "object" &&
    !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  let score = 100;
  const reasons: string[] = [];
  const requestedItems: string[] = [];
  const followupQuestions: string[] = [];

  let weakFieldCount = 0;

  /* ---- 戦略項目（4項目）の審査 ---- */
  for (const field of STRATEGY_FIELDS) {
    const level = classifyField(asString(payload[field.key]));
    if (level === "ok") continue;

    weakFieldCount += 1;

    if (level === "empty") {
      score -= 24;
      reasons.push(`「${field.label}」が未入力です。`);
      requestedItems.push(`「${field.label}」のご入力`);
      followupQuestions.push(field.question);
    } else {
      // weak（短すぎる / フィラー）
      score -= 12;
      reasons.push(`「${field.label}」の記入が具体的ではありません。`);
      requestedItems.push(`「${field.label}」をもう少し具体的に`);
      followupQuestions.push(field.question);
    }
  }

  /* ---- 必要ページ・機能の選択数 ---- */
  const features = asStringArray(payload.features);
  if (features.length === 0) {
    score -= 18;
    weakFieldCount += 1;
    reasons.push("必要なページ・機能が選択されていません。");
    requestedItems.push("ご希望のページ・機能の選択");
    followupQuestions.push(
      "ご希望のページや機能（お問い合わせフォーム・料金表・実績ギャラリーなど）を教えてください。"
    );
  } else if (features.length === 1) {
    score -= 6;
    reasons.push("選択されたページ・機能が少なめです。");
  }

  /* ---- 参考サイトの実質数（URL があるものを数える） ---- */
  const referenceCount = asStringArray(
    Array.isArray(payload.referenceSites)
      ? (payload.referenceSites as Array<unknown>)
          .map((site) =>
            site !== null &&
            typeof site === "object" &&
            !Array.isArray(site)
              ? (site as Record<string, unknown>).url
              : ""
          )
      : []
  ).filter((url) => /^https?:\/\//i.test(url)).length;

  /* ---- スコアを 0〜100 に収める ---- */
  score = Math.max(0, Math.min(100, Math.round(score)));

  /* ---- ステータス判定 ---- */
  let status: ConsultIntakeStatus = score >= FOLLOWUP_THRESHOLD ? "ready" : "needs_followup";

  // スコアが境界付近のとき、複数項目が薄く参考/素材も無ければ要フォローに倒す
  if (
    status === "ready" &&
    weakFieldCount >= 2 &&
    referenceCount === 0 &&
    attachmentCount === 0 &&
    score < 75
  ) {
    status = "needs_followup";
    reasons.push(
      "複数の項目が薄く、参考サイト・素材もないため、自動提案には情報が不足しています。"
    );
  }

  // ready であっても軽微な減点理由はそのまま返す（参考情報）
  return {
    status,
    score,
    reasons,
    requestedItems,
    followupQuestions,
  };
}
