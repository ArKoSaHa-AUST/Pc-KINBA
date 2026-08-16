import { motion } from 'framer-motion';
import './Comparison.css';

const gpus = [
  { name: 'RTX 4060 Ti', vram: '8GB GDDR6', pwr: '160W', price: '$399', fps: 110, score: 75 },
  {
    name: 'RTX 4070',
    vram: '12GB GDDR6X',
    pwr: '200W',
    price: '$599',
    fps: 145,
    score: 88,
    highlight: true,
  },
  { name: 'RTX 5060', vram: '12GB GDDR7', pwr: '175W', price: '$449', fps: 135, score: 92 },
];

export default function Comparison() {
  return (
    <section className="section compare-section" id="compare">
      <div className="container">
        <div className="features-header">
          <h2 className="section-title">
            Component <span className="gradient-text">Comparison</span>
          </h2>
          <p className="section-subtitle">
            Make informed decisions with our real-time performance and spec comparison matrix.
          </p>
        </div>

        <div className="compare-table-container glass-card">
          <table className="compare-table">
            <thead>
              <tr>
                <th>GPU Model</th>
                <th>VRAM</th>
                <th>TDP Power</th>
                <th>Est. Price</th>
                <th>1440p FPS</th>
                <th>Value Score</th>
              </tr>
            </thead>
            <tbody>
              {gpus.map((gpu, i) => (
                <motion.tr
                  key={i}
                  className={gpu.highlight ? 'highlight-row' : ''}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <td className="font-bold">{gpu.name}</td>
                  <td>{gpu.vram}</td>
                  <td>{gpu.pwr}</td>
                  <td className="text-accent">{gpu.price}</td>
                  <td>
                    <div className="fps-bar">
                      <div
                        className="fps-fill"
                        style={{ width: `${(gpu.fps / 150) * 100}%` }}
                      ></div>
                      <span>{gpu.fps}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`score-badge ${gpu.score > 85 ? 'high' : 'med'}`}>
                      {gpu.score}/100
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
