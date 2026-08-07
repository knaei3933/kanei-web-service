/* ------------------------------------------------------------------ */
/*  Proposal payload（提案ページ用ペイロード生成）                       */
/* ------------------------------------------------------------------ */
/*  相談送信データから、Monet カタログを用いた「構成提案」をその場で     */
/*  描画するためのペイロードを組み立てる。純粋関数・決定論的。           */
/*                                                                    */
/*  設計のねらい:                                                       */
/*    - カタログ本体（recommendedStructure / referencePages）は提案     */
/*      ページ側で useCaseKey から都度参照する。カタログはバンドル済み   */
/*      の静的データなので、serverless（Vercel）でもディスク不要で読める。*/
/*    - したがって URL には「consult 由来の表示情報」と「useCaseKey」    */
/*      だけを base64url で埋め込む。URL が長くなりすぎない。            */
/*    - 信頼できない入力（URL パラメータ）は decode 時にカタログで       */
/*      再正規化する（useCaseKey の妥当性・ラベル・説明文はカタログ       */
/*      から上書き）。                                                  */
/* ------------------------------------------------------------------ */

import {
  MONET_CATALOG,
  getMonetUseCase,
  type MonetUseCaseKey,
} from "@/generated/monet-catalog";
import { resolveStyle, type DraftStyleKey } from "@/lib/draft";

/** Monet 業種ユースケースキー（カタログからの再エクスポート） */
export type { MonetUseCaseKey } from "@/generated/monet-catalog";

/* ------------------------------------------------------------------ */
/*  業種マッピング（Draft テーマキー → Monet ユースケースキー）         */
/* ------------------------------------------------------------------ */

/** draft.ts の resolveStyle() の結果をカタログのユースケースキーへ変換 */
const STYLE_TO_USE_CASE: Record<DraftStyleKey, MonetUseCaseKey> = {
  factory: "manufacturing",
  construction: "construction",
  restaurant: "restaurant",
  salon: "salon",
  clinic: "clinic",
  consulting: "consulting",
};

/**
 * 事業種（自由入力）から Monet ユースケースキーを決定論的に解決する。
 * draft.ts のキーワード判定を共有し、カタログの妥当なキーへ割り当てる。
 * resolveStyle の既定値は factory → manufacturing にフォールバック。
 */
export function resolveUseCaseKey(businessType: string): MonetUseCaseKey {
  const styleKey = resolveStyle(businessType);
  return STYLE_TO_USE_CASE[styleKey] ?? "manufacturing";
}

/* ------------------------------------------------------------------ */
/*  選択肢コード → 日本語ラベル（consult/page.tsx の選択肢と同期）       */
/* ------------------------------------------------------------------ */

const BUDGET_LABELS: Record<string, string> = {
  "9800": "月額 ¥9,800",
  "15000": "月額 ¥15,000",
  "20000": "月額 ¥20,000",
  unknown: "ご相談にて決定",
};

const TIMING_LABELS: Record<string, string> = {
  asap: "できるだけ早く（1〜2週間）",
  "1month": "1ヶ月以内",
  "3months": "3ヶ月以内",
  "no-rush": "特に急ぎではない",
};

/** コード値を日本語ラベルに。未定義コードは空文字。 */
function labelOf(map: Record<string, string>, code: string): string {
  return code && Object.prototype.hasOwnProperty.call(map, code) ? map[code] : "";
}

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列化（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** unknown を安全に文字列配列化（空除去・重複排除） */
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

/** 文字列を指定長で切り詰める（UTF-8 境界を壊さないよう Array.from で安全に） */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const chars = Array.from(text);
  return chars.slice(0, max).join("") + "…";
}

/** 自由テキストを箇条書きに分割（読点・改行・中点・スラッシュ等） */
function splitToItems(text: string, max = 6): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts)).slice(0, max);
}

/** 配列要素を切り詰め・件数制限付きで整形 */
function capItems(
  items: string[],
  opts: { itemMax: number; maxCount: number }
): string[] {
  return items
    .map((s) => truncate(s, opts.itemMax))
    .filter((s) => s.length > 0)
    .slice(0, opts.maxCount);
}

/* ------------------------------------------------------------------ */
/*  ペイロード                                                          */
/* ------------------------------------------------------------------ */

/** URL に埋め込む提案ペイロード（カタログ本体を除く最小情報） */
export interface ProposalPayload {
  /** 受領 ID */
  submissionId: string;
  /** 事業体名 */
  companyName: string;
  /** 屋号（事業体名が空のときの予備） */
  enterpriseName: string;
  /** 事業種（自由入力） */
  businessType: string;
  /** Monet 業種ユースケースキー（カタログ参照用） */
  useCaseKey: MonetUseCaseKey;
  /** 業種表示名（カタログの label） */
  useCaseLabel: string;
  /** 構成方針（カタログの description） */
  useCaseDescription: string;
  /** 伝えたいイメージ */
  desiredImage: string;
  /** ターゲット・理想のお客様 */
  targetCustomer: string;
  /** 強み・差別化（箇条書き） */
  strengths: string[];
  /** 必ず載せたい情報（箇条書き） */
  mustInclude: string[];
  /** 必要なページ・機能（箇条書き） */
  features: string[];
  /** ご予算コード */
  budget: string;
  /** ご予算の日本語ラベル */
  budgetLabel: string;
  /** 公開希望時期コード */
  timing: string;
  /** 公開希望時期の日本語ラベル */
  timingLabel: string;
  /** ご担当者名 */
  contactName: string;
  /** メールアドレス */
  email: string;
  /** 電話番号 */
  phone: string;
  /** 提案元カタログのバージョン（鮮度判定用） */
  catalogSourceVersion: string;
}

