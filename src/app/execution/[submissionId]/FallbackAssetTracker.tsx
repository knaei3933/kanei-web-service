"use client";

import * as React from "react";
import {
  Plus,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  ImageIcon,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AiFallbackAsset } from "@/lib/ai-fallback-assets";
import {
  fallbackAssetHref,
  isInlineImageContentType,
} from "@/lib/ai-fallback-asset-links";

/* ------------------------------------------------------------------ */
/*  AIフォールバック資産トラッカー（内部オペレータ専用・クライアント）     */
/* ------------------------------------------------------------------ */
/*  実行ページのオペレータガイドに組み込む「作業サーフェス」。               */
/*  生成した AI仮画像をブラウザからアップロードして登録・差替済み化・削除できる。*/
/*  メイン経路は multipart/form-data によるバイナリアップロード（保存＋登録）。*/
/*  保存ファイル名は常に ai-fallback- プレフィックス付きになるよう、         */
/*  サーバー側で元ファイル名から安全に生成し、トレーサビリティを保証する。     */
/*                                                                        */
/*  サブ経路として「メタデータのみ登録（ファイル未アップロード）」を残す。     */
/*  画像生成そのものは行わない。オペレータがローカルで生成したファイルを      */
/*  保存＋追跡するだけ。                                                    */
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

/**
 * 資産1件の表示行。
 * ステータスバッジ・カテゴリ・保存名・（あれば）元ファイル名/content-type・
 * プレビュー/ダウンロードリンク・インラインサムネイル・差替/削除アクションを出す。
 *
 * contentType がある資産はバイナリ本体も保存されているため、プレビュー・
 * ダウンロード・インラインサムネイルを表示する。メタデータのみの資産は
 * リンクを出さない（保存ファイルが存在しない可能性があるため）。
 */
