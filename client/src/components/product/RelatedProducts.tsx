import { motion } from 'framer-motion';
import { Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const relatedProducts = [
  {
    id: 'cpu-ryzen-7600x',
    name: 'AMD Ryzen 5 7600X',
    image:
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400',
    price: '$229',
    rating: 4.8,
  },
  {
    id: 'mb-b650-tomahawk',
    name: 'MSI MAG B650 TOMAHAWK',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
    price: '$199',
    rating: 4.7,
  },
  {
    id: 'psu-rm750e',
    name: 'Corsair RM750e (2023)',
    image:
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=400',
    price: '$99',
    rating: 4.9,
  },
  {
    id: 'ram-flare-x5',
    name: 'G.Skill Flare X5 32GB',
    image:
      'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=400',
    price: '$105',
    rating: 4.6,
  },
  {
    id: 'cooler-nh-d15',
    name: 'Noctua NH-D15',
    image:
      'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&q=80&w=400',
    price: '$119',
    rating: 4.9,
  },
];

export default function RelatedProducts() {
  const navigate = useNavigate();

  return (
    <section className="py-[100px] lg:py-[140px] relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex items-end justify-between mb-16">
          <div>
            <h2 className="text-title mb-2">Frequently Bought Together</h2>
            <p className="text-subtitle">Complete your ultimate build.</p>
          </div>
          <button className="hidden md:flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            View All <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-8 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
          {relatedProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-card min-w-[280px] md:min-w-[340px] p-6 cursor-pointer group hover:bg-white/10 transition-all duration-300 snap-center hover:shadow-[0_10px_40px_rgba(0,229,255,0.15)] flex-shrink-0"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="aspect-[4/3] bg-gray-900 rounded-[20px] mb-6 p-6 flex items-center justify-center overflow-hidden border border-white/5">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-700 ease-out drop-shadow-2xl"
                  loading="lazy"
                />
              </div>
              <div className="px-2">
                <h3 className="font-bold text-white mb-3 text-lg line-clamp-1 group-hover:text-cyan-400 transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{product.price}</span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {product.rating}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
