"use client";

import { useState } from "react";
import { Check, Undo2, FileCode2 } from "lucide-react";
import SectionCompletionToggle from "./SectionCompletionToggle";

interface Props {
  active: boolean;
  guidance?: string;
  submissionId: string;
  sectionId: string;
}

export default function Gate2InlineActionCard({
  active,
  guidance,
  submissionId,
  sectionId,
}: Props) {
  const [memo, setMemo] = useState("");

  const submitHandler = async (
    endpoint: string,
    body: Record<string, unknown>,
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("제출 완료");
      location.reload();
    } catch (err) {
      console.error("Submit error:", err);
      alert(
        "제출 실패: " + (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  const approveSubmit = () =>
    submitHandler("/api/consult/plan/approve", {
      submissionId,
      memo,
      approvedBy: "代表",
      redirectTo: location.href,
    });

  const rejectSubmit = () =>
    submitHandler("/api/consult/plan/reject", {
      submissionId,
      memo,
      approvedBy: "代表",
      redirectTo: location.href,
    });

  if (!active) return null;

  return (
    <aside
      className="mt-6 border-l-4 border-indigo-600 bg-indigo-50/30 p-4"
      aria-label="第2ゲート 行動支援"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
          <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-medium text-white">
            計画承認待ち（第2ゲート）
          </span>
          <SectionCompletionToggle
            sectionId={sectionId}
            submissionId={submissionId}
            active={active}
          />
        </div>
      </div>
      <p className="mb-3 text-sm text-gray-700">
        計画アーティファクトを確認したら、承認か差し戻しへ
      </p>
      <p className="mb-4 text-xs text-gray-600">{guidance}</p>
      <textarea
        className="mb-4 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        placeholder="承認・差し戻しに関するメモ（任意）"
        rows={2}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={approveSubmit}
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          <Check className="h-4 w-4" />
          <span>計画を承認（実行ハンドオフ生成）</span>
        </button>
        <button
          onClick={rejectSubmit}
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <Undo2 className="h-4 w-4" />
          <span>計画を差し戻す</span>
        </button>
      </div>
      <p className="text-xs text-gray-500">
        承認すると実行ハンドオフ成果物（execution-prompt.md /
        execution-handoff.json）を生成します。Claude Code
        の実行は行わず、オペレータへの引き渡しのみです。差し戻すと第1ゲートに戻ります。詳細はページ下部の「承認アクション」をご利用ください。
      </p>
    </aside>
  );
}
