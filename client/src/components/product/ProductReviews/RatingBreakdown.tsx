import { motion } from 'framer-motion';
import StarRating from './StarRating';

const distribution = [
  { stars: 5, percentage: 72 },
  { stars: 4, percentage: 18 },
  { stars: 3, percentage: 6 },
  { stars: 2, percentage: 2 },
  { stars: 1, percentage: 2 },
];

export default function RatingBreakdown() {
  return (
    <div className="flex flex-col gap-3 w-full">
      {distribution.map((item, idx) => (
        <div key={item.stars} className="flex items-center gap-4">
          <div className="w-24 shrink-0 flex items-center gap-2">
            <span className="text-sm font-bold text-white w-3">{item.stars}</span>
            <StarRating rating={item.stars} size="sm" />
          </div>

          <div className="flex-1 h-2.5 bg-gray-800/50 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${item.percentage}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            />
          </div>

          <div className="w-10 text-right">
            <span className="text-sm font-semibold text-gray-400">{item.percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
