import { useState, useEffect, useCallback } from 'react';
import ReviewSummary from './ReviewSummary';
import ReviewList from './ReviewList';
import type { Review, ReviewStatsData } from './dummyData';
import { defaultStats } from './dummyData';
import type { ProductDetails } from '../ProductHero';

interface ProductReviewsProps {
  productId?: string;
  product?: ProductDetails | null;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStatsData>(defaultStats);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/product/${productId}/reviews`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('[Reviews] Failed to fetch live reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleReviewSubmitted = (_newReview: Review) => {
    // Refresh reviews from backend to get freshly calculated statistics
    fetchReviews();
  };

  return (
    <section
      id="product-reviews"
      style={{ marginTop: '40px' }}
      className="relative w-full z-10 scroll-mt-28"
    >
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-4 lg:col-start-1">
            <ReviewSummary stats={stats} loading={loading} />
          </div>
          <div className="lg:col-span-8">
            <ReviewList
              reviews={reviews}
              stats={stats}
              productId={productId}
              loading={loading}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
