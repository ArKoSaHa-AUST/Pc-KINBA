import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { HERO_CATEGORY_BANNERS } from '../../data/categoryHeroBanners';
import { useComponentStore } from '../../store/useComponentStore';
import type { ComponentCategory } from '../../types/components';

export default function CategoryHeroBanner() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeCategory = useComponentStore((s) => s.filters.category);
  const setFilter = useComponentStore((s) => s.setFilter);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Auto-sliding interval that pauses on hover/touch
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      if (!scrollContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const scrollAmount = 320;

      if (scrollLeft + clientWidth >= scrollWidth - 25) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isHovered]);

  const handleSelectCategory = (cat: ComponentCategory) => {
    if (activeCategory === cat) {
      setFilter('category', 'all');
    } else {
      setFilter('category', cat);
    }
  };

  return (
    <div
      className="relative w-full mb-10 group/banner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <span>Explore Hardware Sectors</span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </h2>
        </div>
      </div>

      {/* Slider Carousel with Sheer Nav Buttons on Left and Right */}
      <div className="relative w-full">
        {/* Sheer Medium-Sized Previous Button (Left) */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-bg-surface/50 backdrop-blur-md border border-border/80 hover:border-accent hover:bg-bg-surface/90 hover:text-accent hover:scale-110 active:scale-95 text-text-primary flex items-center justify-center transition-all shadow-xl cursor-pointer"
          aria-label="Previous hardware sectors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Diagonal Segmented Cards Slider */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3.5 overflow-x-auto scrollbar-none scroll-smooth pb-3 snap-x snap-mandatory focus:outline-none px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {HERO_CATEGORY_BANNERS.map((banner) => {
            const isSelected = activeCategory === banner.category;

            return (
              <div
                key={banner.id}
                onClick={() => handleSelectCategory(banner.category)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectCategory(banner.category);
                  }
                }}
                className={`relative flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] h-[280px] sm:h-[310px] rounded-2xl overflow-hidden cursor-pointer snap-start transition-all duration-500 select-none group focus:outline-none focus:ring-2 focus:ring-accent ${
                  isSelected
                    ? 'ring-2 ring-accent scale-[1.02] shadow-[0_0_30px_rgba(0,229,255,0.35)]'
                    : 'hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(0,0,0,0.6)]'
                }`}
              >
                {/* Background Hardware Image with Smooth Zoom */}
                <div className="absolute inset-0 overflow-hidden bg-[#0a0f1d]">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center transform group-hover:scale-115 transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Diagonal Slash Accent Line Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${banner.accentColor}25 0%, transparent 45%, ${banner.accentColor}40 100%)`,
                  }}
                />

                {/* High-Tech Diagonal Corner Slash */}
                <div
                  className="absolute -top-12 -right-12 w-28 h-28 transform rotate-45 pointer-events-none transition-all duration-500 group-hover:scale-125"
                  style={{
                    backgroundColor: banner.accentColor,
                    opacity: isSelected ? 0.8 : 0.45,
                    boxShadow: `0 0 20px ${banner.accentColor}`,
                  }}
                />

                {/* Multi-Layer Dark Gradient for Text Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

                {/* Top Sector Badge */}
                <div className="absolute top-3.5 left-3.5 z-10">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase backdrop-blur-md border"
                    style={{
                      backgroundColor: `${banner.accentColor}20`,
                      borderColor: `${banner.accentColor}50`,
                      color: banner.accentColor,
                    }}
                  >
                    {banner.badge || banner.tag}
                  </span>
                </div>

                {/* Bottom Information */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10 flex flex-col justify-end">
                  <p className="text-[11px] font-medium text-text-muted/90 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: banner.accentColor }}
                    />
                    {banner.tag}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight leading-snug group-hover:text-accent transition-colors line-clamp-2">
                    {banner.title}
                  </h3>

                  {/* Interactive Action Hint on Hover */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-accent opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <span>{isSelected ? 'Selected Category' : 'Browse Inventory'}</span>
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Active Selection Glow Ring */}
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
                    style={{ borderColor: banner.accentColor }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Sheer Medium-Sized Next Button (Right) */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-bg-surface/50 backdrop-blur-md border border-border/80 hover:border-accent hover:bg-bg-surface/90 hover:text-accent hover:scale-110 active:scale-95 text-text-primary flex items-center justify-center transition-all shadow-xl cursor-pointer"
          aria-label="Next hardware sectors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
