#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  Monet レジストリ → コミット済みカタログ抽出スクリプト             */
/* ------------------------------------------------------------------ */
/*  sibling リポジトリ monet-registry-main の生成物 JSON を読み込み、   */
/*  このレポジトリにコミットする TypeScript カタログ                    */
/*  (src/generated/monet-catalog.ts) を生成する。                       */
/*                                                                    */
/*  実行時（Vercel 含む）は sibling リポジトリに依存しない。生成物は    */
/*  純粋なデータなので、デプロイ先でレジストリ JSON が無くても動く。    */
/*                                                                    */
/*  特徴:                                                              */
/*    - 決定論的: 同じ元データ → 同じ出力（再実行で diff が出ない）    */
/*      ・セクション選定は (keywords数降順 → id昇順) の安定ソート       */
/*      ・generatedAt は元データの createdAt の最大値                   */
/*      ・sourceVersion は元データの SHA-256 先頭12桁                  */
/*    - 無効な preview パス（他人のローカル絶対パス等）を正規化         */
/*    - 6 業種ユースケース別に「推奨セクション構成」をキュレーション   */
/*                                                                    */
/*  使い方: npm run extract:monet                                      */
/* ------------------------------------------------------------------ */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");

/** 元データのあるディレクトリ（sibling リポジトリ） */
const GENERATED_DIR = resolve(
  REPO_ROOT,
  "..",
  "monet-registry-main",
  "public",
  "generated"
);
const REGISTRY_PATH = join(GENERATED_DIR, "registry.json");
const PAGE_REGISTRY_PATH = join(GENERATED_DIR, "page-registry.json");

/** 生成物の出力先 */
const OUT_PATH = join(REPO_ROOT, "src", "generated", "monet-catalog.ts");

/* ================================================================== */
/*  小物ヘルパ                                                          */
/* ================================================================== */

/** unknown を安全に文字列化（前後空白を除去） */
function asStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

