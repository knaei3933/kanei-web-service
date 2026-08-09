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
  Users,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "テスト製造株式会社",
  submissionId: "20260809-061637-e59e74cc",
};

// FAQデータ
const FAQ_ITEMS = [
  {
    q: "対応可能な加工精度はどの程度ですか？",
    a: "±0.005mmの加工精度で対応可能です。業界トップクラスの精度を実現しております。",
  },
  {
    q: "納期はどのくらいで対応できますか？",
    a: "最短3日での納品が可能です。お急ぎの案件にも柔軟に対応いたします。",
  },
  {
    q: "対応エリアはどこまでですか？",
    a: "全国のB2B製造業様を対象としております。遠方のお客様とも円滑にやり取りが可能です。",
  },
  {
    q: "小ロットから対応できますか？",
    a: "はい、1個からの試作から大量生産まで幅広く対応しております。",
  },
  {
    q: "支払条件はどのようになっていますか？",
    a: "月末締め翌月末払い、または銀行振込にて対応しております。詳細はお問い合わせください。",
  },
];

// 実績数値データ
const STATS = [
  { value: "25年", label: "創業実績" },
  { value: "±0.005mm", label: "加工精度" },
  { value: "500件+", label: "導入実績" },
  { value: "3日", label: "最短納期" },
];

// 技術・設備データ
const FEATURES = [
  {
    icon: <Wrench className="h-8 w-8" />,
    title: "精密機械加工",
    description: "最新のNC旋盤・マシニングセンターで、微細な精度要求にも対応します。",
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "短納期対応",
    description: "最短3日での納品を実現。急な仕様変更にも柔軟に対応いたします。",
  },
  {
    icon: <Award className="h-8 w-8" />,
    title: "ISO9001認証",
    description: "品質管理体制を国際規格で認証。安定した品質をお約束します。",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "経験豊富な技術者",
    description: "熟練の技術者が、お客様の要件に最適な加工方案をご提案します。",
  },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○自動車株式会社",
    role: "購買部",
    content: "±0.005mmの精度要求にも確実に対応していただき、大変助かりました。短納期対応も評価しています。",
  },
  {
    company: "△△産業株式会社",
    role: "製造部",
    content: "ISO9001認証取得済みという点で品質面での安心感があり、継続的にご依頼しています。",
  },
  {
    company: "□□機器株式会社",
    role: "技術開発部",
    content: "試作から量産まで一貫して対応いただき、開発期間を短縮できました。",
  },
];

// 料金データ
const PRICING = [
  {
    name: "旋盤加工",
    items: ["NC旋盤加工", "普通旋盤加工", "複合加工機"],
    price: "要見積もり",
  },
  {
    name: "マシニング加工",
    items: ["フライス加工", "ボーリング加工", "5軸加工"],
    price: "要見積もり",
  },
  {
    name: "研磨加工",
    items: ["平面研磨", "円筒研磨", "鏡面研磨"],
    price: "要見積もり",
  },
  {
    name: "表面処理",
    items: ["熱処理", "めっき処理", "コーティング"],
    price: "別途料金",
  },
];

