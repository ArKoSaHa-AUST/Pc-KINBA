import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import BuilderHero from '../components/builder/BuilderHero';
import { BUDGET_MIN, BUDGET_MAX, type BuildPurpose } from '../components/builder/buildConfig';
import './PCBuilderPage.css';

export default function PCBuilderPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const [budget, setBudget] = useState<[number, number]>([BUDGET_MIN, BUDGET_MAX]);
  const [purpose, setPurpose] = useState<BuildPurpose>('Gaming');

  // Initialize Lenis inertial smooth scroll (same pattern as ComparePage)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const handleStartBuilding = useCallback(() => {
    const target = document.getElementById('component-grid');
    if (!target) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -24 });
    } else {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="pc-builder-page">
      <BuilderHero
        budget={budget}
        onBudgetChange={setBudget}
        purpose={purpose}
        onPurposeChange={setPurpose}
        onStartBuilding={handleStartBuilding}
      />

      {/* Section 2 anchor — Component Selection Grid (built in Part 2) */}
      <section id="component-grid" className="section builder-grid-section">
        <div className="container">
          <h2 className="builder-section-title">
            Choose Your <span className="gradient-text">Components</span>
          </h2>
          <p className="builder-section-subtitle">
            Component selection grid coming online — 8 hardware categories, real-time compatibility
            checks, and live 3D assembly.
          </p>
        </div>
      </section>
    </div>
  );
}
