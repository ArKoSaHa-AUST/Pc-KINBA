import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2,
  PackageCheck,
  RefreshCw
} from 'lucide-react';

interface ProductHeroProps {
  product?: any;
  loading?: boolean;
}

const defaultThumbnails = [
  'https://images.unsplash.com/photo-1590253232292-5c0c4c04e428?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&q=80&w=600',
];

export default function ProductHero({ product, loading }: ProductHeroProps) {
  const [activeImage, setActiveImage] = useState<string>('');
  const [wished, setWished] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [liveShops, setLiveShops] = useState<any[]>([]);
  const [bestPriceStr, setBestPriceStr] = useState<string>('');

  useEffect(() => {
    if (product?.image_url) {
      setActiveImage(product.image_url);
      setImgError(false);
    }
    if (product?.shops) {
      setLiveShops(product.shops);
    }
    if (product?.best_price_str) {
      setBestPriceStr(product.best_price_str);
    }
  }, [product]);

  const handleLiveGoogleScan = async () => {
    if (!product?.id || isScanning) return;
    setIsScanning(true);
    try {
      const res = await fetch(`http://localhost:3001/api/product/${product.id}/live-prices`);
      if (res.ok) {
        const data = await res.json();
        if (data.shops && data.shops.length > 0) {
          setLiveShops(data.shops);
          if (data.best_price_str) {
            setBestPriceStr(data.best_price_str);
          }
        }
      }
    } catch (err) {
      console.error('Error during live Google price scan:', err);
    } finally {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <section className="relative pt-12 pb-20 overflow-hidden flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-cyan-400">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-medium text-gray-400">Loading accurate product details...</p>
        </div>
      </section>
    );
  }

  const title = product?.title || 'Component Product Details';
  const brand = product?.brand || 'Generic';
  const category = product?.category || 'Components';
  const displayPrice = product?.price_str || (product?.price ? `${product.price.toLocaleString()}৳` : 'Price on Request');
  const primaryImageUrl = !imgError && activeImage ? activeImage : defaultThumbnails[0];
  const shops = liveShops.length > 0 ? liveShops : (product?.shops || []);
  const keyFeatures = product?.keyFeatures || [
    { label: 'Brand', value: brand },
    { label: 'Model', value: title },
    { label: 'Category', value: category },
    { label: 'Source', value: product?.retailer || 'StarTech BD / Ryans' }
  ];

  const validPricedShops = shops.filter((s: any) => s.price && s.price > 0);
  const lowestPriceNum = validPricedShops.length > 0
    ? Math.min(...validPricedShops.map((s: any) => s.price))
    : (product?.price || 0);

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
          className="flex items-center gap-2 text-xs lg:text-sm text-gray-500 mb-6 flex-wrap"
        >
          <Home className="w-3.5 h-3.5" />
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="hover:text-gray-300 cursor-pointer transition-colors">Components</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="hover:text-gray-300 cursor-pointer transition-colors">
            {category}
          </span>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-gray-300 font-medium truncate max-w-[300px]">{title}</span>
        </motion.nav>

        {/* Main grid: LEFT info | RIGHT image */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-start">
          {/* ── LEFT COLUMN ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            {/* Brand + Status + Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs border border-cyan-400/30 bg-cyan-400/5 px-3 py-1.5 rounded-full">
                  {brand}
                </span>
                <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-full">
                  <Activity className="w-3 h-3" /> Verified In Stock
                </span>
                <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  Source: <span className="text-cyan-300 font-semibold">{product?.retailer || 'Partner Retailer'}</span>
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

            {/* Title + Price Display */}
            <div>
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white mb-3">
                {title}
              </h1>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl lg:text-4xl font-black text-cyan-400 tracking-tight">
                  {displayPrice}
                </span>
                <span className="text-xs text-gray-400">Aggregated real-time price</span>
              </div>
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
                <span className="text-white font-semibold text-sm">4.9</span>
                <span className="text-gray-500 text-xs">(Verified Listing)</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authentic Manufacturer Warranty</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

            {/* Key Specifications */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">
                Key Specifications
              </h3>
              <div className="flex flex-col divide-y divide-white/5">
                {keyFeatures.map((feat: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 py-3">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400/60 mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-500 w-36 shrink-0 font-semibold">
                      {feat.label}
                    </span>
                    <span className="text-xs text-gray-200 leading-relaxed">{feat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Image Box ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="flex flex-col gap-4 lg:sticky lg:top-28"
          >
            {/* Main Image */}
            <div className="relative group rounded-3xl overflow-hidden bg-[#0c1228] border border-white/10 shadow-[0_0_80px_rgba(0,229,255,0.05)] aspect-[4/3] flex items-center justify-center p-8">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/8 blur-[70px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/8 blur-[60px] rounded-full pointer-events-none" />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg shadow-cyan-500/25">
                  Verified Data
                </span>
                <span className="bg-white/10 border border-white/15 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
                  PC Kinba Aggregated
                </span>
              </div>

              <motion.img
                key={primaryImageUrl}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={primaryImageUrl}
                alt={title}
                onError={() => setImgError(true)}
                className="object-contain max-h-[300px] w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] transform group-hover:scale-[1.03] transition-transform duration-500"
              />

              {/* Bottom Right: View More Details button */}
              <a
                href={product?.product_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 hover:text-cyan-200 text-xs font-bold transition-all backdrop-blur-md shadow-lg hover:scale-105"
              >
                View More Details <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* ── PRICE COMPARISON SECTION ── */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-cyan-400 tracking-tight">
                  Live Store Price Comparison
                </h3>
                <button
                  onClick={handleLiveGoogleScan}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Run real-time Google search across all BD tech stores"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning Google Live...' : 'Live Google Scan'}
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1.5 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-green-400" />
                Best Price Available:{' '}
                <span className="text-green-400 font-bold text-lg">
                  {bestPriceStr || (lowestPriceNum > 0 ? `৳${lowestPriceNum.toLocaleString()}` : displayPrice)}
                </span>
              </p>
            </div>
            <span className="text-xs text-gray-400 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              Comparing {shops.length > 0 ? shops.length : 1} verified retailer(s)
            </span>
          </div>

          {/* Store Rows */}
          <div className="flex flex-col gap-3">
            {shops.length > 0 ? (
              shops.map((shop: any, idx: number) => {
                const isBestDeal = shop.price > 0 && shop.price === lowestPriceNum;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 rounded-2xl border transition-all ${
                      isBestDeal
                        ? 'border-cyan-500/40 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md"
                        style={{ backgroundColor: shop.color || '#00e5ff' }}
                      >
                        {shop.logo || shop.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{shop.name}</h4>
                          {isBestDeal && (
                            <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-extrabold uppercase tracking-wider">
                              Best Deal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">Direct Retailer Listing</p>
                      </div>
                    </div>

                    <div>
                      {shop.price > 0 && (shop.stock !== false) ? (
                        <span className="text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          <PackageCheck className="w-3 h-3" /> In Stock
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                          Check Retailer
                        </span>
                      )}
                    </div>

                    <div>
                      <span className={`text-lg font-extrabold ${isBestDeal ? 'text-green-400' : 'text-white'}`}>
                        {shop.price_str || (shop.price > 0 ? `${shop.price?.toLocaleString()}৳` : 'Call for Price')}
                      </span>
                    </div>

                    <div>
                      <a
                        href={shop.product_url || product?.product_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 hover:scale-105"
                      >
                        Buy Direct <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center font-bold text-sm text-slate-950">
                    {product?.retailer?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{product?.retailer || 'StarTech BD'}</h4>
                    <p className="text-xs text-gray-400">Verified Retailer</p>
                  </div>
                </div>
                <div className="text-lg font-extrabold text-white">{displayPrice}</div>
                <a
                  href={product?.product_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
                >
                  Buy Direct <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
