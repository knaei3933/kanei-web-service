/* ------------------------------------------------------------------ */
/*  内部向けプロンプトチェーンプレビュー（代表者レビュー用）            */
/* ------------------------------------------------------------------ */
/*  相談が「十分」と判定されたあと、代表者が社内で確認する               */
/*  「どのプロンプトを・どの順で・何を出力として期待して実行するか」      */
/*  のプレビューを組み立てる。                                          */
/*                                                                      */
/*  重要な設計上の制約:                                                  */
/*    - この情報は【内部レビュー専用】。顧客向けレスポンスや             */
/*      顧客完了画面には一切含めない。                                    */
/*    - Phase 1 では「実行そのもの」は行わず、順序と期待出力の           */
/*      開示だけを行う（post-approval 自動生成は非ゴール）。            */
/*    - 生の完全プロンプト文は保持せず、要約（目的/入力/期待出力）       */
/*      のみを格納する。                                                  */
/* ------------------------------------------------------------------ */

/**
 * プロンプトチェーン1ステージ分のプレビュー。
 * 代表者レビュー画面にこのまま表示できる構造。
 */
export interface PromptStagePreview {
  /** ステージ識別子（機械処理用） */
  id: string;
  /** ステージの表示名（日本語） */
  title: string;
  /** このステージの目的（日本語） */
  objective: string;
  /** このステージへの入力（日本語の箇条書き） */
  inputs: string[];
  /** このステージが出力する成果物（日本語の箇条書き） */
  expectedOutputs: string[];
  /**
   * このステージに進む前に代表者の承認が必要か。
   * 実行ステージは承認後のみ動くことを示すために使う。
   */
  requiresRepresentativeApprovalBeforeContinue: boolean;
}

/** buildPromptChainPreview へのオプション入力（すべて任意） */
export interface PromptChainInput {
  /** 参考サイト URL の実質数（0 のときは抽出計画を簡略化する） */
  referenceCount?: number;
}

/** 参考サイトが無いときの代替文言 */
const NO_REFERENCE_NOTE =
  "参考サイトの指定がないため、業種標準構成と desiredTone から方向性を決定する。";

/**
 * Phase 1 で開示する内部プロンプトチェーンのプレビューを構築する。
 * 純粋関数・決定論的。同じ入力 → 同じ出力。
 *
 * ステージ構成（Phase 1）:
 *   1. intake-normalization            インテイク正規化
 *   2. reference-extraction-planning   参考サイト抽出計画
 *   3. monet-component-mapping         Monet コンポーネント対応付け
 *   4. omc-planning                    OMC 計画立案
 *   5. execution-after-approval        承認後実行（プレビューのみ・未実装）
 *   6. verification                    検証
 */
export function buildPromptChainPreview(
  input: PromptChainInput = {}
): PromptStagePreview[] {
  const referenceCount = Math.max(0, Math.floor(input.referenceCount ?? 0));
  const hasReference = referenceCount > 0;

  return [
    {
      id: "intake-normalization",
      title: "インテイク正規化",
      objective:
        "相談の生入力を、下流の生成で扱いやすい正規化ブリーフへ変換する。矛盾・曖昧さ・必須の確認事項を抽出する。",
      inputs: [
        "相談ペイロード（構造化データ）",
        "保存された添付ファイルのメタデータ",
        "参考サイトの入力メタデータ",
      ],
      expectedOutputs: [
        "正規化ブリーフ",
        "不足事実のリスト",
        "矛盾点のリスト",
      ],
      requiresRepresentativeApprovalBeforeContinue: false,
    },
    {
      id: "reference-extraction-planning",
      title: "参考サイト抽出計画",
      objective: hasReference
        ? `提出された参考サイト（${referenceCount}件）それぞれから何を抽出するかを決定する。`
        : "参考サイトの抽出計画を立案する（今回は提出なし・業種標準で補完）。",
      inputs: hasReference
        ? [
            "正規化ブリーフ",
            `参考サイト ${referenceCount} 件`,
            "再現度のメタデータ",
          ]
        : ["正規化ブリーフ", NO_REFERENCE_NOTE],
      expectedOutputs: [
        "URL ごとの抽出対象（レイアウト/セクション/文案方向/CTA/信頼要素/ナビ構造/ビジュアル）",
        "抽出に適さない URL の却下理由",
      ],
      requiresRepresentativeApprovalBeforeContinue: false,
    },
    {
      id: "monet-component-mapping",
      title: "Monet コンポーネント対応付け",
      objective:
        "顧客の意図を Monet カタログの構造と抽出対象へ対応付ける。そのまま再利用できる部分・要調整・要カスタムを分ける。",
      inputs: ["正規化ブリーフ", "Monet カタログ", "抽出計画"],
      expectedOutputs: [
        "推奨セクション一覧",
        "コンポーネント候補",
        "対応付けの根拠",
      ],
      requiresRepresentativeApprovalBeforeContinue: false,
    },
    {
      id: "omc-planning",
      title: "OMC 計画立案",
      objective:
        "代表者が承認するための、段階別の実行/生成計画を作成する。ここでは実行せず、計画の開示にとどめる。",
      inputs: ["正規化ブリーフ", "抽出計画", "コンポーネント対応付け"],
      expectedOutputs: [
        "段階別の実装/生成計画",
        "前提・ブロッカー",
        "厳密なステージ順序",
      ],
      requiresRepresentativeApprovalBeforeContinue: false,
    },
    {
      id: "execution-after-approval",
      title: "承認後実行（Phase 1 ではプレビューのみ）",
      objective:
        "代表者が計画を承認したあとにのみ実行する。各ステージで成果物を出し、検証して進捗を記録する。Phase 1 では実行エンジンを持たず、予定として開示する。",
      inputs: ["承認済み計画", "承認済みブリーフ", "抽出結果", "コンポーネント対応付け"],
      expectedOutputs: [
        "提案サイト / 下書きサイト / 実装成果物",
      ],
      // このステージは代表承認が前提
      requiresRepresentativeApprovalBeforeContinue: true,
    },
    {
      id: "verification",
      title: "検証",
      objective:
        "完了報告の前に、成果物が承認済みブリーフ・必須セクション・参照整合・素材運用・コンバージョン目標を満たすか検証する。",
      inputs: ["生成された成果物", "最終 URL / ファイル", "期待される成果物"],
      expectedOutputs: [
        "検証レポート",
        "要件ごとの合否チェックリスト",
      ],
      requiresRepresentativeApprovalBeforeContinue: false,
    },
  ];
}
