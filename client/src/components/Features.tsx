import { motion, type Variants } from 'framer-motion';
import {
  BrainCircuit,
  Cpu,
  Zap,
  Activity,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import './Features.css';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: string;
  colSpan: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  tags?: string[];
  visual?: React.ReactNode;
}

const features: FeatureItem[] = [
  {
    icon: <BrainCircuit size={28} />,
    title: 'AI PC Recommendation',
    desc: 'Describe your workflow or gaming goals, and Tonima AI crafts the optimal hardware configuration tailored to your budget instantly.',
    badge: 'AI-POWERED',
    colSpan: 'lg:col-span-2',
    gradient: 'from-purple/10 via-transparent to-accent/5',
    iconBg: 'bg-purple/15 border-purple/30 text-purple',
    iconColor: 'text-purple',
    tags: ['Interactive Assistant', 'Bottleneck Elimination', 'Auto Value Pick'],
  },
  {
    icon: <DollarSign size={26} />,
    title: 'Smart Budget Optimizer',
    desc: 'Extract maximum FPS and multi-threaded compute performance for every single Taka you spend.',
    badge: 'VALUE MAX',
    colSpan: 'lg:col-span-1',
    gradient: 'from-success/10 via-transparent to-transparent',
    iconBg: 'bg-success/15 border-success/30 text-success',
    iconColor: 'text-success',
  },
  {
    icon: <Layers size={26} />,
    title: 'Compatibility Checker',
    desc: 'Never worry about mismatched sockets, RAM clearances, or PSU wattages. 100+ automated physical rules.',
    badge: '100+ RULES',
    colSpan: 'lg:col-span-1',
    gradient: 'from-accent/10 via-transparent to-transparent',
    iconBg: 'bg-accent/15 border-accent/30 text-accent',
    iconColor: 'text-accent',
  },
  {
    icon: <Cpu size={26} />,
    title: 'GPU & CPU Comparison',
    desc: 'Side-by-side architectural and benchmark comparisons for every modern graphics card and desktop processor.',
    badge: 'BENCHMARKS',
    colSpan: 'lg:col-span-1',
    gradient: 'from-purple/10 via-transparent to-transparent',
    iconBg: 'bg-purple/15 border-purple/30 text-purple',
    iconColor: 'text-purple',
  },
  {
    icon: <Activity size={26} />,
    title: 'Real-time Price Tracking',
    desc: 'Aggregated price histories across trusted Bangladeshi retailers with live stock status.',
    badge: 'LIVE AGGREGATOR',
    colSpan: 'lg:col-span-1',
    gradient: 'from-warning/10 via-transparent to-transparent',
    iconBg: 'bg-warning/15 border-warning/30 text-warning',
    iconColor: 'text-warning',
  },
  {
    icon: <Zap size={28} />,
    title: 'Performance Estimation',
    desc: 'Simulate precise frame rates (FPS) across popular titles and resolution tiers before you purchase a single part.',
    badge: 'ULTRA FPS ENGINE',
    colSpan: 'lg:col-span-2',
    gradient: 'from-accent/10 via-transparent to-purple/5',
    iconBg: 'bg-accent/15 border-accent/30 text-accent',
    iconColor: 'text-accent',
    tags: ['1080p / 1440p / 4K Tiers', 'Thermal & Wattage Headroom'],
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 35 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
    },
  }),
};

export default function Features() {
  return (
    <section className="section features-section py-20 relative overflow-hidden" id="features">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-accent/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <motion.div
          className="features-header text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 border border-accent/30 text-accent mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTELLIGENT ARCHITECTURE</span>
          </div>
          <h2 className="section-title text-3xl sm:text-5xl font-black text-text-primary tracking-tight mb-4">
            Why Build With <span className="gradient-text">PC-KINBA?</span>
          </h2>
          <p className="section-subtitle text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Everything you need to build the ultimate gaming or workstation rig, powered by advanced AI and live price telemetry.
          </p>
        </motion.div>

        {/* 4-Column Balanced Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className={`group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-bg-surface/80 backdrop-blur-md border border-border hover:border-accent/40 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden ${feature.colSpan}`}
            >
              {/* Subtle top corner gradient wash */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              {/* Top Row: Icon + Badge */}
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm ${feature.iconBg}`}
                  >
                    {feature.icon}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-bg-primary/80 border border-border text-text-muted group-hover:text-text-primary group-hover:border-accent/30 transition-colors">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-text-primary group-hover:text-accent transition-colors leading-snug mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {feature.desc}
                </p>
              </div>

              {/* Optional Bottom Tags for 2-span Bento Hero cards */}
              {feature.tags && (
                <div className="relative z-10 pt-5 mt-4 border-t border-border/50 flex flex-wrap items-center gap-2">
                  {feature.tags.map((tag, tagIdx) => (
                    <span
                      key={tagIdx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-bg-primary/60 border border-border text-text-muted group-hover:text-text-primary group-hover:border-accent/20 transition-all"
                    >
                      <CheckCircle2 className="w-3 h-3 text-accent" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
