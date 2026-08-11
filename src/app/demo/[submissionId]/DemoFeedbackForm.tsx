"use client";

import { useState, useTransition } from "react";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Link2,
  PencilLine,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { DEMO_SECTION_OPTIONS } from "@/lib/demo-sections";

interface DemoFeedbackFormProps {
  submissionId: string;
}

interface FeedbackState {
  rating: number;
  comment: string;
  action: "approve" | "revision" | null;
  selectedSectionIds: string[];
  sectionFeedback: Record<string, string>;
  referenceImageUrls: string;
}

interface FormState {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
}

export function DemoFeedbackForm({ submissionId }: DemoFeedbackFormProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({
    rating: 0,
    comment: "",
    action: null,
    selectedSectionIds: [],
    sectionFeedback: {},
    referenceImageUrls: "",
  });
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });
  const [isPending, startTransition] = useTransition();
  // 詳細な修正入力（箇所選択・箇所別メモ・参考画像）は初期表示では隠し、
  // 必要な顧客だけ展開する。第一印象を軽くし、承認だけで進む導線を妨げない。
  const [revisionMode, setRevisionMode] = useState(false);

  // 選択中の修正対象セクション（ライブサマリ表示用）
  const selectedSections = DEMO_SECTION_OPTIONS.filter((section) =>
    feedback.selectedSectionIds.includes(section.id)
  );
  const selectedCount = selectedSections.length;

  // 修正依頼送信可否判定: いずれか1つ以上の入力があることを要求
  const hasRevisionInput = (() => {
    const commentFilled = feedback.comment.trim().length > 0;
    const hasSelectedSection = selectedCount > 0;
    const hasSectionMemo = Object.values(feedback.sectionFeedback).some(
      (v) => v.trim().length > 0
    );
    const hasReferenceImage = feedback.referenceImageUrls.trim().length > 0;
    return commentFilled || hasSelectedSection || hasSectionMemo || hasReferenceImage;
  })();

  // 送信前確認サマリ用の集計値
  const commentLength = feedback.comment.trim().length;
  const referenceUrlCount = feedback.referenceImageUrls
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const summaryRows: { label: string; value: string }[] = [
    { label: "全体の評価", value: `★ ${feedback.rating} / 5` },
    {
      label: "全体コメント",
      value: commentLength > 0 ? `${commentLength}文字` : "なし",
    },
    { label: "修正箇所", value: selectedCount > 0 ? `${selectedCount}件` : "なし" },
    {
      label: "参考URL",
      value: referenceUrlCount > 0 ? `${referenceUrlCount}件` : "なし",
    },
  ];

  const handleRatingChange = (rating: number) => {
    setFeedback((prev) => ({ ...prev, rating }));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 1000);
    setFeedback((prev) => ({ ...prev, comment: value }));
  };

  const toggleSection = (sectionId: string) => {
    setFeedback((prev) => {
      const selected = prev.selectedSectionIds.includes(sectionId)
        ? prev.selectedSectionIds.filter((id) => id !== sectionId)
        : [...prev.selectedSectionIds, sectionId];
      return {
        ...prev,
        selectedSectionIds: selected,
      };
    });
  };

  const handleSectionFeedbackChange = (sectionId: string, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      sectionFeedback: {
        ...prev.sectionFeedback,
        [sectionId]: value.slice(0, 400),
      },
    }));
  };

  const handleReferenceUrlsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback((prev) => ({
      ...prev,
      referenceImageUrls: e.target.value.slice(0, 2000),
    }));
  };

  const buildPayload = (action: "approve" | "revision") => {
    const selectedSectionsPayload = DEMO_SECTION_OPTIONS.filter((section) =>
      feedback.selectedSectionIds.includes(section.id)
    ).map((section) => ({
      sectionId: section.id,
      sectionName: section.name,
      feedback: (feedback.sectionFeedback[section.id] ?? "").trim(),
    }));

    const referenceImages = feedback.referenceImageUrls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      action,
      rating: feedback.rating,
      comment: feedback.comment.trim(),
      sections: selectedSectionsPayload,
      referenceImages,
    };
  };

  const handleSubmit = async (action: "approve" | "revision") => {
    if (feedback.rating === 0) {
      setFormState({
        status: "error",
        message: "全体の評価（星）を選択してください。",
      });
      return;
    }

    const payload = buildPayload(action);
    const hasSectionInput = payload.sections.some(
      (section) => section.feedback.length > 0
    );
    const hasAnyRevisionInput =
      payload.comment.length > 0 ||
      payload.sections.length > 0 ||
      payload.referenceImages.length > 0 ||
      hasSectionInput;

    if (action === "revision" && !hasAnyRevisionInput) {
      setFormState({
        status: "error",
        message:
          "修正依頼の場合は、全体コメント・修正する箇所の選択・箇所ごとのメモ・参考画像URLのいずれかを入力してください。",
      });
      return;
    }

    setFeedback((prev) => ({ ...prev, action }));
    setFormState({ status: "submitting", message: "" });

    startTransition(async () => {
      try {
        const response = await fetch(`/api/demo/${submissionId}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("送信に失敗しました");
        }

        setFormState({
          status: "success",
          message:
            action === "approve"
              ? "ご承認ありがとうございます。このまま制作に進みます。"
              : "修正のご要望を受け付けました。修正後に改めてご案内します。",
        });
      } catch {
        setFormState({
          status: "error",
          message: "送信に失敗しました。もう一度お試しください。",
        });
      }
    });
  };

  if (formState.status === "success") {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-600" />
        <h3 className="mb-1 text-lg font-semibold text-green-900">
          送信完了
        </h3>
        <p className="text-green-700">{formState.message}</p>
      </div>
    );
  }

  const isSubmitting = formState.status === "submitting" || isPending;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h3 className="mb-1.5 text-center text-lg font-semibold text-amber-900">
        デモをご確認いただき、ありがとうございます。
      </h3>
      <p className="mb-5 text-center text-sm text-amber-800">
        ご確認後、以下のどちらかの方法でご回答をお願いします。
      </p>

      {/* 2つの回答モードの説明（全体承認 vs 箇所別修正） */}
      <div className="mb-5 space-y-2 rounded-2xl border border-amber-200 bg-white/70 p-3.5 text-sm text-amber-900">
        <p className="font-semibold">ご回答はどちらでも構いません</p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              全体で問題なければ「<b>このまま進める</b>」で承認してください。
            </span>
          </li>
          <li className="flex items-start gap-2">
            <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              直したい箇所があれば、下の<b>「直したい箇所がある場合」を開いて</b>
              該当箇所を選び、「<b>選択した箇所を修正依頼</b>」を押してください。
              <span className="text-amber-700">
                （選んでいない箇所は、そのまま承認扱いで進みます）
              </span>
            </span>
          </li>
        </ul>
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-amber-900">
          全体の評価
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              disabled={isSubmitting}
              className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`${star}星`}
            >
              <Star
                className={`h-8 w-8 ${
                  star <= feedback.rating
                    ? "fill-amber-500 text-amber-500"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label
          htmlFor="comment"
          className="mb-2 block text-sm font-medium text-amber-900"
        >
          全体のご意見 / ご要望
        </label>
        <textarea
          id="comment"
          value={feedback.comment}
          onChange={handleCommentChange}
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
          className="w-full rounded-lg border-amber-200 bg-white px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="全体的に修正したい点や、進め方のご希望があればご記入ください"
        />
        <p className="mt-1 text-xs text-amber-600">
          {feedback.comment.length}/1000文字
        </p>
      </div>

      <div className="mb-5">
        <button
          type="button"
          onClick={() => setRevisionMode((v) => !v)}
          disabled={isSubmitting}
          aria-expanded={revisionMode}
          aria-controls="revision-details"
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-amber-900">
            <PencilLine className="h-4 w-4 shrink-0 text-amber-600" />
            直したい箇所がある場合（オプション）
            {selectedCount > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {selectedCount}件 選択中
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-amber-600 transition-transform ${
              revisionMode ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* 選択中の修正箇所をコンパクトに表示（チップ形式） */}
        {selectedCount > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-1">
            {selectedSections.map((section) => (
              <span
                key={section.id}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
              >
                <PencilLine className="h-3 w-3" />
                {section.name}
              </span>
            ))}
          </div>
        )}

        {revisionMode && (
          <div id="revision-details" className="mt-3 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
              <p className="mb-1 text-sm font-semibold text-amber-900">
                修正したい箇所を選択
              </p>
              <p className="mb-3 text-xs text-amber-700">
                ヘッダー・メインビジュアル・フッターなど、気になる部分だけを選んで、箇所ごとにメモを残せます。
              </p>
              <div className="space-y-3">
                {DEMO_SECTION_OPTIONS.map((section) => {
                  const checked = feedback.selectedSectionIds.includes(section.id);
                  return (
                    <div
                      key={section.id}
                      className={`rounded-xl border bg-white p-3 transition ${
                        checked ? "border-amber-400 ring-1 ring-amber-300" : "border-amber-100"
                      }`}
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSection(section.id)}
                          disabled={isSubmitting}
                          className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-amber-950">
                            {section.name}
                            {checked && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                修正対象
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <textarea
                              value={feedback.sectionFeedback[section.id] ?? ""}
                              onChange={(e) =>
                                handleSectionFeedbackChange(section.id, e.target.value)
                              }
                              disabled={isSubmitting || !checked}
                              rows={2}
                              maxLength={400}
                              className="w-full rounded-lg border-amber-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder={`${section.name}の修正したい点をご記入ください`}
                            />
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="referenceImageUrls"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900"
              >
                <Link2 className="h-4 w-4" />
                参考画像 / スクリーンショット URL
              </label>
              <textarea
                id="referenceImageUrls"
                value={feedback.referenceImageUrls}
                onChange={handleReferenceUrlsChange}
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-lg border-amber-200 bg-white px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="https://... 形式で1行に1つずつご入力ください"
              />
              <p className="mt-1 text-xs text-amber-700">
                例: 参考サイトのスクリーンショット、ご希望のレイアウト画像、カラーの参考など
              </p>
            </div>
          </div>
        )}
      </div>

      {formState.status === "error" && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold">入力エラー</p>
              <p className="mt-1 font-normal">{formState.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 送信前確認サマリ：評価・コメント・修正箇所・参考URLと、
          承認 / 修正依頼それぞれで何が起きるかをコンパクトにまとめる。
          評価（必須）が未選択のあいだはCTAが無効なため、評価後にだけ表示し、
          確認のノイズにならないようにする。 */}
      {feedback.rating > 0 && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-white/80 p-3.5 text-sm text-amber-900">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            送信前のご確認
          </p>
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2"
              >
                <dt className="text-xs text-amber-700">{row.label}</dt>
                <dd className="text-xs font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
          {selectedCount > 0 && (
            <p className="mt-2 text-xs leading-relaxed text-amber-700">
              修正対象: {selectedSections.map((s) => s.name).join("、")}
              （それ以外の箇所は承認扱いで進みます）
            </p>
          )}
          <div className="mt-3 space-y-1 border-t border-amber-100 pt-3 text-xs leading-relaxed text-amber-800">
            <p>
              <b>このまま進める</b>を選ぶと、現在の内容で承認し、制作工程へ進みます。
            </p>
            <p>
              <b>選択した箇所を修正依頼</b>を選ぶと、選択した箇所を修正し、修正後に改めてご確認いただきます。
            </p>
          </div>
        </div>
      )}

      {/* 修正依頼に必要な入力を案内するコンパクトメッセージ */}
      {feedback.rating > 0 && revisionMode && !hasRevisionInput && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <PencilLine className="h-4 w-4 shrink-0 text-amber-600" />
            修正依頼には追加の入力が必要です
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            いずれか1つ以上を入力してください：全体コメント、修正箇所の選択、箇所ごとのメモ、参考画像URL
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleSubmit("approve")}
          disabled={isSubmitting || feedback.rating === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-4 w-4" />
          {feedback.rating === 0 ? "まず評価を選択してください" : "このまま進める（すべて承認）"}
        </button>
        <button
          type="button"
          onClick={() => {
            // 詳細入力が折りたたまれているときは、まず展開して入力を促す（送信しない）
            if (!revisionMode) {
              setRevisionMode(true);
              return;
            }
            handleSubmit("revision");
          }}
          disabled={
            isSubmitting ||
            feedback.rating === 0 ||
            (revisionMode && !hasRevisionInput)
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-400 bg-white px-6 py-3 font-medium text-amber-900 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquare className="h-4 w-4" />
          {feedback.rating === 0
            ? "まず評価を選択してください"
            : !revisionMode
              ? "修正箇所を選択（展開して詳細入力）"
              : selectedCount > 0
                ? `選択した${selectedCount}箇所を修正依頼`
                : "箇所を選択して修正依頼"}
          {selectedCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {selectedCount}
            </span>
          )}
        </button>
      </div>

      {isSubmitting && (
        <p className="mt-3 text-center text-sm text-amber-700">送信中...</p>
      )}

      {/* 修正依頼後の流れ（3ステップ） */}
      <div className="mt-5 rounded-2xl border border-amber-200 bg-white/60 p-3.5 text-xs text-amber-900">
        <p className="mb-2 font-semibold text-amber-800">修正依頼後の流れ</p>
        <ol className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-700">
              1
            </span>
            <span>修正要望を確認し、該当箇所を修正します</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-700">
              2
            </span>
            <span>修正版デモを再公開し、メールでご案内します</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-700">
              3
            </span>
            <span>再度ご確認いただき、問題なければ本制作へ進みます</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
