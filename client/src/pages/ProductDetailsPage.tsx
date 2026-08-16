import { useEffect } from 'react';
import ProductHero from '../components/product/ProductHero';
import ProductReviews from '../components/product/ProductReviews';
import AlternativePartsSection from '../components/product/AlternativeParts/AlternativePartsSection';

export default function ProductDetailsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#050816] text-white min-h-screen relative overflow-hidden pb-32">
      <ProductHero />
      {/* 200px Empty Space between Live Price Comparison / Price History and Product Reviews */}
      <div style={{ height: '200px' }} className="w-full pointer-events-none aria-hidden" />
      <ProductReviews />
      {/* 220px Empty Space between Product Reviews and Alternative Parts */}
      <div style={{ height: '220px' }} className="w-full pointer-events-none aria-hidden" />
      <AlternativePartsSection />
    </div>
  );
}
