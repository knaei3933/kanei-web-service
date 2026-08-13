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
  Factory,
  Calendar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "豊田製作所",
  submissionId: "20260808-123400-3c9a9f70",
};

// FAQデータ
const FAQ_ITEMS = [
  {
    q: "対応可能な加工精度はどの程度ですか？",
    a: "±0.005mmの加工精度で対応可能です。創業50年の技術蓄積で、業界最高水準の精度を実現しております。",
  },
  {
    q: "納期はどのくらいで対応できますか？",
    a: "最短3日での試作品納品が可能です。量産品もスケジュールに合わせて柔軟に対応いたします。",
  },
  {
    q: "工場見学ツアーの予約はどうすればいいですか？",
    a: "お問い合わせフォームから「工場見学希望」と明記してご連絡ください。担当者より日程調整のご連絡を差し上げます。",
  },
  {
    q: "小ロットから対応できますか？",
    a: "はい、1個からの試作から大量生産まで幅広く対応しております。多品種少量生産にも柔軟です。",
  },
  {
    q: "CADデータの提供は可能ですか？",
    a: "はい、CADデータ（DXF、IGES、STEP形式等）の提供が可能です。将来的にはWebからのダウンロード機能も検討しております。",
  },
];

// 実績数値データ - 創業50年に合わせて調整
const STATS = [
  { value: "50年", label: "創業実績" },
  { value: "±0.005mm", label: "加工精度" },
  { value: "1000社+", label: "取引実績" },
  { value: "3日", label: "最短納期" },
];

// 技術・設備データ
const FEATURES = [
  {
    icon: <Wrench className="h-8 w-8" />,
    title: "精密金属加工技術",
    description: "創業50年の技術蓄積と最新設備で、微細な精度要求にも対応します。",
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "短納期・スピード対応",
    description: "最短3日での試作品納品。急な仕様変更にも柔軟に対応いたします。",
  },
  {
    icon: <Award className="h-8 w-8" />,
    title: "ISO9001認証取得",
    description: "品質管理体制を国際規格で認証。安定した品質をお約束します。",
  },
  {
    icon: <Factory className="h-8 w-8" />,
    title: "多品種少量生産",
    description: "試作から量産まで一貫対応。お客様のニーズに合わせた柔軟な生産体制です。",
  },
];

// 主要製品データ
const PRODUCTS = [
  {
    category: "自動車部品",
    items: ["エンジン部品", "トランスミッション部品", "シャシー部品", "足回り部品"],
  },
  {
    category: "産業機械部品",
    items: ["精密ギア", "ベアリングケース", "油圧機器部品", "空圧機器部品"],
  },
  {
    category: "電機・電子部品",
    items: ["放熱器", "シャーシ", "筐体パネル", "コネクタハウジング"],
  },
  {
    category: "建機・建設部品",
    items: ["油圧シリンダー", "バケットリンク", "クローラー部品", "振動篩部品"],
  },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "大手自動車OEM様",
    role: "購買部",
    content: "ISO9001の品質管理体制に加え、50年の実績による技術力に信頼を寄せています。短納期対応も評価しています。",
  },
  {
    company: "精密機器メーカー様",
    role: "技術開発部",
    content: "±0.005mmの精度要求にも確実に対応。試作から量産まで一貫して依頼でき、開発期間を短縮できました。",
  },
  {
    company: "海外商事会社様",
    role: "采购部门",
    content: "日本のものづくり品質に高い評価。輸出実績も豊富で、グローバルなサプライチェーンに最適です。",
  },
];

// 認証・取引先ログ（テキスト表現）
const CERTIFICATIONS = [
  { name: "ISO9001", description: "品質マネジメントシステム" },
  { name: "ISO14001", description: "環境マネジメントシステム" },
  { name: "IATF16949", description: "自動車業界品質マネジメント" },
];

const INDUSTRIES = [
  "自動車業界",
  "産業機械",
  "電機・電子",
  "建設機械",
  "医療機器",
  "航空宇宙",
];

// 沿革データ - 創業50年に調整
const HISTORY = [
  { year: "1976", event: "創業（創業50周年の基準年）" },
  { year: "1985", event: "工場増設、NC旋盤導入" },
  { year: "1995", event: "ISO9001認証取得" },
  { year: "2005", event: "マシニングセンター増強" },
  { year: "2015", event: "3次元測定機導入" },
  { year: "2025", event: "創業50周年を迎え、リニューアル" },
];

