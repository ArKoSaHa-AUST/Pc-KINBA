import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, MicOff, ArrowRight, SlidersHorizontal, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HolographicCore from './HolographicCore';
import './TonimaHero.css';

interface TonimaHeroProps {
  onLaunchPrompt?: (prompt: string, budget?: number) => void;
}

export default function TonimaHero({ onLaunchPrompt }: TonimaHeroProps) {
  const { t } = useTranslation('ai');
  const [promptText, setPromptText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showBudgetSlider, setShowBudgetSlider] = useState(false);
  const [budgetBDT, setBudgetBDT] = useState<number>(150000);

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
    setPromptText(query);
    setBudgetBDT(presetBudget);
    if (onLaunchPrompt) {
      onLaunchPrompt(query, presetBudget);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    if (onLaunchPrompt) {
      onLaunchPrompt(promptText, budgetBDT);
    }
  };

  const toggleVoiceMode = useCallback(() => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      return;
    }

    // Check browser SpeechRecognition support
    interface ISpeechRecognition {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    }

    interface SpeechRecognitionConstructor {
      new (): ISpeechRecognition;
    }

    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsVoiceActive(true);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setPromptText(transcript);
          }
          setIsVoiceActive(false);
        };

        recognition.onerror = () => {
          setIsVoiceActive(false);
        };

        recognition.onend = () => {
          setIsVoiceActive(false);
        };

        recognition.start();
      } catch {
        // Fallback to simulated audio reactive pulse
        setIsVoiceActive(true);
        setTimeout(() => setIsVoiceActive(false), 4000);
      }
    } else {
      // Graceful simulated listening pulse
      setIsVoiceActive(true);
      setTimeout(() => setIsVoiceActive(false), 4000);
    }
  }, [isVoiceActive]);

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
          {/* Badge */}
          <motion.div
            className="ai-hero-badge"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles size={16} className="text-accent animate-spin-slow" />
            <span className="text-text-primary font-semibold">
              {t('heroBadge', { defaultValue: 'Tonima AI 2.0' })}
            </span>
            <span className="text-text-muted">|</span>
            <span className="text-accent font-medium">
              {t('heroBadgeSubtitle', { defaultValue: 'Spatial PC Architect' })}
            </span>
          </motion.div>

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
              <input
                type="text"
                className="tonima-prompt-input"
                placeholder={t('promptPlaceholder', {
                  defaultValue:
                    'e.g. Build me a white aesthetic gaming PC for 1440p gaming under ৳1,50,000...',
                })}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                aria-label="PC Requirement Prompt"
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
                    onChange={(e) => setBudgetBDT(Number(e.target.value))}
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
