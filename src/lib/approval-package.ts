/* ------------------------------------------------------------------ */
/*  承認パッケージ（approval package）モデル + 永続化ヘルパ             */
/* ------------------------------------------------------------------ */
/*  相談1件ごとに作られる「社内レビュー用の統制ドキュメント」。          */
/*  このパッケージが、パイプラインが次の段階へ進んでよいかを決める。     */
/*                                                                      */
/*  Phase 2 の役割（承認ゲート付きパイプライン）:                       */
/*    - 顧客送信 → 品質評価 → 承認パッケージ作成                        */
/*    - 代表者がインテイクを承認すると、OMC 計画アーティファクトを      */
/*      生成し、status を awaiting_plan_approval へ進める（第2ゲート）   */
/*    - 計画を承認すると、実行ハンドオフ成果物（プロンプト/メタデータ/  */
/*      Claude コマンド）を生成し、approved_for_execution へ進める       */
/*    - Claude Code の実行は serverless では行わず、ローカルオペレータ   */
/*      への「実行ハンドオフ」として成果物だけを生成する（正直な設計）   */
/*                                                                      */
/*  保存先（src/server/submission-storage アダプタ経由・環境で切替）:    */
/*    - local     : data/consult-submissions/<id>/approval-package.json */
/*    - relay     : 固定ルート(/api/submission-storage)→WSL リレーへ     */
/*                  HTTP 経由で恒久保存（本番・リレー設定あり）          */
/*    - ephemeral : 本番でリレー未設定時の /tmp（一時・非恒久）          */
/* ------------------------------------------------------------------ */

import type { ConsultIntakeQuality } from "./consult-quality";
import type { PromptStagePreview } from "./prompt-chain";
import { buildPromptChainPreview } from "./prompt-chain";
import { getMonetUseCase, MONET_CATALOG } from "@/generated/monet-catalog";
import { resolveUseCaseKey } from "@/lib/proposal";
import {
  assessImageFallback,
  type GenerationPriorityLevel,
  type ImageFallbackAssessment,
  type ImageGenerationTarget,
} from "./image-fallback";
import {
  writeArtifact,
  readArtifact,
  artifactDisplayPath,
} from "@/server/submission-storage";
import { resolveShowcaseComponentPath } from "@/lib/showcase-map";

/** 承認パッケージのスキーマバージョン（下流ツールの互換性確認用） */
export const APPROVAL_SCHEMA_VERSION = "1.1.0";

/**
 * 承認パッケージの状態。
 *   - received / needs_followup / awaiting_representative_approval: 受領〜代表確認
 *   - awaiting_plan_approval:          代表がインテイクを承認し、計画アーティファクト生成済み・第2ゲート待ち
 *   - approved_for_execution:          計画を承認し、実行ハンドオフ生成済み（実行準備完了）
 *   - approved_for_planning:           Phase 1 の旧状態（後方互換用・新規には出力しない）
 *   - demo_generating:                 Claude Code がデモを生成中
 *   - demo_deployed:                   デモがデプロイ済み・顧客確認待ち
 *   - demo_revision_ready:            顧客フィードバックを受信、Claude Code で修正の準備完了
 *   - demo_revised:                   修正版デモ再デプロイ済み
 *   - customer_approved:              顧客がデモ方向性を承認（本制作前ヒアリング待ち）
 *   - pre_production_interview:       本制作前のヒアリング・追加素材収集中
 *   - pre_production_review:          ヒアリング完了・再検証後、代表の本制作最終承認待ち（第3ゲート）
 *   - production_ready:               本制作開始可能（第3ゲート承認済み）
 *   - delivered:                      納品済み
 *   - rejected:                        却下
 */
export type ApprovalStatus =
  | "received"
  | "needs_followup"
  | "awaiting_representative_approval"
  | "awaiting_plan_approval"
  | "approved_for_execution"
  | "approved_for_planning"
  | "demo_generating"
  | "demo_deployed"
  | "demo_revision_ready"
  | "demo_revised"
  | "customer_approved"
  | "pre_production_interview"
  | "pre_production_review"
  | "production_ready"
  | "delivered"
  | "rejected";

/** 代表者の判定。未判定時は null。 */
export type RepresentativeDecision = "approve" | "reject" | "hold" | null;

/**
 * 顧客向けの表示状態（完了画面の分岐用）。
 * 内部ステータス（ApprovalStatus）とは別に、顧客に見せる意味だけ持つ。
 * レビューURL やプロンプトチェーン等の内部情報はこれに含めない。
 */
export type CustomerFacingStatus =
  | "followup_requested"
  | "under_internal_review"
  | "demo_ready_for_review"
  | "demo_revision_submitted"
  | "demo_approved"
  | "pre_production_in_progress";

/** 承認パッケージに含める品質評価（consult-quality の結果と同じ形） */
export type ApprovalIntakeQuality = ConsultIntakeQuality;

/** ビジネス要約（代表者レビュー用） */
export interface ApprovalReviewSummary {
  /** 事業の簡潔な要約 */
  businessSummary: string;
  /** ターゲット層の要約 */
  targetUserSummary: string;
  /** 強み・差別化の要約 */
  strengthsSummary: string[];
  /** 必須掲載情報の要約 */
  mustIncludeSummary: string[];
  /** リスクのある前提・仮定 */
  riskyAssumptions: string[];
}

/** 参考サイト分析（代表者レビュー用） */
export interface ApprovalReferenceAnalysis {
  /** 参考サイトの URL 一覧（未入力カードは除外済み） */
  referenceUrls: string[];
  /** 抽出対象として適格な URL */
  urlsEligibleForExtraction: string[];
  /** 抽出不適格・利用不可の URL（Phase 1 では空。クローラ未実装のため） */
  urlsBlockedOrUnusable: string[];
  /** 希望する再現度（close / partial / inspiration のラベル） */
  requestedFollowStrength: string[];
  /** 抽出対象セクション/部位（likedSections / whatToReference の統合） */
  sectionTargets: string[];
}

/** 素材・資料の準備状況（代表者レビュー用） */
export interface ApprovalMaterialsAnalysis {
  /** 提出された添付ファイル一覧 */
  availableAttachments: Array<{
    originalName: string;
    savedName: string;
    sizeBytes: number;
    kind: string;
  }>;
  /** 顧客が「用意できる」と申告した素材（ラベル） */
  usableAssets: string[];
  /** 推定で不足している素材（ラベル） */
  missingAssets: string[];
}

/** 代表者の承認/却下メタ */
export interface ApprovalDecision {
  /** 判定結果 */
  representativeDecision: RepresentativeDecision;
  /** 判定日時（ISO8601・未判定時は null） */
  decidedAt: string | null;
  /** 判定者（任意入力） */
  decidedBy: string | null;
  /** 判定に添えるメモ（任意） */
  memo: string | null;
}

/* ------------------------------------------------------------------ */
/*  Phase 2: OMC 計画アーティファクト + 計画承認 + 実行ハンドオフ        */
/* ------------------------------------------------------------------ */

/** 計画アーティファクトのスキーマバージョン */
export const PLANNING_SCHEMA_VERSION = "1.1.0";

/** 実行ハンドオフのスキーマバージョン */
export const EXECUTION_HANDOFF_SCHEMA_VERSION = "1.0.0";

/** Monetマッピングアーティファクトのスキーマバージョン */
export const MONET_MAPPING_SCHEMA_VERSION = "1.0.0";

/** 実行準拠性アーティファクトのスキーマバージョン */
export const EXECUTION_CONFORMANCE_SCHEMA_VERSION = "1.0.0";

/* ------------------------------------------------------------------ */
/*  Phase 2: Monetコンポーネントマッピングアーティファクト          */
/* ------------------------------------------------------------------ */

/** コンポーネントの再利用分類 */
export type ComponentReuseType = "reusable" | "needs_adjustment" | "custom_only";

/** Monet推奨セクションの候補コンポーネント（構造化データ） */
export interface MonetCandidateComponent {
  /** セクションID */
  id: string;
  /** 表示名 */
  title: string;
  /** カテゴリ（hero / pricing / faq 等） */
  category: string;
  /** Monetレポジトリ側のコンポーネントパス */
  componentPath: string;
  /** 再利用分類 */
  reuseType: ComponentReuseType;
  /** 再利用判断の理由（日本語） */
  reuseReason: string;
}

/** Monet推奨セクション1件のマッピング情報 */
export interface MonetRecommendedSection {
  /** スロット名（例: "ヒーロー（技術と信頼のアピール）"） */
  slot: string;
  /** 対応するカテゴリ */
  category: string;
  /** 推奨根拠（日本語） */
  rationale: string;
  /** 候補コンポーネント（該当なしはnull） */
  candidateComponent: MonetCandidateComponent | null;
}

/** Monetコンポーネントマッピングアーティファクト */
export interface MonetMappingArtifact {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 生成方式（決定論的であることの明示） */
  generatedBy: "deterministic-planner";
  /** 事業種 */
  businessType: string;
  /** Monet use case key */
  useCaseKey: string;
  /** Monet use case label（日本語） */
  useCaseLabel: string;
  /** 構成方針（日本語） */
  useCaseDescription: string;
  /** 推奨セクション構造 */
  recommendedSections: MonetRecommendedSection[];
  /** 再利用可能なコンポーネント一覧 */
  reusable: MonetCandidateComponent[];
  /** 調整が必要なコンポーネント一覧 */
  needsAdjustment: MonetCandidateComponent[];
  /** カスタム実装が必要なセクション一覧 */
  customOnly: MonetRecommendedSection[];
  /** マッピング全体の根拠（日本語） */
  rationale: string[];
  /** 参考ページ一覧（sourceURL付き） */
  referencePages: Array<{
    id: string;
    title: string;
    sourceUrl?: string;
  }>;
}

/**
 * Monetコンポーネントマッピングアーティファクトを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。LLM不使用。
 *
 * 代表者がインテイクを承認したときに生成し、レビュー・実行ハンドオフで参照する。
 */
export function buildMonetMappingArtifact(pkg: ApprovalPackage): MonetMappingArtifact {
  const businessType = extractBusinessTypeFromSummary(
    pkg.reviewSummary.businessSummary
  );
  const useCase = getMonetUseCase(resolveUseCaseKey(businessType));

  // 推奨セクション構造を構造化データに変換
  const recommendedSections: MonetRecommendedSection[] = useCase.recommendedStructure.map((slot) => {
    let reuseType: ComponentReuseType = "custom_only";
    let reuseReason = "該当するMonetコンポーネントがないためカスタム実装が必要";

    const candidateComponent: MonetCandidateComponent | null = slot.section
      ? {
          id: slot.section.id,
          title: slot.section.title,
          category: slot.section.category,
          componentPath: slot.section.componentPath,
          reuseType: "reusable",
          reuseReason: "Monetカタログに完全一致するコンポーネントがあるため、そのまま再利用可能",
        }
      : null;

    if (candidateComponent) {
      reuseType = "reusable";
      reuseReason = "Monetカタログに完全一致するコンポーネントがあるため、そのまま再利用可能";
    }

    return {
      slot: slot.slot,
      category: slot.category,
      rationale: slot.rationale,
      candidateComponent,
    };
  });

  // 再利用分類でグルーピング
  const reusable: MonetCandidateComponent[] = [];
  const needsAdjustment: MonetCandidateComponent[] = [];
  const customOnly: MonetRecommendedSection[] = [];

  for (const section of recommendedSections) {
    if (section.candidateComponent) {
      // 今のところ「あるかないか」の二択だが、将来「要調整」を追加できる設計
      reusable.push(section.candidateComponent);
    } else {
      customOnly.push(section);
    }
  }

  // 参考ページのsourceUrlだけを抽出
  const referencePages = useCase.referencePages.map((p) => ({
    id: p.id,
    title: p.title,
    sourceUrl: p.sourceUrl,
  }));

  const rationale: string[] = [
    `Monetカタログ（${MONET_CATALOG.sourceVersion}）から業種「${useCase.label}」の構成案を抽出。`,
    `推奨セクション数: ${recommendedSections.length}件（再利用可能: ${reusable.length}件、カスタム実装: ${customOnly.length}件）。`,
  ];
  if (pkg.referenceAnalysis.referenceUrls.length > 0) {
    rationale.push(
      `顧客指定の参考サイト: ${pkg.referenceAnalysis.referenceUrls.join("・")}。表現はそのまま複製せず、日本語の自然な商談導線に再構成する。`
    );
  }

  return {
    schemaVersion: MONET_MAPPING_SCHEMA_VERSION,
    submissionId: pkg.submissionId,
    generatedAt: new Date().toISOString(),
    generatedBy: "deterministic-planner",
    businessType,
    useCaseKey: useCase.key,
    useCaseLabel: useCase.label,
    useCaseDescription: useCase.description,
    recommendedSections,
    reusable,
    needsAdjustment,
    customOnly,
    rationale,
    referencePages,
  };
}

/** Monetマッピングアーティファクトの表示用パス */
export function monetMappingPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "monet-mapping.json");
}

/**
 * Monetマッピングアーティファクトを読み込む。
 * ファイル不在・形式不正時はnullを返す。
 */
