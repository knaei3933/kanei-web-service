"use client";

import { FormEvent, useRef } from "react";

interface Props {
  submissionId: string;
  redirectTo: string;
  approvedBy?: string;
}

/**
 * 第1ゲート「却下（単一メモ）」フォーム。
 * 送信前に window.confirm で「完全却下」の注意喚起を行う。
 * itemsJson を送らないため、サーバー側で rejected に処理される。
 */
export function RejectWithConfirm({
  submissionId,
  redirectTo,
  approvedBy = "代表",
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleConfirm(e: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      "⚠️ この相談を完全に却下（rejected）します。\n" +
        "項目別に補足を依頼する場合はキャンセルして、\n" +
        "上の「項目別差戻し／補足要求」をお使いください。\n\n" +
        "本当に却下しますか？"
    );
    if (!confirmed) e.preventDefault();
  }

  return (
    <form
      ref={formRef}
      action="/api/consult/reject"
      method="post"
      onSubmit={handleConfirm}
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="approvedBy" value={approvedBy} />
      <label className="mt-3 block text-sm font-bold text-rose-900">
        却下 / 保留メモ（単一）
      </label>
      <textarea
        name="memo"
        rows={4}
        className="mt-2 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-0"
        placeholder="差し戻し理由や保留メモ"
      />
      <p className="mt-2 text-xs leading-relaxed text-rose-800/80">
        却下すると、status を rejected にします。元に戻すことはできません。
      </p>
      <button
        type="submit"
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
      >
        🚫 相談を却下する（受付終了）
      </button>
    </form>
  );
}
