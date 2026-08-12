"use client";

import { useState } from "react";
import { Check, ListChecks, Undo2 } from "lucide-react";
import SectionCompletionToggle from "./SectionCompletionToggle";

interface Props {
  active: boolean;
  guidance?: string;
  submissionId: string;
  sectionId: string;
}

export default function Gate1InlineActionCard({ active, guidance, submissionId, sectionId }: Props) {
  const [memo, setMemo] = useState("");

  const submitHandler = async (endpoint: string, body: Record<string, unknown>) => {
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
      alert("제출 실패: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const approveSubmit = () =>
    submitHandler("/api/consult/approve", {
      submissionId,
      memo,
      approvedBy: "代表",
      redirectTo: location.href,
    });

  const supplementSubmit = () =>
    submitHandler("/api/consult/reject", {
      submissionId,
      items: [],
      memo,
    });

  const rejectSubmit = () =>
    submitHandler("/api/consult/reject", {
      submissionId,
      memo,
    });

  if (!active) return null;

  return (
    <aside
      className="mt-6 border-l-4 border-purple-600 bg-purple-50/30 p-4"
      aria-label="第1ゲート 行動支援"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-800">
          <span className="inline-flex items-center rounded-full bg-purple-600 px-2.5 py-0.5 text-xs font-medium text-white">
            代表確認待ち（第1ゲート）
          </span>
          <SectionCompletionToggle
            sectionId={sectionId}
            submissionId={submissionId}
            active={active}
          />
        </div>
      </div>
      <p className="mb-3 text-sm text-gray-700">このセクションを確認したら、承認か差し戻しへ</p>
      <p className="mb-4 text-xs text-gray-600">{guidance}</p>
      <textarea
        className="mb-4 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        placeholder="選択사항 메모"
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
          <span>この内容で承認（確認）</span>
        </button>
        <button
          onClick={supplementSubmit}
          className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          <ListChecks className="h-4 w-4" />
          <span>項目別に差戻し</span>
        </button>
        <button
          onClick={rejectSubmit}
          className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <Undo2 className="h-4 w-4" />
          <span>差し戻し・却下</span>
        </button>
      </div>
      <p className="text-xs text-gray-500">
        各ボタンはこの画面から直接提出されます。詳細な選択が必要な場合はページ下部の「承認アクション」をご利用ください。
      </p>
    </aside>
  );
}