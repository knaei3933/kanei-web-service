import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { buildDraftPayload, encodeDraft } from "@/lib/draft";

/**
 * 相談フォームの送信を受け付ける Route Handler。
 *
 * ファイルはディスクの consult-submissions/{id}/ に保存されます。
 * - ローカル開発: プロジェクトルートの data/consult-submissions/
 * - Vercel/serverless: 書き込み可能な /tmp/consult-submissions/
 *   （本番では process.cwd() が読み取り専用で書き込めないため /tmp を使う。
 *     /tmp はインスタンス単位・エフェメラルで恒久保存には向かないが、
 *     受領確認と下流ブリーフ生成には十分。あとで Blob / S3 /
 *     Supabase Storage などへ差し替えやすいよう、保存処理は
 *     このファイル内に閉じています。）
 */

// ファイルシステム（node:fs）を使うため Node ランタイムを明示
export const runtime = "nodejs";
// POST はデフォルトで動的だが、毎回ディスクへ書き込むため明示的に動的化
export const dynamic = "force-dynamic";

/**
 * Vercel/serverless 環境で動いているか。
 * Vercel は本番ビルド/実行時に VERCEL=1 を設定する（安全な判定方法）。
 * この環境では process.cwd() が読み取り専用で書き込めないため、
 * 書き込み可能な /tmp 側へ保存先を切り替える。
 */
const IS_SERVERLESS = process.env.VERCEL === "1";

/** 送信データの保存ルート。
 *  - ローカル開発: プロジェクトルートの data/consult-submissions/
 *  - Vercel/serverless: /tmp/consult-submissions/ （os.tmpdir() は Vercel で /tmp）
 */
const SUBMISSIONS_DIR = IS_SERVERLESS
  ? join(tmpdir(), "consult-submissions")
  : join(process.cwd(), "data", "consult-submissions");

/** レスポンスに載せる表示用ルート（ローカルは相対, Vercelは絶対） */
const DISPLAY_ROOT = IS_SERVERLESS
  ? SUBMISSIONS_DIR
  : "data/consult-submissions";

/** 受け付ける最大ファイル数（安全のための上限） */
const MAX_FILES = 50;

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/**
 * アップロードされたファイル名をディスク安全にサニタイズする。
 * - パス区切りを除去（ディレクトリトラバーサル対策）
 * - 連続ドットを圧縮（.. による上位ディレクトリ参照を防止）
 * - Windows で予約された文字 / 制御文字を _ に置換
 * - 先頭・末尾のドット・空白を除去
 * 日本語などの多バイト文字はそのまま保持する。
 */
function sanitizeFilename(rawName: string): string {
  // パス区切り（/ \）があれば末端のファイル名部分だけ取り出す
  const base = (rawName.split(/[/\\]/).pop() ?? rawName) || "file";
  const cleaned = base
    // 制御文字(0x00-0x1F, 0x7F) と Windows 予約文字を _ 化
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_")
    // 連続するドットを1つに圧縮（.. → .）
    .replace(/\.{2,}/g, ".")
    // 先頭のドット・ハイフン・空白を除去
    .replace(/^[\s.-]+/, "")
    // 末尾のドット・空白を除去（Windows で問題になりやすい）
    .replace(/[\s.]+$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : "file";
}

/**
 * リクエストから公開用の絶対ベース URL（プロトコル + ホスト）を組み立てる。
 * - Vercel 本番: x-forwarded-proto / x-forwarded-host が設定される
 * - ローカル開発: host が localhost のときは http を使う
 * draftUrl など「お客様に開いてもらう絶対 URL」の生成に使う。
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

/** 衝突しにくい送信 ID を生成（タイムスタンプ + UUID 短縮形） */
function createSubmissionId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = randomUUID().split("-")[0]; // 8 文字
  return `${stamp}-${rand}`;
}

interface SavedFileMeta {
  /** FormData 上のフィールド名 */
  field: string;
  /** クライアントが送ってきた元のファイル名 */
  originalName: string;
  /** ディスクに保存したファイル名（サニタイズ済み・連番付き） */
  savedName: string;
  /** バイト数 */
  size: number;
  /** MIME タイプ */
  type: string;
}

