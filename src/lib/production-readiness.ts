/* ------------------------------------------------------------------ */
/*  本制作準備度評価 + 方向性確定判定（サーバー側・決定論的）            */
/* ------------------------------------------------------------------ */
/*  顧客がデモを承認したあとの「本制作前ヒアリング・追加素材・再検証」    */
/*  が揃っているかを、consult-quality.ts と同じ思想（スコア + 閾値 +     */
/*  reasons・LLM 不使用・同じ入力で同じ出力）で判定する。                  */
/*                                                                        */
/*  評価のねらい:                                                         */
/*    - 本制作前ヒアリングの必須質問が十分に回答されているか              */
/*    - 不足素材が多く、かつ追加素材が無い場合は要フォロー                */
/*    - 直近のデモフィードバック評価が低く方向性が未確定なら要フォロー    */
/*                                                                        */
/*  評価結果は第3ゲート（pre-production approve）の判断材料になり、        */
/*  approval-package.json の productionReadiness にキャッシュされる。      */
/* ------------------------------------------------------------------ */

import type {
  ApprovalPackage,
  ProductionReadiness,
} from "./approval-package";
import type { DemoFeedbackHistory } from "./demo-feedback-loop";

/* ------------------------------------------------------------------ */
/*  設定                                                                */
/* ------------------------------------------------------------------ */

/** 必須ヒアリング質問への回答が「意味のある長さ」とみなす最小文字数 */
const MIN_ANSWER_LEN = 6;

/** needs_followup に切り替わるスコアの閾値（consult-quality と同じ） */
const READINESS_THRESHOLD = 60;

/** 方向性確定とみなす直近ラウンドの評価（rating）の下限 */
const DIRECTION_SETTLED_RATING = 4;

/** 方向性確定判定に使う直近ラウンド数 */
const DIRECTION_SETTLED_LOOKBACK = 2;

/* ------------------------------------------------------------------ */
/*  小物ヘルパ                                                          */
/* ------------------------------------------------------------------ */

/** unknown を安全に文字列として取り出す（前後空白を除去） */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** スコアを 0〜100 に収める */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ------------------------------------------------------------------ */
/*  方向性確定判定                                                      */
/* ------------------------------------------------------------------ */

/**
 * デモフィードバック履歴から「方向性が確定したか」を判定する（決定論的）。
 *
 * 判定基準:
 *   - フィードバック履歴がない（＝初期デモをそのまま承認）→ 確定（true）
 *   - 直近 {@link DIRECTION_SETTLED_LOOKBACK} ラウンドの rating がすべて
 *     {@link DIRECTION_SETTLED_RATING} 以上 → 確定（true）
 *   - それ以外（直近に低評価の修正要求がある）→ 未確定（false）
 *
 * @param history demo-feedback.json の履歴（未実施時は null）
 */
export function isDirectionSettled(
  history: DemoFeedbackHistory | null
): boolean {
  if (!history || history.history.length === 0) return true;
  const recent = history.history.slice(-DIRECTION_SETTLED_LOOKBACK);
  return recent.every((entry) => entry.feedback.rating >= DIRECTION_SETTLED_RATING);
}

/* ------------------------------------------------------------------ */
/*  本制作準備度評価                                                    */
/* ------------------------------------------------------------------ */

/** assessProductionReadiness への入力 */
export interface ProductionReadinessInput {
  /** 承認パッケージ（素材分析・ヒアリング回答を参照） */
  pkg: ApprovalPackage;
  /** デモフィードバック履歴（方向性確定判定用・未実施時は省略可） */
  feedbackHistory?: DemoFeedbackHistory | null;
  /**
   * 現在の添付ファイル総数（追加素材の有無を補正するため）。
   * 省略時は承認パッケージの availableAttachments の件数を使う。
   */
  attachmentCount?: number;
}

/**
 * 本制作に進めるか（ヒアリング・素材・方向性が揃っているか）を
 * 決定論的に評価する。純粋関数（同じ入力 → 同じ出力）。
 *
 * @returns ProductionReadiness（status / score / reasons / assessedAt）
 */
