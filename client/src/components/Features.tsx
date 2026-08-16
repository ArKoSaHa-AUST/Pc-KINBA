import { motion } from 'framer-motion';
import { BrainCircuit, Cpu, Zap, Activity, DollarSign, Layers } from 'lucide-react';
import './Features.css';

const features = [
  {
    icon: <BrainCircuit size={32} className="feature-icon-svg" />,
    title: 'AI PC Recommendation',
    desc: 'Describe your needs, and our AI builds the perfect PC for you instantly.',
  },
  {
    icon: <DollarSign size={32} className="feature-icon-svg" />,
    title: 'Smart Budget Optimizer',
    desc: 'Get the absolute most FPS and performance for your exact budget.',
  },
  {
    icon: <Layers size={32} className="feature-icon-svg" />,
    title: 'Compatibility Checker',
    desc: 'Never worry about parts not fitting. We check 100+ compatibility rules.',
  },
  {
    icon: <Cpu size={32} className="feature-icon-svg" />,
    title: 'GPU & CPU Comparison',
    desc: 'Side-by-side benchmarks for every modern graphics card and processor.',
  },
  {
    icon: <Activity size={32} className="feature-icon-svg" />,
    title: 'Real-time Price Tracking',
    desc: 'Track price drops across multiple retailers to buy at the perfect time.',
  },
  {
    icon: <Zap size={32} className="feature-icon-svg" />,
    title: 'Performance Estimation',
    desc: 'See exactly how many FPS you will get in your favorite games before buying.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
    },
  }),
};

export default function Features() {
  return (
    <section className="section features-section" id="features">
      <div className="container">
        <motion.div
          className="features-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Why <span className="gradient-text">PC-KINBA?</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to build the ultimate rig, powered by advanced AI and real-time
            data.
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="glass-card feature-card"
              whileHover={{ y: -10, scale: 1.02 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