/* ------------------------------------------------------------------ */
/*  構築                                                                */
/* ------------------------------------------------------------------ */

/**
 * 相談送信ペイロードから、提案描画用のペイロードを組み立てる。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。Monet カタログを参照して
 * 業種ユースケースを決定する。
 */
export function buildProposalPayload(
  payloadRaw: unknown,
  submissionId: string
): ProposalPayload {
  const payload =
    payloadRaw !== null && typeof payloadRaw === "object" && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};

  const businessType = asString(payload.businessType);
  const useCaseKey = resolveUseCaseKey(businessType);
  // カタログから信頼できる表示情報を取り出す（入力由来の useCaseKey は無視）
  const useCase = getMonetUseCase(useCaseKey);

  const budget = asString(payload.budget);
  const timing = asString(payload.timing);

  return {
    submissionId: truncate(submissionId, 40),
    companyName: truncate(asString(payload.companyName), 60),
    enterpriseName: truncate(asString(payload.enterpriseName), 60),
    businessType: truncate(businessType, 40),
    useCaseKey: useCase.key,
    useCaseLabel: useCase.label,
    useCaseDescription: useCase.description,
    desiredImage: truncate(asString(payload.desiredImage), 200),
    targetCustomer: truncate(asString(payload.targetCustomer), 200),
    strengths: capItems(splitToItems(asString(payload.sellingPoints), 8), {
      itemMax: 80,
      maxCount: 8,
    }),
    mustInclude: capItems(splitToItems(asString(payload.mustIncludeInfo), 10), {
      itemMax: 80,
      maxCount: 10,
    }),
    features: capItems(
      Array.from(
        new Set([
          ...asStringArray(payload.features),
          ...splitToItems(asString(payload.featuresOther), 12),
        ])
      ),
      { itemMax: 60, maxCount: 12 }
    ),
    budget,
    budgetLabel: labelOf(BUDGET_LABELS, budget),
    timing,
    timingLabel: labelOf(TIMING_LABELS, timing),
    contactName: truncate(asString(payload.name), 40),
    email: truncate(asString(payload.email), 120),
    phone: truncate(asString(payload.phone), 30),
    catalogSourceVersion: MONET_CATALOG.sourceVersion,
  };
}

/* ------------------------------------------------------------------ */
/*  エンコード / デコード（base64url）                                  */
/* ------------------------------------------------------------------ */

/**
 * 提案ペイロードを URL セーフな base64url 文字列にエンコードする。
 * UTF-8（日本語）対応。draft.ts と同じ方式。
 */
export function encodeProposal(payload: ProposalPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * base64url 文字列から提案ペイロードを復元する。
 * 形式不正・破損時は null を返す（呼び出し側でフォールバック表示に使う）。
 * 信頼できない useCaseKey はカタログで再正規化し、ラベル・説明文も
 * カタログから上書きする。
 */
export function decodeProposal(encoded: string): ProposalPayload | null {
  try {
    if (!encoded || encoded.length === 0) return null;
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const raw = JSON.parse(json);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const o = raw as Record<string, unknown>;

    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const arr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

    // useCaseKey は信頼できないのでカタログで正規化
    const useCase = getMonetUseCase(str(o.useCaseKey));

    const budget = str(o.budget);
    const timing = str(o.timing);

    return {
      submissionId: truncate(str(o.submissionId), 40),
      companyName: truncate(str(o.companyName), 60),
      enterpriseName: truncate(str(o.enterpriseName), 60),
      businessType: truncate(str(o.businessType), 40),
      useCaseKey: useCase.key,
      useCaseLabel: useCase.label,
      useCaseDescription: useCase.description,
      desiredImage: truncate(str(o.desiredImage), 200),
      targetCustomer: truncate(str(o.targetCustomer), 200),
      strengths: arr(o.strengths).map((s) => truncate(s, 80)).slice(0, 8),
      mustInclude: arr(o.mustInclude).map((s) => truncate(s, 80)).slice(0, 10),
      features: arr(o.features).map((s) => truncate(s, 60)).slice(0, 12),
      budget,
      budgetLabel: labelOf(BUDGET_LABELS, budget),
      timing,
      timingLabel: labelOf(TIMING_LABELS, timing),
      contactName: truncate(str(o.contactName), 40),
      email: truncate(str(o.email), 120),
      phone: truncate(str(o.phone), 30),
      // 常に現在のカタログバージョンで上書き（鮮度はページ側で判定）
      catalogSourceVersion: MONET_CATALOG.sourceVersion,
    };
  } catch {
    return null;
  }
}
