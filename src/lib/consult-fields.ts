/* ------------------------------------------------------------------ */
/*  相談ペイロードの全項目カタログ + 表示フォーマッタ（共有モジュール）   */
/* ------------------------------------------------------------------ */
/*  役割:                                                              */
/*    /consult フォームが保存した payload（submission.json）の全項目を  */
/*    オペレータが確認しやすい形に組み立てる。raw JSON を探さなくても    */
/*    すべての顧客記入欄をレビュー画面で一覧できるようにする。          */
/*                                                                      */
/*    コード値（colorScheme / timing / budget / supplement / allowEdit / */
/*    assetsStatus 等）は日本語ラベルに正規化して返す。                  */
/*    純粋関数・決定論的（同じ入力 → 同じ出力）。                         */
/*                                                                      */
/*    ※ /consult 側の選択肢定義（consult/page.tsx）と意味を合わせるが、 */
/*      未知のコード値はそのまま表示に回す（表示側で欠損させない）。     */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全に真偽値として取り出す */
function asBool(value: unknown): boolean {
  return value === true;
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

/** unknown を安全にオブジェクト配列として取り出す */
function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) =>
      v !== null && typeof v === "object" && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null
    )
    .filter((v): v is Record<string, unknown> => v !== null);
}

/* ------------------------------------------------------------------ */
/*  コード値 → 日本語ラベル の対応表（consult/page.tsx と意味同期）     */
/* ------------------------------------------------------------------ */

const COLOR_SCHEME_LABELS: Record<string, string> = {
  blue: "青系（信頼・清潔・ビジネス）",
  white: "白・グレー系（シンプル・モダン）",
  warm: "暖色系（親しみ・温かみ・活力）",
  green: "緑系（自然・癒し・健康）",
  dark: "黒・ダーク系（高級感・洗練・IT）",
  none: "特に指定なし（お任せ）",
};

const TIMING_LABELS: Record<string, string> = {
  asap: "できるだけ早く（1〜2週間）",
  "1month": "1ヶ月以内",
  "3months": "3ヶ月以内",
  "no-rush": "特に急ぎではない",
};

const BUDGET_LABELS: Record<string, string> = {
  "9800": "¥9,800/月（会社案内5〜10ページ・お問い合わせ・月3回更新・サーバー込み）",
  "15000": "¥15,000/月（ブログ・SNS連携・20ページ・月5回更新・SEO強化）",
  "20000": "¥20,000/月（多機能・ページ無制限・月10回更新・カスタム機能）",
  unknown: "わからない（要望をもとに最適プランを提案）",
};

const SUPPLEMENT_LABELS: Record<string, string> = {
  all: "足りないものはすべて金井に作成・撮影してほしい",
  partial: "一部のみ補充してほしい（要相談）",
  self: "写真・文章はこちらで用意する",
};

const ALLOW_EDIT_LABELS: Record<string, string> = {
  yes: "編集・加工・トリミングOK",
  partial: "一部のみ（要相談）",
  no: "原則としてそのまま使ってほしい",
};

const ASSET_LABELS: Record<string, string> = {
  logo: "ロゴデータ",
  photos: "写真・画像",
  copy: "文章・キャッチコピー",
  company: "会社概要・会社案内の資料",
  service: "製品・サービスの資料",
  none: "まだ何もない（すべてお任せ）",
};

const REF_SITE_TYPE_LABELS: Record<string, string> = {
  competitor: "競合他社のサイト",
  industry: "同業他社のサイト",
  design: "デザインの参考",
  layout: "レイアウト・構成の参考",
  color: "色使いの参考",
  image: "写真・ビジュアルの参考",
  other: "その他",
};

const FOLLOW_LEVEL_LABELS: Record<string, string> = {
  close: "かなり忠実に再現",
  partial: "一部だけ取り入れる",
  inspiration: "参考程度（雰囲気・方向性のみ）",
};

