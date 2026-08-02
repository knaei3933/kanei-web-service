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
      "初期費用は0円です。ドメイン取得費（年間約1,500円）のみお客様負担となります。月額10,000円でホームページの制作・運営・保守をすべて含みます。",
  },
  {
    question: "ソースコードの所有権はどうなりますか？",
    answer:
      "すべてお客様のものです。Gitリポジトリごとお渡ししますので、いつでも他のサーバーに移行可能です。WixやSTUDIOのようなプラットフォーム依存はありません。",
  },
  {
    question: "デザインの変更はできますか？",
    answer:
      "はい。テキスト変更・画像差し替えはお客様ご自身で簡単にできます。より大きな変更も月額プランに含まれており、追加料金なしで対応いたします。",
  },
  {
    question: "解約時はどうなりますか？",
    answer:
      "いつでも解約可能です。解約後もソースコード・データはすべてお客様のものとしてお引き渡しします。他のサーバーで引き続き運営できます。",
  },
  {
    question: "どんな技術を使っていますか？",
    answer:
      "Node.js（Next.js）をベースに、Vercelによる高速配信、Supabaseによるフォーム・データ管理、Google Analyticsによるアクセス解析を提供します。いずれも現代的で安定した技術スタックです。",
  },
  {
    question: "スマートフォンに対応していますか？",
    answer:
      "はい。すべてのページがレスポンシブデザインで制作されており、スマートフォン・タブレット・PCのすべてに最適化されています。",
  },
];

export default function FAQ({ className }: { className?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section className={cn("bg-muted/30", className)}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            よくあるご質問
          </h2>
          <p className="text-muted-foreground">
            お客様からよくいただくご質問にお答えします
          </p>
        </div>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border bg-card transition-all"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 font-medium">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="border-t px-6 pb-5 pt-4 text-muted-foreground">
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
