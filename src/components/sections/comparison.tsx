"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

const comparisons = [
  {
    label: "初期費用",
    ours: "0円",
    oursNote: "制作・設計を含めて初期請求なし",
    nocode: "数万円前後",
    nocodeNote: "テンプレ調整や設定代行で増えやすい",
    agency: "30万〜100万円以上",
    agencyNote: "構成・デザイン・構築で大きく変動",
  },
  {
    label: "月額費用",
    ours: "10,000円〜",
    oursNote: "保守・更新・サーバー込み",
    nocode: "2,000〜20,000円",
    nocodeNote: "機能追加ごとに上がりやすい",
    agency: "保守費 + サーバー代",
    agencyNote: "更新代行で毎月コスト化しやすい",
  },
  {
    label: "完成形の見えやすさ",
    ours: "事前に確認しやすい",
    oursNote: "業種別の完成例を見ながら相談できる",
    nocode: "自分で組み立てる前提",
    nocodeNote: "公開後の姿を想像しにくいことがある",
    agency: "会社次第",
    agencyNote: "提案内容の解像度に差が出やすい",
  },
  {
    label: "更新のしやすさ",
    ours: "依頼だけでも運用可能",
    oursNote: "軽微修正や更新相談がしやすい",
    nocode: "自分で操作",
    nocodeNote: "慣れるまで時間がかかることが多い",
    agency: "依頼ベース",
    agencyNote: "小さな修正でも都度相談になりやすい",
  },
  {
    label: "所有権・移行",
    ours: "お客様の資産",
    oursNote: "ソースコード納品・移行しやすさ前提",
    nocode: "プラットフォーム依存",
    nocodeNote: "持ち出しや再現に制約が出やすい",
    agency: "契約次第",
    agencyNote: "管理方法が会社ごとに異なる",
  },
  {
    label: "公開後の相談しやすさ",
    ours: "継続前提で相談しやすい",
    oursNote: "運用・改善まで見据えて対応",
    nocode: "基本は自己解決",
    nocodeNote: "学習コストを自分で負担しやすい",
    agency: "会社により差が大きい",
    agencyNote: "担当変更でやり取りが重くなる場合もある",
  },
];

export default function Comparison() {
  return (
    <Section id="comparison" className="bg-muted/30">
      <div className="mx-auto max-w-container">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            費用だけでなく、公開後の使いやすさまで比較してください
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            初期費用、月額費用、所有権、更新のしやすさ、移行の自由度まで含めて見ると、
            長く使いやすいかどうかが見えてきます。
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-x-auto rounded-3xl border bg-card shadow-sm"
        >
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-5 py-4 text-sm font-semibold">比較項目</th>
                <th className="px-5 py-4 text-center text-sm font-semibold text-blue-700">金井の月額制作</th>
                <th className="px-5 py-4 text-center text-sm font-semibold">ノーコード / 自作系</th>
                <th className="px-5 py-4 text-center text-sm font-semibold">一般的な制作会社</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, index) => (
                <tr key={row.label} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="px-5 py-5 align-top">
                    <div className="font-semibold">{row.label}</div>
                  </td>
                  <td className="px-5 py-5 align-top text-center">
                    <div className="font-semibold text-blue-700">{row.ours}</div>
                    <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.oursNote}</div>
                  </td>
                  <td className="px-5 py-5 align-top text-center">
                    <div className="font-semibold">{row.nocode}</div>
                    <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.nocodeNote}</div>
                  </td>
                  <td className="px-5 py-5 align-top text-center">
                    <div className="font-semibold">{row.agency}</div>
                    <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.agencyNote}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["例1", "ノーコード系は月額を抑えやすい反面、調整や更新の手間を社内で抱えやすくなります。"],
            ["例2", "一般的な制作会社は完成度が高い一方、初期費用が大きく、公開後の軽微更新も積み上がりやすい傾向があります。"],
            ["例3", "金井の月額制作は、初期負担を抑えながら、完成形・更新・移行の安心感を両立しやすい設計です。"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-sm font-semibold text-blue-700">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function CTA() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          まずは無料相談から
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
          会社案内、メモ書き、既存サイトのURLだけでも大丈夫です。
          <br />
          どんな構成が合うか、完成イメージを交えて具体的にご提案します。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <a href="mailto:info@kanei-trade.co.jp?subject=%E3%83%9B%E3%83%BC%E3%83%A0%E3%83%9A%E3%83%BC%E3%82%B8%E5%88%B6%E4%BD%9C%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87">
              無料相談をする
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#showcase">
              制作事例を見る
            </a>
          </Button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          必要であれば、価格イメージや構成例をまとめた資料案内も可能です。
        </div>
      </div>
    </Section>
  );
}