/** unknown を安全に文字列配列化（空除去・重複排除） */
function asStrArr(v) {
  if (!Array.isArray(v)) return [];
  const seen = new Set();
  const out = [];
  for (const item of v) {
    const s = asStr(item);
    if (s.length === 0 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** unknown を安全にオブジェクト化 */
function asObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v
    : {};
}

/**
 * preview 画像パスを正規化する。
 * - 他人のローカル絶対パス（/Users/..., C:\...）は無効なので "" にする
 * - 先頭が "/" の場合は除去（レジストリ public/ からの相対に揃える）
 * - それ以外はそのまま（agent-input/..., scraped/...）
 */
function normalizePreview(raw) {
  const p = asStr(raw);
  if (p.length === 0) return "";
  // Windows ドライブ文字 or /Users 等のローカル絶対パスは無効
  if (/^[A-Za-z]:[\\/]/.test(p)) return "";
  if (p.startsWith("/Users/") || p.startsWith("/home/")) return "";
  // 先頭の / は除去（相対パスに統一）
  if (p.startsWith("/")) return p.slice(1);
  return p;
}

/* ================================================================== */
/*  6 業種ユースケースの定義（スロット → registry category + 根拠）    */
/* ================================================================== */

/**
 * 各ユースケースの推奨サイト構成。
 * slot: 提案ページで表示する日本語の区画名
 * category: registry.json の section category に対応
 * rationale: なぜその区画を推奨するか（日本語）
 */
const USE_CASE_STRUCTURE = {
  manufacturing: {
    label: "製造・工業",
    description:
      "B2Bの信頼性と技術力を前面に。実績の数値と主要取引先で安心感を担保する構成。",
    slots: [
      { slot: "ヒーロー（技術と信頼のアピール）", category: "hero", rationale: "第一印象で「技術力と確かな実績」を伝え、B2Bの信頼の出足を作る。" },
      { slot: "実績の数値（数字で説得力を）", category: "stats", rationale: "創業年数・納品実績・対応国など、数字で客観的な信頼を示す。" },
      { slot: "技術・設備の紹介", category: "feature-showcase", rationale: "自社の強みである設備・工程・品質管理を見せ、差別化を図る。" },
      { slot: "主要取引先・認証", category: "logo-cloud", rationale: "取引先や取得認証のロゴを並べ、安心材料を補強する。" },
      { slot: "お客様の声・導入事例", category: "testimonial", rationale: "既存顧客の声で、抽象的な技術力を具体の信頼に変える。" },
      { slot: "お問い合わせ・資料請求", category: "cta", rationale: "B2Bは比較検討が長い。資料請求の導線を明確に置く。" },
    ],
  },
  construction: {
    label: "建設・不動産",
    description:
      "施工の“質”をビジュアルで証明する構成。ビフォーアフターと実績数値が説得力の核。",
    slots: [
      { slot: "ヒーロー（地域に愛される仕事）", category: "hero", rationale: "施工の質と地域密着を第一印象に乗せ、安心感を作る。" },
      { slot: "ビフォーアフター施工例", category: "before-after", rationale: "建設は“見せる”が最大の営業。施工前後の対比で技術を証明する。" },
      { slot: "施工・工事の強み", category: "feature-showcase", rationale: "対応工事の幅・工法・アフター保証を整理して示す。" },
      { slot: "対応実績の数値", category: "stats", rationale: "完工件数・対応エリア・経年数で信頼を数値化する。" },
      { slot: "お客様の声", category: "testimonial", rationale: "近隣の施工事例の声が、新規依頼の最大の後押しになる。" },
      { slot: "無料見積もりのご案内", category: "cta", rationale: "建設は相見積もりが普通。まずは気軽に、の導線を置く。" },
    ],
  },
  restaurant: {
    label: "飲食・フード",
    description:
      "“美味しそう”を伝えるビジュアル中心の構成。口コミと予約導線で来店に繋げる。",
    slots: [
      { slot: "ヒーロー（おもてなしの空気感）", category: "hero", rationale: "店舗の雰囲気と料理の魅力を、最も大きく見せる。" },
      { slot: "看板メニュー・料理", category: "feature-showcase", rationale: "飲食はメニュー写真が決め手。看板商品をリッチに見せる。" },
      { slot: "お客様の声・口コミ", category: "testimonial", rationale: "SNS・口コミの声が来店判断に直結する。" },
      { slot: "よくある質問", category: "faq", rationale: "予約方法・予算・席・駐車場など、来店前の不安を潰す。" },
      { slot: "予約・ご来店のご案内", category: "cta", rationale: "飲食は“今すぐ予約”の導線が売上に直結する。" },
    ],
  },
  salon: {
    label: "美容・理美容",
    description:
      "スタイルと体験価値を伝える構成。スタッフ紹介と料金の透明性で予約を促す。",
    slots: [
      { slot: "ヒーロー（あなただけのスタイル）", category: "hero", rationale: "ビジュアル業種。理想のスタイル体験を印象付ける。" },
      { slot: "メニュー・コース", category: "feature-showcase", rationale: "提供メニューを美しく整理し、選びやすく見せる。" },
      { slot: "スタイリスト紹介", category: "team", rationale: "担当者選びが来店の鍵。スタッフの得意分野を示す。" },
      { slot: "料金プラン", category: "pricing", rationale: "透明な料金表示が、予約の心理的ハードルを下げる。" },
      { slot: "お客様の声", category: "testimonial", rationale: "ビフォーアフター付きの声が、技術の証明になる。" },
      { slot: "よくある質問", category: "faq", rationale: "施術時間・支払い・キャンセルなど、事前の不安を潰す。" },
      { slot: "ご予約はこちら", category: "cta", rationale: "美容室は“空き枠を押さえる”導線が最重要。" },
    ],
  },
  clinic: {
    label: "整骨・整体・クリニック",
    description:
      "安心と丁寧さを伝える構成。スタッフの資格と丁寧な説明で初見の不安を和らげる。",
    slots: [
      { slot: "ヒーロー（寄り添う丁寧な対応）", category: "hero", rationale: "「安心して任せられる」を第一印象にする。" },
      { slot: "診療・施術メニュー", category: "feature-showcase", rationale: "対応する症状とメニューを分かりやすく整理する。" },
      { slot: "スタッフ・資格紹介", category: "team", rationale: "医療・介護系は“誰に診てもらうか”が信頼の核。" },
      { slot: "よくある質問", category: "faq", rationale: "初診の不安（痛くないか・保険が効くか等）を先回りして解消。" },
      { slot: "お客様・患者様の声", category: "testimonial", rationale: "症状が改善した体験談が、最も説得力を持つ。" },
      { slot: "ご予約・お問い合わせ", category: "cta", rationale: "クリニック系は予約導線の明示が来院に直結する。" },
    ],
  },
  consulting: {
    label: "IT・コンサル・士業",
    description:
      "専門性と実績を論理的に示す構成。料金体系と事例で「頼める相手」を証明する。",
    slots: [
      { slot: "ヒーロー（課題解決のパートナー）", category: "hero", rationale: "専門性と提供価値を端的に伝え、関心を惹く。" },
      { slot: "サービス内容", category: "feature-showcase", rationale: "何を依頼できるかを構造化して示す。" },
      { slot: "プラン・料金体系", category: "pricing", rationale: "士業・コンサルは料金の透明性が問合せの鍵。" },
      { slot: "実績の数値", category: "stats", rationale: "解決件数・対応規模等で、専門性を数値で裏付ける。" },
      { slot: "導入実績・取引先", category: "logo-cloud", rationale: "実績のある顧客層を示し、信頼度を高める。" },
      { slot: "お客様の声・解決事例", category: "testimonial", rationale: "具体の課題解決エピソードが成約を後押しする。" },
      { slot: "よくある質問", category: "faq", rationale: "契約・対応範囲・期間など、依頼前の懸念を潰す。" },
      { slot: "無料相談のお申込み", category: "cta", rationale: "士業・コンサルは“まずは相談”の導線が命。" },
    ],
  },
};

const USE_CASE_KEYS = Object.keys(USE_CASE_STRUCTURE);

/* ================================================================== */
/*  代表セクションの選定（決定論的）                                    */
/* ================================================================== */

/**
 * ある category のセクション一覧を、代表度が高い順にソートする。
 * ソートキー:
 *  1. freeformKeywords が多いほど優先
 *  2. preview 画像パスが有効（空でない）ほど優先
 *  3. componentPath が "@/components/registry/" で始まるほど優先
 *  4. id の辞書順（最終的な安定ソート）
 */
function rankSections(sections) {
  return [...sections].sort((a, b) => {
    const ak = a.keywords.length;
    const bk = b.keywords.length;
    if (bk !== ak) return bk - ak;
    const ap = a.previewPath ? 1 : 0;
    const bp = b.previewPath ? 1 : 0;
    if (bp !== ap) return bp - ap;
    const ac = a.hasComponentPath ? 1 : 0;
    const bc = b.hasComponentPath ? 1 : 0;
    if (bc !== ac) return bc - ac;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/* ================================================================== */
/*  メイン                                                               */
/* ================================================================== */

function main() {
  // --- 元データの存在確認 ---
  if (!existsSync(REGISTRY_PATH) || !existsSync(PAGE_REGISTRY_PATH)) {
    console.error(
      "[extract-monet-catalog] 元データが見つかりません。sibling リポジトリを確認してください:"
    );
    console.error("  " + REGISTRY_PATH);
    console.error("  " + PAGE_REGISTRY_PATH);
    process.exit(1);
  }

  const registryRaw = readFileSync(REGISTRY_PATH, "utf8");
  const pageRegistryRaw = readFileSync(PAGE_REGISTRY_PATH, "utf8");
  const registry = JSON.parse(registryRaw);
  const pageRegistry = JSON.parse(pageRegistryRaw);

  const registryEntries = Object.values(asObj(registry));
  const pageEntries = Object.values(asObj(pageRegistry));

  /* ---- セクション参照の組み立て ---- */
  const allSections = [];
  const byCategory = new Map();
  for (const raw of registryEntries) {
    const e = asObj(raw);
    const id = asStr(e.id);
    if (!id) continue;
    const category = asStr(e.category);
    const keywords = asStrArr(e.freeformKeywords);
    const styles = asStrArr(asObj(e.tags).style);
    const componentPath = asStr(e.componentPath);
    const ref = {
      id,
      category,
      title: asStr(e.title) || asStr(e.name) || id,
      componentPath,
      previewPath: normalizePreview(asObj(e.images).preview),
      keywords,
      styles,
      hasComponentPath: componentPath.startsWith("@/components/registry/"),
    };
    allSections.push(ref);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(ref);
  }

  /* ---- category ごとの代表（上位 N 件）を確定 ---- */
  const REPS_PER_CATEGORY = 4;
  const representativesByCategory = new Map();
  for (const [cat, list] of byCategory.entries()) {
    representativesByCategory.set(
      cat,
      rankSections(list).slice(0, REPS_PER_CATEGORY)
    );
  }

  /** ある category の代表の先頭1件（無ければ null）を返す */
  const topOf = (cat) => {
    const reps = representativesByCategory.get(cat);
    return reps && reps.length > 0 ? reps[0] : null;
  };

  /* ---- ページ参照の組み立て ---- */
  const allPages = [];
  for (const raw of pageEntries) {
    const p = asObj(raw);
    const id = asStr(p.id);
    if (!id) continue;
    const tags = asObj(p.tags);
    const source = asObj(p.source);
    allPages.push({
      id,
      title: asStr(p.title) || asStr(p.name) || id,
      pageType: asStr(p.pageType) || "landing",
      componentPath: asStr(p.componentPath),
      previewPath: normalizePreview(asObj(p.images).preview),
      sourceUrl: asStr(source.url) || undefined,
      industries: asStrArr(tags.industry),
      functionalTags: asStrArr(tags.functional),
      styleTags: asStrArr(tags.style),
      sectionIds: asStrArr((p.sections || []).map((s) => asStr(asObj(s).id))),
    });
  }
  // ページも安定ソート（タグ付き優先 → id 昇順）
  allPages.sort((a, b) => {
    const at = a.industries.length + a.functionalTags.length;
    const bt = b.industries.length + b.functionalTags.length;
    if (bt !== at) return bt - at;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  /** 各ユースケースの関連ページ（タグ合致優先、最大3件、不足は代表で埋める） */
  function referencePagesFor(useCaseKey) {
    // ユースケースと相性の良い industry キーワード（緩いヒューリスティック）
    const affinity = {
      manufacturing: ["saas", "ai", "fintech"],
      construction: ["saas", "fintech"],
      restaurant: ["saas", "ai"],
      salon: ["saas", "ai"],
      clinic: ["saas", "fintech", "ai"],
      consulting: ["saas", "ai", "fintech"],
    };
    const wanted = affinity[useCaseKey] || [];
    const scored = allPages.map((pg) => {
      const score = pg.industries.filter((x) => wanted.includes(x)).length;
      return { pg, score };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ai = allPages.indexOf(a.pg);
      const bi = allPages.indexOf(b.pg);
      return ai - bi;
    });
    return scored.slice(0, 3).map((s) => s.pg);
  }

  /* ---- ユースケースの組み立て ---- */
  const useCases = {};
  for (const key of USE_CASE_KEYS) {
    const def = USE_CASE_STRUCTURE[key];
    const recommendedStructure = def.slots.map((s) => {
      const section = topOf(s.category);
      return {
        slot: s.slot,
        category: s.category,
        rationale: s.rationale,
        section: section
          ? {
              id: section.id,
              title: section.title,
              category: section.category,
              componentPath: section.componentPath,
              previewPath: section.previewPath,
              keywords: section.keywords,
              styles: section.styles,
            }
          : null,
      };
    });
    const selectedSectionIds = recommendedStructure
      .map((s) => s.section?.id)
      .filter((x) => Boolean(x));

    useCases[key] = {
      key,
      label: def.label,
      description: def.description,
      recommendedStructure,
      selectedSectionIds,
      referencePages: referencePagesFor(key),
    };
  }

  /* ---- 全代表セクション（フラット）: 提案ページの“参考コンポーネント”参照用 ---- */
  const featuredSections = [];
  for (const cat of [
    ...new Set([...representativesByCategory.keys()].sort()),
  ]) {
    for (const r of representativesByCategory.get(cat)) {
      featuredSections.push({
        id: r.id,
        title: r.title,
        category: r.category,
        componentPath: r.componentPath,
        previewPath: r.previewPath,
        keywords: r.keywords,
        styles: r.styles,
      });
    }
  }

  /* ---- 決定論的なメタ情報 ---- */
  // generatedAt: 元データの createdAt の最大値（レジストリ更新時のみ変わる）
  const createdAts = [
    ...registryEntries.map((e) => asStr(asObj(e).createdAt)),
    ...pageEntries.map((e) => asStr(asObj(e).createdAt)),
    ...pageEntries.map((e) => asStr(asObj(asObj(e).source).scrapedAt)),
  ].filter((s) => s.length > 0);
  createdAts.sort();
  const generatedAt = createdAts.length > 0 ? createdAts[createdAts.length - 1] : "";
  // sourceVersion: 元データの内容ハッシュ
  const sourceVersion = createHash("sha256")
    .update(registryRaw)
    .update("\u0000")
    .update(pageRegistryRaw)
    .digest("hex")
    .slice(0, 12);

  const catalog = {
    schemaVersion: "1.0.0",
    generatedAt,
    sourceVersion,
    totalSections: allSections.length,
    totalPages: allPages.length,
    useCases,
    featuredSections,
    pages: allPages,
  };

  /* ---- TypeScript ファイルとして書き出し ---- */
  const out = renderTypeScript(catalog);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, out, "utf8");

  console.log("[extract-monet-catalog] カタログを生成しました:");
  console.log("  出力: " + OUT_PATH);
  console.log(
    `  セクション総数: ${catalog.totalSections} / ページ総数: ${catalog.totalPages}`
  );
  console.log(`  代表セクション: ${catalog.featuredSections.length} 件`);
  console.log(`  ユースケース: ${USE_CASE_KEYS.length}`);
  console.log(`  sourceVersion: ${catalog.sourceVersion}`);
  console.log(`  generatedAt:   ${catalog.generatedAt || "(不明)"}`);
}

/* ================================================================== */
/*  TypeScript ソースの組み立て                                          */
/* ================================================================== */

/** 値を TypeScript リテラルとして整形（インデント付き） */
function renderValue(value, indent) {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => `${padInner}${renderValue(v, indent + 1)},`);
    return `[\n${items.join("\n")}\n${pad}]`;
  }
  // object
  const keys = Object.keys(value);
  if (keys.length === 0) return "{}";
  const entries = keys.map(
    (k) => `${padInner}${k}: ${renderValue(value[k], indent + 1)},`
  );
  return `{\n${entries.join("\n")}\n${pad}}`;
}

/** カタログ全体を TypeScript ファイル文字列にする */
function renderTypeScript(catalog) {
  const ts = `/* ------------------------------------------------------------------ */
/*  ⚠️ このファイルは自動生成です。手動で編集しないでください。         */
/* ------------------------------------------------------------------ */
/*  生成元: monet-registry-main/public/generated/{registry,page-registry}.json */
/*  生成スクリプト: scripts/extract-monet-catalog.mjs                   */
/*                                                                    */
/*  このカタログは「Monet レジストリ」から抽出した参照用データです。     */
/*  実行時（Vercel 含む）は sibling リポジトリに依存せず、このファイル   */
/*  だけで動作します。再生成は次のコマンドで行います:                   */
/*                                                                    */
/*    npm run extract:monet                                            */
/*                                                                    */
/*  sourceVersion が同じなら、再生成しても同一の内容になります。         */
/* ------------------------------------------------------------------ */

/** Monet カタログが扱う 6 業種ユースケースのキー */
export type MonetUseCaseKey =
  | "manufacturing"
  | "construction"
  | "restaurant"
  | "salon"
  | "clinic"
  | "consulting";

/** レジストリから抽出したセクション（コンポーネント）の参照 */
export interface MonetSectionRef {
  /** レジストリ内のセクション ID（例: "bolta-io-faq-7"） */
  id: string;
  /** 表示名 */
  title: string;
  /** registry.json の category（hero / pricing / faq ...） */
  category: string;
  /** Monet レポジトリ側のコンポーネントパス（参考元の明示用・実行時 import はしない） */
  componentPath: string;
  /** preview 画像の相対パス（無効な絶対パスは空文字化されている場合あり） */
  previewPath: string;
  /** レジストリ側のフリーフォームキーワード */
  keywords: string[];
  /** スタイルタグ（light-theme / minimal ...） */
  styles: string[];
}

/** レジストリから抽出した完成ランディングページの参照 */
export interface MonetPageRef {
  id: string;
  title: string;
  pageType: string;
  componentPath: string;
  previewPath: string;
  /** 元サイトの URL（参考元の明示用） */
  sourceUrl?: string;
  industries: string[];
  functionalTags: string[];
  styleTags: string[];
  sectionIds: string[];
}

/** 提案内の推奨サイト構成の1区画 */
export interface MonetStructureSlot {
  /** 区画の日本語名（例: "ヒーロー（技術と信頼のアピール）"） */
  slot: string;
  /** 対応する registry category */
  category: string;
  /** その区画を推奨する根拠（日本語） */
  rationale: string;
  /** 当てはめた代表セクション参照（該当なしは null） */
  section: MonetSectionRef | null;
}

/** 業種ユースケースのカタログエントリ */
export interface MonetUseCase {
  key: MonetUseCaseKey;
  /** 日本語の業種表示名 */
  label: string;
  /** この構成の方針（日本語） */
  description: string;
  /** 推奨サイト構成（上から下への並び順） */
  recommendedStructure: MonetStructureSlot[];
  /** このユースケースで採用したセクション ID の一覧 */
  selectedSectionIds: string[];
  /** 関連する完成ランディングページ（参考元） */
  referencePages: MonetPageRef[];
}

/** Monet カタログ全体 */
export interface MonetCatalog {
  schemaVersion: string;
  /** 元データの更新日時（レジストリの createdAt の最大値） */
  generatedAt: string;
  /** 元データの内容ハッシュ先頭12桁（同一性判定用） */
  sourceVersion: string;
  totalSections: number;
  totalPages: number;
  useCases: Record<MonetUseCaseKey, MonetUseCase>;
  /** 各 category の代表セクション一覧（“参考コンポーネント”参照用） */
  featuredSections: MonetSectionRef[];
  /** 全ランディングページの参照 */
  pages: MonetPageRef[];
}

export const MONET_CATALOG: MonetCatalog = ${renderValue(
    catalog,
    1
  )} as const;

/** ユースケースキーの一覧（順序保証） */
export const MONET_USE_CASE_KEYS: MonetUseCaseKey[] = [
  "manufacturing",
  "construction",
  "restaurant",
  "salon",
  "clinic",
  "consulting",
];

/** ユースケースだけを取り出したショートカット */
export const MONET_USE_CASES: Record<MonetUseCaseKey, MonetUseCase> =
  MONET_CATALOG.useCases;

/**
 * 業種キーからユースケースを取得する。
 * 無効なキーは manufacturing にフォールバックする。
 */
export function getMonetUseCase(
  key: MonetUseCaseKey | string | undefined
): MonetUseCase {
  if (key && (key as MonetUseCaseKey) in MONET_USE_CASES) {
    return MONET_USE_CASES[key as MonetUseCaseKey];
  }
  return MONET_USE_CASES.manufacturing;
}
`;
  return ts;
}

main();
