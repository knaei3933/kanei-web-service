import Hero from "@/components/sections/hero";
import Features from "@/components/sections/features";
import HowItWorks from "@/components/sections/how-it-works";
import Comparison, { CTA } from "@/components/sections/comparison";
import Pricing from "@/components/sections/pricing";
import FAQ from "@/components/sections/faq";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Comparison />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
