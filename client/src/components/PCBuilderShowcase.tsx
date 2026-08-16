import { motion } from 'framer-motion';
import { Settings, CheckCircle2, Zap } from 'lucide-react';
import './PCBuilderShowcase.css';

export default function PCBuilderShowcase() {
  return (
    <section className="section builder-section" id="builder">
      <div className="container">
        <motion.div
          className="builder-header text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">
            Smart <span className="gradient-text">PC Builder</span>
          </h2>
          <p className="section-subtitle">
            Visual, interactive, and completely fool-proof. See exactly what you're building.
          </p>
        </motion.div>

        <motion.div
          className="builder-dashboard glass-card"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="dashboard-sidebar">
            <div className="budget-slider">
              <label>Budget</label>
              <div className="slider-track">
                <div className="slider-fill" style={{ width: '60%' }}></div>
                <div className="slider-thumb" style={{ left: '60%' }}></div>
              </div>
              <div className="budget-value">$1,850</div>
            </div>

            <div className="score-widget">
              <div className="score-circle">
                <span className="score-num">98</span>
                <span className="score-label">Compatibility</span>
              </div>
            </div>

            <div className="perf-meter">
              <label>
                <Zap size={16} /> 1440p Gaming FPS
              </label>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: '85%' }}></div>
              </div>
              <span className="fps-val">145+ FPS</span>
            </div>
          </div>

          <div className="dashboard-main">
            <div className="component-list">
              {['GPU', 'CPU', 'Motherboard', 'RAM', 'Storage', 'Power Supply', 'Case'].map(
                (comp, i) => (
                  <div key={i} className="comp-item glass">
                    <div className="comp-icon">
                      <Settings size={20} />
                    </div>
                    <div className="comp-details">
                      <span className="comp-type">{comp}</span>
                      <span className="comp-name">Auto Selected based on budget</span>
                    </div>
                    <div className="comp-status">
                      <CheckCircle2 size={20} className="text-green" />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
