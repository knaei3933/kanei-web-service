"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  /** クリップボードへコピーする文字列 */
  value: string;
  /** ボタンのラベル（未指定時は「コピー」） */
  label?: string;
  className?: string;
}

/**
 * 実行ページのオペレータガイドで、codex のコマンド例などをワンクリックで
 * コピーするための小さなクライアントコンポーネント。
 *
 * クリップボードAPIが使えない環境（非 HTTPS・非 localhost 等）では静かに失敗し、
 * テキスト本体は <pre> で選択できるため運用上の支障はない。
 */
export function CopyButton({ value, label = "コピー", className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードAPIが利用できない環境では何もしない（テキストは選択可能）
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-slate-50"
      }
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          コピーしました
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </button>
  );
}