/** コード値をラベルに変換。未定義コードはそのまま（空は未入力扱い） */
function codeToLabel(map: Record<string, string>, code: string): string {
  const c = asString(code);
  if (c.length === 0) return "";
  return Object.prototype.hasOwnProperty.call(map, c) ? map[c] : c;
}

/* ------------------------------------------------------------------ */
/*  表示行のデータモデル                                                */
/* ------------------------------------------------------------------ */

/** 1項目の表示タイプ */
export type ConsultFieldKind =
  | "text" // 自由文（短い）
  | "longtext" // 自由文（長い・折り返し）
  | "boolean" // はい／いいえ
  | "code" // コード値 → ラベル
  | "list" // 文字列配列
  | "refsites" // 参考サイト配列（構造化）
  | "attachments" // 添付素材メタデータ
  | "empty"; // 値なし

/** 参考サイト1件の表示データ */
export interface RefSiteView {
  url: string;
  typeLabel: string;
  whatToReference: string;
  likedSections: string;
  followLevelLabel: string;
}

/** 添付素材1件の表示データ */
export interface AttachmentView {
  name: string;
  role: string;
  usePolicy: string;
  memo: string;
}

/** 1項目分の表示行 */
export interface ConsultFieldView {
  /** payload 上のキー */
  key: string;
  /** 表示名（日本語） */
  label: string;
  /** 表示タイプ */
  kind: ConsultFieldKind;
  /** 人間が読むための主値（テキスト・ラベル等） */
  value: string;
  /** 入力があるか（空でないか） */
  hasValue: boolean;
  /** 参考サイト（kind=refsites のとき） */
  refSites?: RefSiteView[];
  /** 添付素材（kind=attachments のとき） */
  attachments?: AttachmentView[];
}

/** グループ化された表示行 */
export interface ConsultFieldGroup {
  /** グループ名（日本語） */
  title: string;
  /** グループ内の項目 */
  fields: ConsultFieldView[];
}

/* ------------------------------------------------------------------ */
/*  個別フォーマッタ                                                    */
/* ------------------------------------------------------------------ */

function textField(payload: Record<string, unknown>, key: string, label: string, long = false): ConsultFieldView {
  const value = asString(payload[key]);
  return {
    key,
    label,
    kind: long ? "longtext" : "text",
    value: value || "（未入力）",
    hasValue: value.length > 0,
  };
}

function booleanField(payload: Record<string, unknown>, key: string, label: string): ConsultFieldView {
  const value = asBool(payload[key]);
  return {
    key,
    label,
    kind: "boolean",
    value: value ? "はい" : "いいえ",
    hasValue: true, // 真偽は常に値を持つ
  };
}

function codeField(
  payload: Record<string, unknown>,
  key: string,
  label: string,
  map: Record<string, string>
): ConsultFieldView {
  const label2 = codeToLabel(map, asString(payload[key]));
  return {
    key,
    label,
    kind: "code",
    value: label2 || "（未選択）",
    hasValue: label2.length > 0,
  };
}

function listField(payload: Record<string, unknown>, key: string, label: string): ConsultFieldView {
  const items = asStringArray(payload[key]);
  return {
    key,
    label,
    kind: "list",
    value: items.length > 0 ? items.join("、") : "（未選択）",
    hasValue: items.length > 0,
  };
}

/** assetsStatus のように、コード配列をラベル配列にして表示する */
function codeListField(
  payload: Record<string, unknown>,
  key: string,
  label: string,
  map: Record<string, string>
): ConsultFieldView {
  const codes = asStringArray(payload[key]);
  const labels = codes.map((c) => codeToLabel(map, c)).filter((s) => s.length > 0);
  return {
    key,
    label,
    kind: "list",
    value: labels.length > 0 ? labels.join("、") : "（未選択）",
    hasValue: labels.length > 0,
  };
}

