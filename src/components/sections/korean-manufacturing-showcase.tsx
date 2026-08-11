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
  MessageCircle,
  Settings,
  Factory,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "E2E-StaleBlockerFix-20260811-201404",
  submissionId: "20260811-111405-4909e58d",
};

// 取扱設備カテゴリ（必須掲載）
const EQUIPMENT_CATEGORIES = [
  {
    icon: <Factory className="h-8 w-8" />,
    title: "工作機械",
    description: "NC旋盤・マシニングセンターなど、韓国製の高精度工作機械を取り扱います。",
  },
  {
    icon: <Settings className="h-8 w-8" />,
    title: "自動化設備",
    description: "産業用ロボット・コンベアシステムなど、ライン自動化のソリューションを提供。",
  },
  {
    icon: <Wrench className="h-8 w-8" />,
    title: "組立・検査装置",
    description: "精度要求の高い組立治具や、自動検査装置の導入をサポート。",
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "計測・分析機器",
    description: "3次元測定機や精密測定器など、品質管理に必要な機器を取扱。",
  },
];

// 導入支援範囲（必須掲載 - 強み）
const SUPPORT_RANGE = [
  {
    icon: <MessageCircle className="h-6 w-6" />,
    title: "導入前ヒアリング",
    description: "お客様の要件に合わせて、最適な設備選定から導入計画までサポート。",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "韓国メーカー直結",
    description: "現地メーカーとの直接契約で、中間マージンをカットしコスト削減。",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "日本語一次対応",
    description: "言壁のないコミュニケーションで、スムーズな導入を実現。",
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "据付調整まで伴走",
    description: "納品後の設置・試運転・トレーニングまで、一貫してサポート。",
  },
];

// 実績数値データ
const STATS = [
  { value: "100件+", label: "導入実績" },
  { value: "15社", label: "取扱韓国メーカー" },
  { value: "24時間", label: "現地サポート対応" },
  { value: "全国", label: "対応エリア" },
];

// 主要取引先・認証
const CLIENTS = [
  { name: "○○製造株式会社", type: "製造業" },
  { name: "△△産業株式会社", type: "自動車" },
  { name: "□□機器株式会社", type: "電機" },
  { name: "××エンジニアリング", type: "プラント" },
  { name: "○○システムズ", type: "FA機器" },
  { name: "△△プレシジョン", type: "精密加工" },
];

const CERTIFICATIONS = [
  "ISO 9001",
  "JIS規格適合",
  "CEマーキング",
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○製造株式会社",
    role: "生産技術部",
    content: "韓国メーカーとの言語の壁を心配していましたが、日本語での一次対応が完璧で、安心して導入できました。据付調整まで手厚いサポートに感謝しています。",
  },
  {
    company: "△△産業株式会社",
    role: "購買部",
    content: "コストパフォーマンスと品質のバランスが素晴らしい。導入前のヒアリングで詳細な要件確認を行っていただき、最適な機種選定ができました。",
  },
  {
    company: "□□機器株式会社",
    role: "工場長",
    content: "急な納期希望にも柔軟に対応いただき、生産ラインの増設を予定通り完了できました。韓国メーカー直結ならではのメリットを実感しています。",
  },
];