export async function readMonetMappingArtifact(
  submissionId: string
): Promise<MonetMappingArtifact | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  try {
    const raw = await readArtifact(submissionId, "monet-mapping.json");
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    // 簡易的な正規化
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.schemaVersion === MONET_MAPPING_SCHEMA_VERSION &&
      parsed.submissionId === submissionId
    ) {
      return parsed as MonetMappingArtifact;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Phase 2: 実行準拠性アーティファクト（execution-conformance.json）   */
/* ------------------------------------------------------------------ */

/** 禁止されている行為・発明のカテゴリ */
export type ForbiddenInventionCategory =
  | "legal"
  | "medical_advice"
  | "financial_guarantee"
  | "defamatory"
  | "infringement"
  | "misleading_price"
  | "other";

/** 禁止されている行為・発明1件 */
export interface ForbiddenInvention {
  /** カテゴリ */
  category: ForbiddenInventionCategory;
  /** 検出・推測された内容（日本語） */
  description: string;
  /** 該当箇所（mustInclude または brief の該当テキスト） */
  source: string;
}

/** 資産使用ルールの種類 */
export type AssetUsageRuleType =
  | "ai_generated_credit"
  | "stock_attribution"
  | "copyright_notice"
  | "permission_required"
  | "other";

/** 資産使用ルール1件 */
export interface AssetUsageRule {
  /** ルール種類 */
  ruleType: AssetUsageRuleType;
  /** 適用条件・説明（日本語） */
  description: string;
  /** 該当資産カテゴリ（画像・テキスト・音楽等） */
  assetCategory: string;
}

/**
 * 実行準拠性アーティファクト。
 * 計画承認時に生成され、実行時の準拠要件をまとめる。
 * - 禁止されている行為・発明（リスク回避）
 * - 資産使用ルール（AI生成・ストック写真等の帰属）
 */
export interface ExecutionConformanceArtifact {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 生成方式（決定論的） */
  generatedBy: "deterministic-planner";
  /** 禁止されている行為・発明リスト */
  forbiddenInventions: ForbiddenInvention[];
  /** 資産使用ルールリスト */
  assetUsageRules: AssetUsageRule[];
  /** 準拠要件の全体要約（日本語） */
  rationale: string[];
}

/**
 * 実行準拠性アーティファクトを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。LLM不使用。
 */
export function buildExecutionConformanceArtifact(
  pkg: ApprovalPackage,
  monetMapping: MonetMappingArtifact | null
): ExecutionConformanceArtifact {
  const forbiddenInventions: ForbiddenInvention[] = [];
  const assetUsageRules: AssetUsageRule[] = [];
  const rationale: string[] = [];

  // 禁止行為・発明の検出（mustInclude から高リスクな表現を抽出）
  const mustInclude = pkg.reviewSummary.mustIncludeSummary;
  const businessSummary = pkg.reviewSummary.businessSummary;

  // 医療・法律・金融保証に関する高リスク表現を検出
  const medicalKeywords = ["治療", "効果", "症状", "改善", "予防", "診断", "療法"];
  const legalKeywords = ["訴訟", "裁判", "法的", "違法", "責任", "賠償"];
  const financialKeywords = ["保証", "確実", "安全", "無リスク", "必ず"];

  for (const item of mustInclude) {
    for (const kw of medicalKeywords) {
      if (item.includes(kw)) {
        forbiddenInventions.push({
          category: "medical_advice",
          description: `医療表現「${item}」が含まれています。医療行為・治療効果の表明は医療法規制の対象となり得ます。`,
          source: item,
        });
        break;
      }
    }
    for (const kw of legalKeywords) {
      if (item.includes(kw)) {
        forbiddenInventions.push({
          category: "legal",
          description: `法的表現「${item}」が含まれています。具体的な法的権利・義務の表明は弁護士確認が必要です。`,
          source: item,
        });
        break;
      }
    }
    for (const kw of financialKeywords) {
      if (item.includes(kw)) {
        forbiddenInventions.push({
          category: "financial_guarantee",
          description: `保証表現「${item}」が含まれています。確実な利益・無リスクの表明は景品表示法等の規制対象となり得ます。`,
          source: item,
        });
        break;
      }
    }
  }

  // 資産使用ルールの生成（画像フォールバック状況に基づく）
  const fb = pkg.imageFallback;
  if (fb && fb.status !== "not_needed") {
    assetUsageRules.push({
      ruleType: "ai_generated_credit",
      description: `AI生成画像（${fb.assetTraceability.prefix} プレフィックス）を利用する場合、顧客にその旨を明示し、実物受領後に差し替える必要があります。`,
      assetCategory: "画像",
    });
  }

  if (pkg.materialsAnalysis.availableAttachments.length > 0) {
    const hasImages = pkg.materialsAnalysis.availableAttachments.some(
      (a) => a.kind === "画像"
    );
    if (hasImages) {
      assetUsageRules.push({
        ruleType: "copyright_notice",
        description: "顧客提供の画像は著作権・肖像権の確認が必要です。無断使用を避けてください。",
        assetCategory: "画像",
      });
    }
  }

  rationale.push("実行準拠性アーティファクトは、実行時の法令・著作権・資産運用ルールをまとめるものです。");
  rationale.push(`禁止行為検出: ${forbiddenInventions.length}件、資産使用ルール: ${assetUsageRules.length}件。`);
  if (forbiddenInventions.length > 0) {
    rationale.push("高リスク表現が検出された場合、実行前に専門家の確認を強く推奨します。");
  }

  return {
    schemaVersion: EXECUTION_CONFORMANCE_SCHEMA_VERSION,
    submissionId: pkg.submissionId,
    generatedAt: new Date().toISOString(),
    generatedBy: "deterministic-planner",
    forbiddenInventions,
    assetUsageRules,
    rationale,
  };
}

/** 実行準拠性アーティファクトの表示用パス */
export function executionConformancePathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "execution-conformance.json");
}

/**
 * 実行準拠性アーティファクトを読み込む。
 * ファイル不在・形式不正時はnullを返す。
 */
export async function readExecutionConformanceArtifact(
  submissionId: string
): Promise<ExecutionConformanceArtifact | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  try {
    const raw = await readArtifact(submissionId, "execution-conformance.json");
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.schemaVersion === EXECUTION_CONFORMANCE_SCHEMA_VERSION &&
      parsed.submissionId === submissionId
    ) {
      return parsed as ExecutionConformanceArtifact;
    }
    return null;
  } catch {
    return null;
  }
}

/** 計画1ステージ分（OMC 計画アーティファクトの構成要素） */
export interface PlanningStage {
  /** ステージ識別子（機械処理用） */
  id: string;
  /** 表示名（日本語） */
  title: string;
  /** このステージの目的（日本語） */
  objective: string;
  /** このステージへの入力（日本語の箇条書き） */
  inputs: string[];
  /** このステージが出力する成果物（日本語の箇条書き） */
  outputs: string[];
  /** Claude Code 実行を伴うステージか */
  involvesExecution: boolean;
}

/**
 * OMC 計画アーティファクト。
 * 代表者がインテイクを承認したときに【決定論的に】生成される（LLM 不使用）。
 * 第2ゲート（計画承認）で代表者に提示し、承認されると実行ハンドオフへ受け継がれる。
 */
export interface PlanningArtifact {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 生成方式（LLM 不使用・決定論的であることの明示） */
  generatedBy: "deterministic-planner";
  /** 計画の前提となるブリーフ要点（brief.json のヘッドライン・内部確認用） */
  briefSnapshot: {
    businessSummary: string;
    targetUserSummary: string;
    strengths: string[];
    mustInclude: string[];
    referenceUrls: string[];
  };
  /** 段階別の実行/生成計画 */
  stages: PlanningStage[];
  /** 厳密なステージ順序（stages の id を実行順に列挙） */
  orderedStageIds: string[];
  /** 実行前に満たすべき前提 */
  prerequisites: string[];
  /** 未解決のブロッカー（代表者・オペレータが確認すべき点） */
  blockers: string[];
  /** 計画策定の根拠メモ */
  rationale: string[];
}

/** 計画承認（第2ゲート）の判定メタ。ApprovalDecision と同じ形。 */
export interface PlanApprovalDecision {
  representativeDecision: RepresentativeDecision;
  decidedAt: string | null;
  decidedBy: string | null;
  memo: string | null;
}

/* ------------------------------------------------------------------ */
/*  Phase A: 本制作前ヒアリング（pre-production interview）データモデル  */
/* ------------------------------------------------------------------ */

/** 本制作前ヒアリングの質問1件（代表者が起票・顧客が回答） */
export interface InterviewQuestion {
  /** 質問識別子（機械処理用・英数字と記号） */
  id: string;
  /** 質問文（日本語・顧客向け） */
  text: string;
  /** 必須質問か（未回答だと本制作準備度が下がる） */
  required: boolean;
  /** 入力欄のプレースホルダ（任意・日本語） */
  placeholder?: string;
}

/** 顧客からのヒアリング回答1件 */
export interface InterviewAnswer {
  /** 対応する質問 id */
  questionId: string;
  /** 回答本文（日本語） */
  text: string;
}

/**
 * 本制作前ヒアリングのまとまり。
 * 顧客がデモを承認（customer_approved）したあと、本制作前に追加で収集する。
 * requestedAt に代表者が起票し、answeredAt に顧客が回答する。
 */
export interface PreProductionInterview {
  /** ヒアリング依頼日時（ISO8601） */
  requestedAt: string;
  /** 起票者（admin 等・任意） */
  requestedBy: string | null;
  /** 質問セット */
  questions: InterviewQuestion[];
  /** 顧客の回答（未回答時は null） */
  answers: InterviewAnswer[] | null;
  /** 回答日時（ISO8601・未回答時は null） */
  answeredAt: string | null;
  /** 回答と同時に追加提出された素材ファイル数 */
  additionalMaterialCount: number;
}

/**
 * 本制作準備度の評価結果（assessProductionReadiness のキャッシュ用）。
 * consult-quality と同じ「スコア + 閾値 + reasons」の思想。
 */
export interface ProductionReadiness {
  /** ready: 本制作に進める / needs_followup: 追加ヒアリングが必要 */
  status: "ready" | "needs_followup";
  /** 0〜100 のスコア */
  score: number;
  /** 判定理由（日本語） */
  reasons: string[];
  /** 評価日時（ISO8601） */
  assessedAt: string;
}

/**
 * 実行ハンドオフ成果物（内部専用）。
 * 計画を承認したときに生成する。serverless のリクエストハンドラからは
 * Claude Code を実行せず、ローカルオペレータへ引き渡すための
 * 「プロンプト・メタデータ・コマンド」だけを格納する。
 *
 * プロンプト本文（execution-prompt.md）は別ファイルのため、このオブジェクトには
 * 含めない（レビューページは readExecutionPromptMarkdown で別途読み込む）。
 */
export interface ExecutionHandoff {
  schemaVersion: string;
  submissionId: string;
  generatedAt: string;
  /** 実行方式（serverless では実行せずローカルオペレータへ引き渡す） */
  handoffMode: "local-operator";
  /** 作業ディレクトリ（ローカル実行を想定） */
  workingDirectory: string;
  /** コピー実行用の Claude Code コマンドテキスト（内部専用・顧客非公開） */
  claudeCommand: string;
  /** 実行プロンプトファイルの表示パス（submission フォルダ内） */
  promptFilePath: string;
  /** セクション別実行プロンプトファイルの表示パス（execution-section-prompts.md・Phase P） */
  sectionPromptsFilePath: string;
  /** Monetコンポーネントマッピングアーティファクトの表示パス */
  monetMappingFilePath: string;
  /** ハンドオフメタデータファイルの表示パス */
  metadataFilePath: string;
  /** 計画アーティファクトファイルの表示パス */
  planFilePath: string;
  /** ブリーフファイルの表示パス */
  briefFilePath: string;
  /** この submission 専用の showcase コンポーネント名（拡張子なし） */
  targetComponent?: string | null;
  /** この submission 専用の showcase コンポーネントパス */
  componentPath?: string | null;
  /** 実行前に満たす前提 */
  prerequisites: string[];
  /** 重要事項（serverless 非実行・内部専用など） */
  notices: string[];
  /** ハンドオフ元の計画ステージ順序 */
  plannedStageIds: string[];
}

/** 承認パッケージ本体 */
export interface ApprovalPackage {
  schemaVersion: string;
  submissionId: string;
  receivedAt: string;
  /** 内部ステータス（パイプライン統制用） */
  status: ApprovalStatus;
  /** 顧客向け表示状態（完了画面分岐用） */
  customerFacingStatus: CustomerFacingStatus;
  /** 内部レビューページ URL（社内のみ・顧客には出さない） */
  reviewUrl: string | null;
  /** 品質評価 */
  intakeQuality: ApprovalIntakeQuality;
  /** ビジネス要約 */
  reviewSummary: ApprovalReviewSummary;
  /** 参考サイト分析 */
  referenceAnalysis: ApprovalReferenceAnalysis;
  /** 素材分析 */
  materialsAnalysis: ApprovalMaterialsAnalysis;
  /** 内部向けプロンプトチェーンプレビュー（社内のみ） */
  promptChainPreview: PromptStagePreview[];
  /** 代表者の判定（インテイク承認ゲート） */
  approval: ApprovalDecision;
  /** OMC 計画アーティファクト（代表承認後に生成・未生成時は null） */
  planningArtifact: PlanningArtifact | null;
  /** Monetコンポーネントマッピングアーティファクト（計画生成時に作成・未生成時は null） */
  monetMapping: MonetMappingArtifact | null;
  /** 計画承認（第2ゲート）の判定 */
  planApproval: PlanApprovalDecision;
  /** 実行ハンドオフ（計画承認後に生成・内部専用・未生成時は null） */
  executionHandoff: ExecutionHandoff | null;
  /** 本制作前ヒアリング（顧客デモ承認後に収集・未実施時は null） */
  preProductionInterview: PreProductionInterview | null;
  /** 本制作前最終承認（第3ゲート）の判定。PlanApprovalDecision と同じ形。 */
  preProductionApproval: PlanApprovalDecision;
  /** 本制作準備度評価のキャッシュ（assessProductionReadiness 結果・未評価時は null） */
  productionReadiness: ProductionReadiness | null;
  /**
   * AI画像フォールバック評価（assessImageFallback 結果）。
   * 顧客提供素材が不足しているとき、AI生成の仮画像で運用すべきかを判定し、
   * 内部ガイド・生成経路（/usr/bin/codex -m gpt-5.5）・顧客向け注記を保持する。
   * 評価は決定論的。未評価時は null。
   */
  imageFallback: ImageFallbackAssessment | null;
  /**
   * フォローアップ（追加情報の再提出）が行われたラウンド数。
   * 顧客が needs_followup 状態で情報を更新するたびに +1 される（0 = まだ一度も無い）。
   * 繰り返しループを分かりやすくするためのカウンタ。
   */
  followupRounds: number;
  /** 直近のフォローアップ日時（ISO8601・未実施時は null） */
  lastFollowupAt: string | null;
  /** 直近のフォローアップ後の品質スコア（未実施時は null） */
  lastFollowupScore: number | null;
}

