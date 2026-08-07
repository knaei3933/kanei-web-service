/* ------------------------------------------------------------------ */
/*  Draft preview（URL 埋め込み型の初稿プレビュー）                       */
/* ------------------------------------------------------------------ */
/*  相談送信データから、お客様別の「初稿ホームページ」をその場で描画する   */
/*  ための最小ペイロード。                                              */
/*                                                                    */
/*  ディスク（submission.json / brief.json）には依存しない。本番は        */
/*  serverless でファイルが読めないため、ドラフト描画に必要な情報は        */
/*  すべて URL のクエリ（?d=<base64url>）に安全に埋め込む。              */
/*                                                                    */
/*  新しい npm 依存は追加しない。Node 標準の Buffer だけで             */
/*  UTF-8 ↔ base64url のエンコード/デコードを行う。                      */
/* ------------------------------------------------------------------ */

/** ドラフトのテーマキー（既存6業種の方向性を再利用） */
export type DraftStyleKey =
  | "factory" // 製造・工業（青・B2B）
  | "construction" // 建設・不動産（琥珀色）
  | "restaurant" // 飲食（オレンジ）
  | "salon" // 美容・理美容（ピンク）
  | "clinic" // 整骨・整体・クリニック（緑）
  | "consulting"; // IT・コンサル・士業（ダーク）

/** 各スタイルのテーマ設定（Tailwind クラス断片で表現） */
export interface DraftStyle {
  key: DraftStyleKey;
  /** ジャンル表示名（ヒーローのバッジ等） */
  label: string;
  /** ヒーロー背景グラデーション（bg-gradient-to-b に渡す） */
  heroGradient: string;
  /** アクセント淡色バッジ */
  badgeClass: string;
  /** アクセント濃色テキスト */
  accentText: string;
  /** アクセント罫線・マーカー */
  accentBar: string;
  /** セクション淡色背景 */
  sectionTint: string;
  /** メイン CTA ボタン */
  buttonClass: string;
  /** 顧客データが無いときの既定ヒーロー見出し */
  defaultHeroTitle: string;
  /** 顧客データが無いときの既定サブコピー */
  defaultHeroSub: string;
  /** features が空のときのフォールバック見出しサービス */
  defaultServices: string[];
  /** CTA ラベル */
  ctaLabel: string;
}

/** 6 スタイルのテーマ定義 */
export const DRAFT_STYLES: Record<DraftStyleKey, DraftStyle> = {
  factory: {
    key: "factory",
    label: "製造・工業",
    heroGradient: "from-blue-950/85 to-blue-800/40",
    badgeClass: "bg-blue-100 text-blue-700",
    accentText: "text-blue-600",
    accentBar: "bg-blue-500",
    sectionTint: "bg-blue-50",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    defaultHeroTitle: "確かな技術と長年の信頼",
    defaultHeroSub: "品質と納期でお応えするものづくり",
    defaultServices: ["製品・サービス", "技術力・設備", "対応実績"],
    ctaLabel: "お問い合わせ・資料請求",
  },
  construction: {
    key: "construction",
    label: "建設・不動産",
    heroGradient: "from-amber-950/85 to-amber-800/40",
    badgeClass: "bg-amber-100 text-amber-800",
    accentText: "text-amber-700",
    accentBar: "bg-amber-500",
    sectionTint: "bg-amber-50",
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
    defaultHeroTitle: "地域に愛される、安心の仕事",
    defaultHeroSub: "丁寧な施工と確かなアフターフォロー",
    defaultServices: ["施工・工事例", "対応エリア", "会社・代表ご挨拶"],
    ctaLabel: "お見積り・ご相談",
  },
  restaurant: {
    key: "restaurant",
    label: "飲食・フード",
    heroGradient: "from-orange-950/85 to-red-900/40",
    badgeClass: "bg-orange-100 text-orange-700",
    accentText: "text-orange-600",
    accentBar: "bg-orange-500",
    sectionTint: "bg-orange-50",
    buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
    defaultHeroTitle: "心をこめたおもてなし",
    defaultHeroSub: "素材と技で、毎日の食卓を豊かに",
    defaultServices: ["メニュー", "店内・席のご案内", "アクセス・営業時間"],
    ctaLabel: "予約・お問い合わせ",
  },
  salon: {
    key: "salon",
    label: "美容・理美容",
    heroGradient: "from-pink-950/85 to-fuchsia-900/40",
    badgeClass: "bg-pink-100 text-pink-700",
    accentText: "text-pink-600",
    accentBar: "bg-pink-500",
    sectionTint: "bg-pink-50",
    buttonClass: "bg-pink-600 hover:bg-pink-700 text-white",
    defaultHeroTitle: "あなたの魅力を引き出す",
    defaultHeroSub: "上質な時間と、あなただけのスタイルを",
    defaultServices: ["メニュー・料金", "スタッフ紹介", "ご予約・アクセス"],
    ctaLabel: "ご予約はこちら",
  },
  clinic: {
    key: "clinic",
    label: "整骨・整体・クリニック",
    heroGradient: "from-emerald-950/85 to-teal-900/40",
    badgeClass: "bg-emerald-100 text-emerald-700",
    accentText: "text-emerald-600",
    accentBar: "bg-emerald-500",
    sectionTint: "bg-emerald-50",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    defaultHeroTitle: "一人ひとりに寄り添う丁寧な対応",
    defaultHeroSub: "安心してお任せいただける体制",
    defaultServices: ["対応・メニュー", "スタッフ・資格", "初めての方へ"],
    ctaLabel: "ご予約・お問い合わせ",
  },
  consulting: {
    key: "consulting",
    label: "IT・コンサル・士業",
    heroGradient: "from-slate-950/90 to-slate-800/40",
    badgeClass: "bg-slate-800 text-slate-200",
    accentText: "text-blue-500",
    accentBar: "bg-blue-500",
    sectionTint: "bg-slate-50",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    defaultHeroTitle: "事業の成長を戦略から支える",
    defaultHeroSub: "現場で使える実践的なご提案",
    defaultServices: ["サービス内容", "解決できること", "実績・事例"],
    ctaLabel: "無料相談・お問い合わせ",
  },
};

