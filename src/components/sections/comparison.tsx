"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Star,
  ShieldCheck,
  Wallet,
  Headphones,
} from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

/* ------------------------------------------------------------------ */
/*  型定義                                                              */
/* ------------------------------------------------------------------ */

type Rating = 1 | 2 | 3 | 4 | 5;

type Cell = {
  text: string;
  rating: Rating;
};

type ComparisonRow = {
  label: string;
  ours: Cell;
  nocode: Cell;
  agency: Cell;
};

/* ------------------------------------------------------------------ */
/*  データ                                                              */
/* ------------------------------------------------------------------ */

const comparisons: ComparisonRow[] = [
  {
    label: "初期費用",
    ours: { text: "0円（制作・設計込み）", rating: 5 },
    nocode: { text: "数万円前後（調整で追加費用発生）", rating: 3 },
    agency: { text: "30万〜100万円以上（デザインで大きく変動）", rating: 1 },
  },
  {
    label: "月額費用",
    ours: { text: "10,000円〜（保守・更新・サーバー込み）", rating: 4 },
    nocode: { text: "2,000〜20,000円（機能追加で上がる）", rating: 3 },
    agency: { text: "保守費 + サーバー代（更新代行で毎月コスト）", rating: 2 },
  },
  {
    label: "完成形の見えやすさ",
    ours: { text: "事前に確認しやすい（業種別サンプルあり）", rating: 5 },
    nocode: { text: "自分で組み立てる（公開後を想像しにくい）", rating: 2 },
    agency: { text: "会社次第（提案の解像度に差が出る）", rating: 3 },
  },
  {
    label: "更新のしやすさ",
    ours: { text: "依頼だけで運用可能（小修正も気軽に相談）", rating: 5 },
    nocode: { text: "自分で操作（慣れるまで時間がかかる）", rating: 2 },
    agency: { text: "依頼ベース（小修正も都度相談）", rating: 3 },
  },
  {
    label: "所有権・移行",
    ours: { text: "お客様の資産（ソース納品・移行も容易）", rating: 5 },
    nocode: { text: "プラットフォーム依存（データ持ち出しに制約）", rating: 1 },
    agency: { text: "契約次第（管理方法が会社ごとに異なる）", rating: 3 },
  },
  {
    label: "公開後の相談しやすさ",
    ours: { text: "継続前提で相談しやすい（運用・改善まで対応）", rating: 5 },
    nocode: { text: "基本は自己解決（学習コストを自己負担）", rating: 2 },
    agency: { text: "会社により差が大きい（担当変更で品質変動）", rating: 3 },
  },
];

const columnMeta = [
  {
    key: "ours" as const,
    title: "金井の月額制作",
    icon: CheckCircle2,
    headerClass: "bg-blue-600 text-white",
    cellBg: "bg-blue-50/60",
  },
  {
    key: "nocode" as const,
    title: "ノーコード / 自作系",
    icon: AlertTriangle,
    headerClass: "bg-slate-100 text-slate-700",
    cellBg: "",
  },
  {
    key: "agency" as const,
    title: "一般的な制作会社",
    icon: XCircle,
    headerClass: "bg-slate-100 text-slate-700",
    cellBg: "",
  },
];

const insights = [
  {
    icon: AlertTriangle,
    title: "ノーコードの落とし穴",
    text: "始めは安いが、運用負担は社内に残る。",
    accent: "text-amber-600",
    ring: "ring-amber-200",
  },
  {
    icon: Wallet,
    title: "制作会社の悩み",
    text: "初期費用が高く、小修正も都度費用。",
    accent: "text-red-500",
    ring: "ring-red-200",
  },
  {
    icon: ShieldCheck,
    title: "金井の強み",
    text: "初期費用ゼロ、更新お任せ、ソース納品。",
    accent: "text-blue-700",
    ring: "ring-blue-200",
  },
];

/* ------------------------------------------------------------------ */
/*  ヘルパー                                                            */
/* ------------------------------------------------------------------ */

function ratingTone(r: Rating) {
  if (r >= 4)
    return {
      badge: "bg-green-50 text-green-700 ring-1 ring-green-200",
      star: "text-green-500",
    };
  if (r === 3)
    return {
      badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      star: "text-amber-500",
    };
  return {
    badge: "bg-red-50 text-red-600 ring-1 ring-red-200",
    star: "text-red-500",
  };
}

function Stars({ rating }: { rating: Rating }) {
  const tone = ratingTone(rating);
  return (
    <div className={`flex items-center justify-center gap-0.5 ${tone.star}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "fill-current" : "fill-none opacity-40"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  メイン                                                              */
/* ------------------------------------------------------------------ */

export default function Comparison() {
  return (
    <Section id="comparison" className="bg-muted/30">
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            費用だけでなく、公開後の使いやすさまで比較してください
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            費用だけでなく、所有権・更新のしやすさ・移行の自由度まで比べれば、
            長く使えるかどうかが見えてきます。
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto rounded-2xl border bg-card shadow-sm"
        >
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 px-5 py-4 text-sm font-semibold">
                  比較項目
                </th>
                {columnMeta.map((col) => {
                  const Icon = col.icon;
                  return (
                    <th
                      key={col.key}
                      className={`px-5 py-4 text-center text-sm font-semibold ${col.headerClass}`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon className="h-4 w-4" />
                        {col.title}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, index) => (
                <tr
                  key={row.label}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                >
                  <td className="px-5 py-5 align-middle">
                    <div className="font-semibold">{row.label}</div>
                  </td>
                  {columnMeta.map((col) => {
                    const cell = row[col.key];
                    const tone = ratingTone(cell.rating);
                    const Icon = col.icon;
                    return (
                      <td
                        key={col.key}
                        className={`px-5 py-5 align-middle text-center ${col.cellBg}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Stars rating={cell.rating} />
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${tone.badge}`}
                          >
                            <Icon className="h-3 w-3" />
                            {cell.text}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {insights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`rounded-2xl border bg-card p-5 shadow-sm ring-1 ${item.ring}`}
              >
                <div
                  className={`flex items-center gap-2 text-sm font-bold ${item.accent}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </div>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA                                                                */
/* ------------------------------------------------------------------ */

export function CTA() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          まずは無料相談から
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
          会社案内・メモ書き・既存サイトのURLだけでも大丈夫。完成イメージを交えて、最適な構成をご提案します。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/consult">
              無料で提案を依頼する
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#showcase">制作事例を見る</Link>
          </Button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          価格イメージや構成例の資料も、ご案内できます。
        </div>
      </div>
    </Section>
  );
}
