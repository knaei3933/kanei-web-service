"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Award,
  Home,
  Shield,
  Users,
  Leaf,
  Wind,
  Wrench,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

// メタデータ - デモページ用
const META = {
  enterpriseName: "鈴木工務店",
  submissionId: "20260808-123405-1576b300",
};

// 実績数値データ
const STATS = [
  { value: "30年", label: "創業実績" },
  { value: "1,000棟+", label: "施工実績" },
  { value: "10年", label: "アフター保証" },
  { value: "100%", label: "自社職人施工" },
];

// 施工・工事の強み
const FEATURES = [
  {
    icon: <Home className="h-8 w-8" />,
    title: "ZEH住宅対応",
    description: "次世代省エネ基準をクリアするZEH（ネット・ゼロ・エネルギー・ハウス）の施工に対応しています。",
  },
  {
    icon: <Wind className="h-8 w-8" />,
    title: "全館換気システム",
    description: "健康的で快適な空気環境を実現する全館換気システムを導入。花粉やPM2.5も軽減します。",
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "10年長期保証",
    description: "施工後10年間の長期保証付き。万が一の不具合も安心してご対応いたします。",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "自社職人の手作り",
    description: "すべての工程を自社職人が手掛けるため、品質管理が徹底され、細やかな対応が可能です。",
  },
];

// ビフォーアフター施工例
const BEFORE_AFTER = [
  {
    before: "築40年の古民家。腐食や断熱性の低下が進み、生活環境に課題がありました。",
    after: "現代的な設備を取り入れつつ、和の魅力を活かした快適な住まいへ生まれ変わりました。",
    category: "耐震リフォーム",
  },
  {
    before: "狭暗く間取りの不便な-old house。家族のライフスタイルに合いませんでした。",
    after: "明るく開放的なLDKにリフォーム。子どもたちがのびのびと過ごせる空間に。",
    category: "間取り変更",
  },
  {
    before: "夏は暑く冬は寒いエネルギー効率の低い家でした。",
    after: "高断熱・高気密化で光熱費を約50%削減。快適な省エネ住宅に。",
    category: "省エネリフォーム",
  },
];

// お客様の声
const TESTIMONIALS = [
  {
    location: "〇〇市 S様",
    content: "見積もりから完成まで丁寧に説明いただき、安心して任せることができました。自社職人さんの仕事にこだわりを感じます。",
  },
  {
    location: "△△町 M様",
    content: "10年保証があるということで安心して依頼。引き渡しから2年経ちますが、快適に過ごしています。",
  },
  {
    location: "□□市 K様",
    content: "ZEH住宅を提案いただき、光熱費が大幅に下がりました。次世代の住まいに感謝です。",
  },
];

// 会社概要・沿革
const COMPANY_INFO = {
  name: "鈴木工務店",
  established: "創業 1996年（平成8年）",
  representative: "代表取締役 鈴木 一郎",
  address: "〒123-4567\n東京都〇〇区△△町1-2-3",
  phone: "03-9876-5432",
  email: "suzuki.example@example.com",
  history: [
    { year: "1996年", event: "鈴木工務店として創業" },
    { year: "2005年", event: "本社事務所を現所在地に移転" },
    { year: "2012年", event: "施工実績500棟達成" },
    { year: "2020年", event: "ZEH住宅施工認証取得" },
    { year: "2024年", event: "施工実績1,000棟達成" },
  ],
};