/* ------------------------------------------------------------------ */
/*  Brief 生成（構造化ウェブ制作ブリーフ）                              */
/* ------------------------------------------------------------------ */
/*  保存された consult 送信データから、下流の自動ウェブサイト生成に      */
/*  使える構造化ブリーフ（brief.json）を生成する。                      */
/*  AI/LLM は未使用・完全に決定論的（同じ入力 → 同じ出力）。             */
/* ------------------------------------------------------------------ */

/** Brief のスキーマバージョン（下流ツールの互換性確認用） */
const BRIEF_SCHEMA_VERSION = "1.0.0";

/** ラベルマップから表示名を取得。未定義キーはそのまま返す */
function labelOf(map: Record<string, string>, key: string): string {
  return key && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : key;
}

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全に真偽値として取り出す */
function asBool(value: unknown): boolean {
  return value === true;
}

/** unknown を安全にオブジェクトとして取り出す */
function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** unknown を安全に文字列配列として取り出す（空・重複を除去） */
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

/**
 * 自由入力テキストを箇条書きアイテムに分割する。
 * 改行・読点（、,，）・中点（・）・スラッシュ・縦棒などを区切りとし、
 * 先頭の箇条書き記号（- * • ・ 1. 1) (1) a. など）を取り除く。
 * 空要素・重複は除外する。
 */
function splitToItems(text: string): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts));
}

/** 「その他」自由入力を配列にマージする（「その他」文字列は除去して自由入力に置換） */
function mergeOther(base: string[], other: string): string[] {
  const cleaned = base.filter((x) => x !== "その他");
  if (other) cleaned.push(other);
  return Array.from(new Set(cleaned));
}

/* ---- ラベル定義（クライアント page.tsx の選択肢と同期した固定マップ） ---- */

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

const MATERIAL_ROLE_LABELS: Record<string, string> = {
  logo: "ロゴ・マーク",
  company: "会社案内・会社概要",
  product: "製品・商品カタログ",
  photos: "写真・画像（店舗・施工・商品など）",
  price: "料金表・メニュー表",
  copy: "文章・キャッチコピー（文案）",
  reference: "参考資料（デザイン・競合資料など）",
  other: "その他",
};

const USE_POLICY_LABELS: Record<string, string> = {
  mustUse: "必ず使う",
  useIfSuitable: "合えば使う",
  referenceOnly: "参考だけ",
};

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
  "9800": "¥9,800/月",
  "15000": "¥15,000/月",
  "20000": "¥20,000/月",
  unknown: "わからない（要相談）",
};

const SUPPLEMENT_LABELS: Record<string, string> = {
  all: "足りないものはすべて金井が作成・撮影",
  partial: "一部のみ補充（要相談）",
  self: "写真・文章はこちらで用意",
};

const ALLOW_EDIT_LABELS: Record<string, string> = {
  yes: "編集・加工・トリミングOK",
  partial: "一部のみ（要相談）",
  no: "原則そのまま使用",
};

const ASSET_LABELS: Record<string, string> = {
  logo: "ロゴデータ",
  photos: "写真・画像",
  copy: "文章・キャッチコピー",
  company: "会社概要・会社案内の資料",
  service: "製品・サービスの資料",
  none: "まだ何もない（すべてお任せ）",
};

/** 標準素材セット（不足判定のベース） */
const STANDARD_MATERIALS: { value: string; label: string }[] = [
  { value: "logo", label: "ロゴデータ" },
  { value: "photos", label: "写真・画像" },
  { value: "copy", label: "文章・キャッチコピー" },
  { value: "company", label: "会社概要・会社案内の資料" },
  { value: "service", label: "製品・サービスの資料" },
];

/** 機能 → コード生成ヒントの対応表（部分一致で判定） */
const FEATURE_CODE_HINTS: { match: RegExp; hint: string }[] = [
  { match: /お問い合わせフォーム/, hint: "問い合わせフォーム + 送信 Route Handler（バリデーション付き）" },
  { match: /予約|お申し込み/, hint: "予約/申し込み 導線（外部サービスへのCTAボタン）" },
  { match: /Googleマップ|地図/, hint: "Google Maps 埋め込み（アクセス）" },
  { match: /SNS連携|SNS/, hint: "SNS リンク / フィード埋め込み（Instagram・LINE・X）" },
  { match: /実績|施工事例|ギャラリー/, hint: "実績/事例ギャラリー（グリッド or スライダー）" },
  { match: /料金表|コース一覧|メニュー/, hint: "料金/メニュー表コンポーネント" },
  { match: /よくある質問|FAQ/, hint: "FAQ アコーディオン" },
  { match: /ブログ|お知らせ/, hint: "ブログ/お知らせ 一覧 + 詳細レイアウト" },
  { match: /会社案内|代表挨拶|沿革|アクセス/, hint: "会社案内ページ（代表挨拶・沿革・アクセス）" },
  { match: /スタッフ紹介/, hint: "スタッフ紹介カード" },
  { match: /電話番号.*目立つ|目立つ表示/, hint: "固定CTA（電話番号・予約の目立つ表示）" },
];