function FallbackAssetRow({
  asset,
  submissionId,
  busy,
  onReplace,
  onRemove,
}: {
  asset: AiFallbackAsset;
  submissionId: string;
  busy: boolean;
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  // contentType の有無 = バイナリ本体が保存されているか（プレビュー/ダウンロード可否）
  const hasBinary = Boolean(asset.contentType);
  const previewHref = fallbackAssetHref(submissionId, asset.savedName, "preview");
  const downloadHref = fallbackAssetHref(submissionId, asset.savedName, "download");
  const inlineImage = hasBinary && isInlineImageContentType(asset.contentType);
  const displayName = asset.originalName ?? asset.savedName;

  return (
    <li className="rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={asset.status} />
            <span className="text-sm font-bold text-foreground">
              {asset.category}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              #{asset.id}
            </span>
            {hasBinary && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                <ImageIcon className="h-3 w-3" />
                {asset.contentType}
              </span>
            )}
          </div>

          {/* インライン画像サムネイル（ブラウザ表示可能な画像のときだけ） */}
          {inlineImage && (
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              aria-label={`${displayName} を別タブで開く`}
              className="mt-2 block overflow-hidden rounded-lg border border-border bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewHref}
                alt={displayName}
                loading="lazy"
                decoding="async"
                className="max-h-44 w-full object-contain"
              />
            </a>
          )}

          <p className="mt-1 break-all font-mono text-xs text-foreground">
            {asset.savedName}
          </p>
          {asset.originalName && asset.originalName !== asset.savedName && (
            <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
              元ファイル名: {asset.originalName}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            登録: {asset.createdAt}
            {asset.replacedAt ? ` ／ 差替: ${asset.replacedAt}` : ""}
          </p>
          {asset.note && (
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              {asset.note}
            </p>
          )}

          {/* プレビュー/ダウンロードリンク（バイナリ本体がある資産だけ） */}
          {hasBinary && (
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={previewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-slate-50"
              >
                <Eye className="h-3 w-3" />
                別タブで表示
              </a>
              <a
                href={downloadHref}
                download
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-800 transition hover:bg-rose-100"
              >
                <Download className="h-3 w-3" />
                ダウンロード
              </a>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {asset.status === "generated" && (
            <button
              type="button"
              onClick={() => onReplace(asset.id)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              差し替え済みにする
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(asset.id)}
            disabled={busy}
            aria-label="この資産を削除"
            className="inline-flex items-center justify-center rounded-full border border-border p-1.5 text-muted-foreground transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
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

  // アップロード経路（メイン）の入力
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = React.useState("");
  const [uploadNote, setUploadNote] = React.useState("");

  // メタデータのみ登録（サブ）の入力
  const [category, setCategory] = React.useState(categoryOptions[0] ?? "");
  const [suffix, setSuffix] = React.useState("");
  const [note, setNote] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // フォーカス戻し用の参照
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const suffixRef = React.useRef<HTMLInputElement>(null);

  const apiPath = `/api/execution/${submissionId}/fallback-assets`;

  const pending = assets.filter((a) => a.status === "generated");
  const replaced = assets.filter((a) => a.status === "replaced");

  /**
   * クイック選択用のカテゴリ候補。
   * フォールバック評価の「不足画像カテゴリ」と、既に登録済みのカテゴリを
   * 統合し、重複を除いて順を保つ。よく使うカテゴリを1タップで入力できる。
   */
  const quickPicks = React.useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of categoryOptions) {
      const trimmed = c.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    }
    for (const a of assets) {
      const trimmed = a.category.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    }
    return list;
  }, [categoryOptions, assets]);

  /** JSON 経路（add/replace/remove）を呼び、戻ってきたレジストリで一覧を同期する */
  const mutateJson = React.useCallback(
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

  /**
   * アップロード経路（multipart/form-data・action=upload）を呼ぶ。
   * content-type ヘッダーは指定しない（ブラウザが boundary を自動設定する）。
   * 戻ってきたレジストリで一覧を同期する。
   */
  const mutateUpload = React.useCallback(
    async (formData: FormData) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(apiPath, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(
            typeof json.error === "string"
              ? json.error
              : "アップロードに失敗しました。"
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

  /** アップロード（メイン経路）: ファイル本体を保存しつつレジストリへ登録 */
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("アップロードするファイルを選択してください。");
      return;
    }
    const trimmedCategory = uploadCategory.trim();
    if (!trimmedCategory) {
      setError("カテゴリは必須です。");
      return;
    }
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("category", trimmedCategory);
    if (uploadNote.trim()) {
      formData.append("note", uploadNote.trim());
    }
    // savedName は送らない → サーバーが元ファイル名から
    // ai-fallback- プレフィックス付きで安全に生成する
    const ok = await mutateUpload(formData);
    if (ok) {
      setUploadFile(null);
      setUploadCategory("");
      setUploadNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** メタデータのみ登録（サブ経路）: ファイル未アップロードでメタデータだけ残す */
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
    const ok = await mutateJson({
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
    await mutateJson({ action: "replace", assetId });
  };

  /**
   * 実物を一括で受領したときなど、仮画像（generated）をすべて
   * 「差し替え済み」にする。サーバーのレジストリを都度同期する。
   */
  const handleReplaceAll = async () => {
    const pendingIds = assets
      .filter((a) => a.status === "generated")
      .map((a) => a.id);
    for (const id of pendingIds) {
      const ok = await mutateJson({ action: "replace", assetId: id });
      if (!ok) break;
    }
  };

  const handleRemove = async (assetId: string) => {
    await mutateJson({ action: "remove", assetId });
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
        生成した AI仮画像をここにアップロードし、実物受領後に差し替え状態を更新します。
        保存ファイル名は <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{prefix}</code> プレフィックス付きで元ファイル名から自動生成します。
      </p>

      {/* 共通エラー表示（どの操作の失敗もここに出る） */}
      {error && (
        <p className="mt-3 flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {/* 追加フォーム — アップロード（メイン経路） */}
      <form
        onSubmit={handleUpload}
        className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-4"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-rose-600" />
          <p className="text-sm font-bold text-foreground">
            画像をアップロードして登録（推奨）
          </p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          画像ファイルを選んでアップロードすると、保存と登録を一度に行います。バイナリ本体も保存され、プレビュー・ダウンロードができるようになります。
        </p>

        {quickPicks.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">
              クイック選択（カテゴリ）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickPicks.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setUploadCategory(c);
                    fileInputRef.current?.focus();
                  }}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    uploadCategory === c
                      ? "border-rose-400 bg-rose-100 text-rose-800"
                      : "border-border bg-white text-foreground hover:border-rose-300 hover:bg-rose-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              画像ファイル
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-rose-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-800 hover:file:bg-rose-200"
            />
            {uploadFile && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {uploadFile.name}（{Math.max(1, Math.round(uploadFile.size / 1024))} KB）
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              カテゴリ
            </label>
            <input
              list={listId}
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              placeholder="メインビジュアル（ヒーロー）"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold text-foreground">
              備考（任意）
            </label>
            <input
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="差し替え先や補足メモ"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              アップロードして登録
            </Button>
          </div>
        </div>
      </form>

      {/* サブ経路: メタデータのみ登録（ファイル未アップロード・旧方式） */}
      <details className="mt-3 rounded-2xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
          ファイルをアップロードせず、メタデータのみ登録する
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          保存ファイル名を手動で指定してメタデータだけ残す経路です。バイナリ本体は保存されないため、プレビュー・ダウンロードはできません。原則は上のアップロード経路を使ってください。
        </p>
        <form onSubmit={handleAdd} className="mt-3 grid gap-3 sm:grid-cols-2">
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
                ref={suffixRef}
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
              メタデータのみ登録
            </Button>
          </div>
        </form>
      </details>

      {/* 一括差し替え（実物をまとめて受領したとき用） */}
      {pending.length > 0 && (
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={handleReplaceAll}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            仮画像をすべて差し替え済みにする（{pending.length}件）
          </button>
        </div>
      )}

      {/* 資産一覧 */}
      {assets.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-slate-50 p-4 text-center text-xs text-muted-foreground">
          まだ登録された資産はありません。生成した AI仮画像を上のフォームからアップロードしてください。
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {assets.map((asset) => (
            <FallbackAssetRow
              key={asset.id}
              asset={asset}
              submissionId={submissionId}
              busy={busy}
              onReplace={handleReplace}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      {/* カテゴリ候補の dataList（両経路の入力で共有） */}
      <datalist id={listId}>
        {categoryOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}
