import Hero from "@/components/sections/hero";
import Showcase from "@/components/sections/showcase";
import Features from "@/components/sections/features";
import HowItWorks from "@/components/sections/how-it-works";
import Comparison, { CTA } from "@/components/sections/comparison";
import Pricing from "@/components/sections/pricing";
import NewsBoard from "@/components/sections/news-board";
import FAQ from "@/components/sections/faq";
import FloatingCTA from "@/components/sections/floating-cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Showcase />
      <Comparison />
      <Pricing />
      <FAQ />
      <NewsBoard />
      <CTA />
      <FloatingCTA />
    </>
  );
}
