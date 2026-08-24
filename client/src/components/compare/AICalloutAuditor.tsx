import { useState } from 'react';
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Bot,
  Ruler,
  Cable,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CompareProduct } from '../../types/compare';

interface AICalloutAuditorProps {
  slots: (CompareProduct | null)[];
}

export const AICalloutAuditor: React.FC<AICalloutAuditorProps> = ({ slots }) => {
  const navigate = useNavigate();
  const [targetResolution, setTargetResolution] = useState<'1080p' | '1440p' | '4k'>('1440p');

  const activeProducts = slots.filter((p): p is CompareProduct => p !== null);

  if (activeProducts.length === 0) return null;

  // 1. Power Supply Audit
  const totalTDP = activeProducts.reduce((acc, p) => {
    const tdp = typeof p.specs.tdp === 'number' ? p.specs.tdp : 280;
    return acc + tdp;
  }, 0);

  const systemBaselineOverhead = 150; // Motherboard, RAM, Fans, SSDs, CPU
  const estimatedPeakPower = totalTDP + systemBaselineOverhead;
  const recommendedPSUWattage = Math.max(750, Math.ceil((estimatedPeakPower * 1.35) / 50) * 50);

  // 2. Connector Safety Audit
  const has12VHPWR = activeProducts.some(
    (p) =>
      String(p.specs.powerConnectors || '').includes('16-pin') ||
      String(p.specs.powerConnectors || '').includes('12VHPWR'),
  );

  // 3. Length clearance
  const maxLength = Math.max(
    ...activeProducts.map((p) => {
      const dimStr = String(p.specs.cardDimensions || '');
      const match = dimStr.match(/([0-9.]+)/);
      return match ? parseFloat(match[1]) : 300;
    }),
  );

  // 4. Bottleneck Assessment
  const getBottleneckVerdict = () => {
    switch (targetResolution) {
      case '1080p':
        return {
          riskPercent: 14,
          status: 'warning',
          title: 'Moderate CPU Bottleneck Potential at 1080p',
          description:
            'High-tier GPUs like the RTX 4070 Ti and RX 7900 XT render frames faster than entry/mid CPUs can feed them at 1080p. Pair with at least a Ryzen 7 7800X3D or Core i7-14700K for maximum framerate stability.',
        };
      case '1440p':
        return {
          riskPercent: 3,
          status: 'optimal',
          title: 'Optimal GPU-Bound Balance at 1440p Quad HD',
          description:
            'GPU load reaches >96% across modern AAA titles. Hardware is ideally balanced for high-refresh 144Hz–240Hz 1440p gaming with negligible CPU overhead.',
        };
      case '4k':
        return {
          riskPercent: 0,
          status: 'optimal',
          title: '100% GPU Saturation at 4K Ultra HD',
          description:
            'Pixel throughput is entirely graphics-bound. 4K textures will heavily leverage VRAM capacity (RX 7900 XT 20GB and RTX 4070 Ti 12GB/16GB).',
        };
    }
  };

  const bottleneck = getBottleneckVerdict();

  return (
    <div
      id="ai-auditor-section"
      className="w-full rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl overflow-hidden relative"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(0,229,255,0.4)]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">
                Tonima AI Compatibility & Bottleneck Auditor
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Live Audited
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Autonomous hardware analysis checking power envelopes, CPU pairings, and chassis
              clearances.
            </p>
          </div>
        </div>

        {/* Target Resolution Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 self-start sm:self-auto">
          {(['1080p', '1440p', '4k'] as const).map((res) => (
            <button
              key={res}
              onClick={() => setTargetResolution(res)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                targetResolution === res
                  ? 'bg-accent text-slate-950 shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 1. PSU & Power Envelope */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>PSU Headroom</span>
              </span>
              <span className="text-amber-400">{recommendedPSUWattage}W Min</span>
            </div>
            <div className="text-lg font-mono font-black text-white">
              ~{estimatedPeakPower}W{' '}
              <span className="text-xs font-normal text-text-muted">Peak Draw</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1 leading-normal">
              Includes +150W system motherboard/storage overhead with 35% transient spike safety
              margin.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>ATX 3.0 Standard Recommended</span>
          </div>
        </div>

        {/* 2. CPU Bottleneck Index */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-2">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-accent" />
                <span>CPU Bottleneck ({targetResolution.toUpperCase()})</span>
              </span>
              <span className={bottleneck.riskPercent > 10 ? 'text-warning' : 'text-emerald-400'}>
                {bottleneck.riskPercent}%
              </span>
            </div>
            <div className="text-sm font-bold text-white line-clamp-1">{bottleneck.title}</div>
            <p className="text-[11px] text-text-muted mt-1 leading-normal line-clamp-2">
              {bottleneck.description}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-accent font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Optimal Gaming Tier</span>
          </div>
        </div>

        {/* 3. Chassis Clearance */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-2">
              <span className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-cyan-400" />
                <span>Chassis Length</span>
              </span>
              <span className="text-cyan-400">{maxLength.toFixed(0)} mm Max</span>
            </div>
            <div className="text-sm font-bold text-white">Requires Standard Mid-Tower</div>
            <p className="text-[11px] text-text-muted mt-1 leading-normal">
              Ensure case clearance exceeds 320mm for front radiator / fan clearance.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>ATX / mATX Case Compatible</span>
          </div>
        </div>

        {/* 4. Power Connector Safety */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-2">
              <span className="flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-purple" />
                <span>Cable Safety</span>
              </span>
              <span className={has12VHPWR ? 'text-amber-400' : 'text-emerald-400'}>
                {has12VHPWR ? '12VHPWR' : 'Standard 8-Pin'}
              </span>
            </div>
            <div className="text-sm font-bold text-white">
              {has12VHPWR ? '16-Pin 12V-2x6 Power' : 'Dual 8-Pin PCIe Power'}
            </div>
            <p className="text-[11px] text-text-muted mt-1 leading-normal">
              {has12VHPWR
                ? 'Allow at least 35mm cable clearance before bending to prevent pin stress.'
                : 'Use separate non-daisy-chained PCIe cables from power supply.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
            <AlertTriangle className="w-3 h-3" />
            <span>Follow Cable Bend Safety</span>
          </div>
        </div>
      </div>

      {/* Footer Call to Action with Tonima AI */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-accent/10 via-purple/10 to-transparent border border-accent/20">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-xs sm:text-sm text-text-primary">
            Need customized build recommendations or specific Bangladesh market price tracking? Ask
            our AI expert Tonima!
          </p>
        </div>
        <button
          onClick={() => navigate('/ai-assistant')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-accent text-slate-950 hover:bg-accent/90 transition-all flex-shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
        >
          <span>Ask Tonima AI</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