// お問い合わせフォーム
const CONTACT_INFO = {
  phone: "090-1111-2222",
  email: "e2e-stale-20260811-201404@example.invalid",
  address: "〒100-0001 東京都千代田区○○1-2-3",
  hours: "平日 9:00〜18:00",
};

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
export default function KoreanManufacturingShowcase() {
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
      {/*  ヘッダー / ナビゲーション                                    */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴプレースホルダー */}
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold">
                K
              </div>
              <span className="ml-2 font-semibold text-slate-900">
                KOREAN EQUIPMENT
              </span>
            </div>

            {/* デスクトップナビ */}
            <div className="hidden items-center gap-8 md:flex">
              <a href="#equipment" className="text-sm text-slate-600 hover:text-blue-600">
                設備カテゴリ
              </a>
              <a href="#support" className="text-sm text-slate-600 hover:text-blue-600">
                導入支援
              </a>
              <a href="#cases" className="text-sm text-slate-600 hover:text-blue-600">
                導入事例
              </a>
              <a href="#faq" className="text-sm text-slate-600 hover:text-blue-600">
                よくある質問
              </a>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                <a href="#contact">お問い合わせ</a>
              </Button>
            </div>

            {/* モバイルメニューボタン */}
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

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
              韓国メーカー直結
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              韓国製設備の導入を
              <br />
              日本語でサポートします
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              韓国メーカー直結・日本語一次対応で、
              <br className="hidden sm:block" />
              導入前ヒアリングから据付調整まで伴走します。
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
                <a href="#equipment">設備カテゴリを見る</a>
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
      {/*  取扱設備カテゴリ（必須掲載）                                */}
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
              取扱設備カテゴリ
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              韓国の高品質な製造設備を、お客様のニーズに合わせてご提案します。
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {EQUIPMENT_CATEGORIES.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-blue-600">{category.icon}</div>
                <h3 className="mb-2 font-semibold text-slate-900">
                  {category.title}
                </h3>
                <p className="text-sm text-slate-600">{category.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  導入支援範囲（必須掲載 - 強み）                              */}
      {/* ============================================================ */}
      <section id="support" className="border-b bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              導入支援範囲
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              韓国メーカー直結と日本語一次対応で、スムーズな導入を実現します。
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            {SUPPORT_RANGE.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mr-4 shrink-0 text-blue-600">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  主要取引先・認証                                             */}
      {/* ============================================================ */}
      <section className="border-b py-16">
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
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            {CLIENTS.map((client, index) => (
              <div
                key={index}
                className="rounded-lg bg-slate-50 px-6 py-3 text-sm font-medium text-slate-700"
              >
                {client.name}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4">
            {CERTIFICATIONS.map((cert) => (
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
      <section id="cases" className="border-b py-20">
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
      {/*  よくある質問                                                 */}
      {/* ============================================================ */}
      <section id="faq" className="border-b bg-slate-50 py-20">
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
            <FAQItem
              q="どのような韓国メーカーの設備を取り扱っていますか？"
              a="工作機械、自動化設備、組立・検査装置、計測・分析機器など、15社以上の韓国メーカーと提携し、幅広いカテゴリの設備をご提供しています。"
            />
            <FAQItem
              q="導入までどのくらいの期間がかかりますか？"
              a="要件によって異なりますが、通常はヒアリングから納品まで2〜3ヶ月程度です。急ぎの案件にも柔軟に対応いたします。"
            />
            <FAQItem
              q="アフターサポートはどうなっていますか？"
              a="納品後の据付・試運転・トレーニングまでサポートします。故障時の対応も含め、現地メーカーとの連携で迅速に対応いたします。"
            />
            <FAQItem
              q="海外メーカーですが、日本語での対応は可能ですか？"
              a="はい、日本語での一次対応が可能です。仕様確認や契約手続きなど、すべて日本語で進めることができます。"
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お問い合わせフォーム（必須掲載 - 問い合わせ導線）         */}
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
              href={`tel:${CONTACT_INFO.phone}`}
              className="mt-2 inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              {CONTACT_INFO.phone}
            </a>
            <p className="mt-2 text-xs text-slate-500">
              受付時間: {CONTACT_INFO.hours}
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
                {META.enterpriseName}
              </h3>
              <p className="mb-4 text-slate-400">
                韓国メーカー直結・日本語一次対応で、
                <br />
                韓国製設備の導入をサポートします。
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="h-4 w-4" />
                <span>15社以上の韓国メーカーと提携</span>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">サービス</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>工作機械</li>
                <li>自動化設備</li>
                <li>組立・検査装置</li>
                <li>計測・分析機器</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">会社情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>会社概要</li>
                <li>アクセス</li>
                <li>プライバシーポリシー</li>
                <li>お問い合わせ</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 {META.enterpriseName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
