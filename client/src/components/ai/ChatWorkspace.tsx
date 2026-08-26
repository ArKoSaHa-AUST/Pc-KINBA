import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, RotateCcw, Sparkles, Mic, Paperclip, Cpu, CornerDownLeft, ArrowDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { use3DTilt } from './use3DTilt';
import type { BuildComponentItem } from './BuildPreviewHUD';
import './ChatWorkspace.css';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  parts?: BuildComponentItem[];
  highlightChips?: { label: string; actionQuery?: string }[];
  timestamp: string;
}

interface ChatWorkspaceProps {
  initialPrompt?: string;
  isProcessing?: boolean;
  onSendMessage?: (text: string) => void;
  onRefineBuild?: (action: 'downgrade_ram' | 'swap_gpu_4060' | 'swap_gpu_4080' | 'upgrade_ram_64' | 'swap_cooler_aio' | 'custom', customQuery?: string) => void;
  onResetSession?: () => void;
  className?: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: 'Hello! I am **Tonima AI**, your next-generation PC Architect. I can craft fully optimized PC configurations, audit motherboard socket clearances, simulate real-time thermal/wattage overhead, and compare live retailer prices across Bangladesh.\n\nWhat kind of PC setup are you planning to build today?',
    highlightChips: [
      { label: '🎮 1440p Gaming Under ৳150K', actionQuery: 'Build me a white aesthetic gaming PC for 1440p gaming under ৳ 1,50,000' },
      { label: '🎬 4K Video Editing ৳220K', actionQuery: 'Recommend a high-end 4K video editing workstation with 64GB RAM and fast NVMe storage' },
      { label: '🧠 AI Deep Learning Rig ৳350K', actionQuery: 'Design an AI deep learning workstation with RTX GPU and high CUDA core density' },
    ],
    timestamp: 'Just now',
  },
];

const REFINEMENT_SHORTCUTS = [
  { label: '📉 Downgrade RAM (-৳5,000)', query: 'Can we downgrade RAM to save ৳5000?', action: 'downgrade_ram' as const },
  { label: '🎮 Swap GPU to RTX 4060 (-৳28,000)', query: 'Change GPU to RTX 4060 to stay within budget', action: 'swap_gpu_4060' as const },
  { label: '🚀 Upgrade to RTX 4080 (+৳45,000)', query: 'Upgrade GPU to RTX 4080 Super for 4K Ultra', action: 'swap_gpu_4080' as const },
  { label: '❄️ Upgrade to 360mm AIO Cooler', query: 'Swap air cooler for a 360mm AIO liquid cooler', action: 'swap_cooler_aio' as const },
  { label: '💾 Upgrade to 64GB RAM', query: 'Upgrade memory to 64GB DDR5 for heavy multitasking', action: 'upgrade_ram_64' as const },
];

