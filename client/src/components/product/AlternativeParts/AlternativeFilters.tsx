import { motion } from 'framer-motion';

const filterCategories = [
  'All',
  'Better Performance',
  'Best Value',
  'Lower Price',
  'Similar Performance',
  'Latest Generation',
  'AI Recommended',
];

interface AlternativeFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function AlternativeFilters({
  activeFilter,
  onFilterChange,
}: AlternativeFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filterCategories.map((category) => {
        const isActive = activeFilter === category;
        return (
          <button
            key={category}
            onClick={() => onFilterChange(category)}
            className={`relative px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
              isActive
                ? 'text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'text-gray-400 hover:text-white bg-[#0c1228] border border-white/8 hover:border-cyan-500/30'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeAltFilter"
                className="absolute inset-0 bg-cyan-400 rounded-full"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{category}</span>
          </button>
        );
      })}
    </div>
  );
}
