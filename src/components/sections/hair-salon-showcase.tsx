"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Calendar, Scissors, Sparkles, ShieldCheck, Leaf, CheckCircle2, MessageCircle } from "lucide-react";
import { Section } from "../ui/section";
import { Button } from "../ui/button";

/**
 * HAIR SALON TANAKA - 白と木のぬくもりを活かしたナチュラルテイストの美容室
 * 販売目的: 問い合わせ・予約を増やす
 * ターゲット: 長野市内の20〜40代女性・働くママ層
 * トーン: 白・グレー系、北欧風の清潔感と癒しを感じる空間
 */

const SALON_INFO = {
  name: "HAIR SALON TANAKA",
  phone: "026-224-7890",
  email: "tanaka.misaki@example.com",
  address: "長野県長野市〇〇1-2-3",
  access: "長野駅徒歩8分",
  parking: "専用駐車場3台分（予約可）",
  businessHours: "10:00〜19:00（木曜定休）",
  reservation: "完全予約制",
  instagram: "salon_tanaka_nagano",
};

const STYLISTS = [
  {
    name: "田中 美咲",
    position: "オーナースタイリスト",
    experience: "15年",
    license: "日本美容技術検定1級",
    specialty: "ナチュラルショート、レイヤースタイル、くせ毛カット",
    image: "/generated/photos-real/stylist-female.jpg",
    message: "お一人おひとりの髪質・生活スタイルに合わせて、 Everyday が楽しくなるスタイルをご提案いたします。",
  },
  {
    name: "佐藤 優子",
    position: "シニアスタイリスト",
    experience: "12年",
    license: "日本美容技術検定1級",
    specialty: "カラー、パーマ、ヘアアレンジ",
    image: "/generated/photos-real/stylist-female2.jpg",
    message: "お客様の理想を形にするのが私の喜びです。細やかなカウンセリングで安心して任せていただけます。",
  },
  {
    name: "高橋 真一",
    position: "スタイリスト",
    experience: "8年",
    license: "日本美容技術検定1級",
    specialty: "メンズスタイル、グラデーションカット",
    image: "/generated/photos-real/stylist-male.jpg",
    message: "清潔感ありつつトレンド感のあるスタイルを提案します。ご不明な点は何でもお気軽にどうぞ。",
  },
  {
    name: "山田 舞",
    position: "スタイリスト",
    experience: "6年",
    license: "日本美容技術検定1級",
    specialty: "前髪カット、髪質改善、内巻きアレンジ",
    image: "/generated/photos-real/stylist-female3.jpg",
    message: "働くママ目線で、おしゃれで手入れやすいスタイルをご提案します。お子様連れもぜひご相談ください。",
  },
];

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