// FAQアコデ��オンコンポーネント
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
export default function ToyodaManufacturingShowcase() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    inquiryType: "",
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
      {/*  ヒーローセクション - 技術と信頼のアピール                      */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-200">
                <Award className="mr-2 h-4 w-4" />
                ISO9001認証取得済み
              </div>
              <div className="inline-flex items-center rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-medium text-amber-200">
                <Calendar className="mr-2 h-4 w-4" />
                創業50周年
              </div>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              創業50年の精密金属加工技術で
              <br />
              日本ものづくりを支える
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              豊田製作所は、自動車部品を必要とする国内外の製造メーカーおよび商事会社向けに、
              <br className="hidden sm:block" />
              精密金属加工部品の提案と供給を行っています。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" asChild>
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
                <a href="#factory-tour">
                  <Calendar className="mr-2 h-5 w-5" />
                  工場見学予約
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  実績の数値 - 数字で説得力を                                      */}
      {/* ============================================================ */}
      <section className="border-b bg-gradient-to-b from-slate-50 to-white py-16">
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
      {/*  主要製品一覧                                                   */}
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
              主要製品一覧
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              多岐にわたる業界向けに、高精度の金属加工部品を提供しております
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            {PRODUCTS.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  {category.category}
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {category.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center text-sm text-slate-600"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 shrink-0 text-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  技術・設備の紹介                                               */}
      {/* ============================================================ */}
      <section id="equipment" className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              加工設備・技術の紹介
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              最新の加工機器と創業50年の技術蓄積で、
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
      {/*  品質管理体制（ISO認証）                                        */}
      {/* ============================================================ */}
      <section className="border-b bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              品質管理体制
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              国際規格に基づく品質マネジメントシステムで、
              <br />
              安定した品質をお約束します。
            </p>
          </motion.div>
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            {CERTIFICATIONS.map((cert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <Shield className="mx-auto mb-4 h-12 w-12 text-blue-600" />
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {cert.name}
                </h3>
                <p className="text-sm text-slate-600">{cert.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h3 className="mb-6 text-xl font-bold text-slate-900">
              品質保証体制
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 font-semibold text-slate-900">
                  入荷検査
                </h4>
                <p className="text-sm text-slate-600">
                  全ての原材料について、受入時に材質・寸法・外観検査を実施し、不適合品は排除いたします。
                </p>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-slate-900">
                  工程内検査
                </h4>
                <p className="text-sm text-slate-600">
                  各工程ごとに検査基準を設け、確認検査を実施。不具合の早期発見・是正を行います。
                </p>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-slate-900">
                  最終検査
                </h4>
                <p className="text-sm text-slate-600">
                  製品完成時に全数検査またはロット検査を実施し、お客様に品質を保証します。
                </p>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-slate-900">
                  3次元測定
                </h4>
                <p className="text-sm text-slate-600">
                  高精度3次元測定機による寸法測定で、μmオーダーの精度管理を実現しています。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  主要取引先・認証                                               */}
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
          <div className="mb-8 flex flex-wrap justify-center gap-4 text-slate-400">
            {INDUSTRIES.map((industry) => (
              <div
                key={industry}
                className="rounded-lg bg-white px-6 py-3 font-medium text-slate-700 shadow-sm"
              >
                {industry}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              <Award className="mr-2 h-4 w-4" />
              ISO9001認証取得
            </div>
            <div className="flex items-center rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white">
              <Shield className="mr-2 h-4 w-4" />
              ISO14001認証取得
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お客様の声・導入事例                                           */}
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
              お客様の声・導入事例
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
              会社概要
            </h2>
          </motion.div>
          <div className="grid gap-12 md:grid-cols-2">
            {/* 会社概要 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">会社情報</h3>
              <dl className="space-y-3">
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">会社名</dt>
                  <dd className="text-slate-900">豊田製作所</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">設立</dt>
                  <dd className="text-slate-900">1976年4月1日</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">資本金</dt>
                  <dd className="text-slate-900">5,000万円</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">代表者</dt>
                  <dd className="text-slate-900">代表取締役 豊田 太郎</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">従業員</dt>
                  <dd className="text-slate-900">120名</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">所在地</dt>
                  <dd className="text-slate-900">
                    〒123-4567
                    <br />
                    愛知県豊田市丰田町1-2-3
                  </dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">電話</dt>
                  <dd className="text-slate-900">052-123-4567</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-28 shrink-0 text-slate-500">FAX</dt>
                  <dd className="text-slate-900">052-123-4568</dd>
                </div>
              </dl>
            </div>

            {/* 沿革 */}
            <div>
              <h3 className="mb-6 text-xl font-bold text-slate-900">沿革</h3>
              <div className="space-y-4">
                {HISTORY.map((item, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 w-20 shrink-0 font-bold text-blue-600">
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
      {/*  工場見学ツアー予約                                           */}
      {/* ============================================================ */}
      <section id="factory-tour" className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              工場見学ツアー
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              創業50周年を記念して、工場見学ツアーを実施しております。
              <br />
              実際の製造現場と精密加工技術をぜひご覧ください。
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-8">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                見学内容
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-slate-700">
                    会社概要・品質管理体制の説明
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-slate-700">
                    NC旋盤・マシニングセンターによる実機加工見学
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-slate-700">
                    3次元測定機による品質検査工程の見学
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-slate-700">
                    製品展示コーナーでの事例紹介
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-slate-700">
                    質疑応答・個別相談
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-slate-50 p-8">
              <h3 className="mb-4 text-xl font-bold text-slate-900">
                ご予約方法
              </h3>
              <p className="mb-6 text-slate-700">
                お問い合わせフォームから「工場見学希望」と明記してご連絡ください。
                担当者より日程調整のご連絡を差し上げます。
              </p>
              <div className="rounded-lg bg-white p-6">
                <h4 className="mb-4 font-semibold text-slate-900">
                  見学可能日時
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>平日：月〜金 10:00〜15:00</li>
                  <li>所要時間：約1時間〜1時間半</li>
                  <li>定員：1回5名様まで</li>
                  <li>費用：無料</li>
                </ul>
              </div>
            </div>
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
      {/*  お問い合わせフォーム                                         */}
      {/* ============================================================ */}
      <section id="contact" className="border-b bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              お問い合わせ・資料請求
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
                お問い合わせ種別
              </label>
              <select
                value={formData.inquiryType}
                onChange={(e) =>
                  setFormData({ ...formData, inquiryType: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                <option value="quote">お見積もり依頼</option>
                <option value="consultation">技術相談</option>
                <option value="factory-tour">工場見学予約</option>
                <option value="catalog">資料請求</option>
                <option value="other">その他</option>
              </select>
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
              href="tel:052-123-4567"
              className="mt-2 inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              052-123-4567
            </a>
            <p className="mt-2 text-xs text-slate-500">
              受付時間: 平日 9:00〜18:00
            </p>
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
                豊田製作所
              </h3>
              <dl className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">住所</dt>
                    <dd className="text-slate-600">
                      〒123-4567
                      <br />
                      愛知県豊田市丰田町1-2-3
                    </dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">電話番号</dt>
                    <dd className="text-slate-600">052-123-4567</dd>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">メール</dt>
                    <dd className="text-slate-600">
                      toyota.taro@example.com
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="mb-2 font-semibold text-slate-900">
                    最寄り駅からのアクセス
                  </dt>
                  <dd className="text-sm text-slate-600">
                    名鉄豊田線 豊田市駅より車で約15分
                    <br />
                    東名高速道路 豊田ICより車で約10分
                  </dd>
                </div>
              </dl>
            </div>
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
                豊田製作所
              </h3>
              <p className="mb-4 text-slate-400">
                創業50年の精密金属加工技術とISO9001認証で、
                <br />
                お客様の精密加工ニーズに確実にお応えします。
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Award className="h-4 w-4" />
                <span>ISO9001認証取得済み</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">製品・サービス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>自動車部品</li>
                <li>産業機械部品</li>
                <li>電機・電子部品</li>
                <li>建機・建設部品</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">会社情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>会社概要</li>
                <li>アクセス</li>
                <li>工場見学予約</li>
                <li>プライバシーポリシー</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2025 豊田製作所. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
