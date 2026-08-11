"use client";

import { useState, useTransition } from "react";
import type { IntakeSupplementRequest } from "@/lib/approval-package";

/* ------------------------------------------------------------------ */
/*  顧客向け追加情報入力フォーム（needs_followup 時に表示）              */
/*  サーバーコンポーネントの review ページから clsx なしで組み込み可能   */
/*                                                                      */
/*  このフォームは「繰り返し可能なフォローアップループ」の1ステップ。    */
/*  どの項目が足りないか・今どれくらい埋まったかをその場で分かるように   */
/*  進捗サマリ・「まず埋めるべき項目」の案内・各項目の入力状態を表示する */
/* ------------------------------------------------------------------ */

/** 品質評価でチェックされる戦略項目のキーとラベル（consult-quality.ts と同期） */
const STRATEGY_FIELDS = [
  { key: "targetCustomer", label: "ターゲット・理想のお客様" },
  { key: "sellingPoints", label: "強み・差別化ポイント" },
  { key: "mustIncludeInfo", label: "必ずホームページに載せたい情報" },
  { key: "desiredImage", label: "伝えたいイメージ" },
] as const;

/** features の選択肢（consult フォームと同期） */
const FEATURE_OPTIONS = [
  { value: "contact_form", label: "お問い合わせフォーム" },
  { value: "price_table", label: "料金表" },
  { value: "gallery", label: "実績ギャラリー" },
  { value: "blog", label: "ブログ・お知らせ" },
  { value: "map_access", label: "アクセスマップ" },
  { value: "online_booking", label: "オンライン予約" },
  { value: "faq", label: "よくある質問" },
  { value: "staff_profile", label: "スタッフ紹介" },
  { value: "testimonial", label: "お客様の声" },
  { value: "multi_language", label: "多言語対応" },
] as const;

/** 戦略項目が「意味のある長さ」とみなす最小文字数（consult-quality.ts と同じ基準） */
const MIN_STRATEGY_LEN = 6;

type FieldState = "filled" | "partial" | "empty";

/**
 * 入力値の充実度を分類する（consult-quality.ts の classifyField と同じ基準）。
 * フォーム上で「入力済み / もう少し / 未入力」をその場で分けるために使う。
 */
function classifyFieldValue(value: string): FieldState {
  const v = value.trim();
  if (v.length === 0) return "empty";
  if (v.length < MIN_STRATEGY_LEN) return "partial";
  return "filled";
}

/** 依頼項目リストの中に、指定ラベルの項目が含まれるか（ラベル部分一致で判定） */
function isRequestedField(label: string, requestedItems: string[]): boolean {
  return requestedItems.some((item) => item.includes(label));
}

interface FollowupEditFormProps {
  submissionId: string;
  initialPayload: Record<string, unknown>;
  initialScore: number;
  requestedItems: string[];
  followupQuestions: string[];
  /**
   * 代表者からの項目別差戻し／補足要求（reject / supplement で保存された構造化データ）。
   * 各項目の guidance（具体的なご指示）と currentValue（差戻し時点の入力）を、
   * 顧客向けの追加情報セクションに表示する。
   */
  supplementRequests: IntakeSupplementRequest[];
}

