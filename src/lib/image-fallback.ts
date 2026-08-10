/* ------------------------------------------------------------------ */
/*  AI画像フォールバック評価（サーバー側・決定論的）                     */
/* ------------------------------------------------------------------ */
/*  顧客提供の素材（写真・ロゴなど）が不足しているとき、AI生成の          */
/*  「仮画像」で穴埋めすべきかを判定し、運用に使える内部ガイド・           */
/*  メタデータ・プロンプト断片を組み立てる。                              */
/*                                                                        */
/*  設計のねらい（Phase D）:                                              */
/*    - 既存シグナル（materialsAnalysis.missingAssets / 必要ページ・機能  */
/*      / 参考サイト / allowEdit / supplement 等）から、決定論的に判定。    */
/*    - 内部レビューと実行ハンドオフで「何が足りないか・AI仮画像を使う    */
/*      べきか・どの種類を優先して作るか」を一目で分かるようにする。        */
/*    - 画像生成の経路はローカルオペレータが /usr/bin/codex -m gpt-5.5     */
/*      で実行する前提。serverless のリクエストハンドラからは codex を     */
/*      起動しない（このモジュールはガイド・メタデータを生成するだけ）。   */
/*    - 生成物は「AI フォールバック資産」として追跡できる命名規則を提示。  */
/*    - 顧客向け文言は、提供素材とAI仮画像を明確に区別する。               */
/*                                                                        */
/*  純粋関数（同じ入力 → 同じ出力）。LLM 不使用・外部依存なし。            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  画像生成経路（内部専用・固定）                                       */
/* ------------------------------------------------------------------ */

/**
 * 画像生成に使うローカルコマンドの実行ファイルパス。
 * serverless ではなく、ローカルオペレータが実行することを前提とする。
 */
export const IMAGE_GENERATION_TOOL = "/usr/bin/codex";

/**
 * 画像生成に使うモデル名。
 */
export const IMAGE_GENERATION_MODEL = "gpt-5.5";

/**
 * AI生成画像を顧客提供素材と区別・追跡するためのファイル名プレフィックス。
 * 生成物は必ずこのプレフィックス付きで保存し、トレーサビリティを保証する。
 */
export const AI_FALLBACK_ASSET_PREFIX = "ai-fallback-";

/* ------------------------------------------------------------------ */
/*  型定義                                                              */
/* ------------------------------------------------------------------ */

/** AI仮画像フォールバックの総合判定 */
export type ImageFallbackStatus = "recommended" | "allowed" | "not_needed";

/** 生成優先度（高いほど先に作る） */
export type GenerationPriorityLevel = "high" | "medium" | "low";

/** 生成すべき画像カテゴリ1件（優先順位リストの要素） */
export interface ImageGenerationTarget {
  /** カテゴリ名（日本語・内部確認用） */
  category: string;
  /** このカテゴリを生成する理由（日本語） */
  reason: string;
  /** 優先度 */
  priority: GenerationPriorityLevel;
  /** codex に渡すプロンプト断片（日本語・内部専用） */
  promptFragment: string;
}

/**
 * 画像生成経路（内部専用）。
 * serverless では実行せず、ローカルオペレータが実行する前提のメタ。
 */
export interface ImageGenerationPath {
  /** 実行ファイルパス（固定） */
  tool: string;
  /** モデル名（固定） */
  model: string;
  /** コマンドのテンプレート（プレースホルダ <プロンプト> を差し替えて使う） */
  commandTemplate: string;
  /** 代表的な優先カテゴリを流し込んだ実行例（コピー実行用・内部専用） */
  exampleCommand: string;
  /** 運用上の注意（serverless 非実行・トレーサビリティ 等） */
  notice: string;
}

/** 生成物をトレーサブルにするための規則 */
export interface AiAssetTraceability {
  /** ファイル名プレフィックス */
  prefix: string;
  /** メタデータに付与すべき生成元フラグ */
  marker: string;
  /** 運用規則（日本語） */
  rule: string;
}

/** AI画像フォールバックの評価結果 */
export interface ImageFallbackAssessment {
  /** 総合判定 */
  status: ImageFallbackStatus;
  /** 顧客提供素材で画像が足りないか（判定の根拠となるフラグ） */
  customerAssetsInsufficient: boolean;
  /** 判定理由（日本語・内部確認用） */
  rationale: string[];
  /** 不足している画像カテゴリ（日本語ラベル） */
  missingImageCategories: string[];
  /** 生成すべき優先順位リスト（高い順） */
  generationPriority: ImageGenerationTarget[];
  /** 画像生成経路（内部専用） */
  generationPath: ImageGenerationPath;
  /** カテゴリ別のプロンプト断片（内部専用・実行ハンドオフ用） */
  promptBlocks: string[];
  /** 顧客向け注記（提供素材とAI仮画像の区別） */
  customerFacingNote: string;
  /** AI生成資産のトレーサビリティ規則 */
  assetTraceability: AiAssetTraceability;
  /** 評価日時（ISO8601） */
  assessedAt: string;
}

