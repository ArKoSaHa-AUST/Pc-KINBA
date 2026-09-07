export type Review = {
  id: string;
  productId?: string;
  user: {
    id?: string | null;
    name: string;
    avatar: string;
    country: string;
    countryCode: string;
  };
  verified: boolean;
  date: string;
  createdAt?: string;
  rating: number;
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  helpfulCount: number;
  images?: string[];
  reply?: {
    storeName: string;
    content: string;
    date: string;
  };
};

export type RatingDistributionItem = {
  stars: number;
  count: number;
  percentage: number;
};

export type ReviewStatsData = {
  totalReviews: number;
  averageRating: number;
  recommendPercent: number;
  ratingDistribution: RatingDistributionItem[];
  verifiedCount: number;
  helpfulCount: number;
  reviewsThisMonth: number;
};

export const defaultStats: ReviewStatsData = {
  totalReviews: 0,
  averageRating: 0,
  recommendPercent: 0,
  ratingDistribution: [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ],
  verifiedCount: 0,
  helpfulCount: 0,
  reviewsThisMonth: 0,
};

// All hardcoded mock reviews removed in favor of Supabase/Express dynamic database reviews
export const dummyReviews: Review[] = [];