/** buildApprovalPackage に渡す、保存済みファイルの軽量メタデータ */
export interface ApprovalSavedFile {
  originalName: string;
  savedName: string;
  sizeBytes: number;
  type: string;
}

/* ------------------------------------------------------------------ */
/*  保存ルート（consult route と同じロジックを再現）                    */
/* ------------------------------------------------------------------ */

/* 成果物の保存先・表示パスは src/server/submission-storage アダプタが
   環境別（local / relay / ephemeral）に解決する。このファイルでは
   ルートを持たず、writeArtifact / readArtifact / artifactDisplayPath
   経由で扱う。 */

/**
 * 実行ハンドオフで使う「ローカル実行」前提の表示ルート。
 * serverless では Claude Code を実行しないため、ハンドオフのパス・コマンドは
 * 常にローカルクローンを前提とした相対パスで表記する。
 */
const LOCAL_DISPLAY_ROOT = "data/consult-submissions";

/** パス区切りを含まない安全な submissionId か（トラバーサル対策） */
function isSafeSubmissionId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && /^[A-Za-z0-9._-]+$/.test(id);
}

/**
 * 表示用の承認パッケージパスを返す。
 * レスポンスやメールに載せる「人間が読む用」のパス（アダプタ経由で解決）。
 */
export function approvalPackagePathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "approval-package.json");
}

/** 計画アーティファクト（omc-plan.json）の表示用パス */
export function planningArtifactPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "omc-plan.json");
}

function extractBusinessTypeFromSummary(summary: string): string {
  const match = summary.match(/事業種=([^/]+)/);
  return match?.[1]?.trim() ?? "";
}

function buildMonetExecutionNotes(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): string[] {
  const businessType = extractBusinessTypeFromSummary(
    pkg.reviewSummary.businessSummary
  );
  const useCase = getMonetUseCase(resolveUseCaseKey(businessType));
  const lines: string[] = [];

  lines.push("## Monet コンポーネント対応付け");
  lines.push(`- 業種 추정: ${businessType || "未入力"}`);
  lines.push(`- Monet use case: ${useCase.label} (${useCase.key})`);
  lines.push(`- 構成方針: ${useCase.description}`);
  if (useCase.referencePages.length > 0) {
    lines.push(
      `- 参考ページ候補: ${useCase.referencePages
        .slice(0, 3)
        .map((page) => `${page.title} <${page.sourceUrl}>`)
        .join(" / ")}`
    );
  }
  lines.push("");
  lines.push("## セクション別 実行プロンプト（内部用）");
  useCase.recommendedStructure.slice(0, 6).forEach((slot, index) => {
    lines.push(`### ${index + 1}. ${slot.slot}`);
    lines.push(`- 目的: ${slot.rationale}`);
    lines.push(`- 카테고리: ${slot.category}`);
    if (slot.section) {
      lines.push(
        `- Monet 候補: ${slot.section.title} (${slot.section.id}) / ${slot.section.componentPath}`
      );
    } else {
      lines.push("- Monet 候補: 該当なし（カスタム実装前提）");
    }
    lines.push(
      `- 実行指示: ${plan.briefSnapshot.targetUserSummary || "想定顧客"} を意識し、${slot.slot} をこの submission 専用に実装する。必須掲載事項（${plan.briefSnapshot.mustInclude.join("・") || "未整理"}）と整合し、参考サイトの表現はそのまま複製せず、日本語の自然な商談導線に再構成する。`
    );
    lines.push("");
  });

  return lines;
}

/**
 * AI画像フォールバック評価を実行プロンプト用の Markdown 行に変換する（内部専用）。
 * 顧客提供素材が不足しているとき、どの画像を・どの優先度で・どの経路（codex）で
 * 生成すべきかを、ローカルオペレータが実行できる形でまとめる。
 * serverless から codex は起動せず、あくまでオペレータ向けのガイド。
 */
function buildImageFallbackPromptLines(pkg: ApprovalPackage): string[] {
  const fb = pkg.imageFallback;
  const lines: string[] = [];

  if (!fb || fb.status === "not_needed") {
    lines.push("## AI画像フォールバック方針（内部専用）");
    lines.push(
      "- 判定: AI仮画像は不要。顧客提供の写真・ロゴをそのまま使用する。"
    );
    lines.push("");
    return lines;
  }

  lines.push("## AI画像フォールバック方針（内部専用）");
  lines.push(
    `- 判定: ${fb.status === "recommended" ? "AI仮画像を推奨" : "AI仮画像を許容（差し替え前提）"}`
  );
  if (fb.rationale.length > 0) {
    lines.push("- 判定根拠:");
    for (const r of fb.rationale) lines.push(`  - ${r}`);
  }
  if (fb.missingImageCategories.length > 0) {
    lines.push(`- 不足画像カテゴリ: ${fb.missingImageCategories.join("・")}`);
  }
  lines.push("");
  lines.push("### 生成優先順位（高い順）");
  for (const t of fb.generationPriority) {
    lines.push(
      `- 【${t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}】${t.category} — ${t.reason}`
    );
  }
  lines.push("");
  lines.push("### 生成経路（重要）");
  lines.push(
    `- serverless では画像生成を行わない。ローカルオペレータが以下の経路で生成する。`
  );
  lines.push(`- 経路: \`${fb.generationPath.tool} -m ${fb.generationPath.model}\``);
  lines.push("- コマンド例（コピー実行用）:");
  lines.push(`  \`\`\``);
  lines.push(`  ${fb.generationPath.exampleCommand}`);
  lines.push(`  \`\`\``);
  lines.push("");
  lines.push("### カテゴリ別プロンプト断片");
  for (const block of fb.promptBlocks) {
    lines.push(`- ${block.replace(/\n/g, " ")}`);
  }
  lines.push("");
  lines.push("### トレーサビリティ");
  lines.push(`- ${fb.assetTraceability.rule}`);
  lines.push(`- ファイル名プレフィックス: \`${fb.assetTraceability.prefix}\` / メタデータフラグ: \`${fb.assetTraceability.marker}\``);
  lines.push("");
  lines.push("### 顧客向け扱い");
  lines.push(`- ${fb.customerFacingNote}`);
  lines.push("");

  return lines;
}

/* ------------------------------------------------------------------ */
/*  Phase P: セクション別実行プロンプト（execution-section-prompts.md）  */
/* ------------------------------------------------------------------ */
/*  execution-prompt.md が「1本の大きなプロンプト」なのに対し、こちらは    */
/*  HEADER / HERO / SERVICES / TRUST / CTA / FOOTER / FAQ / ABOUT /     */
/*  CONTACT / OTHER の10セクションに事前分割したコンパクトな作業ブロック。  */
/*  オペレータはセクション単位でプロンプトを取り出して Claude Code に渡せる。 */
/*  Phase Q として、画像フォールバックが必要なセクションに生成ヒントを埋め込む。 */
/*  純粋関数・決定論的。顧客事実は briefSnapshot / imageFallback からのみ引き出す。 */
/* ------------------------------------------------------------------ */

/** セクション別実行プロンプトの1セクション定義（決定論的マスター） */
interface ExecutionPromptSectionDef {
  /** 大文字のセクションID（固定・変更不可） */
  id: string;
  /** 日本語表示名 */
  name: string;
  /** このセクションの目的（オペレータ向け） */
  purpose: string;
  /** briefSnapshot.mustInclude のうちこのセクションに関連する項目を抽出するキーワード */
  mustIncludeKeywords: string[];
  /** 画像生成の必要性（Phase Q）。true のとき imageFallback と突合して候補を埋め込む */
  likelyNeedsImagery: boolean;
  /** imageFallback.generationPriority[].category と突合するキーワード */
  imageryKeywords: string[];
  /** Monet useCase.recommendedStructure のスロットと突合するキーワード */
  monetSlotKeywords: string[];
  /** 実装指示（Claude Code / オペレータ向け） */
  implementation: string;
  /** 検証チェックリスト（オペレータが完了判定に使う） */
  checklist: string[];
}

/**
 * セクション別実行プロンプトのマスターリスト（10セクション）。
 * id は出力の見出しキーとして使うため変更しない。
 * 順序も表示順として扱う。
 */
const EXECUTION_PROMPT_SECTIONS: readonly ExecutionPromptSectionDef[] = [
  {
    id: "HEADER",
    name: "ヘッダー / ナビゲーション",
    purpose:
      "サイト全体の回遊導線を作る。ロゴ・グローバルナビ・CTA ボタンを置き、どこに何があるかを一目で分からせる。",
    mustIncludeKeywords: ["ナビ", "メニュー", "導線", "ロゴ", "屋号"],
    likelyNeedsImagery: true,
    imageryKeywords: ["ロゴ"],
    monetSlotKeywords: ["ヘッダー", "ナビ", "header"],
    implementation:
      "ロゴ（提供がなければ PLACEHOLDER）と主要4〜6項目のナビを実装する。SP ではハンバーガーに折りたたむ。固定表示し、CTA ボタンの色は後続の CTA セクションと揃える。",
    checklist: [
      "ロゴが表示されている（提供logoまたはプレースホルダー）",
      "ナビの主要項目がすべて含まれている",
      "スマホでハンバーガーメニューが開く",
      "ナビのリンク先が実在するセクションを指している",
    ],
  },
  {
    id: "HERO",
    name: "メインビジュアル / ヒーロー",
    purpose:
      "訪問者の最初の3秒を獲得する。事業の核心メッセージとターゲットが一目で伝わるファーストビューを作る。",
    mustIncludeKeywords: ["ビジュアル", "キャッチ", "ターゲット", "メッセージ", "スローガン", "コピー"],
    likelyNeedsImagery: true,
    imageryKeywords: ["メインビジュアル", "ヒーロー", "ファーストビュー", "バックグラウンド", "背景", "メイン"],
    monetSlotKeywords: ["ヒーロー", "メインビジュアル", "hero", "ファーストビュー"],
    implementation:
      "H1＋サブコピー＋主CTA の3要素をファーストビューに収める。背景画像は画像フォールバック指示に従う。ターゲット表現は brief の targetUserSummary を反映し、参考サイトの表現をそのまま複製しない。",
    checklist: [
      "H1 に事業の核心が一言で入っている",
      "サブコピーがターゲットの関心を示している",
      "主CTA ボタンがファーストビュー内にある",
      "背景画像の帰属（顧客提供/AI仮画像）が明確",
    ],
  },
  {
    id: "SERVICES",
    name: "サービス / 商品紹介",
    purpose:
      "何を売っているか・なぜ選ぶべきかを具体例で伝える。料金・メニュー・施工例などで説得材料を並べる。",
    mustIncludeKeywords: [
      "サービス", "メニュー", "料金", "価格", "商品", "コース", "プラン",
      "施工", "内容", "提供", "仕事", "対応", "取扱", "対応エリア",
    ],
    likelyNeedsImagery: true,
    imageryKeywords: ["ギャラリー", "施工", "料理", "商品", "メニュー写真", "事例", "サービス"],
    monetSlotKeywords: ["サービス", "商品", "メニュー", "料金", "service"],
    implementation:
      "サービスを3〜6のカードまたはリストで構成する。各項目に概要・価格・ポイントを載せる。画像が必要な場合は画像フォールバック指示のカテゴリと優先度に従う。mustInclude の料金・メニュー情報を取りこぼさない。",
    checklist: [
      "主要サービスがすべて掲載されている",
      "料金・価格情報が必須掲載事項と整合している",
      "各サービスに画像またはアイコンが添えられている",
      "ターゲットにとってのベネフィットが書かれている",
    ],
  },
  {
    id: "TRUST",
    name: "信頼要素 / 強み紹介",
    purpose:
      "実績・口コミ・資格で「ここに頼んで大丈夫」を示す。強みを根拠付きで並べる。",
    mustIncludeKeywords: ["実績", "お客様の声", "口コミ", "認定", "資格", "許認可", "メディア", "受賞", "導入", "事例", "信頼", "評判", "年数", "経験"],
    likelyNeedsImagery: true,
    imageryKeywords: ["お客様の声", "実績", "口コミ"],
    monetSlotKeywords: ["信頼", "実績", "強み", "口コミ", "お客様の声", "trust"],
    implementation:
      "強み（briefSnapshot.strengths）を見出し化し、数値・資格・口コミで裏付ける。口コミは提供がなければ構成せず、プレースホルダー領域だけ確保する（顧客事実を捏造しない）。",
    checklist: [
      "強みが3〜5項目で根拠付きで並んでいる",
      "資格・許認可が該当分だけ掲載されている",
      "口コミ領域の取り扱い（提供/未提供）が明確",
      "実績数値が顧客事実のみに基づいている",
    ],
  },
  {
    id: "CTA",
    name: "お問い合わせ誘導 / CTA",
    purpose:
      "次の行動（問い合わせ・予約・資料請求）を明確に促し、コンバージョン導線を作る。",
    mustIncludeKeywords: ["問い合わせ", "お問い合わせ", "予約", "見積", "資料請求", "申し込み", "お申し込み", "来店", "応募", "無料", "相談", "お試し"],
    likelyNeedsImagery: true,
    imageryKeywords: ["バナー"],
    monetSlotKeywords: ["CTA", "お問い合わせ", "予約", "コンタクト", "cta"],
    implementation:
      "主要アクションを1つに絞った CTA を複数箇所（ヒーロー下・サービス後・フッター前）に配置する。ボタン文言は必須掲載の導線と一致させる。参考サイトの表現は複製しない。",
    checklist: [
      "主要CTA がファーストビュー内に存在する",
      "CTA 文言が必須導線（予約/見積 等）と一致している",
      "ページ下部に追従または再掲されている",
      "ボタンが目立ち・クリックできる状態にある",
    ],
  },
  {
    id: "FOOTER",
    name: "フッター / 連絡先",
    purpose:
      "連絡先・営業時間・アクセス・SNSなど、最後に必要な情報を網羅し、導線を閉じる。",
    mustIncludeKeywords: ["住所", "電話", "営業時間", "定休日", "アクセス", "SNS", "コピーライト", "会社名", "所在地", "代表"],
    likelyNeedsImagery: false,
    imageryKeywords: [],
    monetSlotKeywords: ["フッター", "footer", "連絡先"],
    implementation:
      "住所・電話・営業時間・定休日・SNS リンクを構造化リストで並べる。コピーライト表記を入れる。これらは CONTACT/ABOUT と重複するため、フッターにはコンパクトな参照版を置く。",
    checklist: [
      "住所・電話・営業時間が正しく掲載されている",
      "定休日が明示されている",
      "SNS リンク（該当分）が含まれている",
      "コピーライト表記がある",
    ],
  },
  {
    id: "FAQ",
    name: "よくある質問 / FAQ",
    purpose:
      "顧客が買い手 jag前に抱える疑問を先回りして解消し、問い合わせの心理的ハードルを下げる。",
    mustIncludeKeywords: ["よくある質問", "FAQ", "質問", "Q&A", "疑問"],
    likelyNeedsImagery: false,
    imageryKeywords: [],
    monetSlotKeywords: ["FAQ", "質問", "よくある"],
    implementation:
      "mustInclude に質問が含まれていればアコーディオンで構成する。質問が顧客から提供されていない場合は、業種の汎用質問を推測掲載せず「質問が提供されていません」の空き領域を残す（捏造しない）。",
    checklist: [
      "提供された質問が漏れなく掲載されている",
      "回答が日本語で自然に読める",
      "アコーディオンの開閉が動作する",
      "捏造した質問/回答が混入していない",
    ],
  },
  {
    id: "ABOUT",
    name: "会社概要 / about",
    purpose:
      "誰が・どんな想いでやっているかを伝え、人格的信頼を作る。",
    mustIncludeKeywords: ["会社概要", "代表", "沿革", "店舗", "スタッフ", "企業", "店紹介", "私たち", "理念", "代表挨拶", "設立"],
    likelyNeedsImagery: true,
    imageryKeywords: ["会社", "スタッフ", "店内", "店舗", "外観", "代表"],
    monetSlotKeywords: ["会社概要", "about", "代表", "理念"],
    implementation:
      "代表挨拶・沿革・理念を mustInclude の範囲で構成する。スタッフ/店舗写真が必要な場合は画像フォールバック指示に従う。提供されていない事項は掲載しない。",
    checklist: [
      "会社概要の必須項目が掲載されている",
      "代表挨拶/理念が提供範囲で反映されている",
      "画像の帰属が明確",
      "捏造した経歴/数値が混入していない",
    ],
  },
  {
    id: "CONTACT",
    name: "お問い合わせ / contact",
    purpose:
      "問い合わせの受け口を作り、顧客が確実に連絡できる導線を完成させる。",
    mustIncludeKeywords: ["電話", "メール", "お問い合わせ", "問い合わせ", "フォーム", "営業時間", "定休日", "住所", "アクセス", "LINE", "予約"],
    likelyNeedsImagery: false,
    imageryKeywords: [],
    monetSlotKeywords: ["お問い合わせ", "コンタクト", "予約", "contact"],
    implementation:
      "電話番号・メール・営業時間・定休日・地図（アクセス）を並べる。フォームは必須項目を最小限にする。連絡先情報は必須掲載事項と一致させる。",
    checklist: [
      "電話・メールが正しく掲載されている",
      "営業時間・定休日が明示されている",
      "アクセス/地図が含まれている",
      "フォーム（あれば）の必須項目が最小限",
    ],
  },
  {
    id: "OTHER",
    name: "その他 / 残項目",
    purpose:
      "上記9セクションのいずれにも分類できなかった必須掲載事項を受け止める逃げ道。セクション構成に当てはまらない個別要件はここで扱う。",
    mustIncludeKeywords: [],
    likelyNeedsImagery: false,
    imageryKeywords: [],
    monetSlotKeywords: [],
    implementation:
      "他セクションに分類できなかった必須事項を個別ブロックで扱う。配置先が不明な場合はフッター直上の自由ブロックに置き、必須掲載の取りこぼしがないことを優先する。",
    checklist: [
      "全必須掲載事項がいずれかのセクションに配置されている",
      "取り残された必須事項がない",
      "配置が不自然でない",
    ],
  },
];

