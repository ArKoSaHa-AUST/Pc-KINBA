import { useState } from 'react';
import { motion } from 'framer-motion';

const filterOptions = ['All', '5★', '4★', '3★', '2★', '1★', 'Verified', 'Photos', 'Newest'];

export default function ReviewFilters() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filterOptions.map((filter) => (
        <button
          key={filter}
          onClick={() => setActiveFilter(filter)}
          className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeFilter === filter
              ? 'text-black'
              : 'text-gray-400 hover:text-white bg-[#0c1228] border border-white/5 hover:border-cyan-500/30'
          }`}
        >
          {activeFilter === filter && (
            <motion.div
              layoutId="activeFilterBg"
              className="absolute inset-0 bg-cyan-400 rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{filter}</span>
        </button>
      ))}
    </div>
  );
}
