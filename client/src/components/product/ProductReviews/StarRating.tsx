import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function StarRating({
  rating,
  interactive = false,
  onRatingChange,
  size = 'sm',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const currentRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={!interactive}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && onRatingChange?.(star)}
          className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`${sizes[size]} transition-all duration-300 ${
              star <= currentRating
                ? 'fill-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                : 'fill-transparent text-gray-700 hover:text-gray-500'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
