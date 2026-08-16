import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MonitorPlay, Settings, Layers } from 'lucide-react';

const benchmarkData = [
  { game: 'Cyberpunk 2077', '1080p': 112, '1440p': 78, '4K': 42 },
  { game: 'Red Dead 2', '1080p': 135, '1440p': 95, '4K': 55 },
  { game: 'Starfield', '1080p': 98, '1440p': 65, '4K': 38 },
  { game: 'Call of Duty', '1080p': 185, '1440p': 130, '4K': 85 },
];

export default function PerformanceBenchmarks() {
  return (
    <section className="py-[100px] lg:py-[140px]">
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="mb-20 text-center">
          <h2 className="text-title mb-4">Performance Benchmarks</h2>
          <p className="text-subtitle max-w-2xl mx-auto">
            Real-world gaming performance across popular titles at maximum settings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: <MonitorPlay className="w-8 h-8" />,
              title: '1080p Gaming',
              desc: 'Flawless >100 FPS on ultra settings.',
              highlight: 'Ultra',
            },
            {
              icon: <Settings className="w-8 h-8" />,
              title: '1440p Gaming',
              desc: 'Smooth >60 FPS on high/ultra settings.',
              highlight: 'High',
            },
            {
              icon: <Layers className="w-8 h-8" />,
              title: 'Ray Tracing',
              desc: 'Excellent performance with DLSS 3.5.',
              highlight: 'DLSS',
            },
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-card p-10 lg:p-14 hover:bg-white/5 transition-colors flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                {card.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{card.title}</h3>
              <p className="text-gray-400 text-base mb-6 leading-relaxed">{card.desc}</p>
              <span className="mt-auto inline-block px-4 py-1.5 rounded-full bg-white/10 text-xs font-bold tracking-widest uppercase text-cyan-300 border border-white/5">
                {card.highlight}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-card p-8 md:p-12 h-[600px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-white tracking-tight">Average FPS</h3>
            <div className="flex gap-4 items-center">
              <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                Higher is better
              </span>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={benchmarkData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                barGap={8}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="game"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 14 }}
                  axisLine={false}
                  tickLine={false}
                  dy={16}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 14 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(10, 15, 37, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    padding: '16px',
                  }}
                  itemStyle={{ fontWeight: '600', padding: '4px 0' }}
                />
                <Legend wrapperStyle={{ paddingTop: '40px' }} iconType="circle" />
                <Bar dataKey="1080p" fill="url(#color1080)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                <Bar dataKey="1440p" fill="url(#color1440)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                <Bar dataKey="4K" fill="url(#color4k)" radius={[6, 6, 0, 0]} maxBarSize={60} />

                <defs>
                  <linearGradient id="color1080" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0077ff" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="color1440" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="color4k" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
