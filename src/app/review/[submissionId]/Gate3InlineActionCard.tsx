"use client";

import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import SectionCompletionToggle from "./SectionCompletionToggle";

interface Props {
  active: boolean;
  submissionId: string;
  sectionId: string;
}

/**
 * Gate3 inline action card for the review page.
 * Gate3 requires ADMIN_SECRET, so this card links to the admin page
 * instead of performing actions directly.
 */
export default function Gate3InlineActionCard({
  active,
  submissionId,
  sectionId,
}: Props) {
  if (!active) return null;

  return (
    <aside
      className="mt-6 border-l-4 border-emerald-600 bg-emerald-50/30 p-4"
      aria-label="第3ゲート 行動支援"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white">
            本制作前最終承認待ち（第3ゲート）
          </span>
          <SectionCompletionToggle
            sectionId={sectionId}
            submissionId={submissionId}
            active={active}
          />
        </div>
      </div>
      <p className="mb-3 text-sm text-gray-700">
        ヒアリング回答・追加素材・本制作準備度を確認したら、管理画面で承認してください
      </p>
      <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        第3ゲートの承認・差し戻しは管理者認証（ADMIN_SECRET）が必要です。
        このレビュー画面からは実行できません。
      </div>
      <Link
        href={`/admin/${submissionId}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        <ShieldCheck className="h-4 w-4" />
        <span>管理画面で承認・差し戻し</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </aside>
  );
}
