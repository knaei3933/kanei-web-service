"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

interface Props {
  sectionId: string;
  submissionId: string;
}

/**
 * Lightweight section completion toggle for the execution page.
 * Reuses /api/submissions/[id]/section-status (public, no auth needed).
 */
export default function ExecutionSectionToggle({
  sectionId,
  submissionId,
}: Props) {
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(
      `/api/submissions/${submissionId}/section-status`,
    )
      .then((r) => r.json())
      .then((data: Record<string, boolean>) => {
        setCompleted(!!data[sectionId]);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [sectionId, submissionId]);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/submissions/${submissionId}/section-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, completed: !completed }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCompleted(!completed);
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={saving || !loaded}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors"
      style={{
        borderColor: completed ? "#16a34a" : "#64748b",
        backgroundColor: completed ? "#f0fdf4" : "#f8fafc",
        color: completed ? "#15803d" : "#64748b",
      }}
    >
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : completed ? (
        <Check className="h-3 w-3" />
      ) : null}
      {saving ? "保存 中..." : completed ? "作業完了" : "未確認"}
    </button>
  );
}
