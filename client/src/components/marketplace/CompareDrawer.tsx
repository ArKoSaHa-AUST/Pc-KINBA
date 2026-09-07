import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  X,
  ArrowRight,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useComponentStore } from '../../store/useComponentStore';

export default function CompareDrawer() {
  const compareList = useComponentStore((s) => s.compareList);
  const removeFromCompare = useComponentStore((s) => s.removeFromCompare);
  const clearCompare = useComponentStore((s) => s.clearCompare);
  const isCompareModalOpen = useComponentStore((s) => s.isCompareModalOpen);
  const setCompareModalOpen = useComponentStore((s) => s.setCompareModalOpen);

  const [highlightDiffs, setHighlightDiffs] = useState(false);

  if (compareList.length === 0) return null;

  // Extract all unique spec keys across compared items
  const allSpecKeys = Array.from(
    new Set(compareList.flatMap((item) => Object.keys(item.specs || {}))),
  );

  return (
    <>
      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl bg-bg-surface/95 backdrop-blur-2xl border border-accent/40 rounded-2xl p-3 sm:p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.2)] animate-slideUp">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Indicator & Selected Items Thumbnails */}
          <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent whitespace-nowrap">
              <Layers className="w-4 h-4 text-accent animate-pulse" />
              <span>Compare ({compareList.length}/4)</span>
            </div>

            <div className="flex items-center gap-2">
              {compareList.map((item) => (
                <div
                  key={item.id}
                  className="relative group/pill flex items-center gap-2 bg-bg-primary/80 border border-border/80 rounded-xl p-1.5 pr-2.5"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-8 h-8 rounded-lg object-contain bg-[#070b14] p-0.5"
                  />
                  <div className="max-w-[100px] sm:max-w-[130px] hidden sm:block">
                    <span className="text-[11px] font-bold text-text-primary block truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-accent font-semibold">
                      ৳{item.price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="text-text-muted hover:text-danger transition-colors cursor-pointer"
                    aria-label={`Remove ${item.name} from comparison`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {Array.from({ length: 4 - compareList.length }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 sm:w-28 sm:h-9 rounded-xl border border-dashed border-border/60 flex items-center justify-center text-[10px] text-text-muted/60"
                >
                  <span className="hidden sm:inline">+ Add Part</span>
                  <span className="sm:hidden">+</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={clearCompare}
              className="p-2.5 rounded-xl bg-bg-primary text-text-muted hover:text-danger border border-border text-xs transition-colors cursor-pointer"
              title="Clear all comparison items"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCompareModalOpen(true)}
              disabled={compareList.length < 2}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                compareList.length >= 2
                  ? 'bg-accent text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:brightness-110 active:scale-98'
                  : 'bg-bg-primary text-text-muted border border-border opacity-50 cursor-not-allowed'
              }`}
            >
              <span>Compare Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Comparison Matrix Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setCompareModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-6xl bg-bg-surface/95 border border-border rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 flex flex-col max-h-[92vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-border bg-bg-secondary/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple/20 border border-purple/40 flex items-center justify-center text-purple">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-text-primary">
                    Side-by-Side Component Comparison
                  </h2>
                  <p className="text-xs text-text-muted">
                    Comparing {compareList.length} items across specifications & value
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-primary border border-border text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highlightDiffs}
                    onChange={(e) => setHighlightDiffs(e.target.checked)}
                    className="rounded text-accent focus:ring-accent bg-bg-surface border-border cursor-pointer accent-cyan-400"
                  />
                  <span className="text-text-primary font-medium">Highlight Diffs</span>
                </label>

                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-bg-primary border border-border text-text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Table Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6 scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="p-4 w-1/4 bg-bg-primary/40 rounded-tl-2xl border-b border-border text-xs font-bold uppercase text-text-muted tracking-wider">
                      Specifications
                    </th>
                    {compareList.map((item) => (
                      <th
                        key={item.id}
                        className="p-4 w-1/4 bg-bg-primary/40 border-b border-border align-top"
                      >
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="relative w-28 h-28 bg-[#070b14] border border-border rounded-xl p-2 flex items-center justify-center">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                            <button
                              onClick={() => removeFromCompare(item.id)}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-surface border border-border text-text-muted hover:text-danger flex items-center justify-center shadow"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="w-full">
                            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                              {item.brand}
                            </span>
                            <h4 className="font-bold text-xs text-text-primary line-clamp-2 mt-0.5">
                              {item.name}
                            </h4>
                            <div className="mt-2 text-base font-black text-text-primary">
                              ৳{item.price.toLocaleString()}
                            </div>
                          </div>

                          <Link
                            to={`/product/${item.id}`}
                            onClick={() => setCompareModalOpen(false)}
                            className="w-full py-2 rounded-xl bg-accent/20 border border-accent/40 text-accent font-bold text-xs hover:bg-accent hover:text-black transition-all flex items-center justify-center gap-1"
                          >
                            <span>View Product</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border/40">
                  {/* Category */}
                  <tr>
                    <td className="p-3 font-semibold text-text-muted bg-bg-primary/20">Category</td>
                    {compareList.map((item) => (
                      <td key={item.id} className="p-3 font-bold text-text-primary text-center">
                        {item.category.toUpperCase()}
                      </td>
                    ))}
                  </tr>

                  {/* Stock Status */}
                  <tr>
                    <td className="p-3 font-semibold text-text-muted bg-bg-primary/20">
                      Availability
                    </td>
                    {compareList.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        {item.inStock ? (
                          <span className="inline-flex items-center gap-1 text-success font-semibold">
                            <Check className="w-3.5 h-3.5" /> In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-danger font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Dynamic Technical Specs */}
                  {allSpecKeys.map((key) => {
                    const values = compareList.map((item) => item.specs[key] || '—');
                    const hasDifference = new Set(values).size > 1;

                    return (
                      <tr
                        key={key}
                        className={
                          highlightDiffs && hasDifference
                            ? 'bg-accent/10 border-l-2 border-accent'
                            : ''
                        }
                      >
                        <td className="p-3 font-medium text-text-muted bg-bg-primary/20">{key}</td>
                        {values.map((val, idx) => (
                          <td
                            key={idx}
                            className={`p-3 text-center font-semibold ${
                              highlightDiffs && hasDifference
                                ? 'text-accent font-bold'
                                : 'text-text-primary'
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-bg-secondary/50 flex items-center justify-between">
              <span className="text-xs text-text-muted">
                Tip: Use this matrix to compare sockets, power draws, and memory speeds.
              </span>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-accent text-black font-bold text-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
