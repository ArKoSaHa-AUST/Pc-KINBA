import { motion } from 'framer-motion';
import StarRating from './StarRating';
import type { RatingDistributionItem } from './dummyData';

interface RatingBreakdownProps {
  distribution?: RatingDistributionItem[];
}

const defaultDistribution: RatingDistributionItem[] = [
  { stars: 5, count: 0, percentage: 0 },
  { stars: 4, count: 0, percentage: 0 },
  { stars: 3, count: 0, percentage: 0 },
  { stars: 2, count: 0, percentage: 0 },
  { stars: 1, count: 0, percentage: 0 },
];

export default function RatingBreakdown({ distribution = defaultDistribution }: RatingBreakdownProps) {
  const items = distribution && distribution.length > 0 ? distribution : defaultDistribution;

  return (
    <div className="flex flex-col gap-3 w-full">
      {items.map((item, idx) => (
        <div key={item.stars} className="flex items-center gap-4">
          <div className="w-24 shrink-0 flex items-center gap-2">
            <span className="text-sm font-bold text-white w-3">{item.stars}</span>
            <StarRating rating={item.stars} size="sm" />
          </div>

          <div className="flex-1 h-2.5 bg-gray-800/50 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.percentage}%` }}
              transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            />
          </div>

          <div className="w-12 text-right flex items-center justify-end gap-1">
            <span className="text-sm font-semibold text-gray-400">{item.percentage}%</span>
            {item.count > 0 && (
              <span className="text-[10px] text-gray-500 font-medium">({item.count})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
