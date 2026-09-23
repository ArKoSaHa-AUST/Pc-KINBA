import Lenis from 'lenis';
import { Trash2, Wand2 } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { defaultBuildName, saveBuild } from '../api/builds';
import { useAuth } from '../auth/useAuth';
import AIOptimizer from '../components/builder/AIOptimizer';
import BuildSummary from '../components/builder/BuildSummary';
import BuilderHero from '../components/builder/BuilderHero';
import BuildLibraryTeaser from '../components/builder/BuildLibraryTeaser';
import ComponentGrid from '../components/builder/ComponentGrid';
import ComponentSelectModal from '../components/builder/ComponentSelectModal';
import ExportActions from '../components/builder/ExportActions';
import SaveBuildModal from '../components/builder/SaveBuildModal';
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
import {
  loadTonimaHandoff,
  clearTonimaHandoff,
  resolveHandoffParts,
  toBuilderPurpose,
  type TonimaHandoffPart,
} from '../store/tonimaHandoff';
import { Bot, AlertCircle } from 'lucide-react';
import './PCBuilderPage.css';

const DRAFT_KEY = 'pc-kinba.builder-draft';

// three.js is ~1 MB — keep it out of the main bundle
const AssemblyViewport3D = lazy(() => import('../components/builder/AssemblyViewport3D'));

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
  const [saveOpen, setSaveOpen] = useState(false);
  const [isAiAssembled, setIsAiAssembled] = useState(false);
  const [unresolvedParts, setUnresolvedParts] = useState<TonimaHandoffPart[]>([]);

  // Hydrate: precedence is ?parts= + Tonima handoff -> ?parts= alone -> saved draft.
  useEffect(() => {
    if (hydrated || catalog.isLoading) return;
    const shared = new URLSearchParams(window.location.search).get('parts');
    const handoff = loadTonimaHandoff();
    const draft = readDraft();

    if (handoff) {
      // If user has an in-progress saved draft, ask before overwriting
      if (draft && draft.partIds.length > 0 && !window.location.search.includes('force=true')) {
        const shouldReplace = window.confirm(
          'You have an in-progress PC build saved. Would you like to replace it with Tonima AI’s assembled build?',
        );
        if (!shouldReplace) {
          clearTonimaHandoff();
          setBuild(selectionFromPartIds(draft.partIds.join(','), catalog.byId));
          setBudget(draft.budget);
          if (BUILD_PURPOSES.includes(draft.purpose)) setPurpose(draft.purpose);
          toast({ message: 'Kept your previous saved build draft.', variant: 'info' });
          setHydrated(true);
          return;
        }
      }

      // Resolve handoff parts against catalog
      const { selection, resolved, unresolved } = resolveHandoffParts(
        handoff.parts,
        catalog.byId,
        (slot) => catalog.forSlot(slot),
      );

      // Merge with shared URL IDs if present
      if (shared) {
        const urlSelection = selectionFromPartIds(shared, catalog.byId);
        Object.assign(selection, urlSelection);
      }

      setBuild(selection);
      setIsAiAssembled(true);

      if (handoff.purpose) {
        setPurpose(toBuilderPurpose(handoff.purpose));
      }

      if (handoff.budgetBDT) {
        const clampedBudget = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, handoff.budgetBDT));
        setBudget([Math.max(BUDGET_MIN, clampedBudget - 20000), clampedBudget]);
      }

      setUnresolvedParts(unresolved);
      clearTonimaHandoff();

      // Honest toast reporting
      if (unresolved.length === 0 && resolved.length > 0) {
        toast({
          message: `Tonima’s build loaded: ${resolved.length} of ${handoff.parts.length} parts matched.`,
          variant: 'success',
        });
      } else if (resolved.length > 0) {
        const missingCategories = unresolved.map((u) => u.category).join(', ');
        toast({
          message: `Loaded ${resolved.length} of ${handoff.parts.length} parts. ${missingCategories} aren't in the builder catalog yet.`,
          variant: 'info',
        });
      } else {
        toast({
          message: 'Could not match Tonima parts with local builder catalog items.',
          variant: 'danger',
        });
      }
    } else if (shared) {
      setBuild(selectionFromPartIds(shared, catalog.byId));
    } else {
      if (draft) {
        setBuild(selectionFromPartIds(draft.partIds.join(','), catalog.byId));
        setBudget(draft.budget);
        if (BUILD_PURPOSES.includes(draft.purpose)) setPurpose(draft.purpose);
        toast({ message: 'Resumed your saved build draft.', variant: 'info' });
      }
    }
    setHydrated(true);
  }, [hydrated, catalog.isLoading, catalog.byId, catalog, toast]);

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
    toast({ message: 'Cleared all parts, starting fresh.', variant: 'info' });
  }, [toast]);

  const handleApplyPreset = useCallback(
    (preset: BuildPreset) => {
      setBuild(resolvePreset(preset, catalog.products, catalog.byId));
      setPurpose(preset.purpose);
      toast({ message: `Loaded “${preset.name}”: customise any part below.`, variant: 'success' });
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
        ? `Filled ${added} slot${added > 1 ? 's' : ''} for ${purpose}: ${formatTaka(totalPriceOf(next))} total.`
        : 'Every core slot is already filled.',
      variant: added ? 'success' : 'info',
    });
  }, [build, budget, purpose, catalog.products, toast]);

  const handleSaveBuild = useCallback(() => {
    if (status !== 'authenticated') {
      toast({ message: 'Sign in to save your build.', variant: 'info' });
      navigate('/login');
      return;
    }
    setSaveOpen(true);
  }, [status, navigate, toast]);

  const handleConfirmSave = useCallback(
    async (name: string) => {
      try {
        const saved = await saveBuild(build, purpose, name);
        setSaveOpen(false);
        toast({
          message: `“${saved.name}” saved. Publish it to the Build Library from your profile.`,
          variant: 'success',
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to save build.';
        toast({ message: msg, variant: 'danger' });
      }
    },
    [build, purpose, toast],
  );

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
            Pick parts across 8 hardware categories; compatibility is checked in real time.
            {catalog.isLive && ' Prices are the lowest live offer across Bangladeshi retailers.'}
          </p>
          <BuildLibraryTeaser catalog={catalog} onApplyPreset={handleApplyPreset} />

          {/* AI Provenance Callout */}
          {isAiAssembled && (
            <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <Bot className="w-4 h-4 text-accent" />
                <span>Assembled by Tonima AI · Real-time compatibility & pricing applied</span>
              </div>
              <button
                type="button"
                className="text-[11px] text-text-muted hover:text-text-primary underline"
                onClick={() => setIsAiAssembled(false)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Unresolved Parts Warning Banner */}
          {unresolvedParts.length > 0 && (
            <div className="mb-4 p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <span>
                    {unresolvedParts.length} Tonima recommendation(s) not in current builder catalog
                  </span>
                </span>
                <button
                  type="button"
                  className="text-[10px] text-warning hover:underline"
                  onClick={() => setUnresolvedParts([])}
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px] text-text-secondary">
                The following parts were recommended by Tonima AI but could not be automatically
                mapped to a catalog product. Please select an alternative manually:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unresolvedParts.map((u, uIdx) => (
                  <span
                    key={uIdx}
                    className="px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-[11px] font-medium text-text-primary"
                  >
                    {u.category}: {u.name} (৳{u.priceBDT.toLocaleString('en-IN')})
                  </span>
                ))}
              </div>
            </div>
          )}
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
            Watch your rig come together: drag to orbit, explode the view, click any part to
            configure it.
          </p>
          <Suspense fallback={<div className="assembly-viewport-placeholder" />}>
            <AssemblyViewport3D build={build} onOpenCategory={setActiveSlot} />
          </Suspense>
        </div>
      </section>

      {/* Section 4: Build Summary & Analytics */}
      <section id="build-summary" className="section builder-summary-section">
        <div className="container">
          <h2 className="builder-section-title">
            Build <span className="gradient-text">Summary</span>
          </h2>
          <p className="builder-section-subtitle">
            Price, power, performance and compatibility, all updated live as you pick parts.
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
      <SaveBuildModal
        open={saveOpen}
        defaultName={defaultBuildName(build)}
        onClose={() => setSaveOpen(false)}
        onSave={handleConfirmSave}
      />
    </div>
  );
}