export function assessProductionReadiness(
  input: ProductionReadinessInput
): ProductionReadiness {
  const { pkg, feedbackHistory = null } = input;
  const interview = pkg.preProductionInterview;
  const additionalMaterialCount = interview?.additionalMaterialCount ?? 0;
  const baseAttachmentCount =
    typeof input.attachmentCount === "number"
      ? input.attachmentCount
      : pkg.materialsAnalysis.availableAttachments.length;
  const totalMaterialCount = baseAttachmentCount + additionalMaterialCount;

  let score = 100;
  const reasons: string[] = [];

  /* ---- 本制作前ヒアリングが未実施 ---- */
  if (!interview || interview.questions.length === 0) {
    score -= 40;
    reasons.push("本制作前ヒアリングが未実施です。");
  } else {
    /* ---- 必須質問の回答網羅性 ---- */
    const answers = interview.answers ?? [];
    const answerById = new Map(answers.map((a) => [a.questionId, asString(a.text)]));

    for (const question of interview.questions) {
      if (!question.required) continue;
      const answer = answerById.get(question.id) ?? "";
      if (answer.length === 0) {
        score -= 18;
        reasons.push(`必須ヒアリング質問への回答がありません: 「${question.text}」`);
      } else if (answer.length < MIN_ANSWER_LEN) {
        score -= 9;
        reasons.push(
          `必須ヒアリング質問の回答が具体的ではありません: 「${question.text}」`
        );
      }
    }

    /* ---- ヒアリング完了マークの不整合（回答があるのに answeredAt がない等） ---- */
    if (interview.questions.some((q) => q.required) && interview.answers === null) {
      score -= 10;
      reasons.push("ヒアリング回答が未提出です。");
    }
  }

  /* ---- 素材の充実度（不足素材が多く、追加素材も無い場合は要フォロー） ---- */
  const missingAssets = pkg.materialsAnalysis.missingAssets;
  if (missingAssets.length >= 3 && totalMaterialCount === 0) {
    score -= 12;
    reasons.push(
      `必須素材の多くが未提供（${missingAssets.length}件）で、追加素材もありません。`
    );
  }

  /* ---- 方向性確定（直近のフィードバック評価が低い場合は要フォロー） ---- */
  if (!isDirectionSettled(feedbackHistory)) {
    score -= 15;
    reasons.push(
      "直近のデモフィードバック評価が低く、制作方向性が確定していません。"
    );
  }

  score = clampScore(score);
  const status: ProductionReadiness["status"] =
    score >= READINESS_THRESHOLD ? "ready" : "needs_followup";

  return {
    status,
    score,
    reasons,
    assessedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  デフォルトのヒアリング質問セット                                    */
/* ------------------------------------------------------------------ */

/**
 * 本制作前ヒアリングのデフォルト質問セット（日本語・顧客向け）。
 * 管理者がカスタム質問を指定しなかった場合に使う。
 * id は安定（変更すると過去の回答との紐付けが切れるため固定）。
 */
export const DEFAULT_INTERVIEW_QUESTIONS = [
  {
    id: "core-message",
    text: "ホームページで一番伝えたい「メッセージ」は何ですか？",
    required: true,
    placeholder: "例：技術力の高さと、顧客に寄り添う姿勢",
  },
  {
    id: "must-have",
    text: "今回の制作で「これだけは絶対に外せない」という要素はありますか？",
    required: true,
    placeholder: "例：実績の見せ方、料金の透明性、お問い合わせのしやすさ",
  },
  {
    id: "differentiator",
    text: "競合他社と比べて、御社ならではの強み・差別化ポイントを教えてください。",
    required: true,
    placeholder: "例：創業〇年の信頼、独自の〇〇技術、対応のスピード",
  },
  {
    id: "update-plan",
    text: "公開後に更新予定のある情報はありますか？（任意）",
    required: false,
    placeholder: "例：施工事例、お知らせ、スタッフブログ",
  },
  {
    id: "concerns",
    text: "その他、ご要望やご不安な点があれば自由にお書きください。（任意）",
    required: false,
    placeholder: "自由記述欄",
  },
] as const;
