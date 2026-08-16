import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import './CTA.css';

export default function CTA() {
  return (
    <section className="section cta-section">
      <div className="container">
        <motion.div
          className="cta-card glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="cta-glow"></div>
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Build Your <br />
              Dream PC?
            </h2>
            <p className="cta-subtitle">
              Join thousands of builders using our AI to create the perfect rig.
            </p>
            <div className="cta-actions">
              <button className="button-primary hero-btn">
                Start Building <ChevronRight size={18} />
              </button>
              <button className="button-secondary hero-btn">
                <Sparkles size={18} className="inline-icon" /> Try AI Assistant
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