/** 配列のうち、いずれかのキーワードを部分含む要素を返す（大小文字・空白区別なしの日本語 includes） */
function filterByKeywords(items: string[], keywords: string[]): string[] {
  if (keywords.length === 0) return [];
  return items.filter((item) =>
    keywords.some((kw) => item.length > 0 && kw.length > 0 && item.includes(kw))
  );
}

/**
 * imageFallback.generationPriority のうち、セクションの imageryKeywords に
 * 合致するカテゴリだけを取り出す（Phase Q）。
 */
function pickImageryTargetsForSection(
  fb: ImageFallbackAssessment | null,
  keywords: string[]
): ImageGenerationTarget[] {
  if (!fb || keywords.length === 0) return [];
  return fb.generationPriority.filter((t) =>
    keywords.some((kw) => t.category.includes(kw))
  );
}

/**
 * Monet useCase.recommendedStructure のスロットのうち、セクションの
 * monetSlotKeywords に合致するもののコンポーネント候補を返す。
 */
function pickMonetCandidatesForSection(
  useCase: ReturnType<typeof getMonetUseCase>,
  keywords: string[]
): Array<{ slot: string; title: string; id: string; componentPath: string }> {
  if (keywords.length === 0) return [];
  const out: Array<{
    slot: string;
    title: string;
    id: string;
    componentPath: string;
  }> = [];
  for (const slot of useCase.recommendedStructure) {
    const haystack = `${slot.slot} ${slot.category ?? ""}`.toLowerCase();
    const hit = keywords.some((kw) =>
      haystack.includes(kw.toLowerCase())
    );
    if (hit && slot.section) {
      out.push({
        slot: slot.slot,
        title: slot.section.title,
        id: slot.section.id,
        componentPath: slot.section.componentPath,
      });
    }
  }
  return out;
}

/**
 * セクション別実行プロンプト（execution-section-prompts.md）を構築する。
 * 内部専用・ローカルオペレータがセクション単位で Claude Code に読ませる。
 * 純粋関数・決定論的（日時・乱数に依存しない）。
 */
export function buildExecutionSectionPromptsMarkdown(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): string {
  const id = pkg.submissionId;
  const snap = plan.briefSnapshot;
  const mustInclude = snap.mustInclude;
  const fb = pkg.imageFallback ?? null;

  // OTHER セクション用に「他の9セクションのいずれにも合致しなかった必須事項」を計算する。
  const matchedByOthers = new Set<string>();
  for (const sec of EXECUTION_PROMPT_SECTIONS) {
    if (sec.id === "OTHER") continue;
    for (const item of filterByKeywords(mustInclude, sec.mustIncludeKeywords)) {
      matchedByOthers.add(item);
    }
  }
  const otherLeftovers = mustInclude.filter((item) => !matchedByOthers.has(item));

  // Monet use case は参考マッピングのために解決する（失敗しない）。
  const businessType = extractBusinessTypeFromSummary(
    pkg.reviewSummary.businessSummary
  );
  const useCase = getMonetUseCase(resolveUseCaseKey(businessType));

  const lines: string[] = [];
  lines.push(`# セクション別実行プロンプト — ${id}`);
  lines.push("");
  lines.push(
    "> 内部専用ドキュメントです。execution-prompt.md をセクション単位に事前分割した作業ブロック。"
  );
  lines.push(
    "> オペレータは該当セクションのブロックを取り出して Claude Code に渡せる。本番（serverless）のリクエストハンドラからは Claude Code を実行しない。"
  );
  lines.push("");
  lines.push("## 全体要件（全セクション共通）");
  lines.push(`- 事業要件: ${snap.businessSummary || "（要約なし）"}`);
  lines.push(`- ターゲット: ${snap.targetUserSummary || "（未整理）"}`);
  if (snap.strengths.length > 0) {
    lines.push(`- 強み: ${snap.strengths.join("・")}`);
  }
  if (mustInclude.length > 0) {
    lines.push(`- 必須掲載（全体）: ${mustInclude.join("・")}`);
  }
  if (snap.referenceUrls.length > 0) {
    lines.push(`- 参考サイト: ${snap.referenceUrls.join("・")}`);
  }
  lines.push(`- Monet use case: ${useCase.label} (${useCase.key})`);
  // Phase Q: 画像フォールバックの全体判定を先頭に明示する。
  if (fb && fb.status !== "not_needed") {
    lines.push(
      `- AI画像フォールバック判定: ${fb.status === "recommended" ? "推奨" : "許容（差し替え前提）"}・不足カテゴリ ${fb.missingImageCategories.join("・") || "（該当記載なし）"}`
    );
    lines.push(
      `  - 生成経路: \`${fb.generationPath.tool} -m ${fb.generationPath.model}\`（serverless ではなくローカルオペレータが実行）。詳細は各セクションの「画像生成の必要性」と execution-prompt.md を参照。`
    );
  } else {
    lines.push("- AI画像フォールバック判定: 不要（顧客提供素材を使用）");
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const sec of EXECUTION_PROMPT_SECTIONS) {
    lines.push(`## [${sec.id}] ${sec.name}`);
    lines.push(`**目的:** ${sec.purpose}`);

    // 1) 反映すべき顧客事実（mustInclude のキーワード抽出）
    const sectionFacts =
      sec.id === "OTHER" ? otherLeftovers : filterByKeywords(mustInclude, sec.mustIncludeKeywords);
    lines.push("**反映すべき顧客事実（必須掲載から抽出）:**");
    if (sectionFacts.length > 0) {
      for (const f of sectionFacts) lines.push(`- ${f}`);
    } else {
      lines.push(
        "- （このセクションに直接対応する必須掲載事項は検出されませんでした。全体の必須掲載事項から取捨選択するか、該当なければ本セクションは最小構成でよい）"
      );
    }

    // 強みは TRUST / ABOUT で関連付ける。
    if ((sec.id === "TRUST" || sec.id === "ABOUT") && snap.strengths.length > 0) {
      lines.push("- 強み（参考）:");
      for (const s of snap.strengths) lines.push(`  - ${s}`);
    }

    // 2) 必須掲載の取り扱い
    lines.push("**必須掲載の取り扱い:**");
    if (sectionFacts.length > 0) {
      lines.push(
        `- 上記の顧客事実を漏れなく配置すること。提供されていない事項は推測で補わない（捏造禁止）。`
      );
    } else {
      lines.push(
        `- 本セクション固有の必須事項がない場合でも、導線上の自然な最小構成を保つこと。`
      );
    }

    // 3) 参考サイト・Monet マッピング
    lines.push("**参考サイト・Monet マッピング:**");
    if (snap.referenceUrls.length > 0) {
      lines.push(
        `- 参考サイトの表現はそのまま複製せず、日本語の自然な商談導線に再構成する: ${snap.referenceUrls.join("・")}`
      );
    } else {
      lines.push("- 参考サイトの指定なし。業種標準の構成で作る。");
    }
    const monetCandidates = pickMonetCandidatesForSection(
      useCase,
      sec.monetSlotKeywords
    );
    if (monetCandidates.length > 0) {
      lines.push("- Monet コンポーネント候補（再利用優先）:");
      for (const c of monetCandidates) {
        lines.push(`  - ${c.title} (${c.id}) — ${c.componentPath} [スロット: ${c.slot}]`);
      }
    } else {
      lines.push(
        "- Monet 候補: 該当なし（カスタム実装前提）。`src/generated/monet-catalog.ts` を再確認のうえ、無ければ新規実装。"
      );
    }

    // 4) Phase Q: 画像生成の必要性
    lines.push("**画像生成の必要性（Phase Q）:**");
    if (!sec.likelyNeedsImagery) {
      lines.push("- このセクションは通常、生成画像を必要としない（テキスト・アイコン中心）。");
    } else {
      const targets = pickImageryTargetsForSection(fb, sec.imageryKeywords);
      if (fb && fb.status !== "not_needed" && targets.length > 0) {
        lines.push(
          `- AI画像フォールバックが必要。以下のカテゴリを優先度順に生成すること:`
        );
        for (const t of targets) {
          lines.push(
            `  - 【${t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}】${t.category} — ${t.reason}`
          );
          lines.push(`    - プロンプトヒント: ${t.promptFragment.replace(/\n/g, " ")}`);
        }
        if (fb.generationPath.exampleCommand) {
          lines.push(`  - 生成経路コマンド例: \`${fb.generationPath.exampleCommand}\``);
        }
        if (fb.assetTraceability.prefix) {
          lines.push(
            `  - トレーサビリティ: 生成物は \`${fb.assetTraceability.prefix}\` プレフィックスで保存し、AI生成資産として顧客提供素材と区別する。`
          );
        }
      } else if (fb && fb.status !== "not_needed") {
        lines.push(
          `- AI画像フォールバック判定ありだが、このセクションに合致するカテゴリは検出されなかった。不足カテゴリ全体（${fb.missingImageCategories.join("・") || "該当記載なし"}）から必要分を判断し、execution-prompt.md の生成経路を参照すること。`
        );
      } else {
        lines.push(
          "- AI画像フォールバック不要。顧客提供の写真・ロゴを使用する（不足時はプレースホルダー領域を確保し、捏造しない）。"
        );
      }
    }

    // 5) 実装指示
    lines.push(`**実装指示（Claude Code / オペレータ）:** ${sec.implementation}`);

    // 6) 検証チェックリスト
    lines.push("**検証チェックリスト:**");
    for (const c of sec.checklist) lines.push(`- [ ] ${c}`);

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("## 使い方（オペレータ向け）");
  lines.push("- 各セクションブロックをコピーして Claude Code に個別渡しできる。");
  lines.push("- 全体プロンプトは execution-prompt.md を参照。本ファイルはその事前分割版。");
  lines.push(
    "- 画像生成が必要なセクションは「画像生成の必要性」の指示に従い、serverless ではなくローカルで生成すること。"
  );
  lines.push("");
  return lines.join("\n");
}

/** 実行プロンプト（execution-prompt.md）の表示用パス */
export function executionPromptPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "execution-prompt.md");
}

/** 実行ハンドオフ（execution-handoff.json）の表示用パス */
export function executionHandoffPathFor(submissionId: string): string {
  return artifactDisplayPath(submissionId, "execution-handoff.json");
}

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

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

