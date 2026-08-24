import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TonimaHero from '../components/ai/TonimaHero';
import './AIAssistantPage.css';

export default function AIAssistantPage() {
  const { t } = useTranslation('ai');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [activeBudget, setActiveBudget] = useState<number | undefined>();

  useEffect(() => {
    document.title = 'Tonima AI Assistant - PC Kinba | Next-Gen AI PC Architect';
  }, []);

  const handleLaunchPrompt = (prompt: string, budget?: number) => {
    setActivePrompt(prompt);
    setActiveBudget(budget);
    // Smooth scroll to workspace if present or prepare session
    const targetElement = document.getElementById('tonima-workspace');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="ai-assistant-page" id="tonima-hub">
      {/* Ambient Lighting Background Spheres */}
      <div className="ai-ambient-orb ai-ambient-orb-1" aria-hidden="true" />
      <div className="ai-ambient-orb ai-ambient-orb-2" aria-hidden="true" />

      <div className="ai-page-content">
        {/* Tonima Hero & Stage 1 Initiation Section */}
        <TonimaHero onLaunchPrompt={handleLaunchPrompt} />

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