// 沿革データ
const HISTORY = [
  { year: "1999", event: "創業（資本金1,000万円）" },
  { year: "2005", event: "工場増設、NC旋盤導入" },
  { year: "2010", event: "ISO9001認証取得" },
  { year: "2015", event: "マシニングセンター増強" },
  { year: "2020", event: "3次元測定機導入" },
  { year: "2024", event: "導入実績500件達成" },
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
export default function ManufacturingShowcase() {
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

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  ヒーローセクション                                            */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-200">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              ISO9001認証取得済み
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              ±0.005mmの精度で
              <br />
              日本ものづくりを支える
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              創業25年の実績と最新設備で、
              <br className="hidden sm:block" />
              お客様の精密加工ニーズに確実にお応えします。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600" asChild>
                <a href="#contact">
                  <Send className="mr-2 h-5 w-5" />
                  お問い合わせ
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-slate-900"
                asChild
              >
                <a href="#services">サービスを詳しく見る</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  実績の数値                                                  */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-2 text-3xl font-bold text-blue-600 sm:text-4xl">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  技術・設備の紹介                                             */}
      {/* ============================================================ */}
      <section id="services" className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              技術と設備で差別化を図ります
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              最新の加工機器と熟練の技術者が、
              <br />
              お客様の要件に最適なソリューションをご提供します。
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-blue-600">{feature.icon}</div>
                <h3 className="mb-2 font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  主要取引先・認証                                             */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 text-center"
          >
            <h2 className="text-2xl font-bold text-slate-900">
              お客様の信頼を得ております
            </h2>
          </motion.div>
          <div className="mb-8 flex flex-wrap justify-center gap-8 text-slate-400">
            {["自動車業界", "電機業界", "機械業界", "医療機器"].map(
              (industry) => (
                <div
                  key={industry}
                  className="rounded-lg bg-white px-6 py-3 font-medium text-slate-600 shadow-sm"
                >
                  {industry}
                </div>
              )
            )}
          </div>
          <div className="flex justify-center gap-6">
            {["ISO9001", "ISO14001"].map((cert) => (
              <div
                key={cert}
                className="flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                <Award className="mr-2 h-4 w-4" />
                {cert}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お客様の声・導入事例                                         */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              お客様の声
            </h2>
            <p className="text-slate-600">
              導入いただいたお客様の評価をご紹介します
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="mb-4 text-slate-700">&quot;{testimonial.content}&quot;</p>
                <div>
                  <div className="font-semibold text-slate-900">
                    {testimonial.company}
                  </div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  会社概要・沿革                                               */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              会社概要・沿革
            </h2>
          </motion.div>
          <div className="grid gap-12 md:grid-cols-2">
            {/* 会社概要 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">会社概要</h3>
              <dl className="space-y-3">
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">会社名</dt>
                  <dd className="text-slate-900">テスト製造株式会社</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">設立</dt>
                  <dd className="text-slate-900">1999年4月1日</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">資本金</dt>
                  <dd className="text-slate-900">1,000万円</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">代表者</dt>
                  <dd className="text-slate-900">代表取締役 田中 太郎</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">従業員</dt>
                  <dd className="text-slate-900">50名</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-24 shrink-0 text-slate-500">所在地</dt>
                  <dd className="text-slate-900">
                    〒123-4567
                    <br />
                    埼玉県川口市青木1-2-3
                  </dd>
                </div>
              </dl>
            </div>

            {/* 沿革 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">沿革</h3>
              <div className="space-y-4">
                {HISTORY.map((item, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 w-16 shrink-0 font-bold text-blue-600">
                      {item.year}
                    </div>
                    <div className="text-slate-700">{item.event}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  サービス内容・料金表                                         */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              サービス内容・料金
            </h2>
            <p className="text-slate-600">
              お客様のニーズに合わせた柔軟な料金プラン
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2">
            {PRICING.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-3 text-lg font-bold text-slate-900">
                  {plan.name}
                </h3>
                <ul className="mb-4 space-y-2">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center text-sm text-slate-600">
                      <CheckCircle2 className="mr-2 h-4 w-4 shrink-0 text-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="rounded bg-slate-50 px-4 py-2 text-center font-semibold text-slate-900">
                  {plan.price}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              ※ 料金は加工内容・数量・仕様により変動いたします。
              <br />
              詳細はお問い合わせください。
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  よくある質問                                                 */}
      {/* ============================================================ */}
      <section className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              よくある質問
            </h2>
            <p className="text-slate-600">
              お客様からよくいただくご質問をご紹介します
            </p>
          </motion.div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {FAQ_ITEMS.map((item, index) => (
              <FAQItem key={index} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  アクセス・地図                                               */}
      {/* ============================================================ */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              アクセス
            </h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* 地図（プレースホルダー） */}
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 mb-3" />
                  <p>Google Map 埋め込み予定</p>
                </div>
              </div>
            </div>

            {/* アクセス情報 */}
            <div className="flex flex-col justify-center">
              <h3 className="mb-6 text-xl font-bold text-slate-900">
                テスト製造株式会社
              </h3>
              <dl className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">住所</dt>
                    <dd className="text-slate-600">
                      〒123-4567
                      <br />
                      埼玉県川口市青木1-2-3
                    </dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">電話番号</dt>
                    <dd className="text-slate-600">03-1234-5678</dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">メール</dt>
                    <dd className="text-slate-600">
                      test-manufacturing@example.com
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="mb-2 font-semibold text-slate-900">
                    最寄り駅からのアクセス
                  </dt>
                  <dd className="text-sm text-slate-600">
                    JR京浜東北線 川口駅 徒歩10分
                    <br />
                    首都高速川口線 新郷ICより車で8分
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お問い合わせフォーム                                         */}
      {/* ============================================================ */}
      <section id="contact" className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              お問い合わせ
            </h2>
            <p className="text-slate-600">
              お見積もり・ご相談はお気軽にお問い合わせください
            </p>
          </motion.div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="○○株式会社"
                />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="03-1234-5678"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={formData.inquiry}
                onChange={(e) =>
                  setFormData({ ...formData, inquiry: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ご相談内容をご記入ください"
              />
            </div>
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="mr-2 h-5 w-5" />
                送信する
              </Button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              お電話でのお問い合わせも承っております
            </p>
            <a
              href="tel:03-1234-5678"
              className="mt-2 inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              03-1234-5678
            </a>
            <p className="mt-2 text-xs text-slate-500">
              受付時間: 平日 9:00〜18:00
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  フッター                                                     */}
      {/* ============================================================ */}
      <footer className="bg-slate-900 py-12 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <h3 className="mb-4 text-xl font-bold">
                テスト製造株式会社
              </h3>
              <p className="mb-4 text-slate-400">
                創業25年の実績と±0.005mmの精度で、
                <br />
                お客様の精密加工ニーズに確実にお応えします。
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Award className="h-4 w-4" />
                <span>ISO9001認証取得済み</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">サービス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>精密機械加工</li>
                <li>旋盤加工</li>
                <li>マシニング加工</li>
                <li>研磨加工</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">会社情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>会社概要</li>
                <li>アクセス</li>
                <li>採用情報</li>
                <li>プライバシーポリシー</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 テスト製造株式会社. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