/** 自由テキストを箇条書きに分割（読点・改行・中点等）。重複排除・上限付き */
function splitToItems(text: string, max = 8): string[] {
  if (!text || !text.trim()) return [];
  const bulletStrip = /^(?:[-*•・·]+|\d+[.)、]|\([\d.]+\)|[a-zA-Z][.)])\s*/;
  const parts = text
    .split(/[\r\n、,，；;／/|｜・]+/)
    .map((s) => s.trim().replace(bulletStrip, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(parts)).slice(0, max);
}

/** MIMEタイプ/拡張子から大まかな素材種別を判定（consult route と同等） */
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

/** 素材申告（assetsStatus）→ 日本語ラベル */
const ASSET_LABELS: Record<string, string> = {
  logo: "ロゴデータ",
  photos: "写真・画像",
  copy: "文章・キャッチコピー",
  company: "会社概要・会社案内の資料",
  service: "製品・サービスの資料",
  none: "まだ何もない（すべてお任せ）",
};

/** 不足判定のベースとなる標準素材セット */
const STANDARD_MATERIALS: { value: string; label: string }[] = [
  { value: "logo", label: "ロゴデータ" },
  { value: "photos", label: "写真・画像" },
  { value: "copy", label: "文章・キャッチコピー" },
  { value: "company", label: "会社概要・会社案内の資料" },
  { value: "service", label: "製品・サービスの資料" },
];

/** 再現度コード → 日本語ラベル */
const FOLLOW_LEVEL_LABELS: Record<string, string> = {
  close: "かなり忠実に再現",
  partial: "一部だけ取り入れる",
  inspiration: "参考程度（雰囲気・方向性のみ）",
};

/** コード値を日本語ラベルに。未定義コードは空文字。 */
function labelOf(map: Record<string, string>, code: string): string {
  return code && Object.prototype.hasOwnProperty.call(map, code) ? map[code] : "";
}

/* ------------------------------------------------------------------ */
/*  構築                                                                */
/* ------------------------------------------------------------------ */

/** buildApprovalPackage のオプション */
export interface BuildApprovalPackageOptions {
  /** 内部レビューページ URL（社内のみ）。未指定時は null */
  reviewUrl?: string | null;
}

/**
 * 相談ペイロード + 品質評価から、レビュー要約（reviewSummary）を構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。
 *
 * 初回作成（buildApprovalPackage）とフォローアップ再提出（PATCH）の
 * 両方から呼び出すことで、派生フィールドのドリフトを防ぐ。
 *
 * 特に riskyAssumptions は intakeQuality.reasons に依存する。品質が
 * needs_followup → ready に更新されても、ここを経由して再計算しないと
 * 後続の Gate 1 計画アーティファクトの blockers に、作成時点の古い前提
 * （未入力項目の理由など）が残り続ける（stale planning-artifact blockers）。
 */
export function buildReviewSummary(
  payload: Record<string, unknown>,
  intakeQuality: ConsultIntakeQuality
): ApprovalReviewSummary {
  const businessType = asString(payload.businessType);
  const companyName =
    asString(payload.companyName) || asString(payload.enterpriseName);
  const targetCustomer = asString(payload.targetCustomer);
  const sellingPoints = splitToItems(asString(payload.sellingPoints));
  const mustInclude = splitToItems(asString(payload.mustIncludeInfo));
  const desiredImage = asString(payload.desiredImage);
  const currentWebsite = asString(payload.currentWebsite);
  const noWebsite = payload.noWebsite === true;

  const summaryParts: string[] = [];
  if (businessType) summaryParts.push(`事業種=${businessType}`);
  if (companyName) summaryParts.push(`事業体=${companyName}`);
  summaryParts.push(
    !noWebsite && currentWebsite
      ? `既存HPリニューアル（${currentWebsite}）`
      : "新規ホームページ制作"
  );
  if (desiredImage) summaryParts.push(`イメージ=${desiredImage}`);

  const riskyAssumptions: string[] = [];
  // 品質評価の理由はそのままリスク前提として共有する価値がある。
  // intakeQuality が更新されれば理由も新しくなるため、ここが常に最新状態を反映する。
  for (const r of intakeQuality.reasons) {
    if (r) riskyAssumptions.push(r);
  }
  if (!targetCustomer) {
    riskyAssumptions.push("ターゲット層の記述がなく、ペルソナが確定していない。");
  }
  if (sellingPoints.length === 0) {
    riskyAssumptions.push("強み・差別化の記述がなく、訴求軸が不明。");
  }

  return {
    businessSummary: summaryParts.join(" / "),
    targetUserSummary: targetCustomer || "（ターゲット記述なし）",
    strengthsSummary: sellingPoints,
    mustIncludeSummary: mustInclude,
    riskyAssumptions,
  };
}

/**
 * 相談ペイロード + 保存ファイル + 品質評価から、承認パッケージを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。外部依存なし。
 *
 * 状態の決定:
 *   - intakeQuality.status === "ready" → awaiting_representative_approval
 *   - それ以外 → needs_followup
 */
export function buildApprovalPackage(
  payloadRaw: unknown,
  submissionId: string,
  savedFiles: ApprovalSavedFile[],
  intakeQuality: ConsultIntakeQuality,
  options: BuildApprovalPackageOptions = {}
): ApprovalPackage {
  const payload = asObject(payloadRaw);
  const receivedAt = new Date().toISOString();

  // reviewSummary（要約・リスク前提）は buildReviewSummary に集約する。
  // PATCH の再構築と同じ導出経路を使うことで、初回作成と再提出の間の
  // ドリフト（古い riskyAssumptions が残る等）を防ぐ。
  const reviewSummary = buildReviewSummary(payload, intakeQuality);
  // フォールバック評価で後続利用する派生値は reviewSummary から取り出す
  const mustInclude = reviewSummary.mustIncludeSummary;
  const desiredImage = asString(payload.desiredImage);

  /* ---- referenceAnalysis ---- */
  const rawReferenceSites = Array.isArray(payload.referenceSites)
    ? payload.referenceSites
    : [];
  const referenceUrls: string[] = [];
  const requestedFollowStrength: string[] = [];
  const sectionTargets: string[] = [];
  const seenUrl = new Set<string>();
  const seenTarget = new Set<string>();
  const seenFollow = new Set<string>();

  for (const raw of rawReferenceSites) {
    const o = asObject(raw);
    const url = asString(o.url);
    if (/^https?:\/\//i.test(url) && !seenUrl.has(url)) {
      seenUrl.add(url);
      referenceUrls.push(url);
    }
    const followLevel = asString(o.followLevel);
    const followLabel = followLevel ? labelOf(FOLLOW_LEVEL_LABELS, followLevel) : "";
    if (followLabel && !seenFollow.has(followLabel)) {
      seenFollow.add(followLabel);
      requestedFollowStrength.push(followLabel);
    }
    for (const t of [
      ...splitToItems(asString(o.whatToReference), 4),
      ...splitToItems(asString(o.likedSections), 4),
    ]) {
      if (!seenTarget.has(t)) {
        seenTarget.add(t);
        sectionTargets.push(t);
      }
    }
  }

  const referenceAnalysis: ApprovalReferenceAnalysis = {
    referenceUrls,
    // Phase 1 では「URL を持つもの」をすべて抽出適格と扱う（クローラ未実装のため詳細判定はしない）
    urlsEligibleForExtraction: referenceUrls,
    urlsBlockedOrUnusable: [],
    requestedFollowStrength,
    sectionTargets,
  };

  /* ---- materialsAnalysis ---- */
  const availableAttachments = savedFiles.map((f) => ({
    originalName: f.originalName,
    savedName: f.savedName,
    sizeBytes: f.sizeBytes,
    kind: detectFileKind(f.type, f.originalName),
  }));

  const assetsStatus = asStringArray(payload.assetsStatus);
  const hasNone = assetsStatus.includes("none");
  const usableAssets = assetsStatus
    .map((v) => labelOf(ASSET_LABELS, v))
    .filter((s) => s.length > 0);
  const providedValues = hasNone ? [] : assetsStatus;
  const missingAssets = STANDARD_MATERIALS.filter(
    (m) => !providedValues.includes(m.value)
  ).map((m) => m.label);

  const materialsAnalysis: ApprovalMaterialsAnalysis = {
    availableAttachments,
    usableAssets,
    missingAssets,
  };

  /* ---- 状態 ---- */
  const isReady = intakeQuality.status === "ready";
  const status: ApprovalStatus = isReady
    ? "awaiting_representative_approval"
    : "needs_followup";
  const customerFacingStatus: CustomerFacingStatus = isReady
    ? "under_internal_review"
    : "followup_requested";

  /* ---- プロンプトチェーンプレビュー ---- */
  const promptChainPreview = buildPromptChainPreview({
    referenceCount: referenceUrls.length,
  });

  /* ---- AI画像フォールバック評価（決定論的） ---- */
  // 顧客提供素材が不足しているとき、AI生成の仮画像で運用すべきかを判定。
  // シグナルは payload + materialsAnalysis + referenceAnalysis から取り出す。
  const fallbackFeatures = asStringArray(payload.features);
  const fallbackHasImageReference = rawReferenceSites.some((raw) => {
    const o = asObject(raw);
    const type = asString(o.type);
    const whatToReference = asString(o.whatToReference);
    return (
      type === "image" ||
      /写真|画像|ビジュアル|image/i.test(`${type} ${whatToReference}`)
    );
  });
  const imageFallback = assessImageFallback({
    missingAssets,
    usableAssets,
    attachmentKinds: availableAttachments.map((a) => a.kind),
    attachmentCount: availableAttachments.length,
    requiredMustInclude: mustInclude,
    requiredPagesOrFeatures: fallbackFeatures,
    hasImageReference: fallbackHasImageReference,
    desiredImage,
    colorSchemeRaw: asString(payload.colorScheme),
    supplementRaw: asString(payload.supplement),
    allowEditRaw: asString(payload.allowEdit),
  });

  return {
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    submissionId,
    receivedAt,
    status,
    customerFacingStatus,
    reviewUrl: options.reviewUrl ?? null,
    intakeQuality,
    reviewSummary,
    referenceAnalysis,
    materialsAnalysis,
    promptChainPreview,
    approval: {
      representativeDecision: null,
      decidedAt: null,
      decidedBy: null,
      memo: null,
    },
    // Phase 2: 計画アーティファクト・計画承認・実行ハンドオフは受領時点では未生成
    planningArtifact: null,
    planApproval: {
      representativeDecision: null,
      decidedAt: null,
      decidedBy: null,
      memo: null,
    },
    executionHandoff: null,
    // Phase 2: Monetマッピングアーティファクトは計画生成時に作成・未生成時はnull
    monetMapping: null,
    // Phase A: 本制作前ヒアリング・第3ゲート・準備度は受領時点では未実施
    preProductionInterview: null,
    preProductionApproval: {
      representativeDecision: null,
      decidedAt: null,
      decidedBy: null,
      memo: null,
    },
    productionReadiness: null,
    // Phase D/E: 画像フォールバック評価は受領時に計算済み。
    // フォローアップ系カウンタは受領時点では未実施。
    imageFallback,
    followupRounds: 0,
    lastFollowupAt: null,
    lastFollowupScore: null,
  };
}

/* ------------------------------------------------------------------ */
/*  永続化                                                              */
/* ------------------------------------------------------------------ */

/**
 * 承認パッケージを書き込む（ストレージアダプタ経由）。
 * local は data/ 、relay は HTTP リレー、ephemeral は /tmp へ。
 * 成果物ディレクトリはアダプタ（filesystem/relay）が保証する。
 */
export async function writeApprovalPackage(
  pkg: ApprovalPackage
): Promise<void> {
  await writeArtifact(
    pkg.submissionId,
    "approval-package.json",
    JSON.stringify(pkg, null, 2)
  );
}

/** 読み込んだ生 JSON から計画アーティファクトを正規化する。不在・形式不正時は null。 */
function normalizePlanningArtifact(
  raw: unknown,
  submissionId: string
): PlanningArtifact | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const stagesRaw = Array.isArray(o.stages) ? o.stages : [];
  const stages: PlanningStage[] = stagesRaw
    .map((s) => asObject(s))
    .map((s) => ({
      id: asString(s.id),
      title: asString(s.title),
      objective: asString(s.objective),
      inputs: asStringArray(s.inputs),
      outputs: asStringArray(s.outputs),
      involvesExecution: s.involvesExecution === true,
    }))
    .filter((s) => s.id.length > 0);
  if (stages.length === 0) return null;

  const bs = asObject(o.briefSnapshot);
  const ordered = asStringArray(o.orderedStageIds);
  return {
    schemaVersion: asString(o.schemaVersion) || PLANNING_SCHEMA_VERSION,
    submissionId: asString(o.submissionId) || submissionId,
    generatedAt: asString(o.generatedAt),
    generatedBy: "deterministic-planner",
    briefSnapshot: {
      businessSummary: asString(bs.businessSummary),
      targetUserSummary: asString(bs.targetUserSummary),
      strengths: asStringArray(bs.strengths),
      mustInclude: asStringArray(bs.mustInclude),
      referenceUrls: asStringArray(bs.referenceUrls),
    },
    stages,
    orderedStageIds: ordered.length > 0 ? ordered : stages.map((s) => s.id),
    prerequisites: asStringArray(o.prerequisites),
    blockers: asStringArray(o.blockers),
    rationale: asStringArray(o.rationale),
  };
}

/** 読み込んだ生 JSON から計画承認（第2ゲート）判定を正規化する。 */
function normalizePlanApproval(raw: unknown): PlanApprovalDecision {
  const o = asObject(raw);
  const d = asString(o.representativeDecision);
  const decision: RepresentativeDecision =
    d === "approve" || d === "reject" || d === "hold" ? d : null;
  return {
    representativeDecision: decision,
    decidedAt: typeof o.decidedAt === "string" ? o.decidedAt : null,
    decidedBy: typeof o.decidedBy === "string" ? o.decidedBy : null,
    memo: typeof o.memo === "string" ? o.memo : null,
  };
}