// お問い合わせフォーム初期値
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export default function SuzukiConstructionShowcase() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeBeforeAfter, setActiveBeforeAfter] = useState<number | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // デモ用の遅延
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormData(INITIAL_FORM);
    // 成功メッセージを3秒後に消す
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* ヒーローセクション */}
      <Section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-orange-50/30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight text-amber-900 sm:text-5xl md:text-6xl">
              鈴木工務店
            </h1>
            <p className="mt-4 text-lg text-amber-700 sm:text-xl">
              創業30年の信頼と実績で、あなたの夢の住まいをかたちにします
            </p>
            <p className="mt-2 text-amber-600">
              地域に愛される、安心の自社職人による手作り工務店
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                無料見積もりを依頼する
                <Send className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-amber-300 text-amber-700">
                施工事例を見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* 実績数値セクション */}
      <Section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              30年の実績でお届けする安心
            </h2>
            <p className="mt-4 text-center text-amber-700">
              地域で選ばれ続けてきた理由は、確かな実績とこだわりの施工です
            </p>
          </motion.div>
          <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-amber-600 sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm font-medium text-amber-700 sm:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* 施工・工事の強みセクション */}
      <Section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              自社職人の手作りで実現する
              <br className="hidden sm:block" />
              品質の高い住まい
            </h2>
            <p className="mt-4 text-center text-amber-700">
              すべての工程を自社職人が手掛けるから、細やかな品質管理が可能です
            </p>
          </motion.div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-lg bg-white p-6 shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-amber-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-amber-700">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ビフォーアフター施工例セクション */}
      <Section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              施工事例で見る
              <br className="hidden sm:block" />
              変わりゆく住まい
            </h2>
            <p className="mt-4 text-center text-amber-700">
              お客様のライフスタイルに合わせたリフォームをご提案します
            </p>
          </motion.div>
          <div className="mt-12 space-y-6">
            {BEFORE_AFTER.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="overflow-hidden rounded-lg border-2 border-amber-200 bg-amber-50"
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveBeforeAfter(
                      activeBeforeAfter === index ? null : index
                    )
                  }
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <div>
                    <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-sm font-medium text-amber-800">
                      {item.category}
                    </span>
                  </div>
                  {activeBeforeAfter === index ? (
                    <ChevronUp className="h-5 w-5 text-amber-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-amber-600" />
                  )}
                </button>
                {activeBeforeAfter === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-amber-200 p-6"
                  >
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="rounded-lg bg-red-50 p-4">
                        <div className="mb-2 font-bold text-red-700">Before</div>
                        <p className="text-sm text-red-600">{item.before}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-4">
                        <div className="mb-2 font-bold text-green-700">After</div>
                        <p className="text-sm text-green-600">{item.after}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* お客様の声セクション */}
      <Section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              お客様の声
            </h2>
            <p className="mt-4 text-center text-amber-700">
              地域の皆様に支えられて30年。その声をご紹介します。
            </p>
          </motion.div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-lg bg-white p-6 shadow-md"
              >
                <div className="mb-4 flex items-center gap-2 text-amber-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">{testimonial.location}</span>
                </div>
                <p className="text-amber-700">{testimonial.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* 会社概要・沿革セクション */}
      <Section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              会社概要・沿革
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-lg bg-amber-50 p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-amber-900">
                <Home className="h-6 w-6" />
                会社概要
              </h3>
              <dl className="space-y-3">
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">社名</dt>
                  <dd className="text-amber-700">{COMPANY_INFO.name}</dd>
                </div>
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">設立</dt>
                  <dd className="text-amber-700">{COMPANY_INFO.established}</dd>
                </div>
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">代表者</dt>
                  <dd className="text-amber-700">{COMPANY_INFO.representative}</dd>
                </div>
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">住所</dt>
                  <dd className="whitespace-pre-line text-amber-700">
                    {COMPANY_INFO.address}
                  </dd>
                </div>
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">電話</dt>
                  <dd className="text-amber-700">{COMPANY_INFO.phone}</dd>
                </div>
                <div className="flex border-b border-amber-200 pb-2">
                  <dt className="w-24 font-medium text-amber-900">メール</dt>
                  <dd className="text-amber-700">{COMPANY_INFO.email}</dd>
                </div>
              </dl>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-lg bg-amber-50 p-6"
            >
              <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-amber-900">
                <Calendar className="h-6 w-6" />
                沿革
              </h3>
              <div className="space-y-4">
                {COMPANY_INFO.history.map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex h-8 w-20 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-800">
                      {item.year}
                    </div>
                    <p className="text-amber-700">{item.event}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* アクセス・地図セクション */}
      <Section className="bg-amber-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              アクセス
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-lg bg-white p-6 shadow-md"
            >
              <h3 className="mb-4 text-xl font-bold text-amber-900">
                <MapPin className="mr-2 inline-block h-5 w-5" />
                所在地
              </h3>
              <address className="not-italic text-amber-700">
                <p className="whitespace-pre-line">{COMPANY_INFO.address}</p>
                <p className="mt-2">
                  <Phone className="mr-2 inline-block h-4 w-4" />
                  {COMPANY_INFO.phone}
                </p>
                <p className="mt-1">
                  <Mail className="mr-2 inline-block h-4 w-4" />
                  {COMPANY_INFO.email}
                </p>
              </address>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex h-64 items-center justify-center rounded-lg bg-amber-200 shadow-md"
            >
              <p className="text-amber-700">
                <MapPin className="mb-2 inline-block h-12 w-12" />
                <br />
                地図がここに表示されます
              </p>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* お問い合わせフォームセクション */}
      <Section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-center text-3xl font-bold text-amber-900 sm:text-4xl">
              無料見積もり・お問い合わせ
            </h2>
            <p className="mt-4 text-center text-amber-700">
              まずはお気軽にご相談ください。専門スタッフが丁寧にご対応いたします。
            </p>
          </motion.div>
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="mt-12 rounded-lg bg-amber-50 p-6 shadow-md sm:p-8"
          >
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block font-medium text-amber-900">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block font-medium text-amber-900">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block font-medium text-amber-900">
                  電話番号
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="090-1234-5678"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block font-medium text-amber-900">
                  お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-amber-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="ご要望やご質問をお書きください"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "送信中..." : "送信する"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-green-50 p-4 text-center text-green-700"
                >
                  お問い合わせを受け付けました。担当者より折り返しご連絡いたします。
                </motion.div>
              )}
            </div>
          </motion.form>
        </div>
      </Section>

      {/* CTAセクション */}
      <Section className="bg-gradient-to-r from-amber-600 to-orange-500">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              あなたの理想の住まいを一緒に実現しませんか？
            </h2>
            <p className="mt-4 text-amber-50">
              30年の実績と信頼で、地域の皆様の夢の住まいをかたちにします。
              <br />
              まずは無料見積もりからご相談ください。
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-white text-amber-700 hover:bg-amber-50"
              >
                無料見積もりを依頼する
                <Send className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10"
              >
                <Phone className="mr-2 h-4 w-4" />
                03-9876-5432
              </Button>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  );
}
