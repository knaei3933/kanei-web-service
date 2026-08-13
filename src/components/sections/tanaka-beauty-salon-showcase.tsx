"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Calendar, Scissors, Sparkles, ShieldCheck, Leaf, CheckCircle2, MessageCircle, Menu, X, User, Camera, Star, Award } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";
import { useState } from "react";

/**
 * 田中美容室 - 上品で洗練された、ラグジュアリーなサロン
 * 事業種=美容室 / 事業体=田中美容室
 * イメージ: 柔らかなベージュとゴールドのトーンで女性らしさを演出
 * ターゲット: 20代から40代の女性で、トレンドに敏感なヘアスタイルを求める方
 * 特に結婚式やイベント前の特別なセットを希望するお客様も多い
 * 強み: 銀座サロンで10年経験したトップスタイリストによる完全マンツーマン施術
 *       一人ひとりの骨格と髪質に合わせたオーダーメイドカットと厳選したオーガニックカラーが自慢
 */

const SALON_INFO = {
  name: "田中美容室",
  phone: "06-1111-2222",
  email: "tanaka.misaki@example.com",
  address: "大阪府大阪市〇〇区〇〇町〇番〇号",
  access: "地下鉄〇〇駅徒歩5分",
  parking: "近隶コインパーキングあり",
  businessHours: "10:00〜19:00（木曜定休）",
  reservation: "完全予約制・オンライン予約受付中",
};

const STYLISTS = [
  {
    name: "田中 美咲",
    title: "オーナースタイリスト",
    experience: "銀座サロン10年経験",
    specialty: "オーダーメイドカット・ブライダルセット",
    certification: "日本美容技術検定1級",
  },
  {
    name: "スタッフ紹介（準備中）",
    title: "スタイリスト",
    experience: "経歴準備中",
    specialty: "得意スタイル準備中",
    certification: "日本美容技術検定1級",
  },
];

const COURSES = [
  {
    name: "プレミアムカット",
    price: "¥11,000",
    duration: "90分",
    description: "銀座仕込みのカット技術で、骨格診断から始める完全オーダーメイド",
    features: ["骨格・髪質診断込み", "シャンプー2種選択", "ヘアケアアドバイス", "スタイリングレッスン"],
    highlighted: true,
  },
  {
    name: "オーガニックカラー",
    price: "¥16,500",
    duration: "150分",
    description: "厳選したオーガニックカラーで、髪に優しく美しい発色を実現",
    features: ["無添加オーガニックカラー", "ダメージレス処置", "トリートメント付き", "カラー診断"],
    highlighted: false,
  },
  {
    name: "スペシャルパーマ",
    price: "¥18,700",
    duration: "180分",
    description: "髪質に合わせた薬剤選択で、理想のウェット・ドライスタイルを",
    features: ["オーガニックパーマ", "髪に優しい薬剤", "スタイリングレッスン", "アフターケア"],
    highlighted: false,
  },
  {
    name: "ブライダルセット",
    price: "¥33,000",
    duration: "240分",
    description: "結婚式・イベントに特化した完全オーダーメイドスペシャルセット",
    features: ["前日カット込み", "当日ヘアセット", "試しセット付き", "ブーケ・衣装合わせ"],
    highlighted: false,
  },
];

