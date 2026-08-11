"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, Newspaper, FileText } from "lucide-react";
import { Section } from "../ui/section";

type Post = {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  tag: string;
};

const POSTS: Post[] = [
  {
    title: "製造業サイトの会社案内ページを整理した構成例",
    excerpt:
      "設備、対応範囲、検査体制、お問い合わせ先をどの順番で見せると安心感が伝わりやすいかを、法人向けの構成例としてまとめています。",
    category: "構成例",
    date: "2026.07.28",
    tag: "製造業",
  },
  {
    title: "来店型サイトで先に整えるべき予約導線の考え方",
    excerpt:
      "営業時間、アクセス、予約方法、メニュー案内をスマホで見やすく整理するだけでも、問い合わせのしやすさは大きく変わります。",
    category: "運用メモ",
    date: "2026.07.21",
    tag: "飲食・美容",
  },
  {
    title: "月額プランに含まれる更新・保守の範囲について",
    excerpt:
      "公開後に相談しやすい軽微修正、画像差し替え、お知らせ更新など、日常運用で依頼しやすい範囲を分かりやすく整理しています。",
    category: "ご案内",
    date: "2026.07.14",
    tag: "料金",
  },
];

export default function NewsBoard() {
  return (
    <Section id="news" className="bg-background">
      <div className="mx-auto max-w-container">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Newspaper className="h-3.5 w-3.5" />
            更新情報・構成メモ
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            運用に役立つ構成メモ
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
            構成例、更新のコツ、月額プランの範囲など、相談の前後に確認しやすい情報をまとめています。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {POSTS.map((post, index) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-3xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  <FileText className="h-3.5 w-3.5" />
                  {post.category}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {post.tag}
                </span>
              </div>
              <div className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {post.date}
              </div>
              <h3 className="text-lg font-bold leading-snug">{post.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                内容を見る
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="mailto:info@kanei-trade.co.jp?subject=%E3%83%9B%E3%83%BC%E3%83%A0%E3%83%9A%E3%83%BC%E3%82%B8%E5%88%B6%E4%BD%9C%E3%81%AE%E3%81%94%E7%9B%B8%E8%AB%87"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            このような構成で相談する
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Section>
  );
}
