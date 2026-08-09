"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Calendar, Users, CheckCircle2, MessageCircle } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

/**
 * テスト居酒屋 - 昭和レトロな温かみのある居酒屋サイト
 * 販売目的: 問い合わせ・予約を増やす
 * ターゲット: 20代男性、渋谷駅周辺で働く会社員
 * トーン: 暖色系、木の内装、暖簾、提灯の雰囲気
 */

const SHOP_INFO = {
  name: "テスト居酒屋",
  phone: "03-9876-5432",
  email: "test-izakaya@example.com",
  address: "東京都渋谷区〇〇1-2-3",
  access: "渋谷駅徒歩5分",
  parking: "駐車場なし（近隣コインパーキングをご利用ください）",
  businessHours: "17:00〜23:30（L.O. 23:00）",
  closed: "日曜日・祝日",
  reservation: "完全予約制",
};

const COURSES = [
  {
    name: "飲放題コース",
    price: "¥4,800",
    description: "120分飲み放題＋おつまみ5品",
    features: ["ビール・焼酎・日本酒", "季節の料理", "個室対応可能"],
    highlighted: true,
  },
  {
    name: "宴会コース",
    price: "¥6,500",
    description: "飲み放題＋豪華料理8品",
    features: ["コース料理", "飲み放題120分", "個室優先"],
    highlighted: false,
  },
  {
    name: "VIPコース",
    price: "¥9,800",
    description: "特上料理＋飲み放題120分",
    features: ["特上刺身", "焼き物", "揚げ物", "煮物", "個室込"],
    highlighted: false,
  },
];

const STRENGTHS = [
  {
    icon: CheckCircle2,
    title: "創業15年の実績",
    description: "地元で愛され続けてきた信頼の味",
  },
  {
    icon: Users,
    title: "完全予約制",
    description: "ゆったりとお過ごしいただける個室完備",
  },
  {
    icon: Calendar,
    title: "毎日仕入れの鮮魚",
    description: "朝穫れの新鮮な魚をその日のうちにお届け",
  },
];

const MENUS = [
  {
    category: "おつまみ",
    items: ["枝豆", "冷奴", "きゅうりの浅漬け", "ポテトサラダ"],
    priceFrom: "¥480",
  },
  {
    category: "刺身",
    items: ["お任せ刺盛", "マグロ刺身", "鯛刺身", "旬の魚刺身"],
    priceFrom: "¥980",
  },
  {
    category: "焼き物",
    items: ["焼き鳥", "焼き魚", "串焼き詰め合わせ"],
    priceFrom: "¥780",
  },
  {
    category: "揚げ物",
    items: ["唐揚げ", "フライドポテト", "天ぷら盛り合わせ"],
    priceFrom: "¥680",
  },
];

const SEATS = [
  {
    type: "カウンター席",
    capacity: "1〜4名",
    description: "カウンターでのんびりと。職人との会話もお楽しみいただけます。",
    image: "/generated/photos-real/restaurant.jpg",
  },
  {
    type: "テーブル席",
    capacity: "2〜8名",
    description: "少人数からグループまで。用途に合わせてご案内いたします。",
    image: "/generated/photos-real/restaurant-about.jpg",
  },
  {
    type: "個室",
    capacity: "4〜12名",
    description: "プライベート空間で会議や接待、記念日にも最適です。",
    image: "/generated/photos-real/restaurant-gallery2.jpg",
  },
];

const FAQS = [
  {
    q: "予約は必要ですか？",
    a: "はい、完全予約制となっております。お電話またはメールにてご予約をお願いいたします。",
  },
  {
    q: "駐車場はありますか？",
    a: "店舗専用の駐車場はありませんが、近隣にコインパーキングがございます。",
  },
  {
    q: "コースのキャンセルについて",
    a: "前日までのキャンセルは無料。当日キャンセルはコース料金の50%をキャンセル料としてお願いいたします。",
  },
  {
    q: "子供連れでも大丈夫ですか？",
    a: "お子様連れも大歓迎です。お子様用メニューもご用意しております。",
  },
];