function refSitesField(payload: Record<string, unknown>): ConsultFieldView {
  const rawSites = asObjectArray(payload.referenceSites);
  // URL・種類・参考部位のいずれかがあるものだけ残す（空カード除外）
  const sites: RefSiteView[] = rawSites
    .map((s) => {
      const url = asString(s.url);
      const typeLabel = codeToLabel(REF_SITE_TYPE_LABELS, asString(s.type));
      const whatToReference = asString(s.whatToReference);
      const likedSections = asString(s.likedSections);
      const followLevelLabel = codeToLabel(
        FOLLOW_LEVEL_LABELS,
        asString(s.followLevel)
      );
      return { url, typeLabel, whatToReference, likedSections, followLevelLabel };
    })
    .filter(
      (s) => s.url || s.typeLabel || s.whatToReference || s.likedSections
    );

  const hasValue = sites.length > 0;
  return {
    key: "referenceSites",
    label: "参考サイト",
    kind: "refsites",
    value: hasValue ? `${sites.length} 件` : "（未入力）",
    hasValue,
    refSites: sites,
  };
}

function attachmentsField(payload: Record<string, unknown>): ConsultFieldView {
  const raw = asObjectArray(payload.attachments);
  const attachments: AttachmentView[] = raw.map((a) => ({
    name: asString(a.name),
    role: asString(a.role),
    usePolicy: asString(a.usePolicy),
    memo: asString(a.memo),
  }));
  const hasValue = attachments.length > 0;
  return {
    key: "attachments",
    label: "アップロード素材（メタデータ）",
    kind: "attachments",
    value: hasValue ? `${attachments.length} 件` : "（未添付）",
    hasValue,
    attachments,
  };
}

/* ------------------------------------------------------------------ */
/*  全項目カタログ（payload → グループ化された表示行）                  */
/* ------------------------------------------------------------------ */

/**
 * 相談ペイロードを、レビュー画面で一覧できるグループ別の表示行に組み立てる。
 * 顧客が記入した全項目を raw JSON から探さずに確認できるようにする。
 *
 * グループ構成は /consult のウィザード（Step 1〜7）に合わせる。
 */
export function formatPayloadForReview(
  payloadRaw: unknown
): ConsultFieldGroup[] {
  const payload =
    payloadRaw !== null &&
    typeof payloadRaw === "object" &&
    !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  const groups: ConsultFieldGroup[] = [
    {
      title: "事業について（Step 1）",
      fields: [
        textField(payload, "businessType", "事業種"),
        textField(payload, "companyName", "事業体名"),
        textField(payload, "enterpriseName", "正式名称・法人名"),
        textField(payload, "currentWebsite", "現在のホームページURL"),
        booleanField(payload, "noWebsite", "ホームページをお持ちでない"),
      ],
    },
    {
      title: "ターゲット・伝えたいこと（Step 2）",
      fields: [
        textField(payload, "targetCustomer", "ターゲット・理想のお客様", true),
        textField(payload, "sellingPoints", "強み・差別化ポイント", true),
        textField(payload, "mustIncludeInfo", "必ず掲載したい情報", true),
        textField(payload, "avoidItems", "避けたいこと・NG（自由記入）", true),
        textField(payload, "currentSiteIssues", "現在のサイトの課題（自由記入）", true),
      ],
    },
    {
      title: "デザイン（Step 3）",
      fields: [
        textField(payload, "desiredImage", "伝えたいイメージ", true),
        codeField(payload, "colorScheme", "配色イメージ", COLOR_SCHEME_LABELS),
        refSitesField(payload),
        listField(payload, "currentIssues", "リニューアル時の課題（選択）"),
        textField(payload, "currentIssuesOther", "リニューアル時の課題（その他）"),
      ],
    },
    {
      title: "サイトの目的・機能（Step 4）",
      fields: [
        listField(payload, "sitePurpose", "サイトの主な目的"),
        textField(payload, "sitePurposeOther", "サイトの主な目的（その他）"),
        listField(payload, "features", "必要なページ・機能"),
        textField(payload, "featuresOther", "必要なページ・機能（その他）"),
        codeField(payload, "timing", "公開希望時期", TIMING_LABELS),
      ],
    },
    {
      title: "ご予算（Step 5）",
      fields: [
        codeField(payload, "budget", "ご予算の目安", BUDGET_LABELS),
        textField(payload, "annualPayment", "年一括払いのご希望"),
      ],
    },
    {
      title: "制作素材（Step 6）",
      fields: [
        textField(payload, "message", "自由メッセージ", true),
        codeListField(payload, "assetsStatus", "素材の準備状況", ASSET_LABELS),
        codeField(payload, "supplement", "足りない素材の補充", SUPPLEMENT_LABELS),
        codeField(payload, "allowEdit", "素材の編集・加工可否", ALLOW_EDIT_LABELS),
        attachmentsField(payload),
      ],
    },
    {
      title: "お客様情報（Step 7）",
      fields: [
        textField(payload, "name", "お名前"),
        textField(payload, "email", "メールアドレス"),
        textField(payload, "phone", "電話番号"),
      ],
    },
  ];

  return groups;
}

