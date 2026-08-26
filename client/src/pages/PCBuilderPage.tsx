import Lenis from 'lenis';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import AIOptimizer from '../components/builder/AIOptimizer';
import AssemblyViewport3D from '../components/builder/AssemblyViewport3D';
import BuildSummary from '../components/builder/BuildSummary';
import BuilderHero from '../components/builder/BuilderHero';
import ComponentGrid from '../components/builder/ComponentGrid';
import ComponentSelectModal from '../components/builder/ComponentSelectModal';
import ExportActions from '../components/builder/ExportActions';
import { BUDGET_MAX, BUDGET_MIN, type BuildPurpose } from '../components/builder/buildConfig';
import {
  BUILDER_CATALOG,
  type BuilderProduct,
  type ComponentCategory,
} from '../components/builder/builderCatalog';
import type { BuildSelection } from '../components/builder/compatibility';
import { useToast } from '../components/ui/useToast';
import { saveBuild } from '../api/builds';
import './PCBuilderPage.css';

// Hydrate from a share link: /pc-builder?parts=id1,id2,…
function buildFromShareLink(): BuildSelection {
  const ids = new URLSearchParams(window.location.search).get('parts')?.split(',') ?? [];
  const selection: BuildSelection = {};
  for (const id of ids) {
    const product = BUILDER_CATALOG.find((p) => p.id === id);
    if (product) selection[product.category] = product;
  }
  return selection;
}

export default function PCBuilderPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const navigate = useNavigate();
  const { status } = useAuth();
  const { toast } = useToast();
  const [budget, setBudget] = useState<[number, number]>([BUDGET_MIN, BUDGET_MAX]);
  const [purpose, setPurpose] = useState<BuildPurpose>('Gaming');
  const [build, setBuild] = useState<BuildSelection>(buildFromShareLink);
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

  const handleSaveBuild = useCallback(async () => {
    if (status !== 'authenticated') {
      toast({ message: 'Sign in to save your build.', variant: 'info' });
      navigate('/login');
      return;
    }
    try {
      const saved = await saveBuild(build);
      toast({ message: `“${saved.name}” saved to your profile.`, variant: 'success' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save build.';
      toast({ message: msg, variant: 'danger' });
    }
  }, [status, build, navigate, toast]);

  const scrollToSummary = useCallback(() => {
    const target = document.getElementById('build-summary');
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

      {/* Section 3: Live 3D Assembly Viewport */}
      <section className="section builder-assembly-section">
        <div className="container">
          <h2 className="builder-section-title">
            Live <span className="gradient-text">3D Assembly</span>
          </h2>
          <p className="builder-section-subtitle">
            Watch your rig come together — drag to orbit, explode the view, click any part to
            configure it.
          </p>
          <AssemblyViewport3D build={build} onOpenCategory={setActiveCategory} />
        </div>
      </section>

      {/* Section 4: Build Summary & Analytics */}
      <section id="build-summary" className="section builder-summary-section">
        <div className="container">
          <h2 className="builder-section-title">
            Build <span className="gradient-text">Summary</span>
          </h2>
          <p className="builder-section-subtitle">
            Price, power, performance and compatibility — updated live as you pick parts.
          </p>
          <BuildSummary
            build={build}
            budget={budget}
            onOpenCategory={setActiveCategory}
            onRemove={handleRemove}
          />
        </div>
      </section>

      {/* Section 5: AI Optimization & Export */}
      <section className="section builder-ai-section">
        <div className="container">
          <h2 className="builder-section-title">
            Optimize & <span className="gradient-text">Export</span>
          </h2>
          <p className="builder-section-subtitle">
            Let AI fine-tune your build, then save, share or export it.
          </p>
          <AIOptimizer build={build} onApply={handleSelectProduct} />
          <ExportActions build={build} onSave={handleSaveBuild} onCheckout={scrollToSummary} />
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
