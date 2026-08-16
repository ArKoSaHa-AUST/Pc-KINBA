import Hero from '../components/Hero';
import TrustedBrands from '../components/TrustedBrands';
import Features from '../components/Features';
import InteractiveAI from '../components/InteractiveAI';
import PCBuilderShowcase from '../components/PCBuilderShowcase';
import Comparison from '../components/Comparison';
import Statistics from '../components/Statistics';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';

export default function Home() {
  return (
    <>
      <Hero />
      <TrustedBrands />
      <Features />
      <InteractiveAI />
      <PCBuilderShowcase />
      <Comparison />
      <Statistics />
      <Testimonials />
      <CTA />
    </>
  );
}
