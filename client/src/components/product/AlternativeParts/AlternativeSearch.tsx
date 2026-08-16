import { Search, SlidersHorizontal } from 'lucide-react';

interface AlternativeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function AlternativeSearch({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: AlternativeSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
      {/* Search Input */}
      <div className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search alternative products..."
          className="w-full bg-[#0c1228] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
        />
      </div>

      {/* Sort Select */}
      <div className="relative shrink-0">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="appearance-none bg-[#0c1228] border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-sm font-semibold text-white focus:outline-none focus:border-cyan-500/50 transition-all cursor-pointer"
        >
          <option value="most-similar">Most Similar</option>
          <option value="highest-rated">Highest Rated</option>
          <option value="cheapest">Cheapest</option>
          <option value="best-performance">Best Performance</option>
          <option value="newest">Newest</option>
          <option value="best-ai-match">Best AI Match</option>
        </select>
        <SlidersHorizontal className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 pointer-events-none" />
      </div>
    </div>
  );
}
