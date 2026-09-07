import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReviewPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ReviewPagination({
  currentPage,
  totalPages,
  onPageChange,
}: ReviewPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${
              page === currentPage
                ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-105'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
