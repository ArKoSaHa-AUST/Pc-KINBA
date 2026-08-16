import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReviewPagination() {
  return (
    <div className="flex items-center justify-between border-t border-white/10 pt-8 mt-12">
      <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <ChevronLeft className="w-5 h-5" />
        Previous
      </button>

      <div className="flex items-center gap-2 hidden sm:flex">
        {[1, 2, 3, 4, '...', 12].map((page, idx) => (
          <button
            key={idx}
            className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-colors ${
              page === 1
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            } ${typeof page === 'string' ? 'cursor-default hover:bg-transparent hover:text-gray-400' : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/5 transition-colors">
        Next
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
