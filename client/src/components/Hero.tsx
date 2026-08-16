import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import './Hero.css';

export default function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="hero-section" id="home">
      <div className="hero-bg">
        <div className="bg-mesh"></div>
        {/* Animated stars/particles would go here */}
      </div>

      <div className="container hero-container">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className="badge glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="gradient-text-alt">AI-Powered</span> PC Builder
          </motion.div>

          <h1 className="hero-title">
            Build Your <br />
            <span className="gradient-text">Dream PC</span> <br />
            with AI
          </h1>

          <p className="hero-subtitle">
            Find the best PC components, compare hardware, get AI recommendations, and build the
            perfect setup within your budget.
          </p>

          <div className="hero-actions">
            <button className="button-primary hero-btn">
              Build Your PC <ChevronRight size={18} />
            </button>
            <button className="button-secondary hero-btn">Explore Components</button>
          </div>
        </motion.div>

        <motion.div
          className="hero-image-container"
          style={{ y: y1, opacity }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="glow-orb"></div>
          <img
            src="/hero-pc.png"
            alt="Floating Futuristic Gaming PC"
            className="hero-image animate-float"
          />
        </motion.div>
      </div>

      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="mouse"></div>
      </motion.div>
    </section>
  );
}
