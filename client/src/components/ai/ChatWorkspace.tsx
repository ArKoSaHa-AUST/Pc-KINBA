import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, RotateCcw, Sparkles, Mic, Paperclip, Cpu, CornerDownLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BuildComponentItem } from './BuildPreviewHUD';
import './ChatWorkspace.css';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  parts?: BuildComponentItem[];
  timestamp: string;
}

interface ChatWorkspaceProps {
  initialPrompt?: string;
  isProcessing?: boolean;
  onSendMessage?: (text: string) => void;
  onResetSession?: () => void;
  className?: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: 'Hello! I am **Tonima AI**, your next-generation PC Architect. I can craft fully optimized PC configurations, audit motherboard socket clearances, simulate real-time thermal/wattage overhead, and compare live retailer prices across Bangladesh. \n\nWhat kind of PC setup are you planning to build today?',
    timestamp: 'Just now',
  },
];

export default function ChatWorkspace({
  initialPrompt = '',
  isProcessing = false,
  onSendMessage,
  onResetSession,
  className = '',
}: ChatWorkspaceProps) {
  const { t } = useTranslation('ai');
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputVal, setInputVal] = useState('');
  const [isTypingStream, setIsTypingStream] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

    // Trigger simulated Stage 2 Neural Processing & Stage 3 Streaming response
    setIsTypingStream(true);

    setTimeout(() => {
      setIsTypingStream(false);
      const botResponse: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Here is an optimized architectural blueprint designed for your requirements. I've selected the **AMD Ryzen 7 7800X3D** paired with the **MSI RTX 4070 Ti Super 16GB**, cooled by a 360mm AIO inside a Lian Li O11 Dynamic chassis. \n\nAll components have been verified with **98% compatibility rating** and +25% PSU power headroom. Live pricing aggregated from **Star Tech**, **Tech Land**, and **Ryans** totals **৳ 2,04,500**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1600);
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
    <div className={`tonima-chat-card ${className}`}>
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
                defaultValue: 'Tonima is analyzing hardware matrices & pricing...',
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
    </div>
  );
}
