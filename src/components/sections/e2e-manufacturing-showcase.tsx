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
  Globe,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// メタデータ - デモページ用
const META = {
  enterpriseName: "E2E運用検証テスト-20260811-194502",
  submissionId: "20260811-104502-ba37cc62",
};

// 実績数値データ
const STATS = [
  { value: "15年+", label: "日韓貿易実績" },
  { value: "200社+", label: "導入実績" },
  { value: "3国", label: "対応国数" },
  { value: "24h", label: "最短回答" },
];

// 取扱設備カテゴリ（必須掲載）
const EQUIPMENT_CATEGORIES = [
  {
    icon: <Factory className="h-6 w-6" />,
    title: "食品加工設備",
    items: ["混合機", "充填機", "包装機", "殺菌装置"],
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: "化粧品製造設備",
    items: ["乳化機", "撹拌機", "充填機", "ラベリング機"],
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "検査・計測機器",
    items: ["金属検出機", "X線検査機", "重量検査機", "異物選別機"],
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "自動化システム",
    items: ["搬送ライン", "制御システム", "データ管理", "遠隔監視"],
  },
];

// 導入支援範囲（必須掲載）
const SUPPORT_RANGE = [
  {
    title: "導入前ヒアリング",
    description: "お客様の現場と要件をじっくりお伺いし、最適な設備をご提案します。",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    title: "韓国メーカー直結調達",
    description: "中間マージンをカットし、コストパフォーマンスの高い調達を実現します。",
    icon: <Globe className="h-6 w-6" />,
  },
  {
    title: "日本語一次窓口",
    description: "言語の壁を気にせず、日本語でスムーズなコミュニケーションが可能です。",
    icon: <Users className="h-6 w-6" />,
  },
  {
    title: "導入後サポート",
    description: "設置から試運転、保守まで一貫してサポートいたします。",
    icon: <Award className="h-6 w-6" />,
  },
];

// お客様の声データ
const TESTIMONIALS = [
  {
    company: "○○食品株式会社",
    role: "製造部長",
    content: "導入前のヒアリングがとても丁寧で、現場の課題を的確に把握してくださいました。おかげで最適な設備を選定できました。",
  },
  {
    company: "△△化粧品工業株式会社",
    role: "技術開発部",
    content: "韓国メーカーとの直結調達で、大幅なコストダウンを実現。日本語でのやり取りもスムーズで安心でした。",
  },
  {
    company: "□□食品加工株式会社",
    role: "工場長",
    content: "導入後のサポートも手厚く、トラブル時も迅速に対応していただきました。長期的なパートナーとして信頼しています。",
  },
];

// 主要取引先・業界
const INDUSTRIES = [
  "食品製造業",
  "化粧品製造業",
  "医薬品製造業",
  "化学品製造業",
];

// FAQデータ
const FAQ_ITEMS = [
  {
    q: "どのような設備を取り扱っていますか？",
    a: "食品・化粧品・医薬品製造設備を中心に、混合・充填・包装・検査・自動化ラインなど幅広く取り扱っています。",
  },
  {
    q: "導入までの期間はどのくらいですか？",
    a: "ヒアリングから設置・試運転まで、通常2〜3ヶ月です。お急ぎのご相談にも柔軟に対応いたします。",
  },
  {
    q: "アフターサービスはありますか？",
    a: "はい、設置後の保守・部品交換・トラブル対応まで一貫してサポートいたします。",
  },
  {
    q: "小ロットの試作機も扱っていますか？",
    a: "はい、試作機から大量生産ラインまで、お客様の規模に合わせた提案が可能です。",
  },
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
export default function E2EManufacturingShowcase() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    inquiry: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("お問い合わせを受け付けました。担当者より折り返しご連絡いたします。");
  };

  return (
    <div className="bg-white">
      {/* ============================================================ */}
      {/*  ヒーローセクション（技術と信頼のアピール）                      */}
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
              韓国メーカー直結調達
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              食品・化粧品メーカーの
              <br />
              設備導入を日本語でサポート
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
              韓国メーカーとの直結調達・導入前ヒアリング対応・
              <br className="hidden sm:block" />
              日本語での一次窓口で、安心して導入をご検討いただけます。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600" asChild>
                <a href="#contact">
                  <Send className="mr-2 h-5 w-5" />
                  無料相談する
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-slate-900"
                asChild
              >
                <a href="#equipment">取扱設備を見る</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  実績の数値（数字で説得力を）                                  */}
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
              数字で証明する実績
            </h2>
          </motion.div>
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
      {/*  取扱設備カテゴリ（必須掲載）                                 */}
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
              食品・化粧品製造現場に最適化した設備を幅広く取り扱っています
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
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
                <h3 className="mb-3 font-semibold text-slate-900">
                  {category.title}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-center text-sm text-slate-600">
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
      {/*  導入支援範囲（必須掲載）                                     */}
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
              導入支援範囲
            </h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              ヒアリングから導入後まで、一貫してサポートいたします
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-2">
            {SUPPORT_RANGE.map((support, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="shrink-0 text-blue-600">{support.icon}</div>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">
                    {support.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {support.description}
                  </p>
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
            {INDUSTRIES.map((industry) => (
              <div
                key={industry}
                className="rounded-lg bg-slate-50 px-6 py-3 font-medium text-slate-700"
              >
                {industry}
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <div className="flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
              <Award className="mr-2 h-4 w-4" />
              15年以上の実績
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  お客様の声・導入事例                                         */}
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
      <section className="border-b py-20">
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
      {/*  お問い合わせ・資料請求（必須掲載：問い合わせ導線）              */}
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
              設備導入のご相談・資料請求はお気軽にお問い合わせください
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
              href="tel:090-0000-0000"
              className="mt-2 inline-flex items-center text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              <Phone className="mr-2 h-5 w-5" />
              090-0000-0000
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
                E2E運用検証テスト-20260811-194502
              </h3>
              <p className="mb-4 text-slate-400">
                韓国メーカーとの直結調達・導入前ヒアリング対応・
                <br />
                日本語での一次窓口で、安心して設備導入をご検討いただけます。
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">取扱設備</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>食品加工設備</li>
                <li>化粧品製造設備</li>
                <li>検査・計測機器</li>
                <li>自動化システム</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">会社情報</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>会社概要</li>
                <li>アクセス</li>
                <li>プライバシーポリシー</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 E2E運用検証テスト-20260811-194502. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
