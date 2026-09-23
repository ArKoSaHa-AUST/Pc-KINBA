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
    <div
      className="flex items-center gap-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] select-none"
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        // Calculate fill percentage for each star
        let fillPercent = 0;
        if (currentRating >= star) {
          fillPercent = 100;
        } else if (currentRating >= star - 0.5) {
          fillPercent = 50;
        }

        return (
          <div
            key={star}
            className={`relative inline-flex items-center justify-center ${
              interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'
            }`}
          >
            {/* Background Empty Star */}
            <Star
              className={`${sizes[size]} text-gray-700 fill-transparent transition-colors duration-200`}
            />

            {/* Filled Foreground Star with fractional clipping */}
            {fillPercent > 0 && (
              <div
                className="absolute top-0 left-0 bottom-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPercent}%` }}
              >
                <Star
                  className={`${sizes[size]} max-w-none shrink-0 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`}
                />
              </div>
            )}

            {/* Interactive Half & Full Click/Hover Hitboxes */}
            {interactive && (
              <div className="absolute inset-0 flex z-10">
                {/* Left Half (e.g. 0.5, 1.5, 2.5, 3.5, 4.5) */}
                <button
                  type="button"
                  className="w-1/2 h-full cursor-pointer focus:outline-none bg-transparent"
                  onMouseEnter={() => setHoverRating(star - 0.5)}
                  onClick={() => onRatingChange?.(star - 0.5)}
                  aria-label={`${star - 0.5} stars`}
                  title={`${star - 0.5} Stars`}
                />
                {/* Right Half (e.g. 1.0, 2.0, 3.0, 4.0, 5.0) */}
                <button
                  type="button"
                  className="w-1/2 h-full cursor-pointer focus:outline-none bg-transparent"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => onRatingChange?.(star)}
                  aria-label={`${star} stars`}
                  title={`${star} Stars`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
