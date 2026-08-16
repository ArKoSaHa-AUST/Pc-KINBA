import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const specsData = [
  {
    category: 'General',
    items: [
      { label: 'Architecture', value: 'NVIDIA Blackwell' },
      { label: 'Core Clock', value: '2.1 GHz' },
      { label: 'Boost Clock', value: '2.5 GHz' },
      { label: 'CUDA Cores', value: '5120' },
    ],
  },
  {
    category: 'Memory',
    items: [
      { label: 'Memory Size', value: '8 GB' },
      { label: 'Memory Type', value: 'GDDR6' },
      { label: 'Memory Bus', value: '128-bit' },
      { label: 'Bandwidth', value: '288 GB/s' },
    ],
  },
  {
    category: 'Power & Dimensions',
    items: [
      { label: 'TDP', value: '115W' },
      { label: 'Suggested PSU', value: '550W' },
      { label: 'Length', value: '242 mm' },
      { label: 'Slot Size', value: '2 Slots' },
    ],
  },
];

export default function TechnicalSpecs() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-[100px] lg:py-[140px] relative">
      <div className="absolute inset-0 bg-gray-900/40 pointer-events-none" />
      <div className="container max-w-[1000px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-title mb-4">Technical Specifications</h2>
          <p className="text-subtitle">
            Deep dive into the architecture and hardware capabilities.
          </p>
        </div>

        <div className="space-y-8">
          {specsData.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`glass-card overflow-hidden transition-all duration-300 ${openIndex === idx ? 'border-cyan-500/30 shadow-[0_10px_30px_rgba(0,229,255,0.1)]' : 'hover:border-white/20'}`}
            >
              <button
                className="w-full px-10 py-7 flex items-center justify-between text-left hover:bg-white/5 transition-colors focus:outline-none"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span
                  className={`text-xl font-bold tracking-tight transition-colors ${openIndex === idx ? 'text-cyan-400' : 'text-white'}`}
                >
                  {section.category}
                </span>
                <div
                  className={`p-2 rounded-full transition-colors ${openIndex === idx ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-gray-400'}`}
                >
                  <ChevronDown
                    className={`w-6 h-6 transition-transform duration-500 ${openIndex === idx ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-10 pb-10 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-8">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex flex-col border-b border-white/5 pb-5">
                            <span className="text-sm text-gray-500 mb-1 font-medium tracking-wide uppercase">
                              {item.label}
                            </span>
                            <span className="text-gray-100 font-semibold text-lg">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
