import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Star,
  Shield,
  Activity,
  Heart,
  Share2,
  ChevronRight,
  CheckCircle,
  Home,
  ExternalLink,
  TrendingDown,
  Truck,
} from 'lucide-react';

const keyFeatures = [
  { label: 'MPN', value: 'GV-N506TAERO-OC-8GD' },
  { label: 'Model', value: 'GeForce RTX 5060 Ti 8GB Aero OC' },
  { label: 'Video Memory', value: '8GB GDDR7, Memory Clock: 28 Gbps' },
  { label: 'Core Clock', value: 'Base: 2407 MHz · Boost: 2557 MHz' },
  { label: 'CUDA Cores', value: '4608, Memory Bandwidth: Up to 448 GB/s' },
  { label: 'Display Outputs', value: '3x DisplayPort 2.1, 1x HDMI 2.1' },
];

const shops = [
  {
    name: 'Star Tech',
    logo: 'ST',
    price: 39900,
    stock: true,
    delivery: 'Next Day',
    color: '#00e5ff',
    trust: 4.9,
  },
  {
    name: 'Ryans',
    logo: 'RY',
    price: 41000,
    stock: false,
    delivery: 'Out of Stock',
    color: '#a855f7',
    trust: 4.8,
  },
  {
    name: 'TechLand',
    logo: 'TL',
    price: 40500,
    stock: true,
    delivery: '2-3 Days',
    color: '#22c55e',
    trust: 4.7,
  },
  {
    name: 'Global Brand',
    logo: 'GB',
    price: 41500,
    stock: true,
    delivery: '2 Days',
    color: '#f59e0b',
    trust: 4.8,
  },
  {
    name: 'Skyland',
    logo: 'SK',
    price: 40800,
    stock: true,
    delivery: 'Same Day',
    color: '#ec4899',
    trust: 4.5,
  },
  {
    name: 'UCC BD',
    logo: 'UC',
    price: 42000,
    stock: false,
    delivery: 'Out of Stock',
    color: '#8b5cf6',
    trust: 4.6,
  },
  {
    name: 'PC House',
    logo: 'PH',
    price: 40200,
    stock: true,
    delivery: '1-2 Days',
    color: '#00bfa5',
    trust: 4.4,
  },
];

const priceHistoryData = [
  { month: 'Jan', price: 45000 },
  { month: 'Feb', price: 44500 },
  { month: 'Mar', price: 43000 },
  { month: 'Apr', price: 42000 },
  { month: 'May', price: 40500 },
  { month: 'Jun', price: 39900 },
];

const thumbnails = [
  'https://images.unsplash.com/photo-1590253232292-5c0c4c04e428?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400',
];

const lowestPrice = Math.min(...shops.filter((s) => s.stock).map((s) => s.price));