/**
 * assessImageFallback への入力（シグナルバッグ）。
 * approval-package（materialsAnalysis 等）と brief（payload 由来）の
 * どちらからも埋められるよう、型に依存しない平たい入力にする。
 */
export interface ImageFallbackInput {
  /** 不足素材ラベル（"写真・画像" / "ロゴデータ" 等） */
  missingAssets: string[];
  /** 顧客が用意できると申告した素材ラベル */
  usableAssets: string[];
  /** 添付ファイルの種別ラベル一覧（"画像" / "PDF" / "ベクターロゴ" 等） */
  attachmentKinds: string[];
  /** 添付ファイル総数 */
  attachmentCount: number;
  /** 必須掲載情報（ギャラリー等の検出用） */
  requiredMustInclude: string[];
  /** 必要ページ・機能ラベル一覧 */
  requiredPagesOrFeatures: string[];
  /** 画像系（type=image）の参考サイトがあるか */
  hasImageReference: boolean;
  /** 伝えたいイメージ（desiredImage・自由文） */
  desiredImage: string;
  /** 配色コード（colorSchemeRaw・"none" は無指定扱い） */
  colorSchemeRaw: string;
  /** 補充意思（"all"=金井が全部作成 / "partial" / "self"=顧客が用意） */
  supplementRaw: string;
  /** 編集許可（"yes" / "partial" / "no"） */
  allowEditRaw: string;
}

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** 配列を安全に（非配列は空配列） */
function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((s) => typeof s === "string") : [];
}

/** 配列のいずれかが正規表現にマッチするか */
function someMatch(items: string[], pattern: RegExp): boolean {
  return items.some((s) => pattern.test(s));
}

/** トーン文章（desiredImage + 配色）を組み立てる（プロンプト断片用） */
function tonePhrase(desiredImage: string, colorSchemeRaw: string): string {
  const parts: string[] = [];
  if (desiredImage) parts.push(`雰囲気「${desiredImage}」`);
  if (colorSchemeRaw && colorSchemeRaw !== "none") {
    parts.push(`配色系統=${colorSchemeRaw}`);
  }
  return parts.length > 0 ? parts.join("・") : "雰囲気・配色は業種標準";
}

/* ------------------------------------------------------------------ */
/*  評価本体                                                            */
/* ------------------------------------------------------------------ */

/**
 * 顧客提供素材が不足しているとき、AI生成の仮画像でフォールバックすべきかを
 * 決定論的に評価する。純粋関数（同じ入力 → 同じ出力）。
 *
 * serverless から codex は起動しない。この関数は判定とガイド・メタデータの
 * 生成だけを行い、実際の画像生成はローカルオペレータが行う。
 */
