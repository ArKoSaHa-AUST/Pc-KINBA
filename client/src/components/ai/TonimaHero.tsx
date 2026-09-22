import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, ArrowRight, SlidersHorizontal, Check, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HolographicCore from './HolographicCore';
import { useTonimaSession } from '../../store/useTonimaSession';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import './TonimaHero.css';

interface TonimaHeroProps {
  onLaunchPrompt?: (prompt: string, budget?: number) => void;
}

export default function TonimaHero({ onLaunchPrompt }: TonimaHeroProps) {
  const { t, i18n } = useTranslation('ai');
  const dispatchPrompt = useTonimaSession((s) => s.dispatchPrompt);
  const sessionBudget = useTonimaSession((s) => s.budgetBDT);
  const setSessionBudget = useTonimaSession((s) => s.setBudget);

  const [promptText, setPromptText] = useState('');
  const { isListening: isVoiceActive, toggleListening: toggleVoiceMode } = useSpeechToText({
    lang: i18n.language === 'bn' ? 'bn-BD' : 'en-US',
    onResult: (transcript) => setPromptText(transcript),
  });
  const [showBudgetSlider, setShowBudgetSlider] = useState(false);
  const [showSentConfirmation, setShowSentConfirmation] = useState(false);
  // 150000 is only the slider's resting position. `budgetChosen` tracks whether the user
  // has actually committed to a budget (moved the slider or picked a preset); until then
  // no target is sent, so Tonima is not told to plan a 1.5 lakh machine the user never
  // asked for.
  const [budgetBDT, setBudgetBDT] = useState<number>(() => sessionBudget || 150000);
  const [budgetChosen, setBudgetChosen] = useState<boolean>(() => (sessionBudget ?? 0) > 0);

  // Auto-growing prompt field: a single-line <input> clipped anything past its width, so a
  // long build description was only ever partly visible. A <textarea> that resizes to its
  // content — up to a cap, past which it scrolls internally — shows the whole prompt.
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = promptTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    if (scrollH > 240) {
      el.style.height = '240px';
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${scrollH}px`;
      el.style.overflowY = 'hidden';
    }
  }, [promptText]);

  const presets = [
    {
      label: t('preset1', { defaultValue: '🎮 Gaming Under ৳150K' }),
      query: t('preset1Prompt', {
        defaultValue: 'Build me a white aesthetic gaming PC for 1440p gaming under ৳ 1,50,000',
      }),
      budget: 150000,
    },
    {
      label: t('preset2', { defaultValue: '🎬 4K Video Editing Beast' }),
      query: t('preset2Prompt', {
        defaultValue:
          'Recommend a high-end 4K video editing workstation with 64GB RAM and fast NVMe storage',
      }),
      budget: 220000,
    },
    {
      label: t('preset3', { defaultValue: '🧠 AI & Deep Learning Rig' }),
      query: t('preset3Prompt', {
        defaultValue:
          'Design an AI deep learning workstation with RTX GPU and high CUDA core density',
      }),
      budget: 350000,
    },
    {
      label: t('preset4', { defaultValue: '⚡ Budget Esports ৳60K' }),
      query: t('preset4Prompt', {
        defaultValue:
          'Build a budget-friendly esports gaming PC under ৳ 60,000 for Valorant and CS2',
      }),
      budget: 60000,
    },
  ];

  const handlePresetClick = (query: string, presetBudget: number) => {
    setBudgetBDT(presetBudget);
    setBudgetChosen(true);
    setSessionBudget(presetBudget);
    const promptId = `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatchPrompt({
      id: promptId,
      text: query,
      budgetBDT: presetBudget,
      source: 'preset',
    });
    setPromptText('');
    setShowSentConfirmation(true);
    setTimeout(() => setShowSentConfirmation(false), 2500);
    if (onLaunchPrompt) {
      onLaunchPrompt(query, presetBudget);
    }
  };

  const submitPrompt = useCallback(() => {
    if (!promptText.trim()) return;
    const query = promptText.trim();
    const promptId = `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatchPrompt({
      id: promptId,
      text: query,
      budgetBDT: budgetChosen ? budgetBDT : undefined,
      source: 'hero',
    });
    setPromptText('');
    setShowSentConfirmation(true);
    setTimeout(() => setShowSentConfirmation(false), 2500);
    if (onLaunchPrompt) {
      onLaunchPrompt(query, budgetChosen ? budgetBDT : undefined);
    }
  }, [promptText, budgetChosen, budgetBDT, dispatchPrompt, onLaunchPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt();
  };

  return (
    <section className="tonima-hero-section" id="tonima-hero">
      {/* Background radial gradient aura */}
      <div className="bg-mesh pointer-events-none" />

      <div className="tonima-hero-container">
        {/* Left Column: Typography & Initiation Interface */}
        <motion.div
          className="ai-hero-text"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Main Headline */}
          <h1 className="ai-hero-headline">
            {t('heroTitlePrefix', { defaultValue: 'Meet Tonima —' })} <br />
            <span className="gradient-accent">
              {t('heroTitleGradient', { defaultValue: 'Your Next-Gen' })}
            </span>{' '}
            <br />
            {t('heroTitleSuffix', { defaultValue: 'AI PC Architect' })}
          </h1>

          {/* Subtitle */}
          <p className="ai-hero-subtitle">
            {t('heroSubtitle', {
              defaultValue:
                'Describe your dream rig in plain English or Bengali. Tonima validates component clearance, thermal headroom, and aggregates live market prices in BDT (৳) across top retailers in Bangladesh.',
            })}
          </p>

          {/* Stage 1: Prompt Launcher Box */}
          <form className="tonima-prompt-box" onSubmit={handleSubmit}>
            <div className="tonima-prompt-input-row">
              <textarea
                ref={promptTextareaRef}
                rows={1}
                className="tonima-prompt-input"
                placeholder={t('promptPlaceholder', {
                  defaultValue:
                    'e.g. Build me a white aesthetic gaming PC for 1440p gaming under ৳1,50,000...',
                })}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  // Enter submits, matching the old single-line input; Shift+Enter still
                  // inserts a newline for a longer, multi-line requirement description.
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitPrompt();
                  }
                }}
                aria-label="PC Requirement Prompt"
                data-lenis-prevent
              />

              {/* Voice prompt trigger */}
              <button
                type="button"
                className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                  isVoiceActive
                    ? 'bg-danger text-white animate-pulse shadow-[0_0_15px_rgba(255,77,94,0.5)]'
                    : 'text-text-muted hover:text-text-primary hover:bg-fill-muted'
                }`}
                onClick={toggleVoiceMode}
                title={t('voiceButton', { defaultValue: 'Voice Prompt' })}
                aria-label="Voice Prompt"
              >
                {isVoiceActive ? (
                  <Mic className="w-5 h-5 animate-bounce" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </button>

              {/* Budget slider toggle */}
              <button
                type="button"
                className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                  showBudgetSlider
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'text-text-muted hover:text-text-primary hover:bg-fill-muted'
                }`}
                onClick={() => setShowBudgetSlider(!showBudgetSlider)}
                title="Set Target Budget (BDT)"
                aria-label="Set Target Budget"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>

              {/* Primary Launch Action Button */}
              <button
                type="submit"
                className="button-primary !py-2.5 !px-5 text-sm whitespace-nowrap"
                disabled={!promptText.trim()}
              >
                <span>{t('launchArchitect', { defaultValue: 'Launch' })}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sent to Tonima confirmation */}
            <AnimatePresence>
              {showSentConfirmation && (
                <motion.div
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-semibold flex items-center justify-between"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('sentToTonima', { defaultValue: 'Sent to Tonima ↓' })}</span>
                  </span>
                  <span className="text-[10px] text-text-muted">Opening workspace...</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice Active Indicator */}
            <AnimatePresence>
              {isVoiceActive && (
                <motion.div
                  className="mt-3 pt-3 border-t border-glass-border flex items-center justify-between text-xs text-accent font-medium"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="voice-wave-container">
                      <span className="voice-wave-bar" />
                      <span className="voice-wave-bar" />
                      <span className="voice-wave-bar" />
                      <span className="voice-wave-bar" />
                    </div>
                    <span>
                      {t('voiceModeActive', {
                        defaultValue: 'Listening... Speak your PC requirements',
                      })}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Optional Budget Range Slider */}
            <AnimatePresence>
              {showBudgetSlider && (
                <motion.div
                  className="mt-3 pt-3 border-t border-glass-border"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex justify-between items-center text-xs font-semibold mb-2">
                    <span className="text-text-muted">
                      {t('budgetLabel', { defaultValue: 'Target Budget' })}:
                    </span>
                    <span className="text-accent text-sm font-bold">
                      ৳ {budgetBDT.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30000"
                    max="500000"
                    step="5000"
                    value={budgetBDT}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBudgetBDT(val);
                      setBudgetChosen(true);
                      setSessionBudget(val);
                    }}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-text-muted mt-1">
                    <span>৳ 30,000</span>
                    <span>৳ 2,50,000</span>
                    <span>৳ 5,00,000+</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Quick Suggestion Preset Chips */}
          <div className="tonima-presets-wrapper">
            <div className="tonima-presets-title">
              {t('stage1Title', { defaultValue: 'Quick Architectural Blueprints' })}
            </div>
            <div className="tonima-preset-chips">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="tonima-preset-pill"
                  onClick={() => handlePresetClick(p.query, p.budget)}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: 3D Holographic Spatial Core */}
        <motion.div
          className="ai-hero-visual"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <HolographicCore isVoiceActive={isVoiceActive} />

          {/* Overlay Status Pill */}
          <motion.div
            className="absolute bottom-4 right-4 glass px-4 py-2 rounded-full flex items-center gap-2.5 text-xs text-text-secondary border border-glass-border shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Cpu className="w-4 h-4 text-accent animate-pulse" />
            <span>Neural Engine Ready</span>
            <span className="w-2 h-2 rounded-full bg-green shadow-[0_0_8px_var(--green)]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