const TESTIMONIALS = [
  {
    name: "A.Mさん（30代・女性）",
    beforeAfter: "前髪がうまく決まらない悩みを解消",
    content: "初めてのお店だったけど、カウンセリングが丁寧で安心しました。スタイリストの山田さんが、忙しいママでも手入れできるスタイルを提案してくれて、毎朝のスタイリングが楽しくなりました！",
    rating: 5,
  },
  {
    name: "S.Kさん（40代・女性）",
    beforeAfter: "初めてのグレーchalange",
    content: "ブリーチ歴が長く髪が痛んでいましたが、オーガニックカラーなら安心と教えてくれました。仕上がりは期待以上で、艶のある落ち着いた色に。セルフでも持ちが良いです。",
    rating: 5,
  },
  {
    name: "T.Hさん（20代・女性）",
    beforeAfter: "初めてのショートカット",
    content: "ロングからのショートカットを迷っていたけど、田中さんが顔形に合わせて最適な長さを提案してくれました。失敗したと思ったけど、毎日鏡を見るのが楽しいです！",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "初めてですが大丈夫ですか？",
    a: "もちろん！初めてのお客様も多数いらっしゃいます。スタイルの好みや普段のお手入れの仕方など、丁寧にお話を伺ってからご提案しますので安心してください。",
  },
  {
    q: "お子様連れでも来店できますか？",
    a: "はい、お子様連れも大歓迎です。ご予約時にお子様同伴であることをお伝えいただければ、お子様が遊べるスペースをご用意します。",
  },
  {
    q: "キャンセル料はかかりますか？",
    a: "前日までのキャンセルは無料です。当日キャンセル・無断欠席は、施術料金の50%をキャンセル料としてお願いいたします。",
  },
  {
    q: "支払い方法はありますか？",
    a: "現金、クレジットカード（主要カード）、電子マネー、PayPayに対応しています。",
  },
  {
    q: "駐車場はありますか？",
    a: "はい、専用駐車場3台分をご用意しています。ご予約時に駐車場のご利用もお伝えいただければ、確保いたします。",
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
  return (
    <div className="bg-white">
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
                長野駅徒歩8分。働くママがサクッと寄れる距感感の近いサロン。
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
                  <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}>
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
                <img
                  src="/generated/photos-real/salon-interior.jpg"
                  alt={`${SALON_INFO.name} - 店内の様子`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/10 to-transparent" />
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
              <p className="mt-1 text-xs text-stone-600">予約可</p>
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STYLISTS.map((stylist, index) => (
              <motion.div
                key={stylist.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
              >
                {/* 写真エリア */}
                <div className="aspect-[3/4] overflow-hidden bg-stone-100">
                  <img
                    src={stylist.image}
                    alt={`${stylist.name} - ${stylist.position}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* プロフィールエリア */}
                <div className="p-6">
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-stone-600">{stylist.position}</p>
                    <h3 className="text-lg font-bold">{stylist.name}</h3>
                  </div>

                  <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <p>経験 {stylist.experience} / {stylist.license}</p>
                    <p>得意: {stylist.specialty}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-700">
                    {stylist.message}
                  </p>

                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}>
                        {stylist.name}さんを指名する
                      </a>
                    </Button>
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
      <Section className="bg-stone-50">
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
      <Section>
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              お客様の声
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              実際にご来店いただいたお客様の満足度5.0の声をご紹介します。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                {/* 星評価 */}
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* ビフォーアフター */}
                <div className="mb-3 rounded-lg bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700">
                  {testimonial.beforeAfter}
                </div>

                {/* お客様の声 */}
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {testimonial.content}
                </p>

                {/* お客様名 */}
                <p className="text-sm font-semibold text-stone-700">
                  {testimonial.name}
                </p>
              </motion.div>
            ))}
          </div>
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
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
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
      {/*  アクセス・地図                                                 */}
      {/* ============================================================ */}
      <Section>
        <div className="mx-auto max-w-container px-4">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              アクセス・地図
            </h2>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              長野駅徒歩8分。専用駐車場3台分をご用意しています。
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Googleマップ埋め込み */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.0470784890626!2d138.1806!3d36.6513!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMzknMDQuOCJOIDEzOMKwMTAnNTAuMiJF!5e2m5qGF5biC5aSn6KiA5bqn6ZqS5bGL6aeF!3e0!3m2!1ja!4sjp!4v1696000000000!5m2!1ja!4sjp"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${SALON_INFO.name}の地図`}
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
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <MapPin className="h-5 w-5 text-stone-600" />
                  所在地
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  〒380-0001
                </p>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-stone-700 to-stone-600">
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
                お電話、Instagram DM、またはフォームからお気軽にご連絡ください
              </p>
            </div>

            {/* 連絡先ボタン */}
            <div className="mb-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-stone-700 hover:bg-white/90"
              >
                <a href={`tel:${SALON_INFO.phone.replace(/[^0-9]/g, "")}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  {SALON_INFO.phone}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                <a href={`https://instagram.com/${SALON_INFO.instagram}`} target="_blank" rel="noopener noreferrer">
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  Instagram DM
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                      placeholder="山田 花子"
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                      placeholder="026-123-4567"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="stylist" className="mb-2 block text-sm font-medium text-gray-700">
                      ご希望スタイリスト
                    </label>
                    <select
                      id="stylist"
                      name="stylist"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                    >
                      <option value="">指名なし</option>
                      {STYLISTS.map((stylist) => (
                        <option key={stylist.name} value={stylist.name}>
                          {stylist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="course" className="mb-2 block text-sm font-medium text-gray-700">
                    ご希望コース
                  </label>
                  <select
                    id="course"
                    name="course"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                  >
                    <option value="">選択してください</option>
                    {COURSES.map((course) => (
                      <option key={course.name} value={course.name}>
                        {course.name}（{course.price}）
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
                    ご要望・お問い合わせ内容
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/20"
                    placeholder="ご要望やご質問をご記入ください"
                  />
                </div>
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-sm text-stone-800">
                    <strong className="text-stone-900">営業時間:</strong> {SALON_INFO.businessHours}
                    <br />
                    <strong className="text-stone-900">定休日:</strong> 木曜日
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-800 hover:to-stone-700"
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

            {/* 連絡先 */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">ご予約・SNS</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-stone-500" />
                  {SALON_INFO.phone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-stone-500" />
                  {SALON_INFO.email}
                </li>
              </ul>
              <div className="mt-4 flex gap-3">
                <a
                  href={`https://instagram.com/${SALON_INFO.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-pink-600 hover:text-white"
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href={`https://line.me/ti/p/${SALON_INFO.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-green-600 hover:text-white"
                  aria-label="LINE"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
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