/** 読み込んだ生 JSON から実行ハンドオフを正規化する。不在・形式不正時は null。 */
function normalizeExecutionHandoff(
  raw: unknown,
  submissionId: string
): ExecutionHandoff | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const cmd = asString(o.claudeCommand);
  if (!cmd) return null;
  return {
    schemaVersion: asString(o.schemaVersion) || EXECUTION_HANDOFF_SCHEMA_VERSION,
    submissionId: asString(o.submissionId) || submissionId,
    generatedAt: asString(o.generatedAt),
    handoffMode: "local-operator",
    workingDirectory: asString(o.workingDirectory) || ".",
    claudeCommand: cmd,
    promptFilePath: asString(o.promptFilePath),
    // 旧パッケージ（Phase P 以前）には sectionPromptsFilePath がないため、
    // promptFilePath のファイル名を差し替えて後方互換的に補う。
    sectionPromptsFilePath:
      asString(o.sectionPromptsFilePath) ||
      (asString(o.promptFilePath)
        ? asString(o.promptFilePath).replace(
            /execution-prompt\.md$/,
            "execution-section-prompts.md"
          )
        : ""),
    // 旧パッケージ（Monetマッピング追加前）には monetMappingFilePath がないため空文字で補う
    monetMappingFilePath: asString(o.monetMappingFilePath) || "",
    metadataFilePath: asString(o.metadataFilePath),
    planFilePath: asString(o.planFilePath),
    briefFilePath: asString(o.briefFilePath),
    targetComponent: asString(o.targetComponent) || null,
    componentPath: asString(o.componentPath) || null,
    prerequisites: asStringArray(o.prerequisites),
    notices: asStringArray(o.notices),
    plannedStageIds: asStringArray(o.plannedStageIds),
  };
}

/** 読み込んだ生 JSON から Monetマッピングアーティファクトを正規化する。不在・形式不正時は null。 */
function normalizeMonetMappingArtifact(
  raw: unknown,
  submissionId: string
): MonetMappingArtifact | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const sv = asString(o.schemaVersion);
  const sid = asString(o.submissionId);
  if (
    sv !== MONET_MAPPING_SCHEMA_VERSION ||
    sid !== submissionId
  ) {
    return null;
  }
  // 簡易的正規化 — 主要なフィールドのみ検証
  const useCaseKey = asString(o.useCaseKey);
  if (!useCaseKey) return null;
  return raw as MonetMappingArtifact;
}

/** 読み込んだ生 JSON から本制作前ヒアリングの質問を正規化する */
function normalizeInterviewQuestion(raw: unknown): InterviewQuestion | null {
  const o = asObject(raw);
  const id = asString(o.id);
  const text = asString(o.text);
  if (!id || !text) return null;
  return {
    id,
    text,
    required: o.required === true,
    placeholder: typeof o.placeholder === "string" ? o.placeholder : undefined,
  };
}

/** 読み込んだ生 JSON から本制作前ヒアリングを正規化する。不在・形式不正時は null。 */
function normalizePreProductionInterview(
  raw: unknown
): PreProductionInterview | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const requestedAt = asString(o.requestedAt);
  if (!requestedAt) return null;

  const questionsRaw = Array.isArray(o.questions) ? o.questions : [];
  const questions = questionsRaw
    .map((q) => normalizeInterviewQuestion(q))
    .filter((q): q is InterviewQuestion => q !== null);
  if (questions.length === 0) return null;

  const answersRaw = Array.isArray(o.answers) ? o.answers : null;
  const answers: InterviewAnswer[] | null = answersRaw
    ? answersRaw
        .map((a) => {
          const ao = asObject(a);
          const questionId = asString(ao.questionId);
          if (!questionId) return null;
          return { questionId, text: asString(ao.text) };
        })
        .filter((a): a is InterviewAnswer => a !== null)
    : null;

  return {
    requestedAt,
    requestedBy: typeof o.requestedBy === "string" ? o.requestedBy : null,
    questions,
    answers,
    answeredAt: typeof o.answeredAt === "string" ? o.answeredAt : null,
    additionalMaterialCount:
      typeof o.additionalMaterialCount === "number"
        ? o.additionalMaterialCount
        : 0,
  };
}

/** 読み込んだ生 JSON から本制作準備度評価を正規化する。不在・形式不正時は null。 */
function normalizeProductionReadiness(raw: unknown): ProductionReadiness | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const status = asString(o.status);
  if (status !== "ready" && status !== "needs_followup") return null;
  return {
    status,
    score: typeof o.score === "number" ? o.score : 0,
    reasons: asStringArray(o.reasons),
    assessedAt: asString(o.assessedAt),
  };
}

/**
 * 読み込んだ生 JSON から AI画像フォールバック評価を正規化する。
 * 不在・形式不正時は null。信頼できない入力でも安全に扱えるよう、
 * 各フィールドを安全な既定値で補う。
 */
function normalizeImageFallback(raw: unknown): ImageFallbackAssessment | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = asObject(raw);
  const status = asString(o.status);
  if (
    status !== "recommended" &&
    status !== "allowed" &&
    status !== "not_needed"
  ) {
    return null;
  }

  const gp = asObject(o.generationPath);
  const at = asObject(o.assetTraceability);
  const targetsRaw = Array.isArray(o.generationPriority)
    ? o.generationPriority
    : [];

  return {
    status,
    customerAssetsInsufficient: o.customerAssetsInsufficient === true,
    rationale: asStringArray(o.rationale),
    missingImageCategories: asStringArray(o.missingImageCategories),
    generationPriority: targetsRaw
      .map((t) => {
        const to = asObject(t);
        const category = asString(to.category);
        if (!category) return null;
        const priority = asString(to.priority);
        const priorityLevel: GenerationPriorityLevel =
          priority === "high" || priority === "medium" || priority === "low"
            ? priority
            : "medium";
        return {
          category,
          reason: asString(to.reason),
          priority: priorityLevel,
          promptFragment: asString(to.promptFragment),
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null),
    generationPath: {
      tool: asString(gp.tool) || "/usr/bin/codex",
      model: asString(gp.model) || "gpt-5.5",
      commandTemplate: asString(gp.commandTemplate),
      exampleCommand: asString(gp.exampleCommand),
      notice: asString(gp.notice),
    },
    promptBlocks: asStringArray(o.promptBlocks),
    customerFacingNote: asString(o.customerFacingNote),
    assetTraceability: {
      prefix: asString(at.prefix) || "ai-fallback-",
      marker: asString(at.marker) || "ai-generated",
      rule: asString(at.rule),
    },
    assessedAt: asString(o.assessedAt),
  };
}

/**
 * 読み込んだ生 JSON を ApprovalPackage の形へ正規化する。
 * 信頼できない入力（古い形式・手編集）でも安全に扱えるように、
 * 必須フィールドを欠損時は安全な既定値で補う。
 */
function normalizeApprovalPackage(
  raw: unknown,
  submissionId: string
): ApprovalPackage | null {
  const o = asObject(raw);
  // 最低限 submissionId が一致していれば復元を試みる
  const id = asString(o.submissionId) || submissionId;

  const status = asString(o.status) as ApprovalStatus;
  const validStatuses: ApprovalStatus[] = [
    "received",
    "needs_followup",
    "awaiting_representative_approval",
    "awaiting_plan_approval",
    "approved_for_execution",
    "approved_for_planning",
    "demo_generating",
    "demo_deployed",
    "demo_revision_ready",
    "demo_revised",
    "customer_approved",
    "pre_production_interview",
    "pre_production_review",
    "production_ready",
    "delivered",
    "rejected",
  ];
  const resolvedStatus: ApprovalStatus = validStatuses.includes(status)
    ? status
    : "received";

  const cfs = asString(o.customerFacingStatus) as CustomerFacingStatus;
  const validCustomerStatuses: CustomerFacingStatus[] = [
    "followup_requested",
    "under_internal_review",
    "demo_ready_for_review",
    "demo_revision_submitted",
    "demo_approved",
    "pre_production_in_progress",
  ];
  const resolvedCfs: CustomerFacingStatus = validCustomerStatuses.includes(cfs)
    ? cfs
    : resolvedStatus === "needs_followup"
      ? "followup_requested"
      : "under_internal_review";

  const iqObj = asObject(o.intakeQuality);
  const intakeQuality: ApprovalIntakeQuality = {
    status: iqObj.status === "needs_followup" ? "needs_followup" : "ready",
    score: typeof iqObj.score === "number" ? iqObj.score : 0,
    reasons: asStringArray(iqObj.reasons),
    requestedItems: asStringArray(iqObj.requestedItems),
    followupQuestions: asStringArray(iqObj.followupQuestions),
  };

  const rs = asObject(o.reviewSummary);
  const reviewSummary: ApprovalReviewSummary = {
    businessSummary: asString(rs.businessSummary),
    targetUserSummary: asString(rs.targetUserSummary),
    strengthsSummary: asStringArray(rs.strengthsSummary),
    mustIncludeSummary: asStringArray(rs.mustIncludeSummary),
    riskyAssumptions: asStringArray(rs.riskyAssumptions),
  };

  const ra = asObject(o.referenceAnalysis);
  const referenceAnalysis: ApprovalReferenceAnalysis = {
    referenceUrls: asStringArray(ra.referenceUrls),
    urlsEligibleForExtraction: asStringArray(ra.urlsEligibleForExtraction),
    urlsBlockedOrUnusable: asStringArray(ra.urlsBlockedOrUnusable),
    requestedFollowStrength: asStringArray(ra.requestedFollowStrength),
    sectionTargets: asStringArray(ra.sectionTargets),
  };

  const ma = asObject(o.materialsAnalysis);
  const rawAttachments = Array.isArray(ma.availableAttachments)
    ? ma.availableAttachments
    : [];
  const availableAttachments = rawAttachments
    .map((a) => asObject(a))
    .map((a) => ({
      originalName: asString(a.originalName),
      savedName: asString(a.savedName),
      sizeBytes: typeof a.sizeBytes === "number" ? a.sizeBytes : 0,
      kind: asString(a.kind) || "ファイル",
    }));
  const materialsAnalysis: ApprovalMaterialsAnalysis = {
    availableAttachments,
    usableAssets: asStringArray(ma.usableAssets),
    missingAssets: asStringArray(ma.missingAssets),
  };

  const promptChainPreview = Array.isArray(o.promptChainPreview)
    ? (o.promptChainPreview
        .map((s) => asObject(s))
        .map((s) => ({
          id: asString(s.id),
          title: asString(s.title),
          objective: asString(s.objective),
          inputs: asStringArray(s.inputs),
          expectedOutputs: asStringArray(s.expectedOutputs),
          requiresRepresentativeApprovalBeforeContinue:
            s.requiresRepresentativeApprovalBeforeContinue === true,
        }))
        .filter((s) => s.id.length > 0) as PromptStagePreview[])
    : [];

  const ap = asObject(o.approval);
  const decisionRaw = asString(ap.representativeDecision);
  const representativeDecision: RepresentativeDecision =
    decisionRaw === "approve" || decisionRaw === "reject" || decisionRaw === "hold"
      ? decisionRaw
      : null;

  return {
    schemaVersion: APPROVAL_SCHEMA_VERSION,
    submissionId: id,
    receivedAt: asString(o.receivedAt) || new Date().toISOString(),
    status: resolvedStatus,
    customerFacingStatus: resolvedCfs,
    reviewUrl: typeof o.reviewUrl === "string" ? o.reviewUrl : null,
    intakeQuality,
    reviewSummary,
    referenceAnalysis,
    materialsAnalysis,
    promptChainPreview,
    approval: {
      representativeDecision,
      decidedAt: typeof ap.decidedAt === "string" ? ap.decidedAt : null,
      decidedBy: typeof ap.decidedBy === "string" ? ap.decidedBy : null,
      memo: typeof ap.memo === "string" ? ap.memo : null,
    },
    planningArtifact: normalizePlanningArtifact(o.planningArtifact, id),
    planApproval: normalizePlanApproval(o.planApproval),
    executionHandoff: normalizeExecutionHandoff(o.executionHandoff, id),
    monetMapping: normalizeMonetMappingArtifact(o.monetMapping, id),
    preProductionInterview: normalizePreProductionInterview(o.preProductionInterview),
    preProductionApproval: normalizePlanApproval(o.preProductionApproval),
    productionReadiness: normalizeProductionReadiness(o.productionReadiness),
    imageFallback: normalizeImageFallback(o.imageFallback),
    followupRounds:
      typeof o.followupRounds === "number" && o.followupRounds >= 0
        ? o.followupRounds
        : 0,
    lastFollowupAt: typeof o.lastFollowupAt === "string" ? o.lastFollowupAt : null,
    lastFollowupScore:
      typeof o.lastFollowupScore === "number" ? o.lastFollowupScore : null,
  };
}

/**
 * 指定した submissionId の承認パッケージを読み込む。
 * ファイル不在・形式不正時は null を返す。
 */
export async function readApprovalPackage(
  submissionId: string
): Promise<ApprovalPackage | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  try {
    const raw = await readArtifact(submissionId, "approval-package.json");
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return normalizeApprovalPackage(parsed, submissionId);
  } catch {
    return null;
  }
}

/** 各遷移関数に渡す判定メタ（承認/却下共通） */
export interface UpdateDecisionMeta {
  memo?: string;
  decidedBy?: string;
}

/* ------------------------------------------------------------------ */
/*  Phase 2: 決定論的ビルダ（計画アーティファクト・実行ハンドオフ）     */
/* ------------------------------------------------------------------ */

/** 任意入力文字列を null 許容へ正規化（空白のみは null） */
function trimOptional(v: string | undefined): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** 判定メタから ApprovalDecision / PlanApprovalDecision と同じ形を組み立てる */
function toDecision(
  action: "approve" | "reject",
  at: string,
  meta: UpdateDecisionMeta
): { representativeDecision: RepresentativeDecision; decidedAt: string; decidedBy: string | null; memo: string | null } {
  return {
    representativeDecision: action,
    decidedAt: at,
    decidedBy: trimOptional(meta.decidedBy),
    memo: trimOptional(meta.memo),
  };
}

/**
 * 承認パッケージから OMC 計画アーティファクトを構築する。
 * 純粋関数・決定論的（同じ入力 → 同じ出力）。LLM 不使用。
 * 代表者がインテイクを承認したときに生成し、第2ゲート（計画承認）で提示する。
 */
