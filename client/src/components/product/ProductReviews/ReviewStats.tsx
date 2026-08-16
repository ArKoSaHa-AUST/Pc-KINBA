import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const stats = [
  { label: 'Helpful Reviews', value: 843 },
  { label: 'Verified Purchases', value: 1046 },
  { label: 'Reviews this Month', value: 92 },
  { label: 'Avg Response Time', value: 12, suffix: ' hrs' },
];

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 2000; // 2 seconds

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);

      setCount(Math.floor(easeOutQuart * value));

      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{count.toLocaleString()}</span>;
}

export default function ReviewStats() {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center text-center hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-2xl font-black text-white drop-shadow-md">
            <AnimatedCounter value={stat.value} />
            {stat.suffix && (
              <span className="text-sm font-bold text-gray-400 ml-1">{stat.suffix}</span>
            )}
          </span>
          <span className="text-xs text-gray-500 font-semibold mt-1">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
