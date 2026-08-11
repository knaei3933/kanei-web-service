"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  代表者向け: 項目別差戻し／補足依頼フォーム（第1ゲート）              */
/* ------------------------------------------------------------------ */
/*  このフォームはサーバーコンポーネントの review ページから組み込む     */
/*  クライアントコンポーネント。チェックボックスで差戻し対象の項目を     */
/*  選び、共通の指示文を入力して送信すると、/api/consult/reject へ        */
/*  itemsJson（構造化された項目別補足要求）を POST する。                */
/*                                                                      */
/*  既存の承認／却下フォームと同じくネイティブな form 送信 + 303         */
/*  リダイレクトで画面を再描画する。送信前に onSubmit で hidden の       */
/*  itemsJson を組み立てるのがこのコンポーネントの役割である。           */
/* ------------------------------------------------------------------ */

/** 差戻し候補となる項目1件（サーバー側から受け取る） */
export interface SupplementTarget {
  /** ペイロード上の項目キー */
  key: string;
  /** 表示名（日本語） */
  label: string;
  /** 必須項目か（UI の目印用） */
  required: boolean;
  /** 現在の入力値の抜粋（「どこが薄いか」の判断材料） */
  currentValue: string;
}

interface SupplementRequestFormProps {
  submissionId: string;
  targets: SupplementTarget[];
}

/**
 * 選択された項目 + 共通指示から、サーバーが解釈する items 配列を作る。
 * サーバー（coerceItems）は key・guidance が空の項目を弾くため、
 * ここでは必ず両方を埋めて返す。
 */
function buildItems(
  targets: SupplementTarget[],
  selected: Set<string>,
  guidance: string
) {
  return targets
    .filter((t) => selected.has(t.key))
    .map((t) => ({
      key: t.key,
      label: t.label,
      currentValue: t.currentValue,
      severity: "supplement" as const,
      guidance,
    }));
}

export function SupplementRequestForm({
  submissionId,
  targets,
}: SupplementRequestFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [guidance, setGuidance] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /**
   * 送信直前に hidden の itemsJson（と memo）を組み立ててから、
   * ネイティブな form 送信に任せる。バリデーション不合格時は送信を止める。
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const trimmed = guidance.trim();
    const items = buildItems(targets, selected, trimmed);

    if (items.length === 0) {
      event.preventDefault();
      setError("差戻し対象の項目を1件以上選択してください。");
      return;
    }
    if (trimmed.length === 0) {
      event.preventDefault();
      setError("選択した項目への指示（補足してほしい内容）を入力してください。");
      return;
    }

    setError(null);

    const itemsField = event.currentTarget.querySelector(
      'input[name="itemsJson"]'
    ) as HTMLInputElement | null;
    if (itemsField) itemsField.value = JSON.stringify(items);

    // 同じ指示文を承認判定メモとしても残す（人間が履歴を読むときの手がかり）
    const memoField = event.currentTarget.querySelector(
      'input[name="memo"]'
    ) as HTMLInputElement | null;
    if (memoField) memoField.value = trimmed;
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-bold text-indigo-900">
        項目別差戻し／補足要求
      </p>
      <p className="mt-2 text-xs leading-relaxed text-indigo-800/90">
        特定の項目について追加入力を依頼する場合は、下の項目を選択して指示を入力してください。
        顧客は完了画面・追加情報入力フォームで項目別の指示を確認できます。
        全項目に問題がなければ、下の「インテイクを承認する」で進めてください。
      </p>

      <form
        action="/api/consult/reject"
        method="post"
        onSubmit={handleSubmit}
        className="mt-4"
      >
        <input type="hidden" name="submissionId" value={submissionId} />
        <input
          type="hidden"
          name="redirectTo"
          value={`/review/${submissionId}`}
        />
        <input type="hidden" name="approvedBy" value="代表" />
        {/* 送信直前に JS で組み立てる。空のまま送信すると単一メモ却下に戻る。 */}
        <input type="hidden" name="itemsJson" value="" />
        <input type="hidden" name="memo" value="" />

        <fieldset className="mt-3 rounded-2xl border border-indigo-200 bg-white p-3">
          <legend className="px-1 text-xs font-bold text-indigo-900">
            差戻し／補足依頼する項目（複数選択可）
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {targets.map((target) => {
              const checked = selected.has(target.key);
              return (
                <label
                  key={target.key}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 ${
                    checked
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleKey(target.key)}
                    className="mt-0.5 size-3.5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {target.label}
                      {target.required && (
                        <span className="ml-1 text-[10px] font-bold text-rose-600">
                          必須
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      現在: {target.currentValue}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-3">
          <label
            htmlFor="supplement-guidance"
            className="block text-xs font-bold text-indigo-900"
          >
            選択項目への共通指示
          </label>
          <textarea
            id="supplement-guidance"
            rows={3}
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-sm text-foreground outline-none ring-0"
            placeholder="選択した項目について、どのような点を補足してほしいかを具体的に記入してください。この指示文がそのまま各項目の補足要求として顧客へ伝わります。"
          />
        </div>

        {error && (
          <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            選択項目を差戻す（追加情報待ちへ）
          </button>
          <span className="text-xs text-muted-foreground">
            → 選択した項目を needs_followup に戻し、顧客へ指示を表示します
          </span>
        </div>
      </form>
    </div>
  );
}