/* ------------------------------------------------------------------ */
/*  補足要求UI用: 差戻し対象として並べる「項目別」の選択肢リスト         */
/* ------------------------------------------------------------------ */

/**
 * 項目別差戻し／補足依頼UIで選択肢として並べるインテイク項目の定義。
 * 代表者が「この項目をもう少し具体化してほしい」と個別に指定できる。
 *
 * value には現在の入力値の抜粋を添えて、どの項目が薄いかを一目で分からせる。
 * consult-quality の評価対象（戦略4項目＋features）を中心にしつつ、
 * 任意項目も必要に応じて指示できるよう網羅する。
 */
export interface SupplementTargetOption {
  key: string;
  label: string;
  required: boolean;
}

/** 補足要求UIの対象項目マスター（順序固定） */
export const SUPPLEMENT_TARGETS: ReadonlyArray<SupplementTargetOption> = [
  { key: "targetCustomer", label: "ターゲット・理想のお客様", required: true },
  { key: "sellingPoints", label: "強み・差別化ポイント", required: true },
  { key: "mustIncludeInfo", label: "必ず掲載したい情報", required: true },
  { key: "features", label: "必要なページ・機能", required: true },
  { key: "desiredImage", label: "伝えたいイメージ", required: false },
  { key: "colorScheme", label: "配色イメージ", required: false },
  { key: "referenceSites", label: "参考サイト", required: false },
  { key: "assetsStatus", label: "素材の準備状況", required: false },
  { key: "supplement", label: "不足素材の補充方針", required: false },
  { key: "allowEdit", label: "素材の編集・加工可否", required: false },
  { key: "budget", label: "ご予算の目安", required: false },
  { key: "timing", label: "公開希望時期", required: false },
  { key: "message", label: "自由メッセージ", required: false },
  { key: "companyName", label: "事業体名", required: true },
];

/**
 * 各対象項目の「現在の入力値の抜粋」を payload から取り出す。
 * UIで「今どう入力されているか」を横に表示して、どこを差し戻すか判断させる。
 */
export function supplementTargetCurrentValues(
  payloadRaw: unknown
): Record<string, string> {
  const payload =
    payloadRaw !== null &&
    typeof payloadRaw === "object" &&
    !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  const out: Record<string, string> = {};
  for (const target of SUPPLEMENT_TARGETS) {
    if (target.key === "referenceSites") {
      const sites = asObjectArray(payload.referenceSites).filter((s) =>
        asString(s.url)
      );
      out[target.key] = sites.length > 0 ? `${sites.length} 件の参考サイト` : "（未入力）";
      continue;
    }
    if (target.key === "features") {
      const arr = asStringArray(payload.features);
      out[target.key] = arr.length > 0 ? arr.join("、") : "（未選択）";
      continue;
    }
    if (target.key === "assetsStatus") {
      const arr = asStringArray(payload.assetsStatus);
      out[target.key] = arr.length > 0 ? arr.join("、") : "（未選択）";
      continue;
    }
    const s = asString(payload[target.key]);
    out[target.key] = s.length > 0 ? s : "（未入力）";
  }
  return out;
}
