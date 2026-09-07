import { Link } from 'react-router-dom';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';

export default function AICompatibilityTip() {
  return (
    <div className="relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-purple/20 via-bg-surface to-accent/20 border border-border/80 p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.4)]">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              <span>AI Hardware Intelligence & Compatibility</span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </h4>
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success border border-success/30">
              Active Engine
            </span>
          </div>
          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Unsure if your CPU will bottleneck your GPU or if your DDR5 RAM matches your Motherboard?
            Ask the PC-KINBA AI Engine for instantaneous compatibility checks, wattage calculations, and optimal value picks.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
        <Link
          to="/ai-assistant"
          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-bg-surface border border-accent/40 text-accent hover:bg-accent hover:text-black font-bold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Ask AI Advisor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/pc-builder"
          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-accent text-black font-bold text-xs hover:brightness-110 active:scale-98 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open PC Builder</span>
        </Link>
      </div>
    </div>
  );
}