/** 事業種（自由入力）→ テーマキー の決定論マッピング（最初に一致したものが勝ち） */
const STYLE_KEYWORDS: { key: DraftStyleKey; words: string[] }[] = [
  {
    key: "restaurant",
    words: [
      "飲食", "食堂", "レストラン", "料理", "カフェ", "喫茶", "居酒屋", "バー",
      "ベーカリー", "パン", "寿司", "ラーメン", "お弁当", "dining", "cafe",
    ],
  },
  {
    key: "salon",
    words: [
      "美容", "美容室", "ヘア", "サロン", "ネイル", "エステ", "理容", "理美容",
      "まつ毛", "まつげ", "アイラッシュ", "salon",
    ],
  },
  {
    key: "clinic",
    words: [
      "整骨", "整体", "接骨", "クリニック", "歯科", "内科", "外科", "皮膚科",
      "眼科", "耳鼻", "小児", "産婦", "薬局", "鍼灸", "マッサージ", "フィットネス",
      "ジム", "ヨガ", "保育", "学習塾", "塾", "介護", "デイサービス",
    ],
  },
  {
    key: "construction",
    words: [
      "建設", "工務店", "建築", "土木", "リフォーム", "内装", "解体", "不動産",
      "住宅", "左官", "配管", "電気工事", "造園",
    ],
  },
  {
    key: "factory",
    words: [
      "製造", "工業", "工場", "機械", "加工", "金属", "化学", "電子", "部品",
      "食品製造", "プラント", "鋳造", "プレス", "溶接",
    ],
  },
  {
    key: "consulting",
    words: [
      "コンサル", "コンサルティング", "IT", "DX", "システム", "ソフトウェア",
      "デジタル", "士業", "弁護士", "税理士", "行政書士", "司法書士", "社労士",
      "ファイナンシャル", "保険", "金融", "投資", "マーケ", "起業", "セミナー",
      "デザイン", "広告", "マーケティング", "ウェブ", "web",
    ],
  },
];

/** 事業種文字列からテーマキーを決定する（一致がなければ factory を既定値にする） */
export function resolveStyle(businessType: string): DraftStyleKey {
  const text = (businessType ?? "").toLowerCase();
  if (text) {
    for (const entry of STYLE_KEYWORDS) {
      if (entry.words.some((w) => text.includes(w.toLowerCase()))) {
        return entry.key;
      }
    }
  }
  return "factory";
}

/** テーマキーから設定を取り出す（無効キーは factory にフォールバック） */
export function getDraftStyle(key: DraftStyleKey | string | undefined): DraftStyle {
  if (key && (key as DraftStyleKey) in DRAFT_STYLES) {
    return DRAFT_STYLES[key as DraftStyleKey];
  }
  return DRAFT_STYLES.factory;
}

/* ------------------------------------------------------------------ */
/*  ドラフトペイロード                                                  */
/* ------------------------------------------------------------------ */