export function buildPlanningArtifact(pkg: ApprovalPackage): PlanningArtifact {
  const refUrls = pkg.referenceAnalysis.referenceUrls;
  const refCount = refUrls.length;
  const followStrength = pkg.referenceAnalysis.requestedFollowStrength;
  const missingAssets = pkg.materialsAnalysis.missingAssets;

  const stages: PlanningStage[] = [
    {
      id: "normalize-brief",
      title: "ブリーフ正規化",
      objective:
        "brief.json を読み込み、矛盾・不足・曖昧さを整理し、実装に使える正規化ブリーフを確定する。",
      inputs: ["brief.json", "approval-package.json の reviewSummary"],
      outputs: ["正規化ブリーフ", "確認すべき前提のリスト"],
      involvesExecution: true,
    },
    {
      id: "analyze-references",
      title: "参考サイト分析",
      objective:
        refCount > 0
          ? `参考サイト ${refCount} 件の構成・デザイン・色・写真を分析し、再現度（${
              followStrength.length > 0 ? followStrength.join("・") : "指定なし"
            }）に応じて取り込む部位を決定する。`
          : "参考サイトの指定がないため、業種標準構成と desiredTone から方向性を決定する。",
      inputs:
        refCount > 0 ? refUrls : ["業種標準構成", "desiredTone（brief.json）"],
      outputs: ["抽出対象部位", "配色・ビジュアル方向"],
      involvesExecution: true,
    },
    {
      id: "map-components",
      title: "コンポーネント対応付け",
      objective:
        "顧客の意図を Monet カタログへ対応付け、そのまま再利用できる部分・要調整・要カスタムを分ける。",
      inputs: ["正規化ブリーフ", "Monet カタログ", "抽出対象部位"],
      outputs: ["推奨セクション一覧", "コンポーネント候補", "対応付けの根拠"],
      involvesExecution: true,
    },
    {
      id: "compose-structure",
      title: "構成確定",
      objective:
        "サイトマップ・ページ構成・CTA を確定し、必須掲載情報と必要機能が漏れなく載るようにする。",
      inputs: ["推奨セクション一覧", "brief.json の requiredPagesOrFeatures"],
      outputs: ["サイトマップ", "ページ構成", "CTA 配置"],
      involvesExecution: true,
    },
    {
      id: "implement-site",
      title: "実装",
      objective:
        "コンポーネント組み立て・原稿・画像方針に沿って実装する。不足素材の扱い（ダミー→差し替え）も決める。",
      inputs: ["ページ構成", "コンポーネント候補", "素材状況"],
      outputs: ["実装成果物（ページ/コンポーネント）"],
      involvesExecution: true,
    },
    {
      id: "verify",
      title: "検証",
      objective:
        "成果物が正規化ブリーフ・必須セクション・参照整合・素材運用・コンバージョン目標を満たすか検証する。",
      inputs: ["実装成果物", "最終 URL/ファイル", "期待される成果物"],
      outputs: ["検証レポート", "要件ごとの合否チェックリスト"],
      involvesExecution: true,
    },
  ];

  const prerequisites: string[] = [];
  for (const r of pkg.intakeQuality.reasons) {
    if (r) prerequisites.push(r);
  }
  if (pkg.intakeQuality.status === "needs_followup") {
    prerequisites.push(
      "インテイク品質が needs_followup のため、計画実行前に追加確認が必要な項目がある。"
    );
  }

  const blockers: string[] = [];
  for (const a of pkg.reviewSummary.riskyAssumptions) {
    if (a) blockers.push(a);
  }
  if (missingAssets.length > 0) {
    blockers.push(`未提供素材あり: ${missingAssets.join("・")}`);
  }

  const rationale: string[] = [];
  rationale.push(
    refCount > 0
      ? `参考サイト ${refCount} 件を分析対象とする。`
      : "参考サイトがないため業種標準構成で補完する。"
  );
  rationale.push(
    missingAssets.length === 0
      ? "素材は一通り揃っている想定で計画する。"
      : `未提供素材（${missingAssets.join("・")}）はダミー生成→実物差し替えを想定する。`
  );

  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    submissionId: pkg.submissionId,
    generatedAt: new Date().toISOString(),
    generatedBy: "deterministic-planner",
    briefSnapshot: {
      businessSummary: pkg.reviewSummary.businessSummary,
      targetUserSummary: pkg.reviewSummary.targetUserSummary,
      strengths: pkg.reviewSummary.strengthsSummary,
      mustInclude: pkg.reviewSummary.mustIncludeSummary,
      referenceUrls: refUrls,
    },
    stages,
    orderedStageIds: stages.map((s) => s.id),
    prerequisites,
    blockers,
    rationale,
  };
}

/**
 * ハンドオフ成果物が示す showcase のパス・コンポーネント名を解決する。
 *
 * 正は SHOWCASE_MAP（runtime と共有）。submissionId が既にマップに登録
 * されていれば、runtime が実際に読み込む安定パス（例:
 * src/components/sections/phase2-manufacturing-showcase.tsx）とその
 * モジュール名を返す。オペレータはこのファイルを作成/更新すればよい。
 *
 * 未登録（新規 submission）の場合は null を返す。呼び出し側は
 * submissionId をそのままファイル名に使わず、オペレータに安定名の選定と
 * SHOWCASE_MAP への登録を促す。数字始まりのファイル名は Turbopack の
 * 動的 import 解決が不安定になるため、古い `${id}-showcase` 命名は出さない。
 */
function resolveShowcaseTarget(id: string): {
  componentPath: string;
  targetComponent: string;
} | null {
  const componentPath = resolveShowcaseComponentPath(id);
  if (!componentPath) return null;
  const fileName = componentPath.split("/").pop() ?? componentPath;
  const targetComponent = fileName.replace(/\.tsx$/, "");
  return { componentPath, targetComponent };
}

/**
 * Claude Code 実行ハンドオフ用のプロンプト（Markdown）を構築する。
 * 内部専用・ローカルオペレータが実行する Claude Code に読ませる。
 * 本番（serverless）のリクエストハンドラからは実行しない。
 */
export function buildExecutionPromptMarkdown(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): string {
  const id = pkg.submissionId;
  const rel = `${LOCAL_DISPLAY_ROOT}/${id}`;
  // runtime が実際に読み込む showcase パスの正は SHOWCASE_MAP。
  // 既にエントリがあればその安定パスを使い、未登録なら null（新規作成扱い）。
  const showcaseTarget = resolveShowcaseTarget(id);
  const lines: string[] = [];
  lines.push(`# 実行ハンドオフプロンプト — ${id}`);
  lines.push("");
  lines.push(
    "> 内部専用ドキュメントです。本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません。"
  );
  lines.push("> ローカル環境のオペレータが Claude Code でこの計画を実行します。");
  lines.push("");
  lines.push("## 前提");
  lines.push("- このプロンプトはリポジトリルートで実行することを想定しています。");
  lines.push(`- 対象 submissionId: \`${id}\``);
  if (showcaseTarget) {
    lines.push(`- この作業で更新すべき showcase コンポーネント（runtime が実際に読み込む安定パス）: \`${showcaseTarget.componentPath}\``);
  } else {
    lines.push("- この submission の showcase は SHOWCASE_MAP に未登録（新規作成）。");
    lines.push(`- showcase は安定した意味的なファイル名（小文字英数字とハイフン、かつ数字で始まらない）で \`src/components/sections/\` 配下に新規作成すること。submissionId（\`${id}\`）をそのままファイル名に使わないこと（Turbopack の動的 import 解決が不安定になるため）。`);
  }
  lines.push("- 他 submission の既存 showcase を流用したり、別 submission のファイルを更新してはいけません。");
  lines.push(`- ブリーフ: \`${rel}/brief.json\``);
  lines.push(`- 計画: \`${rel}/omc-plan.json\``);
  lines.push(`- 承認パッケージ: \`${rel}/approval-package.json\``);
  lines.push("");
  lines.push("## 出力契約（必須）");
  if (showcaseTarget) {
    lines.push(`- 最終的に \`${showcaseTarget.componentPath}\` を更新すること。`);
    lines.push(`- SHOWCASE_MAP の \`${id}\` エントリの loader が \`${showcaseTarget.targetComponent}\` を参照していることを確認すること（runtime はこのマップ経由で解決する）。`);
  } else {
    lines.push(`- showcase を安定名で新規作成し、SHOWCASE_MAP に \`${id}\` をキーとするエントリを追加すること（loader は作成したモジュールを参照）。`);
    lines.push(`- ファイル名に submissionId（\`${id}\`）を使わないこと。`);
  }
  lines.push("- 作業完了時には、作成/更新したファイルパスを明示して検証結果を出すこと。");
  lines.push("");
  lines.push("## 事業要件の要点");
  lines.push(`- ${plan.briefSnapshot.businessSummary || "（要約なし）"}`);
  lines.push(`- ターゲット: ${plan.briefSnapshot.targetUserSummary || "（未整理）"}`);
  if (plan.briefSnapshot.strengths.length > 0) {
    lines.push(`- 強み: ${plan.briefSnapshot.strengths.join("・")}`);
  }
  if (plan.briefSnapshot.mustInclude.length > 0) {
    lines.push(`- 必須掲載: ${plan.briefSnapshot.mustInclude.join("・")}`);
  }
  if (plan.briefSnapshot.referenceUrls.length > 0) {
    lines.push(`- 参考サイト: ${plan.briefSnapshot.referenceUrls.join("・")}`);
  }
  lines.push("");

  for (const note of buildMonetExecutionNotes(pkg, plan)) {
    lines.push(note);
  }

  for (const fbLine of buildImageFallbackPromptLines(pkg)) {
    lines.push(fbLine);
  }

  if (plan.prerequisites.length > 0) {
    lines.push("## 実行前に確認する前提");
    for (const p of plan.prerequisites) lines.push(`- ${p}`);
    lines.push("");
  }
  if (plan.blockers.length > 0) {
    lines.push("## ブロッカー・リスク前提");
    for (const b of plan.blockers) lines.push(`- ${b}`);
    lines.push("");
  }
  lines.push("## 実行ステップ（この順序で進める）");
  plan.stages.forEach((s, i) => {
    lines.push("");
    lines.push(`### ${i + 1}. ${s.title}（${s.id}）`);
    lines.push(s.objective);
    lines.push("");
    lines.push("**入力:**");
    for (const inp of s.inputs) lines.push(`- ${inp}`);
    lines.push("");
    lines.push("**期待成果物:**");
    for (const out of s.outputs) lines.push(`- ${out}`);
  });
  lines.push("");
  lines.push("## 完了条件");
  lines.push(
    "- 最終ステップ（検証）で、要件ごとの合否チェックリストを作成し、不合格項目があれば修正する。"
  );
  lines.push("- 顧客向けに公開する成果物の文言はすべて日本語にすること。");
  lines.push("");
  return lines.join("\n");
}

/**
 * 計画アーティファクトから実行ハンドオフ成果物（メタデータ）を構築する。
 * プロンプト本文は別ファイル（execution-prompt.md）とするため、ここには含めない。
 * 純粋関数・決定論的。
 */
export function buildExecutionHandoff(
  pkg: ApprovalPackage,
  plan: PlanningArtifact
): ExecutionHandoff {
  const id = pkg.submissionId;
  const rel = `${LOCAL_DISPLAY_ROOT}/${id}`;
  const promptFilePath = `${rel}/execution-prompt.md`;
  const sectionPromptsFilePath = `${rel}/execution-section-prompts.md`;
  // runtime が実際に読み込む showcase パスの正は SHOWCASE_MAP。
  // 既にエントリがあればその安定パスを、未登録なら null（新規作成扱い）。
  const showcaseTarget = resolveShowcaseTarget(id);
  const targetComponent = showcaseTarget?.targetComponent ?? null;
  const componentPath = showcaseTarget?.componentPath ?? null;
  const notices: string[] = [
    "本番（Vercel/serverless）のリクエストハンドラからは Claude Code を実行しません（実行時間・実行環境の制約のため）。",
    "このハンドオフはローカル環境のオペレータが Claude Code で実行することを想定しています。",
    "コマンドはリポジトリルートで実行してください。",
    "顧客向けに公開する文言はすべて日本語にしてください。プロンプト/コマンドの詳細は顧客に公開しないでください（内部専用）。",
  ];

  // 画像が不足しているとき、AI生成の経路（codex）を notices に明記する。
  // 実行プロンプト本文に詳細ブロックがあるが、ハンドオフの目立つ場所にも出す。
  const fb = pkg.imageFallback;
  if (fb && fb.status !== "not_needed") {
    notices.push(
      `画像の不足部分は AI仮画像で運用します（判定: ${fb.status === "recommended" ? "推奨" : "許容"}）。生成は serverless ではなくローカルオペレータが ${fb.generationPath.tool} -m ${fb.generationPath.model} で行います。生成物は ${fb.assetTraceability.prefix} プレフィックスで保存し、AI生成資産として顧客提供素材と区別してください。`
    );
  }

  return {
    schemaVersion: EXECUTION_HANDOFF_SCHEMA_VERSION,
    submissionId: id,
    generatedAt: new Date().toISOString(),
    handoffMode: "local-operator",
    workingDirectory: ".",
    claudeCommand: showcaseTarget
      ? `claude "${promptFilePath} を読み、submissionId=${id} 専用の showcase を ${showcaseTarget.componentPath} に実装してください。runtime は SHOWCASE_MAP 経由で解決するため、${id} エントリの loader が ${showcaseTarget.targetComponent} を参照していることを確認してください。他 submission の showcase は再利用・更新せず、brief.json / omc-plan.json を参照し、各ステップを順に進め、最後に検証してください。"`
      : `claude "${promptFilePath} を読み、submissionId=${id} 専用の showcase を安定した意味的なファイル名（数字で始まらない・submissionId を使わない）で新規実装し、SHOWCASE_MAP に ${id} エントリを追加してください。brief.json / omc-plan.json を参照し、各ステップを順に進め、最後に検証してください。"`,
    promptFilePath,
    sectionPromptsFilePath,
    monetMappingFilePath: `${rel}/monet-mapping.json`,
    metadataFilePath: `${rel}/execution-handoff.json`,
    planFilePath: `${rel}/omc-plan.json`,
    briefFilePath: `${rel}/brief.json`,
    targetComponent,
    componentPath,
    prerequisites: plan.prerequisites,
    notices,
    plannedStageIds: plan.orderedStageIds,
  };
}