export default function IzakayaShowcase() {
  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  ヒーローセクション                                             */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-200/20 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-red-200/10 blur-3xl" />
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
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700">
                <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                創業15年 地元で愛される味
              </div>

              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                昭和レトロな温かみがあふれる
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {SHOP_INFO.name}
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                渋谷駅徒歩5分。木の内装に暖簾、提灯の雰囲気が漂う、
                <br />
                こだわりの鮮魚と地元農家直送の野菜をお楽しみください。
              </p>

              <div className="flex flex-wrap gap-3">
                {STRENGTHS.map((strength, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm shadow-sm"
                  >
                    <strength.icon className="h-4 w-4 text-orange-600" />
                    {strength.title}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  <a href={`tel:${SHOP_INFO.phone.replace(/[^0-9]/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    今すぐ予約する
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#courses">コースを見る</a>
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
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-orange-100 to-red-100 shadow-2xl">
                <img
                  src="/generated/photos-real/restaurant-gallery1.jpg"
                  alt={`${SHOP_INFO.name} - 店内の様子`}
                  className="h-full w-full object-cover"
                />
                {/* 暖色系のオーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent" />
              </div>

              {/* 浮かぶ情報カード */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -bottom-6 -left-6 rounded-2xl border border-white bg-white/90 p-4 shadow-xl backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">営業時間</p>
                    <p className="text-sm font-bold text-foreground">{SHOP_INFO.businessHours}</p>
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
      <Section className="bg-orange-50">
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
              className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">営業時間</h3>
              <p className="text-sm text-muted-foreground">{SHOP_INFO.businessHours}</p>
              <p className="mt-1 text-xs text-orange-600">{SHOP_INFO.closed}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">予約</h3>
              <p className="text-sm text-muted-foreground">{SHOP_INFO.reservation}</p>
              <p className="mt-1 text-xs text-orange-600">要予約</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">所在地</h3>
              <p className="text-sm text-muted-foreground">{SHOP_INFO.address}</p>
              <p className="mt-1 text-xs text-orange-600">{SHOP_INFO.access}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="mb-2 text-sm font-semibold">駐車場</h3>
              <p className="text-sm text-muted-foreground">{SHOP_INFO.parking}</p>
              <p className="mt-1 text-xs text-orange-600">近隣CP利用</p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  コース一覧（料金表）                                           */}
      {/* ============================================================ */}
      <Section id="courses">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              コース一覧
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              飲み放題コースからVIPコースまで、用途に合わせてお選びください
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {COURSES.map((course, index) => (
              <motion.div
                key={course.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative rounded-3xl border p-8 ${
                  course.highlighted
                    ? "border-orange-300 bg-orange-50 shadow-xl shadow-orange-100"
                    : "border-border bg-card"
                }`}
              >
                {course.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1 text-xs font-bold text-white">
                      <span className="flex h-2 w-2 rounded-full bg-white" />
                      人気No.1
                    </span>
                  </div>
                )}

                <h3 className="mb-2 text-xl font-bold">{course.name}</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  {course.description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-orange-600">
                    {course.price}
                  </span>
                  <span className="text-muted-foreground"> / 税込</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {course.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          course.highlighted ? "text-orange-600" : "text-emerald-500"
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    course.highlighted
                      ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                      : ""
                  }`}
                  variant={course.highlighted ? "default" : "outline"}
                  asChild
                >
                  <a href={`tel:${SHOP_INFO.phone.replace(/[^0-9]/g, "")}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    予約する
                  </a>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  メニュー紹介                                                  */}
      {/* ============================================================ */}
      <Section className="bg-orange-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              メニュー
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              毎日仕入れのこだわり鮮魚と地元農家直送の有機野菜
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MENUS.map((menu, index) => (
              <motion.div
                key={menu.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-3 text-lg font-bold text-orange-700">
                  {menu.category}
                </h3>
                <ul className="mb-4 space-y-2">
                  {menu.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <span className="flex h-1 w-1 rounded-full bg-orange-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-orange-600">
                  {menu.priceFrom} 〜
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  お席・個室情報                                                */}
      {/* ============================================================ */}
      <Section>
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              お席・個室
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              用途に合わせてお選びいただける多彩な席をご用意
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {SEATS.map((seat, index) => (
              <motion.div
                key={seat.type}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
              >
                {/* 画像エリア */}
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={seat.image}
                    alt={`${seat.type}の様子`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-lg font-bold">{seat.type}</h3>
                  <p className="mb-3 text-sm text-orange-600 font-semibold">
                    {seat.capacity}様
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {seat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  アクセス・地図                                                 */}
      {/* ============================================================ */}
      <Section className="bg-orange-50">
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              アクセス・地図
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              渋谷駅から徒歩5分。お車でお越しの方は近隣コインパーキングをご利用ください
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Googleマップ埋め込み */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.0470784890626!2d139.7016!3d35.6580!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188b3a7f8e8e8f%3A0x6b7f1e8e8e8e8e8!2z5rWq6K2b5p2x5Lqs6aeF!5e2m5qGF5biC5aSn6KiA5bqn6ZqS5bGL6aeF!3e0!3m2!1ja!4sjp!4v1696000000000!5m2!1ja!4sjp"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="テスト居酒屋の地図"
                className="h-full w-full"
              />
            </motion.div>

            {/* アクセス詳細 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  所在地
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  〒150-0002
                </p>
                <p className="text-base font-semibold">
                  {SHOP_INFO.address}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-orange-600" />
                  アクセス
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SHOP_INFO.access}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  駐車場
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SHOP_INFO.parking}
                </p>
              </div>
            </motion.div>
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
              ご予約・ご来店前にご確認ください
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="mb-2 font-semibold text-foreground">
                  Q. {faq.q}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A. {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  お問い合わせ・予約 CTA                                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-red-600">
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
                お電話、メール、またはフォームからお気軽にご連絡ください
              </p>
            </div>

            {/* 連絡先ボタン */}
            <div className="mb-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-orange-700 hover:bg-white/90"
              >
                <a href={`tel:${SHOP_INFO.phone.replace(/[^0-9]/g, "")}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  {SHOP_INFO.phone}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <a href={`mailto:${SHOP_INFO.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  {SHOP_INFO.email}
                </a>
              </Button>
            </div>

            {/* お問い合わせフォーム */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white p-8 shadow-xl"
            >
              <h3 className="mb-6 text-center text-lg font-semibold text-gray-900">
                お問い合わせフォーム
              </h3>
              <form
                action="/api/contact"
                method="POST"
                className="space-y-6"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                      お名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                      電話番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="03-1234-5678"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="example@email.com"
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="mb-2 block text-sm font-medium text-gray-700">
                      ご希望日
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="people" className="mb-2 block text-sm font-medium text-gray-700">
                      ご人数
                    </label>
                    <select
                      id="people"
                      name="people"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="">選択してください</option>
                      <option value="1-2">1〜2名</option>
                      <option value="3-4">3〜4名</option>
                      <option value="5-8">5〜8名</option>
                      <option value="9-12">9〜12名（個室）</option>
                      <option value="13+">13名以上</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
                    ご要望・お問い合わせ内容
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="ご要望やご質問をご記入ください"
                  />
                </div>
                <div className="rounded-lg bg-orange-50 p-4">
                  <p className="text-sm text-orange-800">
                    <strong className="text-orange-900">営業時間:</strong> {SHOP_INFO.businessHours}
                    <br />
                    <strong className="text-orange-900">定休日:</strong> {SHOP_INFO.closed}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  送信する
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                      */}
      {/* ============================================================ */}
      <footer className="border-t bg-slate-950">
        <div className="mx-auto max-w-container px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* 店名 */}
            <div>
              <h3 className="mb-3 text-lg font-bold text-white">
                {SHOP_INFO.name}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                渋谷で創業15年。昭和レトロな温かみのある居酒屋で、
                <br />
                こだわりの鮮魚と地元野菜をお楽しみください。
              </p>
            </div>

            {/* 営業情報 */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">営業情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>営業: {SHOP_INFO.businessHours}</li>
                <li>定休: {SHOP_INFO.closed}</li>
                <li>{SHOP_INFO.reservation}</li>
              </ul>
            </div>

            {/* アクセス */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">アクセス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>{SHOP_INFO.address}</li>
                <li>{SHOP_INFO.access}</li>
                <li>{SHOP_INFO.parking}</li>
              </ul>
            </div>

            {/* 連絡先 */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">ご予約・SNS</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-orange-500" />
                  {SHOP_INFO.phone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-500" />
                  {SHOP_INFO.email}
                </li>
              </ul>
              <div className="mt-4 flex gap-3">
                <a
                  href="https://instagram.com/test-izakaya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-orange-600 hover:text-white"
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://line.me/test-izakaya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-green-600 hover:text-white"
                  aria-label="LINE"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com/test_izakaya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                  aria-label="X (Twitter)"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} {SHOP_INFO.name} All Rights Reserved.</p>
            <p className="mt-1 text-xs">このサイトは実装用プレビューです</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
