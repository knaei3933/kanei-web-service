/**
 * 第3ゲート（本制作前最終承認）向けの 内部判断支援 チェックリスト。
 *
 * 【重要】これは「自動承認エンジン」ではない。オペレーターが
 * 承認 / 差し戻し を判断するための補助表示であり、既存データ
 * （本制作前ヒアリング・本制作準備度・内部ステータス）からのみ派生する。
 * 新たな永続化や状態更新は一切行わない。
 *
 * review ページ（Server Component）と admin ページ（Client Component）の
 * 両方から使うため、React に依存しない純粋関数として実装している。
 * （Next.js 16 でも、クライアント専用コードを含まない共有モジュールは
 *   Server / Client どちらの module graph にも取り込める。）
 */

/** チェック行のトーン（色と意味を対応させる）。 */
export type Gate3Tone = "ok" | "review" | "incomplete";

/** 1 行分のチェック結果。 */
export interface Gate3ChecklistRow {
  id: string;
  label: string;
  detail: string;
  tone: Gate3Tone;
}

/**
 * 入力形状。review 側（approval-package.ts の正規型・フィールド必須）と
 * admin 側（緩いローカル型・フィールド任意）の両方を受け入れるため、
 * すべて optional / null 許容の構造的部分型にしている。
 */
export interface Gate3ChecklistInput {
  status?: string | null;
  interview: {
    requestedAt?: string | null;
    questions?: { id: string; required?: boolean }[];
    answers?: { questionId: string; text?: string }[] | null;
    answeredAt?: string | null;
    additionalMaterialCount?: number;
  } | null;
  readiness: {
    status?: "ready" | "needs_followup" | null;
    score?: number | null;
    reasons?: string[] | null;
    assessedAt?: string | null;
  } | null;
}

export interface Gate3ChecklistResult {
  rows: Gate3ChecklistRow[];
  /** 内部専用の1行サマリ（自動判定ではない旨を必ず含める）。 */
  summary: string;
  /** 「承認へ進められるか」の推奨判定（あくまで目安・自動承認ではない）。 */
  recommendApprove: boolean;
  /** 第3ゲート（pre_production_review / production_ready）に到達済みか。 */
  reachedReview: boolean;
}

/** 設問のうち、空でない回答が得られている件数を数える。 */
function countAnswered(
  questions: { id: string }[],
  answers: { questionId: string; text?: string }[] | null | undefined,
): number {
  if (!answers || answers.length === 0) return 0;
  const filled = new Set<string>();
  for (const a of answers) {
    if ((a.text ?? "").trim().length > 0) filled.add(a.questionId);
  }
  return questions.filter((q) => filled.has(q.id)).length;
}

/**
 * 第3ゲート判断支援チェックリストを構築する。
 *
 * 派生元は入力のみ。副作用なし。表示用のトーン・詳細文・サマリを返す。
 */
