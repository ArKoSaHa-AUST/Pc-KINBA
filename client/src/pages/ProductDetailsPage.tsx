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
    <div className="bg-bg-primary text-text-primary min-h-screen relative overflow-hidden pb-32">
      <ProductHero product={product} loading={loading} />
      {/*
        Each section below owns its own top spacing (see ProductReviews/index.tsx and
        AlternativePartsSection.tsx) — no dead spacer divs here. There used to be two,
        200px and 220px, stacked ON TOP of those sections' own margins (which were
        themselves 40px and 220px), for up to 440px of unexplained empty space between
        content the user actually came to read.
      */}
      <ProductReviews productId={id} product={product} />
      <AlternativePartsSection product={product} />
    </div>
  );
}
