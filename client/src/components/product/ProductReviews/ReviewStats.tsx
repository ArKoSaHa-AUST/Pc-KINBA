import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ReviewStatsData } from './dummyData';

interface ReviewStatsProps {
  stats?: ReviewStatsData;
}

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1200; // 1.2s

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);

      setCount(Math.floor(easeOutQuart * value));

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{count.toLocaleString()}</span>;
}

export default function ReviewStats({ stats }: ReviewStatsProps) {
  const items = [
    { label: 'Helpful Votes', value: stats?.helpfulCount ?? 0 },
    { label: 'Verified Reviews', value: stats?.verifiedCount ?? 0 },
    { label: 'Recent (30d)', value: stats?.reviewsThisMonth ?? 0 },
    { label: 'Avg Rating', value: stats?.averageRating ?? 0, isDecimal: true, suffix: ' / 5' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {items.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center text-center hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-2xl font-black text-white drop-shadow-md">
            {stat.isDecimal ? (
              <span>{(stats?.averageRating || 0).toFixed(1)}</span>
            ) : (
              <AnimatedCounter value={stat.value} />
            )}
            {stat.suffix && (
              <span className="text-sm font-bold text-cyan-400 ml-1">{stat.suffix}</span>
            )}
          </span>
          <span className="text-xs text-gray-500 font-semibold mt-1">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
