"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  Award,
  Users,
  TrendingUp,
  Wrench,
  Globe,
  Factory,
  Shield,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "再検証テスト会社",
  submissionId: "20260811-165104-0134f1d5",
};

// 実績数値データ
const STATS = [
  { value: "15年", label: "創業実績", icon: <Award className="h-6 w-6" /> },
  { value: "300件+", label: "導入実績", icon: <Users className="h-6 w-6" /> },
  { value: "7日", label: "最短納期", icon: <Clock className="h-6 w-6" /> },
  { value: "12社", label: "韓国提携工場", icon: <Globe className="h-6 w-6" /> },
];

// 技術・設備データ
const FEATURES = [
  {
    icon: <Globe className="h-8 w-8" />,
    title: "韓国製造ネットワーク",
    description: "12社の韓国提携工場と連携し、高品質な製品を安定的に供給します。現地スタッフによる品質管理も徹底。",
  },
  {
    icon: <Clock className="h-8 w-8" />,
    title: "短納期対応",
    description: "最短7日での納品を実現。急な発注や仕様変更にも柔軟に対応し、お客様の生産計画を支えます。",
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "品質管理体制",
    description: "厳格な品質チェック体制により、安定した製品品質をお約束。検査報告書の発行も可能です。",
  },
  {
    icon: <Factory className="h-8 w-8" />,
    title: "多品種対応",
    description: "試作から量産まで、1個から大量注文まで幅広く対応。お客様のニーズに合わせた柔軟な生産体制。",
  },
];

// 取扱品目データ
const PRODUCTS = [
  {
    category: "精密機械部品",
    items: ["NC旋盤加工品", "マシニング加工品", "プレス成型品"],
  },
  {
    category: "金型・治具",
    items: ["射出成型金型", "プレス金型", "検査治具"],
  },
  {
    category: "組立製品",
    items: ["機械装置組立", "電子部品組立", "製品検査"],
  },
  {
    category: "表面処理",
    items: ["めっき処理", "熱処理", "コーティング"],
  },
];

// 主要取引先・認証
const PARTNERS = [
  { name: "株式会社A", type: "自動車関連" },
  { name: "株式会社B", type: "電機機器" },
  { name: "株式会社C", type: "精密機器" },
  { name: "株式会社D", type: "医療機器" },
  { name: "株式会社E", type: "半導体装置" },
  { name: "株式会社F", type: "産業機械" },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○自動車株式会社",
    role: "購買担当部長",
    content: "短納期対応が本当に助かります。急な発注にも柔軟に対応していただき、生産ラインを止めることなく運用できています。",
  },
  {
    company: "△△電機株式会社",
    role: "品質保証部",
    content: "韓国製造ネットワークの強みを活かし、コストパフォーマンスに優れた製品をご提供いただいています。品質も安定しており満足です。",
  },
  {
    company: "□□産業株式会社",
    role: "製造部長",
    content: "試作から量産まで一貫して対応いただき、開発期間を短縮できました。コミュニケーションも円滑で安心して任せられます。",
  },
];

// 会社沿革データ
const HISTORY = [
  { year: "2010", event: "創業（韓国製造業との提携開始）" },
  { year: "2013", event: "東京支社開設、関東圏への営業強化" },
  { year: "2016", event: "品質管理システム導入" },
  { year: "2019", event: "韓国提携工場12社体制へ拡大" },
  { year: "2022", event: "導入実績300件達成" },
  { year: "2025", event: "Web受注システム構築" },
];

// 会社概要
const COMPANY_INFO = [
  { label: "会社名", value: "再検証テスト会社" },
  { label: "設立", value: "2010年4月" },
  { label: "資本金", value: "1,000万円" },
  { label: "代表者", value: "山田 太郎" },
  { label: "従業員数", value: "50名" },
  { label: "所在地", value: "東京都港区〇〇1-2-3" },
  { label: "電話番号", value: "03-3333-4444" },
  { label: "メール", value: "info@example.com" },
];

// FAQアコーディオンコンポーネント
function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left font-medium text-slate-900 transition-colors hover:text-blue-600"
      >
        <span>{q}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="pb-4 text-slate-600"
        >
          {a}
        </motion.div>
      )}
    </div>
  );
}

