import Link from "next/link";

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-6xl font-black text-primary">404</p>
        <h1 className="mt-4 text-xl font-bold text-foreground">
          ページが見つかりませんでした
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            トップページへ
          </Link>
          <Link
            href="/consult"
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-slate-50"
          >
            無料相談
          </Link>
        </div>
      </div>
    </div>
  );
}
