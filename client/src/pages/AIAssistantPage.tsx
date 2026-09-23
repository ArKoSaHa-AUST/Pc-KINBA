import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import TonimaHero from '../components/ai/TonimaHero';
import TonimaWorkspace from '../components/ai/TonimaWorkspace';
import TonimaFeatureCards from '../components/ai/TonimaFeatureCards';
import { useTonimaSession } from '../store/useTonimaSession';
import './AIAssistantPage.css';

export default function AIAssistantPage() {
  const { t } = useTranslation('ai');
  const lenisRef = useRef<Lenis | null>(null);
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [activeBudget, setActiveBudget] = useState<number | undefined>();

  const buildStatus = useTonimaSession((s) => s.activeBuild.status);
  const activeBuild = useTonimaSession((s) => s.activeBuild);

  useEffect(() => {
    document.title = t('pageTitle', {
      defaultValue: 'Tonima AI Assistant - PC Kinba | Next-Gen AI PC Architect',
    });
  }, [t]);

  useEffect(() => {
    // Skip Lenis on prefers-reduced-motion for native scrolling
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // 2.1 Smooth Scroll Orchestration with Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      prevent: (node) => node.hasAttribute?.('data-lenis-prevent'),
    });
    lenisRef.current = lenis;

    let animationFrameId: number;

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const handleLaunchPrompt = (prompt: string, budget?: number) => {
    setActivePrompt(prompt);
    setActiveBudget(budget);
    // Smooth scroll to workspace using Lenis if available
    if (lenisRef.current) {
      lenisRef.current.scrollTo('#tonima-workspace', { offset: -20, duration: 1.2 });
    } else {
      const targetElement = document.getElementById('tonima-workspace');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="ai-assistant-page" id="tonima-hub">
      {/* Dynamic Ambient Aura Lighting Blobs with continuous color drift */}
      <div className="ai-ambient-orb ai-ambient-orb-1" aria-hidden="true" />
      <div className="ai-ambient-orb ai-ambient-orb-2" aria-hidden="true" />
      <div className="ai-ambient-orb ai-ambient-orb-3" aria-hidden="true" />

      <div className="ai-page-content">
        {/* Tonima Hero & Stage 1 Initiation Section */}
        <TonimaHero onLaunchPrompt={handleLaunchPrompt} />

        {/* Tonima 60/40 Interactive Workspace Section */}
        <TonimaWorkspace initialPrompt={activePrompt} initialBudget={activeBudget} />

        {/* 3D Parallax Feature Cards Grid (Section 2.3 & 2.4) */}
        <TonimaFeatureCards />

        {/* Accessibility status transition tracker */}
        <div className="sr-only" aria-live="polite">
          {buildStatus === 'thinking' &&
            t('statusPlanning', { defaultValue: 'Tonima is planning your build...' })}
          {buildStatus === 'streaming' &&
            t('statusStreaming', {
              defaultValue: 'Tonima is calculating component metrics...',
            })}
          {buildStatus === 'ready' &&
            activeBuild.parts.length > 0 &&
            t('statusReady', {
              defaultValue: `Build ready: ৳${activeBuild.totalBDT.toLocaleString('en-IN')}, ${activeBuild.parts.length} parts`,
            })}
          {buildStatus === 'error' &&
            t('statusError', { defaultValue: 'Error processing build configuration.' })}
        </div>
      </div>
    </div>
  );
}
