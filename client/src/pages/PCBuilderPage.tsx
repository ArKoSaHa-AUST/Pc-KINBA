import { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import BuilderHero from '../components/builder/BuilderHero';
import ComponentGrid from '../components/builder/ComponentGrid';
import ComponentSelectModal from '../components/builder/ComponentSelectModal';
import { BUDGET_MIN, BUDGET_MAX, type BuildPurpose } from '../components/builder/buildConfig';
import type { BuilderProduct, ComponentCategory } from '../components/builder/builderCatalog';
import type { BuildSelection } from '../components/builder/compatibility';
import './PCBuilderPage.css';

export default function PCBuilderPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const [budget, setBudget] = useState<[number, number]>([BUDGET_MIN, BUDGET_MAX]);
  const [purpose, setPurpose] = useState<BuildPurpose>('Gaming');
  const [build, setBuild] = useState<BuildSelection>({});
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | null>(null);

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

  const handleSelectProduct = useCallback((product: BuilderProduct) => {
    setBuild((prev) => ({ ...prev, [product.category]: product }));
    setActiveCategory(null);
  }, []);

  const handleRemove = useCallback((category: ComponentCategory) => {
    setBuild((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
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

      {/* Section 2: Component Selection Grid */}
      <section id="component-grid" className="section builder-grid-section">
        <div className="container">
          <h2 className="builder-section-title">
            Choose Your <span className="gradient-text">Components</span>
          </h2>
          <p className="builder-section-subtitle">
            Pick parts across 8 hardware categories — compatibility is checked in real time.
          </p>
          <ComponentGrid build={build} onOpenCategory={setActiveCategory} onRemove={handleRemove} />
        </div>
      </section>

      <ComponentSelectModal
        category={activeCategory}
        build={build}
        onClose={() => setActiveCategory(null)}
        onSelect={handleSelectProduct}
      />
    </div>
  );
}