/** MIMEタイプ/拡張子から大まかな素材種別を判定 */
function detectFileKind(type: string, name: string): string {
  const lower = name.toLowerCase();
  if (type.startsWith("image/")) return "画像";
  if (type.startsWith("video/")) return "動画";
  if (type.startsWith("audio/")) return "音声";
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (type.includes("word") || /\.(docx?)$/.test(lower)) return "Word";
  if (type.includes("excel") || type.includes("sheet") || /\.(xlsx?|csv)$/.test(lower))
    return "表計算";
  if (type.includes("presentation") || /\.(pptx?)$/.test(lower)) return "プレゼン";
  if (type.includes("zip") || /\.(zip|rar|7z)$/.test(lower)) return "圧縮ファイル";
  if (type.startsWith("text/") || /\.(txt|md|rtf)$/.test(lower)) return "テキスト";
  if (/\.(svg|ai|eps)$/.test(lower)) return "ベクターロゴ";
  if (lower.endsWith(".psd")) return "PSD";
  return type || "ファイル";
}

/** 生成する Brief の型 */
interface ConsultBrief {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;

  projectOverview: {
    companyName: string;
    enterpriseName: string;
    businessType: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    currentWebsite: string;
    hasCurrentWebsite: boolean;
    timingRaw: string;
    timingLabel: string;
    budgetRaw: string;
    budgetLabel: string;
    annualPaymentInterest: string;
    freeMessage: string;
  };

  targetAudience: {
    rawDescription: string;
    inferredSegments: string[];
  };

  businessSummary: {
    businessType: string;
    summary: string;
    isRenewal: boolean;
    currentIssues: string[];
  };

  valueProposition: {
    sellingPointsRaw: string;
    sellingPoints: string[];
  };

  requiredSiteGoals: string[];
  requiredPagesOrFeatures: string[];
  requiredMustIncludeInfo: string[];

  desiredTone: {
    imageDescription: string;
    colorSchemeRaw: string;
    colorSchemeLabel: string;
  };

  avoidTone: {
    rawAvoidItems: string;
    avoidItems: string[];
    currentIssues: string[];
  };

  referenceStrategy: {
    referenceCount: number;
    sites: Array<{
      index: number;
      typeRaw: string;
      typeLabel: string;
      url: string;
      whatToReference: string;
      likedSections: string[];
      followLevelRaw: string;
      followLevelLabel: string;
      interpretation: string;
    }>;
    aggregateHints: string[];
  };

  providedMaterialsSummary: {
    fileCount: number;
    totalBytes: number;
    byRole: Array<{
      role: string;
      roleLabel: string;
      count: number;
      files: Array<{
        savedName: string;
        originalName: string;
        kind: string;
        sizeBytes: number;
        usePolicy: string;
        usePolicyLabel: string;
        memo: string;
      }>;
    }>;
    byKind: Array<{ kind: string; count: number }>;
    assetChecklistRaw: string[];
    assetChecklistLabels: string[];
    supplementRaw: string;
    supplementLabel: string;
    allowEditRaw: string;
    allowEditLabel: string;
  };

  missingMaterials: {
    declaredMissingRaw: string[];
    inferredMissingLabels: string[];
    recommendedFollowUp: string[];
  };

  automationHints: {
    codeGeneration: string[];
    imageGeneration: string[];
    contentDrafting: string[];
    manualReview: string[];
  };
}

/**
 * 保存済みペイロード + 添付ファイル情報から、構造化ブリーフを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。外部依存なし。
 */