export function assessImageFallback(
  input: ImageFallbackInput
): ImageFallbackAssessment {
  const missingAssets = safeArray(input.missingAssets);
  const usableAssets = safeArray(input.usableAssets);
  const attachmentKinds = safeArray(input.attachmentKinds);
  const requiredMustInclude = safeArray(input.requiredMustInclude);
  const requiredPagesOrFeatures = safeArray(input.requiredPagesOrFeatures);
  const attachmentCount =
    typeof input.attachmentCount === "number" ? input.attachmentCount : 0;
  const hasImageReference = input.hasImageReference === true;
  const desiredImage = (input.desiredImage ?? "").trim();
  const colorSchemeRaw = (input.colorSchemeRaw ?? "").trim();
  const supplementRaw = (input.supplementRaw ?? "").trim();
  const allowEditRaw = (input.allowEditRaw ?? "").trim();

  /* ---- 画像需要の検出 ---- */
  const missingPhotos = missingAssets.includes("写真・画像");
  const missingLogo = missingAssets.includes("ロゴデータ");
  const hasImageAttachment =
    attachmentKinds.includes("画像") || attachmentKinds.includes("ベクターロゴ");
  const wantsGallery = someMatch(
    [...requiredPagesOrFeatures, ...requiredMustInclude],
    /実績|ギャラリー|施工事例|事例|ポートフォリオ|works|gallery/i
  );
  const wantsMenu = someMatch(
    [...requiredPagesOrFeatures, ...requiredMustInclude],
    /料金|メニュー|コース|プラン|price|menu/i
  );

  // 画像がそもそも必要か（提供不足 or ギャラリー需要に画像がない）
  const imagesNeeded =
    missingPhotos ||
    missingLogo ||
    (wantsGallery && !hasImageAttachment) ||
    (attachmentCount === 0 && (wantsGallery || missingAssets.length >= 3));

  /* ---- 総合判定 ---- */
  const rationale: string[] = [];
  let status: ImageFallbackStatus;

  if (!imagesNeeded) {
    status = "not_needed";
    rationale.push("顧客提供の写真・ロゴで画像は概ね足りている。");
    if (hasImageAttachment) {
      rationale.push("画像系の添付ファイルが確認できる。");
    }
  } else {
    // 金井がすべて作成する方針のときは、AI仮画像を積極採用
    const kaneiHandlesAll = supplementRaw === "all";
    // 写真もロゴも両方欠けていて添付もない場合は、提供見込みが薄い
    const deeplyMissing = missingPhotos && missingLogo && attachmentCount === 0;

    if (kaneiHandlesAll || deeplyMissing) {
      status = "recommended";
      if (kaneiHandlesAll) {
        rationale.push("不足素材は金井がすべて作成・撮影する方針（supplement=all）。");
      }
      if (deeplyMissing) {
        rationale.push("写真・ロゴが両方未提供で添付もないため、AI仮画像で進める。");
      }
    } else {
      status = "allowed";
      if (supplementRaw === "self") {
        rationale.push("写真・文章は顧客が用意する方針。AI仮画像は受け取りまでの差し替え用。");
      } else if (supplementRaw === "partial") {
        rationale.push("不足素材の一部補充を希望。未補充分はAI仮画像で補う。");
      } else {
        rationale.push("画像の一部が不足。実物受領までAI仮画像で運用する。");
      }
    }

    if (missingPhotos) rationale.push("「写真・画像」が未提供。");
    if (missingLogo) rationale.push("「ロゴデータ」が未提供。");
    if (wantsGallery && !hasImageAttachment) {
      rationale.push("実績/ギャラリーの掲載予定があるが、画像添付がない。");
    }
    if (allowEditRaw && allowEditRaw !== "no") {
      rationale.push(`画像の編集・加工は許可されている（allowEdit=${allowEditRaw}）。`);
    } else if (allowEditRaw === "no") {
      rationale.push("画像の編集・加工は原則不可（allowEdit=no）。AI仮画像は仮扱いとする。");
    }
    // 顧客が「用意できる」と申告済みの素材は受領見込み。AI仮画像の対象は
    // その申告ではカバーされない残りの不足分だけであることを明示する。
    if (usableAssets.length > 0) {
      rationale.push(
        `顧客申告の提供可能素材（${usableAssets.join("・")}）は受領待ちとして扱い、AI仮画像は残る不足分のみ補う。`
      );
    }
  }

  /* ---- 不足カテゴリと優先順位 ---- */
  const tone = tonePhrase(desiredImage, colorSchemeRaw);
  const missingImageCategories: string[] = [];
  const generationPriority: ImageGenerationTarget[] = [];

  const addTarget = (
    category: string,
    reason: string,
    priority: GenerationPriorityLevel,
    promptFragment: string
  ) => {
    missingImageCategories.push(category);
    generationPriority.push({ category, reason, priority, promptFragment });
  };

  if (imagesNeeded) {
    addTarget(
      "メインビジュアル（ヒーロー）",
      "ファーストビューを決める最重要画像。提供がなければ最優先で生成する。",
      "high",
      `メインビジュアル（ヒーロー）画像を1点生成する。${tone}。業種に沿った写真風・高解像度。テキストを載せやすい余白を残す。`
    );
  }
  if (missingLogo) {
    addTarget(
      "ロゴプレースホルダ",
      "ロゴデータが未提供。実物受領までの仮ロゴ（テキストベース）を用意する。",
      "high",
      `ロゴ未提供のため、仮のテキストロゴプレースホルダを用意する。後日ロゴデータと差し替える前提。`
    );
  }
  if (wantsGallery && (missingPhotos || !hasImageAttachment)) {
    addTarget(
      "実績・ギャラリー画像",
      "実績/ギャラリーを掲載予定だが写真がない。ダミーを生成し、実物受領まで差し替える。",
      "high",
      `実績/ギャラリー用ダミー画像を4〜6点生成する。${tone}。実物と差し替えられるよう同じ縦横比で揃える。`
    );
  }
  if (imagesNeeded && colorSchemeRaw && colorSchemeRaw !== "none") {
    addTarget(
      "アイキャッチ・背景画像",
      "配色系統に合わせたアクセント画像で、各区画の印象を統一する。",
      "medium",
      `配色系統（${colorSchemeRaw}）に合わせたアイキャッチ/背景画像を生成する。${tone}。`
    );
  }
  if (wantsMenu && (missingPhotos || !hasImageAttachment)) {
    addTarget(
      "バナー・メニュー画像",
      "料金/メニュー導線用のバナー。実データが揃うまでの仮画像。",
      "low",
      `料金/メニュー導線用のバナー画像を生成する。${tone}。実データと差し替え前提。`
    );
  }

  /* ---- プロンプト断片（優先順位順） ---- */
  const promptBlocks: string[] = generationPriority.map(
    (t) => `【${t.category}（優先度: ${t.priority}）】\n${t.promptFragment}`
  );
  if (promptBlocks.length === 0) {
    promptBlocks.push("画像生成は不要。顧客提供素材をそのまま使用する。");
  }
  if (hasImageReference) {
    promptBlocks.push(
      "参考サイトの写真/ビジュアル方向性をトーン参考にする（そのままコピーしない）。"
    );
  }

  /* ---- 画像生成経路（内部専用） ---- */
  const commandTemplate = `${IMAGE_GENERATION_TOOL} -m ${IMAGE_GENERATION_MODEL} "<プロンプト>"`;
  const topTarget = generationPriority[0];
  const exampleCommand = topTarget
    ? `${IMAGE_GENERATION_TOOL} -m ${IMAGE_GENERATION_MODEL} "${topTarget.promptFragment} 保存ファイル名は ${AI_FALLBACK_ASSET_PREFIX}<カテゴリ>.png とし、AI生成資産として扱う。"`
    : `${IMAGE_GENERATION_TOOL} -m ${IMAGE_GENERATION_MODEL} "<画像生成プロンプト>"`;

  const generationPath: ImageGenerationPath = {
    tool: IMAGE_GENERATION_TOOL,
    model: IMAGE_GENERATION_MODEL,
    commandTemplate,
    exampleCommand,
    notice:
      "本番（Vercel/serverless）のリクエストハンドラからは codex を起動しない（実行時間・実行環境の制約）。" +
      "ローカル環境のオペレータが実行する。生成物は必ず ai-fallback- プレフィックスで保存し、" +
      "AI フォールバック資産として顧客提供素材と区別・追跡すること。",
  };

  /* ---- 顧客向け注記（提供素材とAI仮画像の区別） ---- */
  let customerFacingNote: string;
  if (status === "not_needed") {
    customerFacingNote =
      "ご提供いただいた写真・画像を中心に制作を進めます。";
  } else {
    const categoriesText =
      missingImageCategories.length > 0
        ? `（${missingImageCategories.join("・")}）`
        : "";
    customerFacingNote =
      "ご提供いただいた写真・画像を優先して使います。" +
      `不足する部分${categoriesText}には、一時的にAIで生成した仮画像を使用し、` +
      "実物が揃い次第、順次差し替えます。仮画像は本公開前に入れ替えることを前提としています。";
  }

  /* ---- トレーサビリティ ---- */
  const assetTraceability: AiAssetTraceability = {
    prefix: AI_FALLBACK_ASSET_PREFIX,
    marker: "ai-generated",
    rule:
      "AI生成画像は必ず ai-fallback- プレフィックスのファイル名で保存し、" +
      "メタデータに aiGenerated:true を付与する。" +
      "顧客提供素材（logo-/photo- 等）と混同しないよう、常にプレフィックスで区別・追跡すること。",
  };

  return {
    status,
    customerAssetsInsufficient: imagesNeeded,
    rationale,
    missingImageCategories,
    generationPriority,
    generationPath,
    promptBlocks,
    customerFacingNote,
    assetTraceability,
    assessedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  表示用ヘルパ                                                        */
/* ------------------------------------------------------------------ */

/** ステータスの日本語ラベル */
export function imageFallbackStatusLabel(
  status: ImageFallbackStatus
): string {
  switch (status) {
    case "recommended":
      return "AI仮画像を推奨";
    case "allowed":
      return "AI仮画像を許容（差し替え前提）";
    case "not_needed":
      return "AI仮画像は不要";
    default:
      return status;
  }
}

/** 優先度の日本語ラベル */
export function generationPriorityLabel(
  priority: GenerationPriorityLevel
): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return priority;
  }
}
