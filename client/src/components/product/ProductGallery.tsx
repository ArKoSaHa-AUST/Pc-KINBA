import { motion } from 'framer-motion';

const images = [
  {
    src: 'https://images.unsplash.com/photo-1590253232292-5c0c4c04e428?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-[4/3]',
  },
  {
    src: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-[3/4]',
  },
  {
    src: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-square',
  },
  {
    src: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-[16/9]',
  },
  {
    src: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-[3/4]',
  },
  {
    src: 'https://images.unsplash.com/photo-1624838637213-92f7e7a3eb03?auto=format&fit=crop&q=80&w=800',
    aspect: 'aspect-[4/3]',
  },
];

export default function ProductGallery() {
  return (
    <section className="py-[100px] lg:py-[140px] relative z-10">
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-title mb-4">Product Gallery</h2>
          <p className="text-subtitle">High-resolution shots of the NVIDIA GeForce RTX 5060 Ti.</p>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`break-inside-avoid relative rounded-3xl overflow-hidden bg-gray-900 border border-white/10 group cursor-zoom-in ${img.aspect}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <img
                src={img.src}
                alt={`Gallery image ${i + 1}`}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