/* ------------------------------------------------------------------ */
/*  Phase 2: ファイル I/O                                               */
/* ------------------------------------------------------------------ */

/** 計画アーティファクトを omc-plan.json へ書き込む（アダプタ経由） */
async function writePlanningArtifactFile(plan: PlanningArtifact): Promise<void> {
  await writeArtifact(
    plan.submissionId,
    "omc-plan.json",
    JSON.stringify(plan, null, 2)
  );
}

/**
 * 実行ハンドオフを構成するファイル群を書き込む。
 *   - execution-prompt.md        : Claude Code に読ませるプロンプト（内部専用）
 *   - execution-section-prompts.md: セクション別に事前分割したプロンプト（Phase P・内部専用）
 *   - execution-handoff.json     : ハンドオフのメタデータ + コマンド（内部専用）
 */
async function writeExecutionHandoffFiles(
  submissionId: string,
  handoff: ExecutionHandoff,
  promptMarkdown: string,
  sectionPromptsMarkdown: string
): Promise<void> {
  // プロンプト本文（Markdown×2）とメタデータ（JSON）をそれぞれアダプタ経由で書き込む
  await writeArtifact(submissionId, "execution-prompt.md", promptMarkdown);
  await writeArtifact(
    submissionId,
    "execution-section-prompts.md",
    sectionPromptsMarkdown
  );
  await writeArtifact(
    submissionId,
    "execution-handoff.json",
    JSON.stringify(handoff, null, 2)
  );
}

/** 実行プロンプト（Markdown）をディスクから読み込む。不在時は null。 */
export async function readExecutionPromptMarkdown(
  submissionId: string
): Promise<string | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  // アダプタは不在・失敗時に null を返すので try/catch 不要
  return readArtifact(submissionId, "execution-prompt.md");
}

/** セクション別実行プロンプト（execution-section-prompts.md）をディスクから読み込む。不在時は null。 */
export async function readExecutionSectionPromptsMarkdown(
  submissionId: string
): Promise<string | null> {
  if (!isSafeSubmissionId(submissionId)) return null;
  // アダプタは不在・失敗時に null を返すので try/catch 不要
  return readArtifact(submissionId, "execution-section-prompts.md");
}

/* ------------------------------------------------------------------ */
/*  Phase 2: 状態遷移                                                   */
/* ------------------------------------------------------------------ */

/**
 * 代表者がインテイクを承認したときの遷移（第1ゲート）。
 * OMC 計画アーティファクトを決定論的に生成して omc-plan.json に書き出し、
 * status を awaiting_plan_approval（第2ゲート：計画承認待ち）へ進める。
 * 該当パッケージが無い場合は null を返す（呼び出し側で 404 へマップ）。
 */
export async function approveRepresentativeReview(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.approval = toDecision("approve", new Date().toISOString(), meta);

  const plan = buildPlanningArtifact(pkg);
  pkg.planningArtifact = plan;
  // 新計画に対する第2ゲートは未判定にリセット
  pkg.planApproval = {
    representativeDecision: null,
    decidedAt: null,
    decidedBy: null,
    memo: null,
  };
  pkg.executionHandoff = null;

  // Monetコンポーネントマッピングアーティファクトを生成・保存
  const monetMapping = buildMonetMappingArtifact(pkg);
  pkg.monetMapping = monetMapping;

  try {
    await writePlanningArtifactFile(plan);
    await writeArtifact(
      submissionId,
      "monet-mapping.json",
      JSON.stringify(monetMapping, null, 2)
    );
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "awaiting_plan_approval";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者がインテイクを却下したときの遷移。status を rejected にする。
 */
export async function rejectRepresentativeReview(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.approval = toDecision("reject", new Date().toISOString(), meta);
  pkg.status = "rejected";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者が計画を承認したときの遷移（第2ゲート）。
 * 実行ハンドオフ成果物（プロンプトMD・メタデータJSON・Claude コマンド）を
 * 生成して submission フォルダに書き出し、status を approved_for_execution へ進める。
 *
 * 重要: ここでは Claude Code を実行しない。serverless では実行できないため、
 * ローカルオペレータへ「実行ハンドオフ」として引き渡す成果物だけを生成する。
 */
export async function approvePlan(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  // 計画が無い場合は生成して保証（冪等性のため）
  const plan = pkg.planningArtifact ?? buildPlanningArtifact(pkg);
  pkg.planningArtifact = plan;
  pkg.planApproval = toDecision("approve", new Date().toISOString(), meta);

  const handoff = buildExecutionHandoff(pkg, plan);
  const promptMarkdown = buildExecutionPromptMarkdown(pkg, plan);
  const sectionPromptsMarkdown = buildExecutionSectionPromptsMarkdown(pkg, plan);
  pkg.executionHandoff = handoff;

  // 実行準拠性アーティファクトを生成・保存
  const executionConformance = buildExecutionConformanceArtifact(pkg, pkg.monetMapping);

  try {
    await writePlanningArtifactFile(plan);
    await writeExecutionHandoffFiles(
      submissionId,
      handoff,
      promptMarkdown,
      sectionPromptsMarkdown
    );
    await writeArtifact(
      submissionId,
      "execution-conformance.json",
      JSON.stringify(executionConformance, null, 2)
    );
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "approved_for_execution";
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者が計画を差し戻したときの遷移。
 * 計画を取り下げ、status を awaiting_representative_approval に戻す。
 * 代表者が再承認すれば新しい計画が再生成される（再計画ループ）。
 */
export async function rejectPlan(
  submissionId: string,
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  pkg.planApproval = toDecision("reject", new Date().toISOString(), meta);
  pkg.planningArtifact = null;
  pkg.executionHandoff = null;
  pkg.status = "awaiting_representative_approval";
  await writeApprovalPackage(pkg);
  return pkg;
}

/* ------------------------------------------------------------------ */
/*  Phase A: 本制作前ヒアリング → 再検証 → 第3ゲート（本制作最終承認）   */
/* ------------------------------------------------------------------ */

/**
 * 顧客がデモを承認したあと、本制作前のヒアリングを開始する遷移。
 * 質問セットを preProductionInterview に保存し、interview-request.json を書き出し、
 * status を customer_approved → pre_production_interview へ進める。
 *
 * @returns 更新後のパッケージ。無効な遷移・不在時は例外または null。
 * @throws 現在のステータスから遷移できない場合は Error
 */
export async function startPreProductionInterview(
  submissionId: string,
  questions: InterviewQuestion[],
  requestedBy: string | null = null
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  if (!isValidTransition(pkg.status, "pre_production_interview")) {
    throw new Error(
      `無効なステータス遷移: ${pkg.status} → pre_production_interview`
    );
  }

  const requestedAt = new Date().toISOString();
  pkg.preProductionInterview = {
    requestedAt,
    requestedBy,
    questions,
    answers: null,
    answeredAt: null,
    additionalMaterialCount: 0,
  };

  try {
    await writeArtifact(
      submissionId,
      "interview-request.json",
      JSON.stringify(
        {
          schemaVersion: "1.0.0",
          submissionId,
          requestedAt,
          requestedBy,
          questions,
        },
        null,
        2
      )
    );
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "pre_production_interview";
  pkg.customerFacingStatus = toCustomerFacingStatus(pkg.status);
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 顧客がヒアリングに回答したときの遷移。
 * 回答を preProductionInterview.answers に保存し、interview-answer.json を書き出し、
 * status を pre_production_interview → pre_production_review（代表の最終承認待ち）へ進める。
 *
 * @throws 現在のステータスから遷移できない場合は Error
 */
export async function completePreProductionInterview(
  submissionId: string,
  answers: InterviewAnswer[],
  additionalMaterialCount = 0
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  if (!isValidTransition(pkg.status, "pre_production_review")) {
    throw new Error(
      `無効なステータス遷移: ${pkg.status} → pre_production_review`
    );
  }

  const answeredAt = new Date().toISOString();
  const interview = pkg.preProductionInterview ?? {
    requestedAt: answeredAt,
    requestedBy: null,
    questions: [],
    answers: null,
    answeredAt: null,
    additionalMaterialCount: 0,
  };
  interview.answers = answers;
  interview.answeredAt = answeredAt;
  interview.additionalMaterialCount = additionalMaterialCount;
  pkg.preProductionInterview = interview;

  try {
    await writeArtifact(
      submissionId,
      "interview-answer.json",
      JSON.stringify(
        {
          schemaVersion: "1.0.0",
          submissionId,
          answeredAt,
          additionalMaterialCount,
          answers,
        },
        null,
        2
      )
    );
  } catch {
    // ファイル書き出し失敗でもパッケージ本体の更新を優先する
  }

  pkg.status = "pre_production_review";
  pkg.customerFacingStatus = toCustomerFacingStatus(pkg.status);
  await writeApprovalPackage(pkg);
  return pkg;
}

/**
 * 代表者の本制作前最終承認（第3ゲート）。
 *   - approve の場合: pre_production_review → production_ready
 *   - reject の場合: pre_production_review → pre_production_interview（追加ヒアリングへ差し戻し）
 *
 * この関数は状態遷移と判定記録だけを行う。本制作準備度の評価（assessProductionReadiness）は
 * 呼び出し側で実施し、結果を productionReadiness にキャッシュしてから呼ぶ想定。
 *
 * @throws 現在のステータスから遷移できない場合は Error
 */
export async function recordPreProductionApproval(
  submissionId: string,
  action: "approve" | "reject",
  meta: UpdateDecisionMeta = {}
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  const nextStatus: ApprovalStatus =
    action === "approve" ? "production_ready" : "pre_production_interview";

  if (!isValidTransition(pkg.status, nextStatus)) {
    throw new Error(
      `無効なステータス遷移: ${pkg.status} → ${nextStatus}`
    );
  }

  pkg.preProductionApproval = toDecision(
    action,
    new Date().toISOString(),
    meta
  );
  // 差し戻し時は回答をリセットして再ヒアリングできるようにする
  if (action === "reject" && pkg.preProductionInterview) {
    pkg.preProductionInterview = {
      ...pkg.preProductionInterview,
      answers: null,
      answeredAt: null,
      additionalMaterialCount: 0,
    };
  }

  pkg.status = nextStatus;
  pkg.customerFacingStatus = toCustomerFacingStatus(pkg.status);
  await writeApprovalPackage(pkg);
  return pkg;
}

/* ------------------------------------------------------------------ */
/*  デモ生成・レビューループの状態遷移                                 */
/* ------------------------------------------------------------------ */

/**
 * 内部ステータスから顧客向けステータスへマッピングする。
 * demo_deployed / demo_revised → demo_ready_for_review
 * demo_revision_ready → demo_revision_submitted
 * customer_approved / production_ready / delivered → demo_approved
 * pre_production_interview / pre_production_review → pre_production_in_progress
 * その他 → under_internal_review（デフォルト）
 */
export function toCustomerFacingStatus(
  internalStatus: ApprovalStatus
): CustomerFacingStatus {
  switch (internalStatus) {
    case "demo_deployed":
    case "demo_revised":
      return "demo_ready_for_review";
    case "demo_revision_ready":
      return "demo_revision_submitted";
    case "customer_approved":
    case "production_ready":
    case "delivered":
      return "demo_approved";
    case "pre_production_interview":
    case "pre_production_review":
      return "pre_production_in_progress";
    default:
      return "under_internal_review";
  }
}

/**
 * 有効なステータス遷移の一覧。
 * キー: 現在のステータス、値: 遷移可能な次のステータスの配列
 *
 * 本制作前（第3ゲート）フロー:
 *   customer_approved → pre_production_interview（ヒアリング開始）
 *   pre_production_interview → pre_production_review（顧客回答完了・再検証後）
 *   pre_production_review → production_ready（代表の本制作最終承認）
 *   pre_production_review → pre_production_interview（代表の差し戻し）
 *
 * 注意: かつて存在した customer_approved → production_ready（直接遷移）は廃止。
 *   本制作へ進むには必ずヒアリング→再検証→第3ゲート承認を経る必要がある。
 */
export const VALID_TRANSITIONS: Map<ApprovalStatus, ApprovalStatus[]> =
  new Map([
    [
      "approved_for_execution",
      ["demo_generating"],
    ],
    [
      "demo_generating",
      ["demo_deployed", "demo_revised"],
    ],
    [
      "demo_deployed",
      ["demo_revision_ready", "customer_approved"],
    ],
    [
      "demo_revision_ready",
      ["demo_generating"],
    ],
    [
      "demo_revised",
      ["demo_revision_ready", "customer_approved"],
    ],
    [
      "customer_approved",
      ["pre_production_interview"],
    ],
    [
      "pre_production_interview",
      ["pre_production_review"],
    ],
    [
      "pre_production_review",
      ["production_ready", "pre_production_interview"],
    ],
    [
      "production_ready",
      ["delivered"],
    ],
  ]);

/**
 * ステータス遷移が有効かどうかを検証する。
 * @param current 現在のステータス
 * @param next 遷移後のステータス
 * @returns 遷移が有効な場合は true、無効な場合は false
 */
export function isValidTransition(
  current: ApprovalStatus,
  next: ApprovalStatus
): boolean {
  const allowed = VALID_TRANSITIONS.get(current);
  return allowed !== undefined && allowed.includes(next);
}

/**
 * ステータス遷移を実行する。遷移が無効な場合は例外を投げる。
 * また、customerFacingStatus も自動的に更新する。
 */
export async function transitionStatus(
  submissionId: string,
  newStatus: ApprovalStatus
): Promise<ApprovalPackage | null> {
  const pkg = await readApprovalPackage(submissionId);
  if (!pkg) return null;

  if (!isValidTransition(pkg.status, newStatus)) {
    throw new Error(
      `無効なステータス遷移: ${pkg.status} → ${newStatus}`
    );
  }

  pkg.status = newStatus;
  pkg.customerFacingStatus = toCustomerFacingStatus(newStatus);
  await writeApprovalPackage(pkg);
  return pkg;
}
