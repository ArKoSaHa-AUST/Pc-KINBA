import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductHero, { type ProductDetails } from '../components/product/ProductHero';
import ProductReviews from '../components/product/ProductReviews';
import AlternativePartsSection from '../components/product/AlternativeParts/AlternativePartsSection';

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;

    setLoading(true);
    fetch(`/api/product/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setProduct(data);
        }
      })
      .catch((err) => console.error('Error fetching product details:', err))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="bg-[#050816] text-white min-h-screen relative overflow-hidden pb-32">
      <ProductHero product={product} loading={loading} />
      {/* 200px Empty Space between Live Price Comparison / Price History and Product Reviews */}
      <div style={{ height: '200px' }} className="w-full pointer-events-none aria-hidden" />
      <ProductReviews productId={id} product={product} />
      {/* 220px Empty Space between Product Reviews and Alternative Parts */}
      <div style={{ height: '220px' }} className="w-full pointer-events-none aria-hidden" />
      <AlternativePartsSection product={product} />
    </div>
  );
}
