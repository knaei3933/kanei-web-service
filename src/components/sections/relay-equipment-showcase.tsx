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
  Globe,
  HeadphonesIcon,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "Relay添付Durable検証株式会社",
  submissionId: "20260808-064916-01296544",
};

// FAQデータ
const FAQ_ITEMS = [
  {
    q: "対応可能な設備の種類はどのようなものがありますか？",
    a: "韓国製の精密加工機、組立ライン、検査装置など、幅広い設備の輸入に対応しています。お客様の要件に合わせて最適な機種をご提案します。",
  },
  {
    q: "導入後のサポート体制はどうなっていますか？",
    a: "導入後の設置調整、操作トレーニング、保守・メンテナンスまで、一貫して日本語でサポートいたします。遠隔監視・オンサイト対応も柔軟に承ります。",
  },
  {
    q: "納期はどのくらいで対応できますか？",
    a: "韓国との輸入実績とネットワークを活かし、通常3〜6ヶ月での納入が可能です。お急ぎの案件については別途ご相談ください。",
  },
  {
    q: "小ロットからの対応はできますか？",
    a: "はい、1台からの単独導入からライン構築まで、規模を問わず対応いたします。",
  },
  {
    q: "保証期間と保守契約について教えてください",
    a: "通常1年間の保証期間付きで、その後の保守契約も柔軟にご提案いたします。現地での対応状況に応じた最適なプランをご用意します。",
  },
];

// 実績数値データ
const STATS = [
  { value: "15年", label: "韓国設備輸入実績" },
  { value: "200件+", label: "導入実績" },
  { value: "100%", label: "日本語対応" },
  { value: "24時間", label: "サポート対応" },
];

// 技術・設備データ
const FEATURES = [
  {
    icon: <Globe className="h-8 w-8" />,
    title: "韓国設備輸入の経験",
    description: "15年以上にわたり、韓国の信頼できるメーカーとのネットワークを構築。高品質な設備を安定輸入します。",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "日本語完全対応",
    description: "仕様書作成から契約、導入後の運用まで、全工程を日本語でサポート。言葉の壁を感じさせません。",
  },
  {
    icon: <HeadphonesIcon className="h-8 w-8" />,
    title: "導入後サポート",
    description: "設置・トレーニング・保守まで一貫して担当。現地エンジニアによる迅速な対応も可能です。",
  },
  {
    icon: <Settings className="h-8 w-8" />,
    title: "カスタマイズ対応",
    description: "お客様の生産ラインに合わせて、設備のカスタマイズ・改修も柔軟に承ります。",
  },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○化粧品株式会社",
    role: "生産技術部",
    content: "韓国製設備の導入に不安がありましたが、日本語での丁寧な説明とサポートでスムーズに導入できました。導入後の保守対応も安心です。",
  },
  {
    company: "△△コスメ製造株式会社",
    role: "工場長",
    content: "コストパフォーマンスと品質のバランスが最適でした。日本語での操作トレーニングも分かりやすく、現場の定着もスムーズです。",
  },
  {
    company: "□□ビューティー株式会社",
    role: "購買部",
    content: "導入から2年経ちますが、トラブル時の対応も迅速で大変助かっています。長期的なパートナーとして信頼しています。",
  },
];

// 料金データ
const PRICING = [
  {
    name: "設備輸入",
    items: ["仕様書作成支援", "メーカー調整", "輸入手続き", "現地検査"],
    price: "要見積もり",
  },
  {
    name: "設置・導入",
    items: ["搬送・設置", "据付調整", "操作トレーニング", "初期セットアップ"],
    price: "要見積もり",
  },
  {
    name: "保守サポート",
    items: ["定期点検", "緊急対応", "部品調達", "リモートサポート"],
    price: "別途契約",
  },
  {
    name: "オプション",
    items: ["カスタマイズ", "増設対応", "データ連携", "自動化改修"],
    price: "要見積もり",
  },
];

// 沿革データ
const HISTORY = [
  { year: "2009", event: "創業（韓国設備輸入事業開始）" },
  { year: "2012", event: "日本国内10件目導入実績" },
  { year: "2015", event: "導入後サポート部門を強化" },
  { year: "2018", event: "化粧品業界特化事業を開始" },
  { year: "2021", event: "導入実績100件達成" },
  { year: "2024", event: "導入実績200件達成" },
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
export default function RelayEquipmentShowcase() {
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
              <Globe className="mr-2 h-4 w-4" />
              韓国設備輸入15年の実績
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              韓国の優れた設備を
              <br />
              日本語で安心サポート
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              15年以上の輸入実績と導入後の充実サポートで、
              <br className="hidden sm:block" />
              お客様の生産ラインを最適化します。
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
              3つの強みで選ばれています
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              韓国設備輸入の経験と日本語対応、導入後サポートの三位一体で、
              <br />
              お客様の安心をお約束します。
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
            {["化粧品製造業界", "精密加工業界", "食品製造業界", "電子部品製造"].map(
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
                  <dt className="w-32 shrink-0 text-slate-500">会社名</dt>
                  <dd className="text-slate-900">Relay添付Durable検証株式会社</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-32 shrink-0 text-slate-500">設立</dt>
                  <dd className="text-slate-900">2009年4月1日</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-32 shrink-0 text-slate-500">資本金</dt>
                  <dd className="text-slate-900">1,500万円</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-32 shrink-0 text-slate-500">代表者</dt>
                  <dd className="text-slate-900">代表取締役 山田 太郎</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-32 shrink-0 text-slate-500">従業員</dt>
                  <dd className="text-slate-900">30名</dd>
                </div>
                <div className="flex border-b border-slate-200 pb-3">
                  <dt className="w-32 shrink-0 text-slate-500">所在地</dt>
                  <dd className="text-slate-900">
                    〒100-0001
                    <br />
                    東京都千代田区丸の内1-2-3
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
              お客様のニーズに合わせた柔軟なサービスプラン
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
              ※ 料金は設備の種類・仕様・数量により変動いたします。
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
                Relay添付Durable検証株式会社
              </h3>
              <dl className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <dt className="font-semibold text-slate-900">住所</dt>
                    <dd className="text-slate-600">
                      〒100-0001
                      <br />
                      東京都千代田区丸の内1-2-3
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
                      info@relay-equipment.example.com
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <dt className="mb-2 font-semibold text-slate-900">
                    最寄り駅からのアクセス
                  </dt>
                  <dd className="text-sm text-slate-600">
                    JR東京駅 丸の内北口より徒歩5分
                    <br />
                    東京メトロ丸の内線 丸の内駅より徒歩3分
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
                Relay添付Durable検証株式会社
              </h3>
              <p className="mb-4 text-slate-400">
                15年以上の韓国設備輸入実績と、
                <br />
                導入後の充実サポートで安心をお届けします。
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Award className="h-4 w-4" />
                <span>ISO9001認証取得済み</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">サービス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>設備輸入</li>
                <li>設置・導入</li>
                <li>保守サポート</li>
                <li>カスタマイズ</li>
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
            <p>&copy; 2024 Relay添付Durable検証株式会社. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
