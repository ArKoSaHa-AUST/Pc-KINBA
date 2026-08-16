import { motion } from 'framer-motion';
import './Testimonials.css';

const testimonials = [
  {
    name: 'Alex Rivera',
    role: 'PC Enthusiast',
    review:
      'This AI recommended a build I never would have thought of. It perfectly balanced my budget for 1440p gaming.',
    rating: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    review:
      'The compatibility checker saved me from buying a case that was too small for my GPU. Absolutely essential tool.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'First-time Builder',
    review:
      'I was intimidated by building a PC, but this platform made it foolproof. The performance estimates were spot on.',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="section testimonials-section">
      <div className="container">
        <div className="features-header">
          <h2 className="section-title">
            Loved by <span className="gradient-text">Builders</span>
          </h2>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((test, i) => (
            <motion.div
              key={i}
              className="glass-card testimonial-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <div className="stars">
                {[...Array(test.rating)].map((_, idx) => (
                  <span key={idx} className="star">
                    ★
                  </span>
                ))}
              </div>
              <p className="review-text">"{test.review}"</p>
              <div className="reviewer">
                <div className="avatar"></div>
                <div>
                  <div className="reviewer-name">{test.name}</div>
                  <div className="reviewer-role">{test.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