export default function ProductHero() {
  const [activeImage, setActiveImage] = useState(thumbnails[0].replace('w=400', 'w=1200'));
  const [wished, setWished] = useState(false);

  return (
    <section className="relative pt-4 pb-16 lg:pt-6 lg:pb-20 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/6 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/6 rounded-full blur-[120px]" />
      </div>

      <div className="container max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-sm text-gray-500 mb-6"
        >
          <Home className="w-3.5 h-3.5" />
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="hover:text-gray-300 cursor-pointer transition-colors">Components</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="hover:text-gray-300 cursor-pointer transition-colors">
            Graphics Cards
          </span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-gray-300 font-medium">NVIDIA GeForce RTX 5060 Ti</span>
        </motion.nav>

        {/* Main grid: LEFT info | RIGHT image */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 xl:gap-20 items-start">
          {/* ── LEFT COLUMN ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex flex-col gap-7"
          >
            {/* Brand + Status + Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs border border-cyan-400/30 bg-cyan-400/5 px-3 py-1.5 rounded-full">
                  NVIDIA
                </span>
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full">
                  <Activity className="w-3 h-3" /> In Stock
                </span>
                <span className="text-xs text-gray-500">
                  Code: <span className="text-gray-300 font-medium">58241</span>
                </span>
              </div>
              {/* Wishlist + Share */}
              <div className="flex gap-2">
                <button
                  onClick={() => setWished(!wished)}
                  className={`p-2.5 rounded-xl border transition-all duration-300 hover:scale-110 active:scale-95 ${wished ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'}`}
                >
                  <Heart className={`w-4 h-4 ${wished ? 'fill-current' : ''}`} />
                </button>
                <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:scale-110 active:scale-95">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title + Description */}
            <div>
              <h1 className="text-4xl lg:text-5xl xl:text-[54px] font-extrabold leading-[1.1] tracking-tight text-white mb-4">
                GeForce RTX
                <br />
                5060 Ti
              </h1>
              <p className="text-gray-400 text-base leading-relaxed max-w-lg">
                Next-generation NVIDIA Blackwell architecture GPU with DLSS 4 and advanced ray
                tracing. Built for 1080p and 1440p gamers who demand flawless performance without
                compromise.
              </p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < 4 ? 'fill-current' : 'text-gray-600'}`}
                    />
                  ))}
                </div>
                <span className="text-white font-semibold text-sm">4.8</span>
                <span className="text-gray-500 text-xs">(124 Reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <Shield className="w-3.5 h-3.5" />
                <span>3 Year Warranty</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

            {/* Key Features */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">
                Key Features
              </h3>
              <div className="flex flex-col divide-y divide-white/5">
                {keyFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-4 py-3">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400/60 mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-500 w-32 shrink-0 font-semibold">
                      {feat.label}
                    </span>
                    <span className="text-xs text-gray-200 leading-relaxed">{feat.value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center gap-1 transition-colors group">
                View Full Specifications
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Image ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            className="flex flex-col gap-5 lg:sticky lg:top-28"
          >
            {/* Main Image */}
            <div className="relative group rounded-3xl overflow-hidden bg-[#0c1228] border border-white/8 shadow-[0_0_80px_rgba(0,229,255,0.05)] aspect-[4/3] flex items-center justify-center p-12">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/8 blur-[70px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/8 blur-[60px] rounded-full pointer-events-none" />

              {/* Badges */}
              <div className="absolute top-5 left-5 flex flex-col gap-2.5 z-10">
                <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-cyan-500/25">
                  AI Recommended
                </span>
                <span className="bg-white/10 border border-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md">
                  Best Seller
                </span>
              </div>

              <motion.img
                key={activeImage}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                src={activeImage}
                alt="NVIDIA GeForce RTX 5060 Ti"
                className="object-contain w-full h-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)] transform group-hover:scale-[1.04] transition-transform duration-700 cursor-zoom-in"
              />
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3">
              {thumbnails.map((thumb, idx) => {
                const full = thumb.replace('w=400', 'w=1200');
                const isActive = activeImage === full;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(full)}
                    className={`relative w-20 h-20 shrink-0 rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                      isActive
                        ? 'border-cyan-400 shadow-[0_0_14px_rgba(0,229,255,0.35)] scale-105'
                        : 'border-white/10 hover:border-white/30 bg-white/3 hover:bg-white/6'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={`View ${idx + 1}`}
                      className="w-full h-full object-contain p-1.5"
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── PRICE & HISTORY SECTION ── */}
        <div
          style={{ marginTop: '200px' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 pt-8"
        >
          {/* Left Column: Live Price Comparison */}
          <motion.div>
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8" />
            {/* ── PRICE COMPARISON BOX ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-cyan-400 tracking-tight">
                    Live Price Comparison
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    Lowest from{' '}
                    <span className="text-green-400 font-bold text-lg">
                      ৳{lowestPrice.toLocaleString()}
                    </span>
                  </p>
                </div>
                <span className="text-sm text-gray-500 font-medium px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  {shops.length} stores
                </span>
              </div>

              {/* Shop rows with gaps */}
              <div className="flex flex-col gap-3">
                {shops.map((shop, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 + idx * 0.05 }}
                    className={`grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 px-5 py-4 rounded-2xl border transition-colors duration-200 backdrop-blur-xl ${
                      shop.stock
                        ? 'bg-white/[0.02] border-white/8 hover:bg-white/5 hover:border-white/10'
                        : 'bg-white/[0.01] border-white/5 opacity-50'
                    } ${idx === 0 ? 'bg-cyan-500/5 border-cyan-500/20' : ''}`}
                  >
                    {/* Left: logo + name + delivery */}
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 border"
                        style={{
                          background: `${shop.color}15`,
                          borderColor: `${shop.color}30`,
                          color: shop.color,
                        }}
                      >
                        {shop.logo}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white truncate flex items-center gap-2">
                          {shop.name}
                          {idx === 0 && (
                            <span className="text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                              BEST
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Truck className="w-3.5 h-3.5 text-gray-500" />
                          <span
                            className={`text-xs font-medium ${shop.stock ? 'text-gray-400' : 'text-red-400'}`}
                          >
                            {shop.delivery}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Price */}
                    <div className="flex justify-center">
                      <span
                        className={`text-lg font-bold tracking-tight ${shop.stock ? 'text-white' : 'text-gray-600'}`}
                      >
                        ৳{shop.price.toLocaleString()}
                      </span>
                    </div>

                    {/* Right: Trust Score */}
                    <div className="flex justify-center items-center gap-1.5">
                      <Star
                        className={`w-4 h-4 ${shop.stock ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                      />
                      <span
                        className={`text-sm font-bold ${shop.stock ? 'text-white' : 'text-gray-600'}`}
                      >
                        {shop.trust}
                      </span>
                    </div>

                    {/* End: Direct Buy Link */}
                    <div className="flex justify-end">
                      <button
                        disabled={!shop.stock}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all duration-200 ${
                          shop.stock
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white hover:scale-105 active:scale-95'
                            : 'bg-transparent border-white/5 text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        {shop.stock ? 'Buy Now' : 'Out of Stock'}
                        {shop.stock && <ExternalLink className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Price History Chart */}
          <motion.div className="flex flex-col h-full">
            {/* Divider for desktop to match left side */}
            <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8 hidden lg:block" />
            {/* Price History Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-lg backdrop-blur-xl flex-1 flex flex-col"
            >
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Price History (6 Months)
              </h3>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={priceHistoryData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `৳${val / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0c1228',
                        borderColor: '#ffffff20',
                        borderRadius: '12px',
                      }}
                      itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                      formatter={(value) => [`৳${Number(value).toLocaleString()}`, 'Lowest Price']}
                      labelStyle={{ color: '#888' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