// メインコンポーネント
export default function ReverificationManufacturingShowcase() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    inquiry: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 実際の送信処理は省略（デモ用）
    alert("お問い合わせを受け付けました。担当者より折り返しご連絡いたします。");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  ヒーローセクション                                            */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-200">
              <Globe className="mr-2 h-4 w-4" />
              韓国製造ネットワーク × 短納期対応
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              関東圏の製造業を支える
              <br />
              信頼のパートナー
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
              12社の韓国提携工場との強固なネットワークで、
              <br className="hidden sm:block" />
              高品質な製品を最短7日で納品します。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Send className="mr-2 h-5 w-5" />
                お問い合わせ
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
              >
                取扱品目を見る
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  実績の数値セクション                                         */}
      {/* ============================================================ */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
              数字で証明する実績
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-lg bg-white p-6 text-center shadow-sm"
                >
                  <div className="mb-3 inline-flex items-center justify-center rounded-full bg-blue-100 p-3 text-blue-600">
                    {stat.icon}
                  </div>
                  <div className="mb-2 text-3xl font-bold text-blue-600">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  強みセクション                                              */}
      {/* ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-center text-3xl font-bold text-slate-900">
              選ばれる理由
            </h2>
            <p className="mb-12 text-center text-slate-600">
              お客様から信頼される4つの強み
            </p>
            <div className="grid gap-8 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-lg border border-slate-200 p-8 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 inline-flex items-center justify-center rounded-full bg-blue-100 p-3 text-blue-600">
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  取扱品目セクション                                         */}
      {/* ============================================================ */}
      <section id="products" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-center text-3xl font-bold text-slate-900">
              取扱品目
            </h2>
            <p className="mb-12 text-center text-slate-600">
              試作から量産まで幅広く対応します
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {PRODUCTS.map((product, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-lg bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-4 flex items-center text-lg font-bold text-slate-900">
                    <Wrench className="mr-2 h-5 w-5 text-blue-600" />
                    {product.category}
                  </h3>
                  <ul className="space-y-2">
                    {product.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center text-slate-600">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  主要取引先・認証セクション                                  */}
      {/* ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-center text-3xl font-bold text-slate-900">
              お客様・実績
            </h2>
            <p className="mb-12 text-center text-slate-600">
              多くの企業様にご利用いただいています
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PARTNERS.map((partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-lg border border-slate-200 p-6 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="mb-2 font-bold text-slate-900">{partner.name}</div>
                  <div className="text-sm text-slate-600">{partner.type}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お客様の声セクション                                       */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-center text-3xl font-bold text-slate-900">
              お客様の声
            </h2>
            <p className="mb-12 text-center text-slate-600">
              実際にご利用いただいたお客様からの評価
            </p>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-lg bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-start">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                      {testimonial.company[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {testimonial.company}
                      </div>
                      <div className="text-sm text-slate-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600">{testimonial.content}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  会社紹介セクション                                         */}
      {/* ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
              会社紹介
            </h2>

            {/* 会社概要 */}
            <div className="mb-12 rounded-lg bg-slate-50 p-8">
              <h3 className="mb-6 text-xl font-bold text-slate-900">会社概要</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                {COMPANY_INFO.map((info, index) => (
                  <div key={index}>
                    <dt className="text-sm font-medium text-slate-600">
                      {info.label}
                    </dt>
                    <dd className="mt-1 text-slate-900">{info.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 沿革 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">沿革</h3>
              <div className="space-y-4">
                {HISTORY.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex items-start"
                  >
                    <div className="mr-4 flex shrink-0 flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      {index < HISTORY.length - 1 && (
                        <div className="my-1 w-0.5 flex-1 bg-blue-200" />
                      )}
                    </div>
                    <div className="flex-1 rounded-lg bg-slate-50 p-4">
                      <div className="mb-1 font-bold text-blue-600">
                        {item.year}
                      </div>
                      <div className="text-slate-900">{item.event}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お問い合わせセクション                                     */}
      {/* ============================================================ */}
      <section id="contact" className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-center text-3xl font-bold text-white">
              お問い合わせ
            </h2>
            <p className="mb-12 text-center text-slate-300">
              製造・加工に関するご相談をお気軽にお寄せください
            </p>
            <div className="grid gap-12 lg:grid-cols-2">
              {/* 問い合わせフォーム */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    お名前 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    会社名
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="株式会社〇〇"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    メールアドレス <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="info@example.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="03-0000-0000"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    お問い合わせ内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="inquiry"
                    required
                    rows={5}
                    value={formData.inquiry}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="ご相談内容をご記入ください"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="mr-2 h-5 w-5" />
                  送信する
                </Button>
              </form>

              {/* 連絡先情報 */}
              <div className="space-y-8">
                <div>
                  <h3 className="mb-6 text-xl font-bold text-white">連絡先</h3>
                  <dl className="space-y-4">
                    <div className="flex items-start">
                      <dt className="mr-4 flex shrink-0 items-center justify-center">
                        <Phone className="h-6 w-6 text-blue-400" />
                      </dt>
                      <dd>
                        <div className="mb-1 text-sm text-slate-400">電話番号</div>
                        <div className="text-white">03-3333-4444</div>
                      </dd>
                    </div>
                    <div className="flex items-start">
                      <dt className="mr-4 flex shrink-0 items-center justify-center">
                        <Mail className="h-6 w-6 text-blue-400" />
                      </dt>
                      <dd>
                        <div className="mb-1 text-sm text-slate-400">メール</div>
                        <div className="text-white">info@example.com</div>
                      </dd>
                    </div>
                    <div className="flex items-start">
                      <dt className="mr-4 flex shrink-0 items-center justify-center">
                        <MapPin className="h-6 w-6 text-blue-400" />
                      </dt>
                      <dd>
                        <div className="mb-1 text-sm text-slate-400">所在地</div>
                        <div className="text-white">
                          〒105-0001
                          <br />
                          東京都港区〇〇1-2-3
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg bg-slate-800 p-6">
                  <h4 className="mb-3 font-bold text-white">
                    営業時間について
                  </h4>
                  <dl className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <dt>平日：</dt>
                      <dd>9:00 - 18:00</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>土日祝：</dt>
                      <dd>休業</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                     */}
      {/* ============================================================ */}
      <footer className="bg-slate-950 py-8 text-center text-slate-400">
        <p className="text-sm">
          © {new Date().getFullYear()} 再検証テスト会社 All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