/** URL に埋め込むドラフトの最小ペイロード（表示に必要な分だけ） */
export interface DraftPayload {
  /** 事業体名 */
  companyName: string;
  /** 企業名（屋号）— 事業体名が空のときの予備 */
  enterpriseName: string;
  /** 事業種 */
  businessType: string;
  /** 伝えたいイメージ（ヒーロー見出しの元） */
  desiredImage: string;
  /** ターゲット・理想のお客様 */
  targetCustomer: string;
  /** 強み・差別化（箇条書き） */
  strengths: string[];
  /** 必ず載せたい情報（箇条書き） */
  mustInclude: string[];
  /** 必要なページ・機能（箇条書き） */
  features: string[];
  /** 電話番号 */
  phone: string;
  /** メールアドレス */
  email: string;
  /** テーマキー */
  styleKey: DraftStyleKey;
  /** 受領 ID（注記の参照用） */
  submissionId: string;
}

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列化（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 文字列を指定長で切り詰める（UTF-8 バイト境界を壊さないよう Array.from で安全に） */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const chars = Array.from(text);
  return chars.slice(0, max).join("") + "…";
}

/** 自由入力テキストを箇条書きアイテムに分割（改行・読点・中点・スラッシュ等で区切る） */
function splitToItems(text: string): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts));
}

/** 文字列配列を切り詰め・件数制限付きで整形 */
function capItems(items: string[], opts: {
  itemMax: number;
  maxCount: number;
}): string[] {
  return items
    .map((s) => truncate(s, opts.itemMax))
    .filter((s) => s.length > 0)
    .slice(0, opts.maxCount);
}

/* ------------------------------------------------------------------ */
/*  ペイロード構築                                                      */
/* ------------------------------------------------------------------ */

/**
 * 相談送信ペイロードから、ドラフト描画用の最小ペイロードを組み立てる。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。
 */
export function buildDraftPayload(
  payloadRaw: unknown,
  submissionId: string
): DraftPayload {
  const payload =
    payloadRaw !== null && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  const businessType = asString(payload.businessType);
  const styleKey = resolveStyle(businessType);

  const strengths = capItems(splitToItems(asString(payload.sellingPoints)), {
    itemMax: 70,
    maxCount: 8,
  });
  const mustInclude = capItems(splitToItems(asString(payload.mustIncludeInfo)), {
    itemMax: 70,
    maxCount: 10,
  });
  const features = capItems(splitToItems(asString(payload.features)), {
    itemMax: 40,
    maxCount: 12,
  });

  return {
    companyName: truncate(asString(payload.companyName), 60),
    enterpriseName: truncate(asString(payload.enterpriseName), 60),
    businessType: truncate(businessType, 40),
    desiredImage: truncate(asString(payload.desiredImage), 140),
    targetCustomer: truncate(asString(payload.targetCustomer), 160),
    strengths,
    mustInclude,
    features,
    phone: truncate(asString(payload.phone), 30),
    email: truncate(asString(payload.email), 120),
    styleKey,
    submissionId: truncate(submissionId, 40),
  };
}

/* ------------------------------------------------------------------ */
/*  エンコード / デコード（base64url）                                  */
/* ------------------------------------------------------------------ */

/**
 * ドラフトペイロードを URL セーフな base64url 文字列にエンコードする。
 * UTF-8（日本語）対応。+ / を使わず - _ を使うので URL エスケープ不要。
 */
export function encodeDraft(payload: DraftPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * base64url 文字列からドラフトペイロードを復元する。
 * 形式不正・破損時は null を返す（呼び出し側でフォールバック表示に使う）。
 */
export function decodeDraft(encoded: string): DraftPayload | null {
  try {
    if (!encoded || encoded.length === 0) return null;
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const raw = JSON.parse(json);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const o = raw as Record<string, unknown>;

    // 配列でない値を安全に文字列化
    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const arr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter((s) => s.length > 0)
        : [];

    return {
      companyName: truncate(str(o.companyName), 60),
      enterpriseName: truncate(str(o.enterpriseName), 60),
      businessType: truncate(str(o.businessType), 40),
      desiredImage: truncate(str(o.desiredImage), 140),
      targetCustomer: truncate(str(o.targetCustomer), 160),
      strengths: arr(o.strengths).map((s) => truncate(s, 70)).slice(0, 8),
      mustInclude: arr(o.mustInclude).map((s) => truncate(s, 70)).slice(0, 10),
      features: arr(o.features).map((s) => truncate(s, 40)).slice(0, 12),
      phone: truncate(str(o.phone), 30),
      email: truncate(str(o.email), 120),
      styleKey: resolveStyle(str(o.businessType)), // 信頼できない入力は再決定論で正規化
      submissionId: truncate(str(o.submissionId), 40),
    };
  } catch {
    return null;
  }
}
