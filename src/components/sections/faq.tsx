"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "../ui/section";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "初期費用はいくらですか？",
    answer:
      "初期費用は0円です。お客様にご負担いただくのは、独自ドメイン取得費用（年間約1,500円前後）と、必要な追加機能がある場合の個別見積もりのみです。",
  },
  {
    question: "何を準備すれば始められますか？",
    answer:
      "会社案内、既存パンフレット、写真、メモ書きだけでも大丈夫です。文章が整っていなくても、見せ方や構成はこちらで整理します。",
  },
  {
    question: "どんな業種でも対応できますか？",
    answer:
      "製造業、建設業、飲食業、美容室、整骨院、士業、IT・コンサルなど、中小企業向けのホームページに幅広く対応できます。業種ごとに重視すべき情報を整理して構成します。",
  },
  {
    question: "完成イメージは事前に確認できますか？",
    answer:
      "はい。業種別の完成例を見ながらご相談いただけます。『実際にどんな見え方になるのか分からない』という状態のまま進めることはありません。",
  },
  {
    question: "更新は自分でできますか？",
    answer:
      "簡単な変更はお客様自身でも可能ですし、難しい部分は当社が対応します。お知らせ追加や画像差し替えなど、公開後も相談しやすい形で運用できます。",
  },
  {
    question: "解約したら何も残りませんか？",
    answer:
      "いいえ。サイトのデータやソースコードはお客様の資産として扱います。移行が必要な場合も進めやすいように整理してお渡しします。",
  },
  {
    question: "検索対策は含まれますか？",
    answer:
      "はい。タイトル設計、見出し構造、スマホ対応、基本的な表示速度、業種や地名の整理など、検索に向けた土台は最初から整えます。",
  },
  {
    question: "納期はどれくらいですか？",
    answer:
      "内容が固まっていれば、初稿は7営業日前後でご提示できます。ページ数が多い場合や多言語対応が必要な場合は、内容に応じて別途調整します。",
  },
];

export default function FAQ({ className }: { className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq" className={cn("bg-muted/30", className)}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            よくあるご質問
          </h2>
          <p className="text-muted-foreground">
            初めてホームページを依頼する方が気になりやすい点を、先に分かりやすく整理しています。
          </p>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div key={index} className="rounded-2xl border bg-card transition-all">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 font-medium leading-relaxed">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="border-t px-6 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
