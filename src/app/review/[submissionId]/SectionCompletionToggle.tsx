"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface Props {
  sectionId: string;
  submissionId: string;
  active: boolean;
}

export default function SectionCompletionToggle({ sectionId, submissionId, active }: Props) {
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mount 시 현재 상태 로드
  useEffect(() => {
    if (!active) return;

    fetch(`/api/submissions/${submissionId}/section-status`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load section status");
        return res.json();
      })
      .then((data: Record<string, boolean>) => {
        setCompleted(!!data[sectionId]);
      })
      .catch(() => {
        console.warn(`Failed to load section status for ${sectionId}`);
      });
  }, [active, submissionId, sectionId]);

  // 체크 토글 시 저장
  const handleToggle = async () => {
    if (!active) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/section-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, completed: !completed }),
      });

      if (!res.ok) throw new Error("Failed to update section status");

      const data = await res.json();
      setCompleted(!!data.completed);
    } catch (err) {
      console.error("Failed to toggle section completion:", err);
      alert("체크 상태 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={saving}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
          completed
            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
            : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Check className={`w-3.5 h-3.5 ${completed ? "text-emerald-600" : "text-gray-400"}`} />
        {completed ? "확인완료" : saving ? "저장 중..." : "미확인"}
      </button>
    </div>
  );
}