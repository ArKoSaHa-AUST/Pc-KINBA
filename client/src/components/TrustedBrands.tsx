import { motion } from 'framer-motion';
import './TrustedBrands.css';

const brands = ['NVIDIA', 'AMD', 'Intel', 'MSI', 'ASUS', 'Gigabyte', 'Corsair', 'Kingston'];

export default function TrustedBrands() {
  return (
    <section className="brands-section">
      <div className="container">
        <p className="brands-title">POWERED BY INDUSTRY LEADERS</p>
        <div className="brands-marquee">
          <div className="brands-track">
            {[...brands, ...brands].map((brand, index) => (
              <motion.div
                key={index}
                className="brand-logo"
                whileHover={{ filter: 'grayscale(0%)', opacity: 1, scale: 1.1 }}
              >
                {/* Normally we'd use SVG logos here. Simulating with text for layout */}
                <span>{brand}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
