import { motion } from 'framer-motion';

const filterOptions = ['All', '5★', '4★', '3★', '2★', '1★', 'Verified', 'Newest'];

interface ReviewFiltersProps {
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export default function ReviewFilters({
  activeFilter = 'All',
  onFilterChange,
}: ReviewFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filterOptions.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange?.(filter)}
          className={`relative px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
            activeFilter === filter
              ? 'text-black font-bold'
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
