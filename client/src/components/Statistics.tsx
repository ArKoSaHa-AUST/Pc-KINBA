import { motion } from 'framer-motion';
import './Statistics.css';

const stats = [
  { value: '20K+', label: 'Components' },
  { value: '100K+', label: 'Builds Created' },
  { value: '95%', label: 'Compatibility Accuracy' },
  { value: '4.9★', label: 'User Rating' },
];

export default function Statistics() {
  return (
    <section className="section stats-section">
      <div className="container">
        <div className="stats-grid">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="stat-item"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
            >
              <h3 className="stat-value gradient-text">{stat.value}</h3>
              <p className="stat-label">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
