import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Store, Layers, Sparkles, Cpu, ShieldCheck, Check } from 'lucide-react';
import { use3DTilt } from './use3DTilt';
import './TonimaFeatureCards.css';

interface FeatureCardProps {
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
  index: number;
}

function ParallaxFeatureCard({
  icon,
  badge,
  title,
  description,
  children,
  index,
}: FeatureCardProps) {
  const {
    cardRef,
    rotateX,
    rotateY,
    scale,
    glossPos,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = use3DTilt({ maxTilt: 7, scaleOnHover: 1.02 });

  return (
    <motion.div
      ref={cardRef}
      className="tonima-feature-card-wrapper"
      initial={{ opacity: 0, rotateX: 25, scale: 0.85, y: 40 }}
      whileInView={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.8,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="tonima-feature-card"
        style={{
          rotateX,
          rotateY,
          scale,
        }}
      >
        {/* Dynamic Gloss Highlight Overlay */}
        <div
          className="tonima-card-gloss"
          style={{
            background: `radial-gradient(circle at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.35), transparent 60%)`,
          }}
        />

        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="tonima-feature-icon-box">{icon}</div>
          <span className="tonima-feature-badge">{badge}</span>
        </div>

        {/* Card Title & Description */}
        <h3 className="tonima-feature-title">{title}</h3>
        <p className="tonima-feature-desc">{description}</p>

        {/* Interactive Visual Content */}
        <div className="tonima-feature-interactive-box">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export default function TonimaFeatureCards() {
  const [activeTabRetailer, setActiveTabRetailer] = useState<string>('Star Tech');

  const retailerPrices = [
    { name: 'Star Tech', price: 68500, stock: true, badge: 'Official Partner' },
    { name: 'Tech Land', price: 67900, stock: true, badge: 'Lowest Price' },
    { name: 'Ryans Computers', price: 69200, stock: true, badge: 'Nationwide Pickup' },
    { name: 'Custom Mac BD', price: 68800, stock: false, badge: 'Restocking Soon' },
  ];

  return (
    <section className="tonima-features-section" id="tonima-features">
      <div className="tonima-features-container">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-glass-border text-xs font-semibold text-accent mb-4 shadow-[0_0_15px_var(--glass-glow)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3D Spatial Intelligence Matrix</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            Next-Gen Neural Hardware <br />
            <span className="gradient-accent">Architectural Capabilities</span>
          </h2>
          <p className="text-sm sm:text-base text-text-secondary mt-3">
            Real-time validation algorithms, live multi-retailer aggregation across Bangladesh, and
            interactive 3D component breakdown.
          </p>
        </motion.div>

        {/* 3D Parallax Feature Cards Grid */}
        <div className="tonima-features-grid">
          {/* Card 1: Real-Time Bottleneck AI */}
          <ParallaxFeatureCard
            index={0}
            icon={<Activity className="w-5 h-5 text-accent" />}
            badge="Neural Auditor"
            title="Real-Time Bottleneck AI"
            description="Simulates CPU/GPU compute parity, memory throughput, and PCIe lane saturation to prevent thermal throttling and compute imbalance."
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-bg-surface/80 p-2.5 rounded-xl border border-glass-border">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-accent" /> 1440p Parity Score
                </span>
                <span className="text-green font-extrabold">98.2% (Optimal)</span>
              </div>
              <div className="flex justify-between items-center bg-bg-surface/80 p-2.5 rounded-xl border border-glass-border">
                <span className="text-text-secondary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green" /> Memory Bus Width
                </span>
                <span className="text-accent font-mono">256-bit DDR5</span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-gradient-to-r from-accent to-purple h-full w-[96%]" />
              </div>
            </div>
          </ParallaxFeatureCard>

          {/* Card 2: Bangladesh Live Retailer Sync */}
          <ParallaxFeatureCard
            index={1}
            icon={<Store className="w-5 h-5 text-purple" />}
            badge="Live Market Sync"
            title="Bangladesh Retailer Tracker"
            description="Aggregates live BDT (৳) pricing and instantaneous stock status directly from leading tech hubs across Dhaka, Chittagong, and online vendors."
          >
            <div className="space-y-2 text-xs">
              {retailerPrices.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTabRetailer(r.name)}
                  className={`flex justify-between items-center p-2 rounded-xl border cursor-pointer transition-all ${
                    activeTabRetailer === r.name
                      ? 'bg-accent/15 border-accent text-text-primary'
                      : 'bg-bg-surface/60 border-glass-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-[10px] text-text-muted">{r.badge}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-accent">৳ {r.price.toLocaleString('en-IN')}</span>
                    <span className={`text-[10px] flex items-center gap-1 ${r.stock ? 'text-green' : 'text-danger'}`}>
                      {r.stock ? <Check className="w-2.5 h-2.5" /> : null}
                      {r.stock ? 'In Stock' : 'Stockout'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ParallaxFeatureCard>

          {/* Card 3: Dynamic 3D Exploded View */}
          <ParallaxFeatureCard
            index={2}
            icon={<Layers className="w-5 h-5 text-green" />}
            badge="3D Spatial Engine"
            title="Dynamic 3D Exploded View"
            description="Disassembles high-fidelity hardware models on the Z-axis to inspect RAM clearances, cooler mounting brackets, and GPU sag tolerances."
          >
            <div className="relative p-3 rounded-xl bg-bg-surface/80 border border-glass-border flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted font-medium">Interactive Disassembly</span>
                <span className="text-accent font-mono text-[11px]">Z-Axis +65mm</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 rounded-lg bg-fill-subtle border border-glass-border flex flex-col">
                  <span className="text-[10px] text-accent font-bold">GPU Clearance</span>
                  <span className="text-xs font-bold text-text-primary mt-0.5">340mm / 400mm</span>
                </div>
                <div className="p-2 rounded-lg bg-fill-subtle border border-glass-border flex flex-col">
                  <span className="text-[10px] text-purple font-bold">Cooler Height</span>
                  <span className="text-xs font-bold text-text-primary mt-0.5">165mm Max OK</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-green mt-1">
                <Check className="w-3 h-3" />
                <span>Zero hardware spatial collisions detected</span>
              </div>
            </div>
          </ParallaxFeatureCard>
        </div>
      </div>
    </section>
  );
}
