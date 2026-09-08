import Lenis from 'lenis';
import { Trash2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveBuild } from '../api/builds';
import { useAuth } from '../auth/useAuth';
import AIOptimizer from '../components/builder/AIOptimizer';
import AssemblyViewport3D from '../components/builder/AssemblyViewport3D';
import BuildSummary from '../components/builder/BuildSummary';
import BuilderHero from '../components/builder/BuilderHero';
import BuildLibraryTeaser from '../components/builder/BuildLibraryTeaser';
import ComponentGrid from '../components/builder/ComponentGrid';
import ComponentSelectModal from '../components/builder/ComponentSelectModal';
import ExportActions from '../components/builder/ExportActions';
import { autoBuild } from '../components/builder/autoBuild';
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUILD_PURPOSES,
  formatTaka,
  type BuildPurpose,
} from '../components/builder/buildConfig';
import { resolvePreset, type BuildPreset } from '../components/builder/buildPresets';
import type { BuilderProduct, ComponentCategory } from '../components/builder/builderCatalog';
import {
  partIdsOf,
  selectionFromPartIds,
  totalPriceOf,
  type BuildSelection,
} from '../components/builder/compatibility';
import { useToast } from '../components/ui/useToast';
import { useBuilderCatalog } from '../hooks/useBuilderCatalog';
import './PCBuilderPage.css';

const DRAFT_KEY = 'pc-kinba.builder-draft';

interface Draft {
  partIds: string[];
  budget: [number, number];
  purpose: BuildPurpose;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const draft = raw ? (JSON.parse(raw) as Draft) : null;
    return draft && Array.isArray(draft.partIds) && draft.partIds.length ? draft : null;
  } catch {
    return null;
  }
}

export default function PCBuilderPage() {
  const lenisRef = useRef<Lenis | null>(null);
  const navigate = useNavigate();
  const { status } = useAuth();
  const { toast } = useToast();
  const catalog = useBuilderCatalog();
  const [budget, setBudget] = useState<[number, number]>([BUDGET_MIN, BUDGET_MAX]);
  const [purpose, setPurpose] = useState<BuildPurpose>('Gaming');
  const [build, setBuild] = useState<BuildSelection>({});
  const [hydrated, setHydrated] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ComponentCategory | null>(null);

  // Hydrate once the catalog is available: share link wins, otherwise the saved draft.
  useEffect(() => {
    if (hydrated || catalog.isLoading) return;
    const shared = new URLSearchParams(window.location.search).get('parts');
    if (shared) {
      setBuild(selectionFromPartIds(shared, catalog.byId));
    } else {
      const draft = readDraft();
      if (draft) {
        setBuild(selectionFromPartIds(draft.partIds.join(','), catalog.byId));
        setBudget(draft.budget);
        if (BUILD_PURPOSES.includes(draft.purpose)) setPurpose(draft.purpose);
        toast({ message: 'Resumed your saved build draft.', variant: 'info' });
      }
    }
    setHydrated(true);
  }, [hydrated, catalog.isLoading, catalog.byId, toast]);

  useEffect(() => {
    if (!hydrated) return;
    const partIds = partIdsOf(build);
    if (partIds.length) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ partIds, budget, purpose } satisfies Draft));
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [hydrated, build, budget, purpose]);

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

  const handleSelectProduct = useCallback((slot: ComponentCategory, product: BuilderProduct) => {
    setBuild((prev) => ({ ...prev, [slot]: product }));
    setActiveSlot(null);
  }, []);

  const handleRemove = useCallback((slot: ComponentCategory) => {
    setBuild((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setBuild({});
    toast({ message: 'Cleared all parts — starting fresh.', variant: 'info' });
  }, [toast]);

  const handleApplyPreset = useCallback(
    (preset: BuildPreset) => {
      setBuild(resolvePreset(preset, catalog.products, catalog.byId));
      setPurpose(preset.purpose);
      toast({ message: `Loaded “${preset.name}” — customise any part below.`, variant: 'success' });
      handleStartBuilding();
    },
    [catalog, toast, handleStartBuilding],
  );

  const handleAutoBuild = useCallback(() => {
    const next = autoBuild(build, budget[1], purpose, catalog.products);
    const added = Object.keys(next).length - Object.keys(build).length;
    setBuild(next);
    toast({
      message: added
        ? `Filled ${added} slot${added > 1 ? 's' : ''} for ${purpose} — ${formatTaka(totalPriceOf(next))} total.`
        : 'Every core slot is already filled.',
      variant: added ? 'success' : 'info',
    });
  }, [build, budget, purpose, catalog.products, toast]);

  const handleSaveBuild = useCallback(async () => {
    if (status !== 'authenticated') {
      toast({ message: 'Sign in to save your build.', variant: 'info' });
      navigate('/login');
      return;
    }
    try {
      const saved = await saveBuild(build, purpose);
      toast({
        message: `“${saved.name}” saved. Publish it to the Build Library from your profile.`,
        variant: 'success',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save build.';
      toast({ message: msg, variant: 'danger' });
    }
  }, [status, build, purpose, navigate, toast]);

  const handleCheckout = useCallback(() => {
    navigate(`/pc-builder/checkout?parts=${partIdsOf(build).join(',')}`);
  }, [build, navigate]);

  const remainingBudget =
    budget[1] - totalPriceOf(build) + (activeSlot ? (build[activeSlot]?.price ?? 0) : 0);

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
            {catalog.isLive && ' Prices are the lowest live offer across Bangladeshi retailers.'}
          </p>
          <BuildLibraryTeaser catalog={catalog} onApplyPreset={handleApplyPreset} />
          <div className="builder-grid-toolbar">
            <button
              type="button"
              className="button-secondary"
              onClick={handleClearAll}
              disabled={partIdsOf(build).length === 0}
            >
              <Trash2 size={15} /> Clear all
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={handleAutoBuild}
              disabled={catalog.isLoading}
            >
              <Wand2 size={16} /> Build it for me
              <span className="builder-grid-toolbar-hint">
                fills empty slots · {purpose} · up to {formatTaka(budget[1])}
              </span>
            </button>
          </div>
          <ComponentGrid build={build} onOpenCategory={setActiveSlot} onRemove={handleRemove} />
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
          <AssemblyViewport3D build={build} onOpenCategory={setActiveSlot} />
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
            purpose={purpose}
            onOpenCategory={setActiveSlot}
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
          <AIOptimizer
            build={build}
            budget={budget[1]}
            purpose={purpose}
            catalog={catalog.products}
            onApply={handleSelectProduct}
          />
          <ExportActions
            build={build}
            purpose={purpose}
            onSave={handleSaveBuild}
            onCheckout={handleCheckout}
          />
        </div>
      </section>

      <ComponentSelectModal
        slot={activeSlot}
        build={build}
        products={activeSlot ? catalog.forSlot(activeSlot) : []}
        remainingBudget={remainingBudget}
        onClose={() => setActiveSlot(null)}
        onSelect={handleSelectProduct}
      />
    </div>
  );
}