function buildBrief(
  submissionId: string,
  payloadRaw: unknown,
  savedFiles: SavedFileMeta[]
): ConsultBrief {
  const payload = asObject(payloadRaw);
  const generatedAt = new Date().toISOString();

  /* ---- 基本フィールドの取り出し ---- */
  const businessType = asString(payload.businessType);
  const companyName = asString(payload.companyName);
  const enterpriseName = asString(payload.enterpriseName);
  const contactPerson = asString(payload.name);
  const contactEmail = asString(payload.email);
  const contactPhone = asString(payload.phone);
  const currentWebsite = asString(payload.currentWebsite);
  const noWebsite = asBool(payload.noWebsite);
  const hasCurrentWebsite = !noWebsite && currentWebsite.length > 0;

  const timingRaw = asString(payload.timing);
  const budgetRaw = asString(payload.budget);
  const annualPaymentRaw = asString(payload.annualPayment);
  const freeMessage = asString(payload.message);

  const targetCustomerRaw = asString(payload.targetCustomer);
  const sellingPointsRaw = asString(payload.sellingPoints);
  const mustIncludeInfoRaw = asString(payload.mustIncludeInfo);
  const avoidItemsRaw = asString(payload.avoidItems);
  const desiredImage = asString(payload.desiredImage);
  const colorSchemeRaw = asString(payload.colorScheme);

  const sitePurpose = asStringArray(payload.sitePurpose);
  const sitePurposeOther = asString(payload.sitePurposeOther);
  const features = asStringArray(payload.features);
  const featuresOther = asString(payload.featuresOther);
  const currentIssues = asStringArray(payload.currentIssues);
  const currentIssuesOther = asString(payload.currentIssuesOther);
  const assetsStatus = asStringArray(payload.assetsStatus);
  const supplementRaw = asString(payload.supplement);
  const allowEditRaw = asString(payload.allowEdit);

  /* ---- 派生値（自由テキスト → 構造化配列） ---- */
  const requiredSiteGoals = mergeOther(sitePurpose, sitePurposeOther);
  const requiredPagesOrFeatures = mergeOther(features, featuresOther);
  const requiredMustIncludeInfo = splitToItems(mustIncludeInfoRaw);
  const sellingPoints = splitToItems(sellingPointsRaw);
  const inferredSegments = splitToItems(targetCustomerRaw);
  const avoidItems = splitToItems(avoidItemsRaw);
  const resolvedCurrentIssues = mergeOther(currentIssues, currentIssuesOther);

  const colorSchemeLabel = colorSchemeRaw
    ? labelOf(COLOR_SCHEME_LABELS, colorSchemeRaw)
    : "";
  const timingLabel = timingRaw ? labelOf(TIMING_LABELS, timingRaw) : "";
  const budgetLabel = budgetRaw ? labelOf(BUDGET_LABELS, budgetRaw) : "";
  const annualPaymentInterest =
    annualPaymentRaw === "interested"
      ? "年払い割引に興味あり"
      : annualPaymentRaw === "not-interested"
        ? "年払い割引に興味なし"
        : "";

  const isRenewal = hasCurrentWebsite;
  const summaryParts: string[] = [];
  if (businessType) summaryParts.push(`事業種=${businessType}`);
  if (companyName || enterpriseName)
    summaryParts.push(`事業体=${companyName || enterpriseName}`);
  summaryParts.push(
    isRenewal ? `既存HPリニューアル（${currentWebsite}）` : "新規ホームページ制作"
  );
  if (timingLabel) summaryParts.push(`公開希望=${timingLabel}`);
  if (budgetLabel) summaryParts.push(`予算=${budgetLabel}`);
  const businessSummaryText = summaryParts.join(" / ");

  /* ---- 参考サイトの解釈 ---- */
  const rawReferenceSites = Array.isArray(payload.referenceSites)
    ? payload.referenceSites
    : [];
  const interpretedSites = rawReferenceSites
    .map((raw, idx) => {
      const o = asObject(raw);
      const typeRaw = asString(o.type);
      const url = asString(o.url);
      const whatToReference = asString(o.whatToReference);
      const likedSections = splitToItems(asString(o.likedSections));
      const followLevelRaw = asString(o.followLevel);
      // 未入力カードは除外
      if (
        !typeRaw &&
        !url &&
        !whatToReference &&
        likedSections.length === 0 &&
        !followLevelRaw
      ) {
        return null;
      }
      const typeLabel = typeRaw ? labelOf(REF_SITE_TYPE_LABELS, typeRaw) : "種別未指定";
      const followLevelLabel = followLevelRaw
        ? labelOf(FOLLOW_LEVEL_LABELS, followLevelRaw)
        : "再現度未指定";

      const interp: string[] = [];
      interp.push(typeLabel);
      if (url) interp.push(`URL=${url}`);
      if (whatToReference) interp.push(`参考部位=${whatToReference}`);
      if (likedSections.length > 0)
        interp.push(`好きな箇所=${likedSections.join("・")}`);
      interp.push(`再現度=${followLevelLabel}`);

      return {
        index: idx + 1,
        typeRaw,
        typeLabel,
        url,
        whatToReference,
        likedSections,
        followLevelRaw,
        followLevelLabel,
        interpretation: interp.join(" / "),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const referenceAggregateHints: string[] = [];
  if (interpretedSites.length === 0) {
    referenceAggregateHints.push(
      "参考サイトの指定なし。業種標準構成と desiredTone から方向性を決定する。"
    );
  } else {
    referenceAggregateHints.push(
      `参考サイト計 ${interpretedSites.length} 件を実機分析対象とする。`
    );
    if (interpretedSites.some((s) => s.followLevelRaw === "close")) {
      referenceAggregateHints.push(
        "「かなり忠実に再現」指定あり。構成/デザインを近づける優先度が高い。"
      );
    }
    const layoutDesignCount = interpretedSites.filter(
      (s) => s.typeRaw === "layout" || s.typeRaw === "design"
    ).length;
    if (layoutDesignCount > 0) {
      referenceAggregateHints.push(
        `レイアウト/デザイン参考 ${layoutDesignCount} 件。ワイヤーフレーム策定のベースにする。`
      );
    }
    if (interpretedSites.some((s) => s.typeRaw === "color")) {
      referenceAggregateHints.push("色参考サイトあり。配色を抽出してカラーパレットを生成する。");
    }
    if (interpretedSites.some((s) => s.typeRaw === "image")) {
      referenceAggregateHints.push(
        "写真/ビジュアル参考あり。画像スタイルの方向性を継承する。"
      );
    }
  }

  /* ---- 提供素材の集計 ---- */
  // payload.attachments のメタデータを name|size で索引化し、savedFiles と突き合わせる
  const attachmentMetaMap = new Map<
    string,
    { role: string; usePolicy: string; memo: string }
  >();
  if (Array.isArray(payload.attachments)) {
    for (const rawAtt of payload.attachments) {
      const o = asObject(rawAtt);
      const name = asString(o.name);
      const sizeNum = typeof o.size === "number" ? o.size : Number(o.size) || 0;
      if (!name) continue;
      attachmentMetaMap.set(`${name}|${sizeNum}`, {
        role: asString(o.role),
        usePolicy: asString(o.usePolicy),
        memo: asString(o.memo),
      });
    }
  }

  const roleGroups = new Map<
    string,
    {
      role: string;
      roleLabel: string;
      files: Array<{
        savedName: string;
        originalName: string;
        kind: string;
        sizeBytes: number;
        usePolicy: string;
        usePolicyLabel: string;
        memo: string;
      }>;
    }
  >();
  const kindCounts = new Map<string, number>();
  let totalBytes = 0;

  for (const f of savedFiles) {
    totalBytes += f.size;
    const kind = detectFileKind(f.type, f.originalName);
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);

    const meta = attachmentMetaMap.get(`${f.originalName}|${f.size}`);
    const role = meta?.role ?? "";
    const roleLabel = role ? labelOf(MATERIAL_ROLE_LABELS, role) : "用途未設定";
    const usePolicy = meta?.usePolicy ?? "";
    const usePolicyLabel = usePolicy ? labelOf(USE_POLICY_LABELS, usePolicy) : "";
    const memo = meta?.memo ?? "";

    if (!roleGroups.has(roleLabel)) {
      roleGroups.set(roleLabel, { role, roleLabel, files: [] });
    }
    roleGroups.get(roleLabel)!.files.push({
      savedName: f.savedName,
      originalName: f.originalName,
      kind,
      sizeBytes: f.size,
      usePolicy,
      usePolicyLabel,
      memo,
    });
  }

  const byRole = Array.from(roleGroups.values()).map((g) => ({
    role: g.role,
    roleLabel: g.roleLabel,
    count: g.files.length,
    files: g.files,
  }));
  const byKind = Array.from(kindCounts.entries()).map(([kind, count]) => ({
    kind,
    count,
  }));

  const assetChecklistLabels = assetsStatus
    .map((v) => labelOf(ASSET_LABELS, v))
    .filter((s) => s.length > 0);

  /* ---- 不足素材の推定 ---- */
  const hasNone = assetsStatus.includes("none");
  const providedValues = hasNone ? [] : assetsStatus;
  const inferredMissingLabels = STANDARD_MATERIALS.filter(
    (m) => !providedValues.includes(m.value)
  ).map((m) => m.label);

  const recommendedFollowUp: string[] = [];
  if (hasNone || inferredMissingLabels.length === STANDARD_MATERIALS.length) {
    recommendedFollowUp.push("すべての素材が未提出。ヒアリングで必要素材を確定する。");
  } else if (inferredMissingLabels.length > 0) {
    recommendedFollowUp.push(`未提供素材の準備を依頼する: ${inferredMissingLabels.join("・")}`);
  }
  if (supplementRaw === "all") {
    recommendedFollowUp.push(
      "不足写真・文章を金井側で作成・撮影するとのこと。撮影スケジュールと画像生成方針を策定する。"
    );
  } else if (supplementRaw === "partial") {
    recommendedFollowUp.push("不足素材の一部補充を希望。代行範囲を要相談する。");
  }
  if (
    requiredPagesOrFeatures.some((f) => /実績|ギャラリー|施工事例/.test(f)) &&
    inferredMissingLabels.includes("写真・画像")
  ) {
    recommendedFollowUp.push(
      "実績/ギャラリー掲載予定だが写真が未提供。施工事例写真の撮影/生成を優先する。"
    );
  }
  if (
    requiredPagesOrFeatures.some((f) => /料金表|メニュー|コース/.test(f)) &&
    inferredMissingLabels.includes("製品・サービスの資料")
  ) {
    recommendedFollowUp.push("料金表/メニュー掲載予定だが資料が未提供。料金データの提供を依頼する。");
  }

  /* ---- 自動化ヒント ---- */
  // コード生成
  const codeGeneration: string[] = [];
  for (const feature of requiredPagesOrFeatures) {
    for (const h of FEATURE_CODE_HINTS) {
      if (h.match.test(feature) && !codeGeneration.includes(h.hint)) {
        codeGeneration.push(h.hint);
      }
    }
  }
  if (requiredPagesOrFeatures.length === 0) {
    codeGeneration.push(
      "必要ページ/機能が未選択。業種標準構成（TOP/会社/サービス/お問い合わせ）をベースにする。"
    );
  }

  // 画像生成
  const imageGeneration: string[] = [];
  if (hasNone || inferredMissingLabels.includes("写真・画像")) {
    imageGeneration.push("メインビジュアル（ヒーロー）画像の生成/選定を優先する。");
  }
  if (requiredPagesOrFeatures.some((f) => /実績|ギャラリー|施工事例/.test(f))) {
    imageGeneration.push("実績/ギャラリー用ダミー画像を生成し、実物受領まで差し替える。");
  }
  if (colorSchemeLabel && colorSchemeRaw !== "none") {
    imageGeneration.push(`配色トーン（${colorSchemeLabel}）に合わせたアイキャッチ画像を生成する。`);
  }
  if (interpretedSites.some((s) => s.typeRaw === "image")) {
    imageGeneration.push("参考サイトの写真/ビジュアル方向性を、画像生成のトーン参考にする。");
  }
  if (imageGeneration.length === 0) {
    imageGeneration.push("提供画像が十分。画像生成は差し替え用ダミー程度に留める。");
  }

  // 原稿作成
  const contentDrafting: string[] = [];
  if (hasNone || inferredMissingLabels.includes("文章・キャッチコピー")) {
    contentDrafting.push("キャッチコピー・各ページ原稿の草案作成を優先する。");
  }
  if (inferredMissingLabels.includes("会社概要・会社案内の資料")) {
    contentDrafting.push("会社概要ページ用原稿（代表挨拶・沿革・理念）を起案する。");
  }
  if (sellingPoints.length === 0) {
    contentDrafting.push("強み・差別化の記述が薄い。ヒアリングして強み原稿を補強する。");
  }
  if (contentDrafting.length === 0) {
    contentDrafting.push("原稿素材が揃っている。提供テキストの構成/最適化が主作業になる。");
  }

  // 手動レビュー
  const manualReview: string[] = [];
  if (!targetCustomerRaw)
    manualReview.push("ターゲット層 (targetCustomer) が空。ペルソナ確認が必須。");
  if (!sellingPointsRaw)
    manualReview.push("強み・差別化 (sellingPoints) が空。ヒアリングが必須。");
  if (!mustIncludeInfoRaw)
    manualReview.push("必須掲載情報 (mustIncludeInfo) が空。掲載要件の確認が必須。");
  if (interpretedSites.length > 0) {
    manualReview.push(
      `参考サイト ${interpretedSites.length} 件を実機確認し、構成/デザイン/色/写真を分析する。`
    );
  }
  if (budgetRaw === "unknown")
    manualReview.push("予算が「わからない」。プラン提案のすり合わせが必須。");
  if (freeMessage) manualReview.push("自由記述メモあり。要望の実現可能性を確認する。");
  if (isRenewal)
    manualReview.push("既存サイトあり。引き継ぐべきコンテンツ/資産を精査する。");
  if (manualReview.length === 0) manualReview.push("入力は網羅的。通常どおり進行可能。");

  /* ---- Brief の組み立て ---- */
  return {
    schemaVersion: BRIEF_SCHEMA_VERSION,
    submissionId,
    generatedAt,

    projectOverview: {
      companyName,
      enterpriseName,
      businessType,
      contactPerson,
      contactEmail,
      contactPhone,
      currentWebsite,
      hasCurrentWebsite,
      timingRaw,
      timingLabel,
      budgetRaw,
      budgetLabel,
      annualPaymentInterest,
      freeMessage,
    },

    targetAudience: {
      rawDescription: targetCustomerRaw,
      inferredSegments,
    },

    businessSummary: {
      businessType,
      summary: businessSummaryText,
      isRenewal,
      currentIssues: resolvedCurrentIssues,
    },

    valueProposition: {
      sellingPointsRaw,
      sellingPoints,
    },

    requiredSiteGoals,
    requiredPagesOrFeatures,
    requiredMustIncludeInfo,

    desiredTone: {
      imageDescription: desiredImage,
      colorSchemeRaw,
      colorSchemeLabel,
    },

    avoidTone: {
      rawAvoidItems: avoidItemsRaw,
      avoidItems,
      currentIssues: resolvedCurrentIssues,
    },

    referenceStrategy: {
      referenceCount: interpretedSites.length,
      sites: interpretedSites,
      aggregateHints: referenceAggregateHints,
    },

    providedMaterialsSummary: {
      fileCount: savedFiles.length,
      totalBytes,
      byRole,
      byKind,
      assetChecklistRaw: assetsStatus,
      assetChecklistLabels,
      supplementRaw,
      supplementLabel: supplementRaw ? labelOf(SUPPLEMENT_LABELS, supplementRaw) : "",
      allowEditRaw,
      allowEditLabel: allowEditRaw ? labelOf(ALLOW_EDIT_LABELS, allowEditRaw) : "",
    },

    missingMaterials: {
      declaredMissingRaw: assetsStatus,
      inferredMissingLabels,
      recommendedFollowUp,
    },

    automationHints: {
      codeGeneration,
      imageGeneration,
      contentDrafting,
      manualReview,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  POST /api/consult                                                  */
/* ------------------------------------------------------------------ */

export async function POST(request: Request): Promise<Response> {
  // --- Content-Type の簡易チェック ---
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return Response.json(
      {
        ok: false,
        error:
          "リクエスト形式が正しくありません（multipart/form-data で送信してください）。",
      },
      { status: 415 }
    );
  }

  // --- FormData をパース ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "フォームデータの読み取りに失敗しました。",
      },
      { status: 400 }
    );
  }

  // --- 構造化ペイロード（JSON 文字列）を取得・検証 ---
  const payloadField = formData.get("payload");
  if (typeof payloadField !== "string" || payloadField.length === 0) {
    return Response.json(
      {
        ok: false,
        error: "送信データ（payload）が見つかりません。",
      },
      { status: 400 }
    );
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadField);
  } catch {
    return Response.json(
      {
        ok: false,
        error: "送信データの形式（JSON）が不正です。",
      },
      { status: 400 }
    );
  }

  // --- 保存先ディレクトリを準備 ---
  const submissionId = createSubmissionId();
  const submissionDir = join(SUBMISSIONS_DIR, submissionId);
  const filesDir = join(submissionDir, "files");

  try {
    await mkdir(filesDir, { recursive: true });
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "サーバーで保存領域を準備できませんでした。しばらくしてからもう一度お試しください。",
      },
      { status: 500 }
    );
  }

  // --- ファイルだけを収集して保存 ---
  // ※ "payload" フィールド以外で、値が File（Blob）のものをファイルとみなす
  const savedFiles: SavedFileMeta[] = [];
  try {
    let index = 0;
    for (const [field, value] of formData.entries()) {
      if (field === "payload") continue;
      // File でない値（文字列など）は無視
      if (typeof value === "string") continue;
      // File / Blob チェック
      if (typeof (value as File).arrayBuffer !== "function") continue;

      if (savedFiles.length >= MAX_FILES) {
        return Response.json(
          {
            ok: false,
            error: `ファイル数が多すぎます（最大 ${MAX_FILES} 件まで）。`,
          },
          { status: 413 }
        );
      }

      const file = value as File;
      const originalName = file.name || `file-${index + 1}`;
      const safeName = sanitizeFilename(originalName);
      // 連番プレフィックスで同名ファイルの衝突を防ぐ
      const seq = String(index + 1).padStart(2, "0");
      const savedName = `${seq}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      await writeFile(join(filesDir, savedName), Buffer.from(arrayBuffer));

      savedFiles.push({
        field,
        originalName,
        savedName,
        size: file.size,
        type: file.type,
      });
      index += 1;
    }
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "ファイルの保存中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      },
      { status: 500 }
    );
  }

  // --- 構造化データ（JSON）を保存 ---
  const submissionRecord = {
    submissionId,
    receivedAt: new Date().toISOString(),
    payload: parsedPayload,
    fileCount: savedFiles.length,
    files: savedFiles,
  };

  try {
    await writeFile(
      join(submissionDir, "submission.json"),
      JSON.stringify(submissionRecord, null, 2),
      "utf8"
    );
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "送信データの保存中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      },
      { status: 500 }
    );
  }

  // --- 構造化ブリーフ（brief.json）を生成・保存 ---
  // 送信データから下流の自動ウェブサイト生成に使えるブリーフを組み立てる。
  // この時点で submission.json は保存済みなので、ブリーフ生成/書き込みが
  // 失敗しても送信自体は成功扱いとし、結果を briefGenerated で返す。
  let briefGenerated = false;
  let briefPath: string | null = null;
  try {
    const brief = buildBrief(submissionId, parsedPayload, savedFiles);
    await writeFile(
      join(submissionDir, "brief.json"),
      JSON.stringify(brief, null, 2),
      "utf8"
    );
    briefGenerated = true;
    briefPath = `${DISPLAY_ROOT}/${submissionId}/brief.json`;
  } catch {
    // ブリーフ生成/書き込み失敗 — 送信データは保存済みなので続行
    briefGenerated = false;
  }

  // --- お客様別ドラフトプレビュー URL の生成 ---
  // 送信内容から最小ペイロードを組み立てて base64url で URL に埋め込む。
  // ディスク（brief/submission）に依存しないので、本番 serverless でも
  // お客様がそのまま開いて初稿プレビューを確認できる。生成/エンコードに
  // 失敗しても送信自体は成功扱いとし、結果を draftUrl で返す（null 可）。
  let draftUrl: string | null = null;
  try {
    const draftPayload = buildDraftPayload(parsedPayload, submissionId);
    const encoded = encodeDraft(draftPayload);
    draftUrl = `${absoluteBaseUrl(request)}/draft?d=${encoded}`;
  } catch {
    draftUrl = null;
  }

  // --- 成功レスポンス ---
  return Response.json({
    ok: true,
    submissionId,
    fileCount: savedFiles.length,
    /** 保存先（ローカルは相対パス, Vercelは絶対パス） */
    path: `${DISPLAY_ROOT}/${submissionId}`,
    /** 構造化ブリーフ（brief.json）を生成・保存できたか */
    briefGenerated,
    /** ブリーフの保存先（生成失敗時は null） */
    briefPath,
    /** お客様別の初稿プレビュー URL（絶対 URL）。生成失敗時は null */
    draftUrl,
    /** 保存モード（"local" | "serverless"）— 検証・確認用 */
    storageMode: IS_SERVERLESS ? "serverless" : "local",
    /** 実際の保存ルート（絶対パス）— 検証・確認用 */
    storageBase: SUBMISSIONS_DIR,
  });
}
