"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Calendar, Scissors, Sparkles, ShieldCheck, Leaf, CheckCircle2, MessageCircle, Menu, X, User } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";
import { useState } from "react";

/**
 * HAIR SALON TANAKA - 白と木のぬくもりを活かしたナチュラルテイストの美容室
 * 販売目的: 問い合わせ・予約を増やす
 * ターゲット: 長野市内の20〜40代女性・働くママ層
 * トーン: 白・グレー系、北欧風の清潔感と癒しを感じる空間
 */

const SALON_INFO = {
  name: "HAIR SALON TANAKA",
  phone: "（電話番号は現在準備中です）",
  email: "（メールアドレスは現在準備中です）",
  address: "長野県長野市〇〇（詳細住所は現在準備中です）",
  access: "長野駅徒歩8分",
  parking: "駐車場情報は現在準備中です",
  businessHours: "10:00〜19:00（木曜定休）",
  reservation: "完全予約制",
};


const COURSES = [
  {
    name: "カットコース",
    price: "¥7,700",
    duration: "68分",
    description: "洗髪・カット・スタイリング",
    features: ["カウンセリング込み", "シャンプー2種選択", "ヘアケア診断"],
    highlighted: true,
  },
  {
    name: "カット＋カラー",
    price: "¥13,200",
    duration: "120分",
    description: "カット＋フルカラー",
    features: ["オーガニックカラー", "ダメージレス処置", "トリートメント付き"],
    highlighted: false,
  },
  {
    name: "パーマコース",
    price: "¥14,300",
    duration: "135分",
    description: "カット＋パーマ",
    features: ["オーガニックパーマ", "髪に優しい薬剤", "スタイリングレッスン"],
    highlighted: false,
  },
  {
    name: "スペシャルコース",
    price: "¥19,800",
    duration: "150分",
    description: "カット＋カラー＋パーマ",
    features: ["フルオーダー対応", "プレミアムトリートメント", "ヘッドスパ付き"],
    highlighted: false,
  },
];

const STRENGTHS = [
  {
    icon: ShieldCheck,
    title: "全スタッフ1級資格保持",
    description: "日本美容技術検定1級のスタッフが確かな技術をお届けします",
  },
  {
    icon: Calendar,
    title: "完全予約制",
    description: "お待たせしないゆったりとした時間をお約束します",
  },
  {
    icon: Leaf,
    title: "オーガニック製品のみ使用",
    description: "髪にも環境にもやさしい製品を選んでいます",
  },
  {
    icon: Sparkles,
    title: "カット68分のコース設定",
    description: "じっくりと向き合う充実の施術時間です",
  },
];



const MENU_ITEMS = [
  {
    category: "カット",
    items: [
      { name: "カット（68分）", price: "¥7,700" },
      { name: "前髪カット（15分）", price: "¥2,200" },
      { name: "キッズカット", price: "¥5,500" },
    ],
  },
  {
    category: "カラー",
    items: [
      { name: "フルカラー", price: "¥8,800〜" },
      { name: "リタッチ", price: "¥6,600〜" },
      { name: "ハイライト・ローライト", price: "¥11,000〜" },
    ],
  },
  {
    category: "パーマ",
    items: [
      { name: "ロングパーマ", price: "¥9,900〜" },
      { name: "ショートパーマ", price: "¥8,800〜" },
      { name: "デジタルパーマ", price: "¥12,100〜" },
    ],
  },
  {
    category: "トリートメント",
    items: [
      { name: "髪質改善トリートメント", price: "¥5,500〜" },
      { name: "プレミアムトリートメント", price: "¥13,200〜" },
      { name: "ヘッドスパ", price: "¥6,600〜" },
    ],
  },
];