const MENU_ITEMS = [
  {
    category: "カット",
    items: [
      { name: "プレミアムカット（90分）", price: "¥11,000" },
      { name: "ショートカット", price: "¥8,800" },
      { name: "ミディアムカット", price: "¥9,900" },
      { name: "ロングカット", price: "¥11,000" },
      { name: "前髪カット（15分）", price: "¥2,200" },
      { name: "キッズカット", price: "¥5,500" },
    ],
  },
  {
    category: "カラー",
    items: [
      { name: "フルオーガニックカラー", price: "¥13,200〜" },
      { name: "リタッチ（根元のみ）", price: "¥9,900〜" },
      { name: "ハイライト・ローライト", price: "¥15,400〜" },
      { name: "グラデーションカラー", price: "¥17,600〜" },
      { name: "インナーカラー", price: "¥6,600〜" },
    ],
  },
  {
    category: "パーマ",
    items: [
      { name: "ロングパーマ", price: "¥15,400〜" },
      { name: "ショートパーマ", price: "¥13,200〜" },
      { name: "デジタルパーマ", price: "¥17,600〜" },
      { name: "エアウェーブパーマ", price: "¥19,800〜" },
      { name: "ツイストパーマ", price: "¥18,700〜" },
    ],
  },
  {
    category: "トリートメント",
    items: [
      { name: "髪質改善トリートメント", price: "¥7,700〜" },
      { name: "プレミアムトリートメント", price: "¥15,400〜" },
      { name: "ヘッドスパ（30分）", price: "¥8,800" },
      { name: "オイルトリートメント", price: "¥5,500〜" },
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "予約は必要ですか？",
    answer: "はい、完全予約制となっております。お電話またはオンライン予約フォームからご予約ください。"
  },
  {
    question: "初めての方でも安心ですか？",
    answer: "もちろん！カウンセリングから丁寧に行い、ご希望に合わせたスタイルをご提案します。"
  },
  {
    question: "キャンセル料はかかりますか？",
    answer: "前日までのキャンセルは無料です。当日キャンセルは料金を発生させていただく場合がございます。"
  },
  {
    question: "結婚式・イベントの予約はいつまでに？",
    answer: "可能な限り早めのご予約をおすすめしております。特に繁忙期は2ヶ月前までのご予約をお願いいたします。"
  },
  {
    question: "駐車場はありますか？",
    answer: "近隣のコインパーキングをご利用いただけます。詳細はアクセスページをご確認ください。"
  },
];

const STRENGTHS = [
  {
    icon: Award,
    title: "銀座サロン10年経験",
    description: "オーナー田中美咲は銀座の高級サロンで10年間の経験を持つトップスタイリスト",
  },
  {
    icon: ShieldCheck,
    title: "完全マンツーマン施術",
    description: "一人ひとりの骨格と髪質に合わせた完全オーダーメイドカット",
  },
  {
    icon: Leaf,
    title: "厳選オーガニックカラー",
    description: "髪にも環境にも優しいオーガニックカラーのみを使用",
  },
  {
    icon: Sparkles,
    title: "ブライダルセット得意",
    description: "結婚式・イベント前の特別なセットも安心してご相談ください",
  },
];

export default function TanakaBeautySalonShowcase() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "ホーム", href: "#" },
    { label: "コンセプト", href: "#concept" },
    { label: "スタイリスト", href: "#stylists" },
    { label: "メニュー・料金", href: "#courses" },
    { label: "よくある質問", href: "#faq" },
    { label: "アクセス", href: "#access" },
    { label: "お問い合わせ", href: "#contact" },
  ];

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  デモ用ヘッダー/ナビゲーション                                    */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-container px-4">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴ */}
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-stone-900">
                {SALON_INFO.name}
              </span>
            </a>

            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-stone-600 hover:text-amber-600 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* CTAボタン（デスクトップ） */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}>
                  <Phone className="mr-2 h-3.5 w-3.5" />
                  予約する
                </a>
              </Button>
            </div>

            {/* モバイルメニューボタン */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg hover:bg-amber-50 transition-colors"
              aria-label="メニューを開く"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-stone-700" />
              ) : (
                <Menu className="h-5 w-5 text-stone-700" />
              )}
            </button>
          </div>

          {/* モバイルメニュー */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden border-t border-amber-100 py-4"
            >
              <nav className="flex flex-col space-y-3">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-stone-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-amber-100">
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                  >
                    <a
                      href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Phone className="mr-2 h-3.5 w-3.5" />
                      今すぐ予約する
                    </a>
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/*  ヒーローセクション                                             */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-yellow-100/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-container px-4 py-16 sm:py-24 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* テキストエリア */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                上品で洗練されたラグジュアリーサロン
              </div>

              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                銀座サロン10年経験の
                <br />
                <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                  トップスタイリストによる完全マンツーマン施術
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                一人ひとりの骨格と髪質に合わせたオーダーメイドカットと、
                <br />
                厳選したオーガニックカラーが自慢です。
                <br />
                20代から40代の女性で、トレンドに敏感なヘアスタイルを求める方に。
              </p>

              <div className="flex flex-wrap gap-3">
                {STRENGTHS.map((strength, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm shadow-sm border-amber-100"
                  >
                    <strength.icon className="h-4 w-4 text-amber-600" />
                    {strength.title}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white"
                >
                  <a href="#contact">
                    <Phone className="mr-2 h-4 w-4" />
                    今すぐ予約する
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <a href="#stylists">スタイリストを見る</a>
                </Button>
              </div>
            </motion.div>

            {/* ヒーロー画像 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center bg-amber-50">
                  <div className="text-center p-8">
                    <Scissors className="h-16 w-16 mx-auto mb-4 text-amber-300" />
                    <p className="text-amber-600 text-sm">店舗画像は現在準備中です</p>
                    <p className="text-amber-400 text-xs mt-2">※ デモ用プレースホルダー</p>
                  </div>
                </div>
              </div>

              {/* 浮かぶ情報カード */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -bottom-6 -left-6 rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">営業時間</p>
                    <p className="text-sm font-bold text-foreground">{SALON_INFO.businessHours}</p>
                  </div>
                </div>
              </motion.div>

              {/* 浮かぶ評価カード */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="absolute -top-4 -right-4 rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-amber-700">銀座仕込みの技術</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  コンセプトセクション                                           */}
      {/* ============================================================ */}
      <Section id="concept" className="bg-amber-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              コンセプト
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              上品で洗練された、ラグジュアリーなサロンのような雰囲気
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STRENGTHS.map((strength, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <strength.icon className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="mb-2 text-sm font-semibold">{strength.title}</h3>
                <p className="text-sm text-muted-foreground">{strength.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  スタイリスト紹介                                              */}
      {/* ============================================================ */}
      <Section id="stylists">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              スタイリスト紹介
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              銀座サロンで10年経験したトップスタイリストによる完全マンツーマン施術
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {STYLISTS.map((stylist, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200">
                    <User className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{stylist.name}</h3>
                    <p className="text-sm text-amber-600 font-medium">{stylist.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stylist.experience}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        {stylist.certification}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
                        {stylist.specialty}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  コース・料金表                                                */}
      {/* ============================================================ */}
      <Section id="courses" className="bg-amber-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              コース・料金表
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              透明な料金表示で、安心してご予約いただけます
            </p>
          </div>

          {/* コースカード */}
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {COURSES.map((course, index) => (
              <motion.div
                key={course.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative rounded-2xl border p-6 ${
                  course.highlighted
                    ? "border-amber-400 bg-white shadow-lg"
                    : "border-amber-200 bg-white"
                }`}
              >
                {course.highlighted && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 text-xs font-bold text-white">
                      <Star className="h-3 w-3 fill-white" />
                      人気
                    </span>
                  </div>
                )}

                <h3 className="mb-1 text-lg font-bold">{course.name}</h3>
                <p className="mb-4 text-sm text-amber-600">{course.duration}</p>
                <p className="mb-4 text-xs text-muted-foreground">{course.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-amber-700">
                    {course.price}
                  </span>
                  <span className="text-muted-foreground"> / 税込</span>
                </div>

                <ul className="mb-6 space-y-2">
                  {course.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white"
                  variant="default"
                  size="sm"
                  asChild
                >
                  <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}>
                    <Phone className="mr-2 h-3.5 w-3.5" />
                    予約する
                  </a>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* メニューリスト */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MENU_ITEMS.map((menu, index) => (
              <motion.div
                key={menu.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-bold text-amber-700">
                  {menu.category}
                </h3>
                <ul className="space-y-3">
                  {menu.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-semibold text-amber-600">
                        {item.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  よくある質問                                                   */}
      {/* ============================================================ */}
      <Section>
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              よくある質問
            </h2>
            <p className="mt-2 text-muted-foreground">
              ご予約・施術に関するよくある質問
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-2 font-semibold text-amber-700">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  アクセス・地図                                                 */}
      {/* ============================================================ */}
      <Section id="access" className="bg-amber-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              アクセス・地図
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              地下鉄〇〇駅徒歩5分
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 地図プレースホルダー */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square overflow-hidden rounded-2xl border border-amber-200 bg-amber-100 flex items-center justify-center"
            >
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-amber-300" />
                <p className="text-amber-600 text-sm">地図は現在準備中です</p>
                <p className="text-amber-400 text-xs mt-2">※ デモ用プレースホルダー</p>
              </div>
            </motion.div>

            {/* アクセス詳細 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <MapPin className="h-5 w-5 text-amber-600" />
                  所在地
                </h3>
                <p className="text-base font-semibold">
                  {SALON_INFO.address}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  アクセス
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SALON_INFO.access}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  営業時間
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SALON_INFO.businessHours}
                </p>
                <p className="mt-1 text-xs text-amber-600">定休日: 木曜日</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  駐車場
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SALON_INFO.parking}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  お問い合わせ・予約 CTA                                         */}
      {/* ============================================================ */}
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-amber-600 to-amber-500">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-container px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                ご予約・お問い合わせ
              </h2>
              <p className="mt-4 text-lg text-white/90">
                完全予約制・オンライン予約受付中
              </p>
            </div>

            {/* 連絡先カード */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm border border-white/20"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg bg-white/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Phone className="h-6 w-6 text-white" />
                    <h3 className="font-semibold text-white">お電話で予約</h3>
                  </div>
                  <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`} className="text-xl font-bold text-white hover:text-amber-200 transition-colors">
                    {SALON_INFO.phone}
                  </a>
                  <p className="mt-2 text-sm text-white/70">
                    営業時間内にお電話ください
                  </p>
                </div>

                <div className="rounded-lg bg-white/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="h-6 w-6 text-white" />
                    <h3 className="font-semibold text-white">メールで問い合わせ</h3>
                  </div>
                  <a href={`mailto:${SALON_INFO.email}`} className="text-xl font-bold text-white hover:text-amber-200 transition-colors">
                    {SALON_INFO.email}
                  </a>
                  <p className="mt-2 text-sm text-white/70">
                    24時間受付中
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Instagram プレースホルダー */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20 text-center"
            >
              <Camera className="h-10 w-10 mx-auto mb-3 text-white" />
              <h3 className="mb-2 text-lg font-semibold text-white">
                Instagram で最新スタイルをチェック
              </h3>
              <p className="text-sm text-white/80 mb-4">
                施術例やスタイルをご紹介しています
              </p>
              <Button
                asChild
                size="sm"
                className="bg-white text-amber-600 hover:bg-amber-50"
              >
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Camera className="mr-2 h-4 w-4" />
                  Instagram を見る
                </a>
              </Button>
            </motion.div>

            {/* オンライン予約プレースホルダー */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20 text-center"
            >
              <Calendar className="h-10 w-10 mx-auto mb-3 text-white" />
              <h3 className="mb-2 text-lg font-semibold text-white">
                オンライン予約
              </h3>
              <p className="text-sm text-white/80 mb-4">
                24時間いつでもご予約可能です
              </p>
              <Button
                asChild
                size="sm"
                className="bg-white text-amber-600 hover:bg-amber-50"
              >
                <a href="#">
                  <Calendar className="mr-2 h-4 w-4" />
                  オンライン予約する
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                      */}
      {/* ============================================================ */}
      <footer className="border-t bg-stone-950">
        <div className="mx-auto max-w-container px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* サロン名 */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                {SALON_INFO.name}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                上品で洗練された、ラグジュアリーなサロン。
                <br />
                銀座サロン10年経験のトップスタイリストによる
                <br />
                完全マンツーマン施術で、あなたにぴったりのスタイルを。
              </p>
            </div>

            {/* 営業情報 */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">営業情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>営業: {SALON_INFO.businessHours}</li>
                <li>定休: 木曜日</li>
                <li>{SALON_INFO.reservation}</li>
              </ul>
            </div>

            {/* アクセス */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">アクセス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>{SALON_INFO.address}</li>
                <li>{SALON_INFO.access}</li>
                <li>{SALON_INFO.parking}</li>
              </ul>
            </div>

            {/* 連絡先 */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">お問い合わせ</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>TEL: {SALON_INFO.phone}</li>
                <li>MAIL: {SALON_INFO.email}</li>
              </ul>
              <div className="mt-4 flex gap-3">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Camera className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} {SALON_INFO.name} All Rights Reserved.</p>
            <p className="mt-1 text-xs">このサイトは実装用プレビューです</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
