import { Search, X } from 'lucide-react';

interface ReviewSearchProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function ReviewSearch({
  searchQuery = '',
  onSearchChange,
}: ReviewSearchProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder="Search reviews by keywords, pros, cons..."
        className="block w-full pl-11 pr-10 py-3 bg-[#0c1228] border border-white/10 rounded-xl leading-5 bg-transparent text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-inner text-sm"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange?.('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