export default function ChatWorkspace({
  initialPrompt = '',
  isProcessing = false,
  onSendMessage,
  onRefineBuild,
  onResetSession,
  className = '',
}: ChatWorkspaceProps) {
  const { t } = useTranslation('ai');
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputVal, setInputVal] = useState('');
  const [isTypingStream, setIsTypingStream] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 3D Parallax Tilt Physics with Framer Motion spring
  const {
    cardRef,
    rotateX,
    rotateY,
    scale,
    glossPos,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = use3DTilt({ maxTilt: 5, scaleOnHover: 1.005 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, isTypingStream]);

  // Handle incoming initial prompt from Hero
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleUserSubmit(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleUserSubmit = (userQuery: string) => {
    if (!userQuery.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    if (onSendMessage) {
      onSendMessage(userQuery);
    }

    // Determine if user query is a Stage 4 refinement
    const lower = userQuery.toLowerCase();
    let refinementAction: 'downgrade_ram' | 'swap_gpu_4060' | 'swap_gpu_4080' | 'upgrade_ram_64' | 'swap_cooler_aio' | 'custom' = 'custom';
    let botReplyText = '';

    if (lower.includes('downgrade ram') || lower.includes('save ৳5000') || lower.includes('save 5000')) {
      refinementAction = 'downgrade_ram';
      botReplyText = `✅ **Re-optimization complete!** I have downgraded the RAM to **Corsair Vengeance 16GB DDR5 5200MHz**, saving you **৳ 5,000**. \n\nThe updated total is now **৳ 1,99,500**. System compatibility remains **98%** and thermal headroom is fully preserved.`;
    } else if (lower.includes('4060')) {
      refinementAction = 'swap_gpu_4060';
      botReplyText = `✅ **GPU Reconfigured!** Swapped graphics card to **MSI RTX 4060 Ventus 2X 8GB**. \n\nTotal price reduced by **৳ 28,500** to **৳ 1,76,000**. Estimated power draw drops to **340W**, providing **+120% PSU headroom** with your 750W unit.`;
    } else if (lower.includes('4080')) {
      refinementAction = 'swap_gpu_4080';
      botReplyText = `🚀 **Tier Elevated!** Upgraded to **ZOTAC RTX 4080 Super 16GB Trinity OC** for uncompromised 4K high-FPS gaming. \n\nRecalculated wattage: **580W**. PSU remains adequate with **+29% headroom**. Live price adjusted to **৳ 2,49,500** across Star Tech & Ryans.`;
    } else if (lower.includes('64gb')) {
      refinementAction = 'upgrade_ram_64';
      botReplyText = `💾 **Memory Expanded!** Upgraded to **G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5 6000MHz** for 4K video rendering and heavy virtualization. Price adjusted by **+৳ 12,500**.`;
    } else if (lower.includes('aio') || lower.includes('liquid cooler')) {
      refinementAction = 'swap_cooler_aio';
      botReplyText = `❄️ **Cooling Enhanced!** Upgraded to **DeepCool LT720 360mm Liquid Cooler**. Peak CPU thermals drop to **~58°C** under maximum all-core synthetic load.`;
    } else {
      botReplyText = `Here is an optimized architectural blueprint designed for your requirements. I've selected the **AMD Ryzen 7 7800X3D** paired with the **MSI RTX 4070 Ti Super 16GB**, cooled by a 360mm AIO inside a Lian Li O11 Dynamic chassis. \n\nAll components have been verified with **98% compatibility rating** and +25% PSU power headroom. Live pricing aggregated from **Star Tech**, **Tech Land**, and **Ryans** totals **৳ 2,04,500**.`;
    }

    if (onRefineBuild) {
      onRefineBuild(refinementAction, userQuery);
    }

    // Trigger simulated Stage 2 Neural Processing & Stage 3 Streaming response
    setIsTypingStream(true);

    setTimeout(() => {
      setIsTypingStream(false);
      const botResponse: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        highlightChips: [
          { label: '📉 Downgrade RAM (-৳5,000)', actionQuery: 'Can we downgrade RAM to save ৳5000?' },
          { label: '🎮 Swap to RTX 4060', actionQuery: 'Change GPU to RTX 4060 to stay within budget' },
          { label: '🚀 Upgrade to RTX 4080', actionQuery: 'Upgrade GPU to RTX 4080 Super for 4K Ultra' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1400);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserSubmit(inputVal);
  };

  const handleClear = () => {
    setMessages(DEFAULT_MESSAGES);
    if (onResetSession) {
      onResetSession();
    }
  };

  return (
    <div
      ref={cardRef}
      className={`tonima-chat-card-perspective-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="tonima-chat-card"
        style={{
          rotateX,
          rotateY,
          scale,
        }}
      >
        {/* Dynamic Gloss Highlight Overlay */}
        <div
          className="tonima-card-gloss"
          style={{
            background: `radial-gradient(circle at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.35), transparent 60%)`,
          }}
        />

        {/* Sticky Top Header Bar inside Card */}
        <div className="tonima-chat-header">
          <div className="flex items-center gap-3">
            <div className="tonima-avatar-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-primary">Tonima AI Core</span>
                <span className="flex items-center gap-1 text-[11px] text-green font-medium">
                  <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-accent" />
                  v2.0 Neural Engine
                </span>
                <span>•</span>
                <span className="text-accent/90 font-mono">28ms Latency</span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="p-2 rounded-full glass text-text-muted hover:text-text-primary hover:border-accent transition-all flex items-center gap-1.5 text-xs font-semibold"
              onClick={handleClear}
              title="Reset Conversation Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Container */}
        <div className="tonima-messages-container">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className={msg.sender === 'bot' ? 'tonima-msg-bot' : 'tonima-msg-user'}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                {/* Interactive Suggestion Chips inside bot message */}
                {msg.sender === 'bot' && msg.highlightChips && msg.highlightChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-glass-border">
                    {msg.highlightChips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        className="tonima-hardware-chip"
                        onClick={() => chip.actionQuery && handleUserSubmit(chip.actionQuery)}
                      >
                        <ArrowDownUp className="w-3 h-3" />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 ${
                    msg.sender === 'bot' ? 'text-text-muted' : 'text-text-primary/70 text-right'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Stage 2 & 3 Thinking / Streaming Indicator */}
          {(isProcessing || isTypingStream) && (
            <motion.div
              className="tonima-msg-bot flex items-center gap-2 text-accent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Sparkles className="w-4 h-4 animate-spin text-accent" />
              <span className="text-xs font-medium">
                {t('thinking', {
                  defaultValue: 'Tonima is calculating hardware matrices & BDT pricing...',
                })}
              </span>
              <div className="flex gap-1 ml-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Stage 4 Interactive Refinement Quick Ticker Bar */}
        <div className="px-4 py-2 bg-fill-subtle border-t border-glass-border overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Refine:
          </span>
          {REFINEMENT_SHORTCUTS.map((refine, idx) => (
            <button
              key={idx}
              type="button"
              className="px-2.5 py-1 rounded-full glass border border-glass-border text-[11px] text-text-secondary hover:text-text-primary hover:border-accent whitespace-nowrap transition-all flex items-center gap-1"
              onClick={() => handleUserSubmit(refine.query)}
            >
              <span>{refine.label}</span>
            </button>
          ))}
        </div>

        {/* Pinned Multimodal Floating Input Bar */}
        <div className="tonima-input-bar-wrapper">
          <form className="tonima-input-bar" onSubmit={handleFormSubmit}>
            <button
              type="button"
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-fill-muted transition-colors"
              title="Attach benchmark or specification sheet"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              className="tonima-input-field"
              placeholder={t('placeholder', {
                defaultValue: 'Ask Tonima: e.g. Swap GPU to RTX 4080 Super or adjust budget...',
              })}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isProcessing || isTypingStream}
            />

            <button
              type="button"
              className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-fill-muted transition-colors"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-purple text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_var(--glass-glow)]"
              disabled={!inputVal.trim() || isProcessing || isTypingStream}
              aria-label="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-text-muted mt-2 px-2">
            <span>Supports English & বাংলা natural queries</span>
            <span className="flex items-center gap-1 font-mono">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-fill-muted text-[10px] text-text-secondary border border-glass-border">
                <CornerDownLeft className="w-2.5 h-2.5 inline" /> Enter
              </kbd>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
