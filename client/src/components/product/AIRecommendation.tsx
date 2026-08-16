import { motion } from 'framer-motion';
import { Sparkles, Check, X, Target, Brain, TrendingUp, Zap, Shield } from 'lucide-react';

const scores = [
  { label: 'Gaming', score: 92, icon: <Zap className="w-4 h-4" />, color: '#00e5ff' },
  { label: 'Productivity', score: 85, icon: <TrendingUp className="w-4 h-4" />, color: '#a855f7' },
  { label: 'Future Proof', score: 78, icon: <Shield className="w-4 h-4" />, color: '#eab308' },
  { label: 'Efficiency', score: 96, icon: <Zap className="w-4 h-4" />, color: '#22c55e' },
];

const pros = [
  'Exceptional 1080p performance',
  'Power efficient (115W TDP)',
  'DLSS 3.5 support',
  'Runs very cool & quiet',
];

const cons = ['Only 8GB VRAM', 'Not ideal for 4K gaming', 'Slightly higher MSRP than last gen'];

function ScoreRing({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="4"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function AIRecommendation() {
  return (
    <section className="py-[100px] lg:py-[140px] relative z-10">
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 lg:mb-20"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl shadow-[0_0_25px_rgba(0,229,255,0.3)]">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-title">AI Analysis</h2>
            </div>
          </div>
          <p className="text-gray-400 text-base lg:text-lg max-w-2xl leading-relaxed">
            Powered by machine learning models trained on benchmark data, pricing trends, and
            community sentiment.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Left: Verdict + Pros/Cons — 8 cols */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-8 flex flex-col gap-10"
          >
            {/* AI Verdict Card */}
            <div className="glass-card p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em]">
                    AI Verdict
                  </span>
                </div>
                <p className="text-white text-lg lg:text-xl leading-relaxed font-medium">
                  The RTX 5060 Ti offers a substantial leap in 1080p and 1440p gaming performance.
                  Based on current market data, performance benchmarks, and user sentiment — it's an{' '}
                  <span className="text-cyan-400">excellent value proposition</span> for mainstream
                  gamers.
                </p>
              </div>
            </div>

            {/* Pros & Cons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Pros */}
              <div className="glass-card p-8 lg:p-10 group hover:border-green-500/30 transition-colors">
                <h4 className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-base font-bold text-white uppercase tracking-wider">
                    Pros
                  </span>
                </h4>
                <ul className="space-y-4">
                  {pros.map((pro, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[15px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div className="glass-card p-8 lg:p-10 group hover:border-red-500/30 transition-colors">
                <h4 className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-base font-bold text-white uppercase tracking-wider">
                    Cons
                  </span>
                </h4>
                <ul className="space-y-4">
                  {cons.map((con, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300 text-[15px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Right: Scores + Target — 4 cols */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="lg:col-span-4 flex flex-col gap-8"
          >
            {/* Score Rings Card */}
            <div className="glass-card p-8">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-[0.15em] mb-8">
                Performance Scores
              </h4>
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                {scores.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3 text-center">
                    <ScoreRing score={item.score} color={item.color} />
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <span style={{ color: item.color }}>{item.icon}</span>
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="glass-card p-8 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <h5 className="font-bold text-white text-base tracking-tight">Target Audience</h5>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Perfect for gamers upgrading from RTX 3060 or older, targeting high-FPS 1080p or
                solid 1440p gameplay without breaking the bank.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
