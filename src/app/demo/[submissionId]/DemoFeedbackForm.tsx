"use client";

import { useState, useTransition } from "react";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Link2,
} from "lucide-react";

interface DemoFeedbackFormProps {
  submissionId: string;
}

const SECTION_OPTIONS = [
  { id: "header", name: "헤더 / 네비게이션" },
  { id: "hero", name: "메인 비주얼 / 히어로" },
  { id: "trust", name: "신뢰요소 / 강점 소개" },
  { id: "services", name: "서비스 / 제품 소개" },
  { id: "content", name: "본문 콘텐츠 / 문구" },
  { id: "cta", name: "문의 유도 / CTA" },
  { id: "footer", name: "푸터 / 연락처" },
] as const;

type SectionOption = (typeof SECTION_OPTIONS)[number];

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
    const selectedSections = SECTION_OPTIONS.filter((section) =>
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
      sections: selectedSections,
      referenceImages,
    };
  };

  const handleSubmit = async (action: "approve" | "revision") => {
    if (feedback.rating === 0) {
      setFormState({
        status: "error",
        message: "평가를 선택해 주세요",
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
          "수정 요청 시에는 전체 코멘트, 수정할 요소 선택, 요소별 메모, 참고 이미지 URL 중 하나 이상 입력해 주세요",
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
              ? "ご承認ありがとうございます。制作に進みます。"
              : "요소별 피드백을 접수했습니다. 수정 후 다시 안내드리겠습니다.",
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
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
        <h3 className="mb-2 text-lg font-semibold text-green-900">
          送信完了
        </h3>
        <p className="text-green-700">{formState.message}</p>
      </div>
    );
  }

  const isSubmitting = formState.status === "submitting" || isPending;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h3 className="mb-2 text-center text-lg font-semibold text-amber-900">
        デモをご確認いただき、ありがとうございます。
      </h3>
      <p className="mb-6 text-center text-sm text-amber-800">
        전체 승인뿐 아니라, 요소별 수정 요청과 참고 이미지 URL도 함께 남길 수 있습니다.
      </p>

      <div className="mb-6">
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

      <div className="mb-6">
        <label
          htmlFor="comment"
          className="mb-2 block text-sm font-medium text-amber-900"
        >
          전체 의견 / 요청사항
        </label>
        <textarea
          id="comment"
          value={feedback.comment}
          onChange={handleCommentChange}
          disabled={isSubmitting}
          rows={4}
          maxLength={1000}
          className="w-full rounded-lg border-amber-200 bg-white px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="전체적으로 수정하고 싶은 점이나 방향성을 적어 주세요"
        />
        <p className="mt-1 text-xs text-amber-600">
          {feedback.comment.length}/1000文字
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-amber-200 bg-white/80 p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-amber-900">수정하고 싶은 요소 선택</p>
          <p className="mt-1 text-xs text-amber-700">
            헤더, 메인, 푸터 등 원하는 부분만 골라서 피드백할 수 있습니다.
          </p>
        </div>
        <div className="space-y-3">
          {SECTION_OPTIONS.map((section) => {
            const checked = feedback.selectedSectionIds.includes(section.id);
            return (
              <div key={section.id} className="rounded-xl border border-amber-100 bg-white p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSection(section.id)}
                    disabled={isSubmitting}
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-amber-950">{section.name}</div>
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
                        placeholder={`${section.name}에서 수정할 점을 적어 주세요`}
                      />
                    </div>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="referenceImageUrls"
          className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900"
        >
          <Link2 className="h-4 w-4" />
          참고 이미지 / 스크린샷 URL
        </label>
        <textarea
          id="referenceImageUrls"
          value={feedback.referenceImageUrls}
          onChange={handleReferenceUrlsChange}
          disabled={isSubmitting}
          rows={3}
          className="w-full rounded-lg border-amber-200 bg-white px-4 py-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="https://... 형식으로 한 줄에 하나씩 넣어 주세요"
        />
        <p className="mt-1 text-xs text-amber-700">
          예: 참고 사이트 스크린샷, 원하는 레이아웃 이미지, 컬러 레퍼런스 등
        </p>
      </div>

      {formState.status === "error" && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {formState.message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleSubmit("approve")}
          disabled={isSubmitting || feedback.rating === 0}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ThumbsUp className="h-4 w-4" />
          このまま進めてください
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("revision")}
          disabled={isSubmitting || feedback.rating === 0}
          className="flex items-center justify-center gap-2 rounded-full border border-amber-400 bg-white px-6 py-3 font-medium text-amber-900 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageSquare className="h-4 w-4" />
          요소별 수정 요청 보내기
        </button>
      </div>

      {isSubmitting && (
        <p className="mt-3 text-center text-sm text-amber-700">送信中...</p>
      )}
    </div>
  );
}
