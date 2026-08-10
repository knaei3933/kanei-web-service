"use client";

import * as React from "react";
import {
  Plus,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiFallbackAsset } from "@/lib/ai-fallback-assets";

/* ------------------------------------------------------------------ */
/*  AIフォールバック資産トラッカー（内部オペレータ専用・クライアント）     */
/* ------------------------------------------------------------------ */
/*  実行ページのオペレータガイドに組み込む「作業サーフェス」。               */
/*  生成した AI仮画像のメタデータを登録・差替済み化・削除できる。            */
/*  保存ファイル名は常に ai-fallback- プレフィックス付きになるよう、         */
/*  接頭辞を固定表示してトレーサビリティを保証する。                         */
/*                                                                        */
/*  画像生成そのものは行わない。オペレータがローカルで生成したファイルを      */
/*  メタデータとして追跡するだけ。                                          */
/* ------------------------------------------------------------------ */

interface FallbackAssetTrackerProps {
  submissionId: string;
  /** サーバ側で読み込んだ初期資産一覧 */
  initialAssets: AiFallbackAsset[];
  /** カテゴリ候補（フォールバック評価の「不足画像カテゴリ」） */
  categoryOptions: string[];
  /** 保存ファイル名の固定プレフィックス（ai-fallback-） */
  prefix: string;
}

/**
 * 資産の状態バッジ。
 * generated = 仮画像（差し替え待ち）/ replaced = 差し替え済み
 */
function StatusBadge({ status }: { status: AiFallbackAsset["status"] }) {
  if (status === "replaced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        差し替え済み
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
      <AlertCircle className="h-3 w-3" />
      仮画像（差し替え待ち）
    </span>
  );
}

export function FallbackAssetTracker({
  submissionId,
  initialAssets,
  categoryOptions,
  prefix,
}: FallbackAssetTrackerProps) {
  const [assets, setAssets] =
    React.useState<AiFallbackAsset[]>(initialAssets);
  const [category, setCategory] = React.useState(categoryOptions[0] ?? "");
  const [suffix, setSuffix] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const apiPath = `/api/execution/${submissionId}/fallback-assets`;

  const pending = assets.filter((a) => a.status === "generated");
  const replaced = assets.filter((a) => a.status === "replaced");

  /** API を呼び、戻ってきたレジストリで一覧を同期する */
  const mutate = React.useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(apiPath, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(
            typeof json.error === "string" ? json.error : "保存に失敗しました。"
          );
        }
        const next = json.registry?.assets;
        setAssets(Array.isArray(next) ? next : []);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apiPath]
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCategory = category.trim();
    const trimmedSuffix = suffix.trim();
    if (!trimmedCategory) {
      setError("カテゴリは必須です。");
      return;
    }
    if (!trimmedSuffix) {
      setError("保存ファイル名は必須です。");
      return;
    }
    const ok = await mutate({
      action: "add",
      category: trimmedCategory,
      savedName: `${prefix}${trimmedSuffix}`,
      note: note.trim() ? note.trim() : undefined,
    });
    if (ok) {
      setSuffix("");
      setNote("");
    }
  };

  const handleReplace = async (assetId: string) => {
    await mutate({ action: "replace", assetId });
  };

  const handleRemove = async (assetId: string) => {
    await mutate({ action: "remove", assetId });
  };

  // カテゴリ候補の dataList 用 id（重複回避）
  const listId = "fallback-category-options";

  return (
    <div className="mt-8 rounded-2xl border border-rose-200 bg-white p-5">
      {/* ヘッダ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-rose-600" />
          <p className="text-sm font-bold text-foreground">
            生成資産の追跡レジストリ
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          仮画像 <span className="font-bold text-amber-700">{pending.length}</span> 件 ／
          差し替え済み <span className="font-bold text-emerald-700">{replaced.length}</span> 件
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        ローカルで生成した AI仮画像をここに登録し、実物受領後に差し替え状態を更新します。
        保存ファイル名は必ず <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{prefix}</code> プレフィックスになります。
      </p>

      {/* 追加フォーム */}
      <form
        onSubmit={handleAdd}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label className="mb-1 block text-xs font-bold text-foreground">
            カテゴリ
          </label>
          <input
            list={listId}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="メインビジュアル（ヒーロー）"
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400"
          />
          <datalist id={listId}>
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-foreground">
            保存ファイル名
          </label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-white focus-within:border-rose-400">
            <span className="flex items-center whitespace-nowrap border-r border-border bg-slate-50 px-2.5 font-mono text-[11px] text-muted-foreground">
              {prefix}
            </span>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder="hero.png"
              className="w-full px-3 py-2 text-sm text-foreground outline-none"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-foreground">
            備考（任意）
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="差し替え先や補足メモ"
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400"
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            資産を登録
          </Button>
          {error && (
            <p className="flex items-center gap-1 text-xs font-medium text-rose-700">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>
      </form>

      {/* 資産一覧 */}
      {assets.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center text-xs text-muted-foreground">
          まだ登録された資産はありません。生成した AI仮画像を上のフォームから登録してください。
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="rounded-xl border border-border bg-white p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={asset.status} />
                    <span className="text-sm font-bold text-foreground">
                      {asset.category}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{asset.id}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {asset.savedName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    登録: {asset.createdAt}
                    {asset.replacedAt ? ` ／ 差替: ${asset.replacedAt}` : ""}
                  </p>
                  {asset.note && (
                    <p className="mt-1 text-xs leading-relaxed text-foreground">
                      {asset.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {asset.status === "generated" && (
                    <button
                      type="button"
                      onClick={() => handleReplace(asset.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      差し替え済みにする
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(asset.id)}
                    disabled={busy}
                    aria-label="この資産を削除"
                    className="inline-flex items-center justify-center rounded-full border border-border p-1.5 text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