export function buildGate3Checklist(
  input: Gate3ChecklistInput,
): Gate3ChecklistResult {
  const status = input.status ?? "";
  const interview = input.interview;
  const readiness = input.readiness;

  const questions = interview?.questions ?? [];
  const questionCount = questions.length;
  const requiredQuestions = questions.filter((q) => q.required === true);
  const requiredCount = requiredQuestions.length;

  const answeredCount = countAnswered(questions, interview?.answers);
  const unansweredCount = Math.max(0, questionCount - answeredCount);

  const requiredAnswered = countAnswered(requiredQuestions, interview?.answers);
  const requiredMissing = Math.max(0, requiredCount - requiredAnswered);

  const materials = interview?.additionalMaterialCount ?? 0;

  const reasons = readiness?.reasons ?? [];
  const reasonCount = reasons.length;
  const score = readiness?.score ?? 0;
  const readinessOk = readiness?.status === "ready";

  const reachedReview =
    status === "pre_production_review" || status === "production_ready";
  const alreadyApproved = status === "production_ready";

  // 「承認へ進められるか」の推奨判定（あくまで目安・自動承認ではない）。
  // 全設問回答済み・必須漏れなし・準備度 ready・未解決理由なし を満たす場合のみ true。
  const recommendApprove =
    !!interview &&
    questionCount > 0 &&
    unansweredCount === 0 &&
    requiredMissing === 0 &&
    readinessOk &&
    reasonCount === 0;

  const rows: Gate3ChecklistRow[] = [];

  // 1. ヒアリング起票の有無
  rows.push(
    interview
      ? {
          id: "interview_started",
          label: "ヒアリング起票",
          tone: "ok",
          detail: `起票済み（${interview.requestedAt ?? "日時不明"}）`,
        }
      : {
          id: "interview_started",
          label: "ヒアリング起票",
          tone: "incomplete",
          detail: "未起票（customer_approved 後に管理画面で開始）",
        },
  );

  // 2. 全設問の回答状況
  if (questionCount === 0) {
    rows.push({
      id: "answers",
      label: "設問の回答",
      tone: "incomplete",
      detail: "設問が未定義",
    });
  } else if (unansweredCount === 0) {
    rows.push({
      id: "answers",
      label: "設問の回答",
      tone: "ok",
      detail: `全 ${questionCount} 件に回答済み`,
    });
  } else if (answeredCount > 0) {
    rows.push({
      id: "answers",
      label: "設問の回答",
      tone: "review",
      detail: `${answeredCount} / ${questionCount} 件（未回答 ${unansweredCount}）`,
    });
  } else {
    rows.push({
      id: "answers",
      label: "設問の回答",
      tone: "incomplete",
      detail: `0 / ${questionCount} 件（全件未回答）`,
    });
  }

  // 3. 必須設問の完了度
  if (requiredCount === 0) {
    rows.push({
      id: "required_answers",
      label: "必須設問の完了",
      tone: "ok",
      detail: "必須設問なし",
    });
  } else if (requiredMissing === 0) {
    rows.push({
      id: "required_answers",
      label: "必須設問の完了",
      tone: "ok",
      detail: `必須 ${requiredCount} 件すべて回答済み`,
    });
  } else {
    rows.push({
      id: "required_answers",
      label: "必須設問の完了",
      tone: "incomplete",
      detail: `必須 ${requiredMissing} / ${requiredCount} 件が未回答`,
    });
  }

  // 4. 追加素材の有無（任意だが、有无をひと目で）
  rows.push({
    id: "materials",
    label: "追加素材",
    tone: materials > 0 ? "ok" : "review",
    detail:
      materials > 0
        ? `${materials} 件の追加素材を提出済み`
        : "未提出（任意・必要か要確認）",
  });

  // 5. 本制作準備度（最新のキャッシュ）
  if (!readiness) {
    rows.push({
      id: "readiness",
      label: "本制作準備度",
      tone: "incomplete",
      detail: "未評価（回答後に再検証を実施）",
    });
  } else if (readinessOk) {
    rows.push({
      id: "readiness",
      label: "本制作準備度",
      tone: "ok",
      detail: `進行可能（スコア ${score}）`,
    });
  } else {
    rows.push({
      id: "readiness",
      label: "本制作準備度",
      tone: "review",
      detail: `要フォロー（スコア ${score}）`,
    });
  }

  // 6. 未解決の準備度理由
  if (!readiness) {
    rows.push({
      id: "reasons",
      label: "未解決の判定理由",
      tone: "incomplete",
      detail: "未評価のため理由なし",
    });
  } else if (reasonCount === 0) {
    rows.push({
      id: "reasons",
      label: "未解決の判定理由",
      tone: "ok",
      detail: "指摘事項なし",
    });
  } else {
    rows.push({
      id: "reasons",
      label: "未解決の判定理由",
      tone: "review",
      detail: `${reasonCount} 件の未解決理由あり`,
    });
  }

  // 7. 現在の承認可否ガイド（safe to approve vs recommend send-back）
  if (alreadyApproved) {
    rows.push({
      id: "guidance",
      label: "承認可否の目安",
      tone: "ok",
      detail: "第3ゲート承認済み（記録の確認用）",
    });
  } else if (status === "pre_production_review") {
    rows.push(
      recommendApprove
        ? {
            id: "guidance",
            label: "承認可否の目安",
            tone: "ok",
            detail: "承認へ進めます（最終判断はオペレーター）",
          }
        : {
            id: "guidance",
            label: "承認可否の目安",
            tone: "review",
            detail: "差し戻しを推奨する未完了・要確認要素あり",
          },
    );
  } else {
    rows.push({
      id: "guidance",
      label: "承認可否の目安",
      tone: "incomplete",
      detail: reachedReview
        ? "第3ゲート前の状態"
        : "まだ第3ゲートに到達していません",
    });
  }

  // サマリ（内部専用・「自動判定ではない」を必ず明示）
  let summary: string;
  if (alreadyApproved) {
    summary =
      "内部判断支援: 第3ゲートは承認済みです（記録の確認用・自動承認ではありません）。";
  } else if (status === "pre_production_review") {
    const blockers =
      unansweredCount + requiredMissing + (readinessOk ? 0 : 1) + reasonCount;
    summary = recommendApprove
      ? "内部判断支援: 確認要素は揃っています（ブロック項目 0）。ただし承認可否はオペレーターの最終判断であり、自動承認ではありません。"
      : `内部判断支援: 未完了・要確認が ${blockers} 件あります。差し戻しを検討してください（自動判定ではなく目安です）。`;
  } else {
    summary =
      "内部判断支援: まだ第3ゲート（本制作前最終承認）前の状態です。ヒアリングと再検証が終わった時点で承認可否を判断します（自動承認ではありません）。";
  }

  return { rows, summary, recommendApprove, reachedReview };
}
