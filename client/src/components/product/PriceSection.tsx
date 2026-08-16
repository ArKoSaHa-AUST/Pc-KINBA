import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ExternalLink, TrendingDown } from 'lucide-react';

const mockPriceHistory = [
  { date: 'Jan', price: 449 },
  { date: 'Feb', price: 439 },
  { date: 'Mar', price: 429 },
  { date: 'Apr', price: 419 },
  { date: 'May', price: 409 },
  { date: 'Jun', price: 399 },
];

const mockStores = [
  { name: 'Star Tech', price: 399, stock: true, delivery: 'Next Day', logo: 'ST' },
  { name: 'TechLand', price: 405, stock: true, delivery: '2-3 Days', logo: 'TL' },
  { name: 'Ryans', price: 410, stock: false, delivery: 'Out of Stock', logo: 'RY' },
  { name: 'Global Brand', price: 415, stock: true, delivery: '2 Days', logo: 'GB' },
];

export default function PriceSection() {
  return (
    <section className="py-[100px] lg:py-[140px] relative">
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Live Price Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 lg:p-10 flex flex-col"
          >
            <h3 className="text-2xl font-bold mb-8 text-white flex items-center gap-2 tracking-tight">
              Live Price Comparison
            </h3>

            <div className="flex flex-col gap-4 flex-1 justify-center">
              {mockStores.map((store, idx) => (
                <div
                  key={idx}
                  className={`group flex items-center justify-between p-5 rounded-[20px] border transition-all duration-300 hover:scale-[1.02] ${idx === 0 ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center font-bold text-gray-400 text-sm group-hover:border-white/20 transition-colors">
                      {store.logo}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-lg mb-1">{store.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={store.stock ? 'text-green-400' : 'text-red-400'}>
                          {store.stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <span className="text-gray-500">• {store.delivery}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="text-2xl font-bold text-white">${store.price}</span>
                    <button
                      disabled={!store.stock}
                      className={`p-3 rounded-xl transition-all duration-300 ${store.stock ? 'bg-white/10 hover:bg-white/20 text-white hover:scale-110 active:scale-95' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Price History */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card p-8 lg:p-10 flex flex-col"
          >
            <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
              <h3 className="text-2xl font-bold text-white tracking-tight">Price History</h3>
              <div className="flex gap-2 bg-gray-900/50 p-1 rounded-xl border border-white/10">
                {['1M', '3M', '6M', '1Y'].map((range) => (
                  <button
                    key={range}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${range === '6M' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8 bg-gradient-to-r from-green-500/10 to-transparent border-l-2 border-green-500 text-green-400 px-4 py-3 rounded-r-xl w-fit">
              <TrendingDown className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Price dropped by 11% in the last 6 months</span>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mockPriceHistory}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 15, 37, 0.9)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      color: '#fff',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)',
                    }}
                    itemStyle={{ color: '#00e5ff', fontWeight: 'bold' }}
                    cursor={{
                      stroke: 'rgba(0, 229, 255, 0.2)',
                      strokeWidth: 2,
                      strokeDasharray: '5 5',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#00e5ff"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
