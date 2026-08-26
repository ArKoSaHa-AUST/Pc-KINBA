import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import TonimaHero from '../components/ai/TonimaHero';
import TonimaWorkspace from '../components/ai/TonimaWorkspace';
import TonimaFeatureCards from '../components/ai/TonimaFeatureCards';
import './AIAssistantPage.css';

export default function AIAssistantPage() {
  const { t } = useTranslation('ai');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [activeBudget, setActiveBudget] = useState<number | undefined>();

  useEffect(() => {
    document.title = 'Tonima AI Assistant - PC Kinba | Next-Gen AI PC Architect';

    // 2.1 Smooth Scroll Orchestration with Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    let animationFrameId: number;

    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }

    animationFrameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  const handleLaunchPrompt = (prompt: string, budget?: number) => {
    setActivePrompt(prompt);
    setActiveBudget(budget);
    // Smooth scroll to workspace
    const targetElement = document.getElementById('tonima-workspace');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
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

        {/* Hidden accessibility state tracker */}
        {activePrompt && (
          <div className="sr-only" aria-live="polite">
            {t('thinking', { defaultValue: 'Processing:' })} {activePrompt}{' '}
            {activeBudget ? `(Budget: ৳${activeBudget})` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