export default function HairSalonShowcase() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "ホーム", href: "#" },
    { label: "スタイリスト", href: "#stylists" },
    { label: "料金", href: "#courses" },
    { label: "お客様の声", href: "#testimonials" },
    { label: "アクセス", href: "#access" },
    { label: "お問い合わせ", href: "#contact" },
  ];

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  デモ用ヘッダー/ナビゲーション                                    */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-container px-4">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴ */}
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-800">
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
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
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
                className="bg-stone-800 hover:bg-stone-900"
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
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
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
              className="md:hidden border-t border-stone-200 py-4"
            >
              <nav className="flex flex-col space-y-3">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-stone-200">
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-stone-800 hover:bg-stone-900"
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
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 to-white">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-stone-200/20 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-neutral-200/10 blur-3xl" />
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
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-700">
                <span className="flex h-2 w-2 rounded-full bg-stone-500" />
                北欧風の癒しの空間
              </div>

              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                白と木のぬくもりを活かした
                <br />
                <span className="bg-gradient-to-r from-stone-700 to-stone-500 bg-clip-text text-transparent">
                  {SALON_INFO.name}
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                長野駅徒歩8分。働くママがサクッと寄れる、距離感の近いサロン。
                <br />
                全スタッフ1級資格保持。オーガニック製品のみ使用。
              </p>

              <div className="flex flex-wrap gap-3">
                {STRENGTHS.map((strength, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm shadow-sm"
                  >
                    <strength.icon className="h-4 w-4 text-stone-600" />
                    {strength.title}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-800 hover:to-stone-700"
                >
                  <a href="#contact">
                    <Phone className="mr-2 h-4 w-4" />
                    今すぐ予約する
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
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
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-stone-100 to-stone-200 shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                  <div className="text-center p-8">
                    <Scissors className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                    <p className="text-stone-400 text-sm">店舗画像は現在準備中です</p>
                    <p className="text-stone-300 text-xs mt-2">※ デモ用プレースホルダー</p>
                  </div>
                </div>
              </div>

              {/* 浮かぶ情報カード */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -bottom-6 -left-6 rounded-2xl border border-white bg-white/90 p-4 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                    <Clock className="h-6 w-6 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">営業時間</p>
                    <p className="text-sm font-bold text-foreground">{SALON_INFO.businessHours}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  営業情報                                                     */}
      {/* ============================================================ */}
      <Section className="bg-stone-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              営業情報
            </h2>
            <p className="mt-2 text-muted-foreground">
              ご来店をお待ちしております
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <Clock className="h-5 w-5 text-stone-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">営業時間</h3>
              <p className="text-sm text-muted-foreground">{SALON_INFO.businessHours}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <Calendar className="h-5 w-5 text-stone-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">予約</h3>
              <p className="text-sm text-muted-foreground">{SALON_INFO.reservation}</p>
              <p className="mt-1 text-xs text-stone-600">完全予約制</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <MapPin className="h-5 w-5 text-stone-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">所在地</h3>
              <p className="text-sm text-muted-foreground">{SALON_INFO.address}</p>
              <p className="mt-1 text-xs text-stone-600">{SALON_INFO.access}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <Calendar className="h-5 w-5 text-stone-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">駐車場</h3>
              <p className="text-sm text-muted-foreground">{SALON_INFO.parking}</p>
            </motion.div>
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
              全スタッフが日本美容技術検定1級を取得。安心してお任せください。
            </p>
          </div>

          {/* プレースホルダーセクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50 p-12 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-stone-200">
              <User className="h-10 w-10 text-stone-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-stone-700">
              スタッフ紹介は現在準備中です
            </h3>
            <p className="max-w-lg mx-auto text-sm leading-relaxed text-stone-600">
              スタッフの顔写真・経歴・得意スタイルなどの情報は、
              <br />
              公式素材を受領次第、反映させていただきます。
            </p>
            <p className="mt-4 text-xs text-stone-400">
              ※ 現在、全スタッフが日本美容技術検定1級を取得していることは確定情報です
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  コース・料金表                                                */}
      {/* ============================================================ */}
      <Section id="courses" className="bg-stone-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              コース・料金表
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              カット68分のコース設定。じっくりと向き合う充実の施術時間です。
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
                    ? "border-stone-400 bg-white shadow-lg"
                    : "border-stone-200 bg-white"
                }`}
              >
                {course.highlighted && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-700 px-3 py-0.5 text-xs font-bold text-white">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-white" />
                      人気
                    </span>
                  </div>
                )}

                <h3 className="mb-1 text-lg font-bold">{course.name}</h3>
                <p className="mb-4 text-sm text-stone-600">{course.duration}</p>
                <p className="mb-4 text-xs text-muted-foreground">{course.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-stone-700">
                    {course.price}
                  </span>
                  <span className="text-muted-foreground"> / 税込</span>
                </div>

                <ul className="mb-6 space-y-2">
                  {course.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-stone-700 hover:bg-stone-800"
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
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-bold text-stone-700">
                  {menu.category}
                </h3>
                <ul className="space-y-3">
                  {menu.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-semibold text-stone-600">
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
      {/*  お客様の声                                                    */}
      {/* ============================================================ */}
      <Section id="testimonials">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              お客様の声
            </h2>
          </div>

          {/* プレースホルダーセクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50 p-12 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-stone-200">
              <Sparkles className="h-10 w-10 text-stone-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-stone-700">
              お客様の声は素材受領後に掲載予定です
            </h3>
            <p className="max-w-lg mx-auto text-sm leading-relaxed text-stone-600">
              実際にご来店いただいたお客様の声を掲載する予定です。
              <br />
              公式素材を受領次第、反映させていただきます。
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  よくある質問                                                   */}
      {/* ============================================================ */}
      <Section className="bg-stone-50">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              よくある質問
            </h2>
          </div>

          {/* プレースホルダーセクション */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border-2 border-dashed border-stone-300 bg-white p-12 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
              <MessageCircle className="h-10 w-10 text-stone-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-stone-700">
              よくある質問は現在整理中です
            </h3>
            <p className="max-w-lg mx-auto text-sm leading-relaxed text-stone-600">
              よくある質問と回答を現在整理中です。
              <br />
              最終的なQ&Aは、お客様からのヒアリング後に反映させていただきます。
            </p>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  アクセス・地図                                                 */}
      {/* ============================================================ */}
      <Section id="access">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              アクセス・地図
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              長野駅徒歩8分。駐車場情報は現在準備中です。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 地図プレースホルダー */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 flex items-center justify-center"
            >
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                <p className="text-stone-400 text-sm">地図は現在準備中です</p>
                <p className="text-stone-300 text-xs mt-2">※ デモ用プレースホルダー</p>
              </div>
            </motion.div>

            {/* アクセス詳細 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <MapPin className="h-5 w-5 text-stone-600" />
                  所在地
                </h3>
                <p className="text-base font-semibold">
                  {SALON_INFO.address}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-stone-600" />
                  アクセス
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SALON_INFO.access}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-stone-600" />
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
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-stone-700 to-stone-600">
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
                予約方法・連絡先は現在準備中です
              </p>
            </div>

            {/* プレースホルダーカード */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm border border-white/20"
            >
              <div className="text-center">
                <Phone className="h-12 w-12 mx-auto mb-4 text-white/60" />
                <h3 className="mb-3 text-xl font-bold text-white">
                  予約・お問い合わせは現在準備中です
                </h3>
                <p className="text-sm text-white/80 mb-6">
                  電話番号・メールアドレス・Instagramアカウントなどの<br />
                  連絡先情報は、公式素材を受領次第、反映させていただきます。
                </p>
                <div className="rounded-lg bg-white/10 p-4">
                  <p className="text-xs text-white/70">
                    <strong className="text-white">確定情報:</strong><br />
                    ・完全予約制<br />
                    ・営業時間: {SALON_INFO.businessHours}<br />
                    ・定休日: 木曜日
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
              <svg className="h-8 w-8 mx-auto mb-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
              </svg>
              <p className="text-sm font-semibold text-white">
                Instagram掲載内容を反映予定
              </p>
              <p className="text-xs text-white/70 mt-1">
                Instagramアカウント情報は現在準備中です
              </p>
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
                白と木のぬくもりを活かしたナチュラルテイスト。
                <br />
                北欧風の清潔感と癒しを感じる空間で、
                <br />
                あなたにぴったりのスタイルをご提案します。
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

            {/* SNSプレースホルダー */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">SNS</h4>
              <p className="text-sm text-slate-400 mb-3">
                SNSアカウントは現在準備中です
              </p>
              <div className="mt-4 flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                  <span className="text-xs">IG</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                  <span className="text-xs">LINE</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                ※ アカウント情報は素材受領次第反映予定
              </p>
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