export function FollowupEditForm({
  submissionId,
  initialPayload,
  initialScore,
  requestedItems,
  followupQuestions,
  supplementRequests,
}: FollowupEditFormProps) {
  // 各戦略項目の初期値を取り出す
  const getStrVal = (key: string): string =>
    typeof initialPayload[key] === "string"
      ? (initialPayload[key] as string)
      : "";

  const [targetCustomer, setTargetCustomer] = useState(getStrVal("targetCustomer"));
  const [sellingPoints, setSellingPoints] = useState(getStrVal("sellingPoints"));
  const [mustIncludeInfo, setMustIncludeInfo] = useState(getStrVal("mustIncludeInfo"));
  const [desiredImage, setDesiredImage] = useState(getStrVal("desiredImage"));

  // features の初期値（文字列配列 or カンマ/区切り文字列）
  const initialFeatures: string[] = (() => {
    const raw = initialPayload.features;
    if (Array.isArray(raw)) return raw.filter((f): f is string => typeof f === "string");
    if (typeof raw === "string") return raw.split(/[,、\s]+/).filter(Boolean);
    return [];
  })();
  const [features, setFeatures] = useState<Set<string>>(new Set(initialFeatures));

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    newScore?: number;
    newStatus?: string | null;
    error?: string;
    updatedFields?: string[];
  } | null>(null);

  function toggleFeature(value: string) {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const payload: Record<string, unknown> = {
      targetCustomer: targetCustomer.trim(),
      sellingPoints: sellingPoints.trim(),
      mustIncludeInfo: mustIncludeInfo.trim(),
      desiredImage: desiredImage.trim(),
      features: Array.from(features),
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/consult/${submissionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          setResult({
            ok: true,
            newScore: data.newScore,
            newStatus: data.newStatus,
            updatedFields: data.updatedFields,
          });
        } else {
          setResult({ ok: false, error: data.error || "更新に失敗しました。" });
        }
      } catch {
        setResult({ ok: false, error: "通信エラーが発生しました。" });
      }
    });
  }

  /* ---- 現在の入力状態から、進捗と「まず埋めるべき項目」を計算 ---- */
  const fieldValues: Record<string, string> = {
    targetCustomer,
    sellingPoints,
    mustIncludeInfo,
    desiredImage,
  };
  const fieldStates = STRATEGY_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    state: classifyFieldValue(fieldValues[f.key]),
    requested: isRequestedField(f.label, requestedItems),
  }));

  // 機能（features）の依頼有無と現在の選択数
  const featuresRequested = requestedItems.some((item) => /ページ・機能|機能/.test(item));
  const featuresAddressed = features.size > 0;

  // 進捗カウント：戦略4項目 +（機能が依頼されていれば）機能1枠
  const strategyFilled = fieldStates.filter((s) => s.state === "filled").length;
  const totalSlots = 4 + (featuresRequested ? 1 : 0);
  const filledSlots = strategyFilled + (featuresRequested && featuresAddressed ? 1 : 0);
  const progressPct =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  // 「まず埋めるべき項目」：依頼されているのにまだ埋まっていない項目
  const fillFirst: string[] = [];
  for (const s of fieldStates) {
    if (!s.requested || s.state === "filled") continue;
    fillFirst.push(
      s.state === "empty"
        ? `「${s.label}」`
        : `「${s.label}」（もう少し具体的に）`
    );
  }
  if (featuresRequested && !featuresAddressed) {
    fillFirst.push("ご希望のページ・機能");
  }

  const scoreImproved = result?.ok && typeof result.newScore === "number" && result.newScore > initialScore;
  const transitionedToReview =
    result?.ok && result.newStatus === "awaiting_representative_approval";

  return (
    <div className="space-y-5">
      {/* フォローアップ要求内容 + 進捗サマリ */}
      {(requestedItems.length > 0 || followupQuestions.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-amber-900">追加情報のお願い</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                依頼項目 {requestedItems.length} 件
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                質問 {followupQuestions.length} 件
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">
                入力済み {filledSlots} / {totalSlots}
              </span>
            </div>
          </div>

          {/* 進捗バー（入力に合わせて伸びる） */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* 「まず埋めるべき項目」の案内 */}
          {fillFirst.length > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-amber-900">
              <span className="font-bold">まず埋めるべき:</span>{" "}
              {fillFirst.join("・")}
              を入力するとスコアが大きく上がります。
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-emerald-800">
              依頼された項目は一通り入力済みです。「情報を更新する」で送信してください。
            </p>
          )}

          {/* 担当者からの項目別ご指示（reject / supplement で保存された guidance） */}
          {supplementRequests.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold text-amber-800">
                担当者からの具体的なご指示:
              </p>
              <ul className="mt-1 space-y-2">
                {supplementRequests.map((req) => (
                  <li
                    key={req.key}
                    className="rounded-xl border border-amber-200 bg-white/70 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-amber-900">
                        {req.label}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          req.severity === "reject"
                            ? "border-rose-200 bg-rose-100 text-rose-700"
                            : "border-amber-200 bg-amber-100 text-amber-700"
                        }`}
                      >
                        {req.severity === "reject" ? "要修正" : "補足依頼"}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
                      {req.guidance}
                    </p>
                    {req.currentValue && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        現在の入力:{" "}
                        <span className="break-words text-foreground/80">
                          {req.currentValue}
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requestedItems.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold text-amber-800">不足している項目:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {requestedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {followupQuestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-bold text-amber-800">質問:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {followupQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 戦略項目（4項目） — 入力状態バッジ付き */}
        {STRATEGY_FIELDS.map((field) => {
          const value =
            field.key === "targetCustomer"
              ? targetCustomer
              : field.key === "sellingPoints"
                ? sellingPoints
                : field.key === "mustIncludeInfo"
                  ? mustIncludeInfo
                  : desiredImage;
          const onChange =
            field.key === "targetCustomer"
              ? setTargetCustomer
              : field.key === "sellingPoints"
                ? setSellingPoints
                : field.key === "mustIncludeInfo"
                  ? setMustIncludeInfo
                  : setDesiredImage;

          const state = classifyFieldValue(value);
          const requested = isRequestedField(field.label, requestedItems);

          return (
            <div key={field.key}>
              <div className="flex flex-wrap items-center gap-2">
                <label className="block text-sm font-bold text-foreground">
                  {field.label}
                </label>
                {state === "filled" ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    入力済み
                  </span>
                ) : requested ? (
                  <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    {state === "empty" ? "要入力" : "もう少し具体的に"}
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    任意
                  </span>
                )}
              </div>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder={`${field.label}を具体的に入力してください`}
              />
            </div>
          );
        })}

        {/* features（チェックボックス） — 選択状態バッジ付き */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="block text-sm font-bold text-foreground">
              必要なページ・機能
            </label>
            {features.size > 0 ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {features.size} 件選択中
              </span>
            ) : featuresRequested ? (
              <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                要選択
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FEATURE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm text-foreground hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={features.has(opt.value)}
                  onChange={() => toggleFeature(opt.value)}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "更新中..." : "情報を更新する"}
          </button>
          <span className="text-sm text-muted-foreground">
            現在のスコア: <span className="font-bold text-foreground">{initialScore}</span>
          </span>
        </div>

        {/* 結果表示 */}
        {result && (
          <div
            className={`rounded-2xl border p-4 text-sm leading-relaxed ${
              result.ok
                ? transitionedToReview
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : scoreImproved
                    ? "border-blue-200 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-slate-50 text-foreground"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {result.ok ? (
              transitionedToReview ? (
                <p>
                  ✅ スコアが <strong>{result.newScore}</strong> に向上し、すべての必須項目が充足しました。
                  ステータスを「代表確認待ち」に自動更新しました。担当者からの連絡をお待ちください。
                </p>
              ) : scoreImproved ? (
                <p>
                  ✅ スコアが <strong>{initialScore}</strong> → <strong>{result.newScore}</strong> に向上しました。
                  さらに情報を追加すると、よりスムーズに進められます。
                </p>
              ) : (
                <p>
                  更新しました（スコア: {result.newScore}）。
                  さらに詳しい情報を追加することをお勧めします。
                </p>
              )
            ) : (
              <p>❌ {result.error}</p>
            )}
            {transitionedToReview && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                画面を更新
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
