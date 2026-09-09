import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  Mic,
  Paperclip,
  Cpu,
  CornerDownLeft,
  ArrowDownUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BuildComponentItem } from './BuildPreviewHUD';
import './ChatWorkspace.css';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  parts?: BuildComponentItem[];
  highlightChips?: { label: string; actionQuery?: string }[];
  timestamp: string;
  isError?: boolean;
}

export interface BuildUpdatePayload {
  parts: BuildComponentItem[];
  totalBDT: number;
  validation: {
    score: number;
    wattage: number;
    psuWattage: number;
    ok: boolean;
    violations: Array<{ rule: string; detail: string }>;
  };
  alternatives?: Array<{ category: string; id: string; delta_bdt: number; label: string }>;
  diff?: {
    category: string;
    priceDelta: number;
    newPartName?: string;
  };
}

interface ChatWorkspaceProps {
  initialPrompt?: string;
  sessionId?: string;
  onBuildUpdated?: (payload: BuildUpdatePayload) => void;
  onResetSession?: () => void;
  className?: string;
}

function renderInlineFormatted(text: string, isUser: boolean) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong
          key={idx}
          className={
            isUser
              ? 'font-bold text-white'
              : 'font-bold text-accent drop-shadow-[0_0_8px_rgba(0,229,255,0.25)]'
          }
        >
          {boldText}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedMessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split('\n');
  const blocks: Array<
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'paragraph'; lines: string[] }
  > = [];

  let currentTableLines: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: [...currentParagraphLines] });
      currentParagraphLines = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const parsedRows = currentTableLines
        .filter((l) => !/^\s*\|?\s*[-:]+[-| :]*\|\s*$/.test(l))
        .map((l) =>
          l
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim()),
        );

      if (parsedRows.length > 0) {
        const headers = parsedRows[0];
        const rows = parsedRows.slice(1);
        blocks.push({ type: 'table', headers, rows });
      }
      currentTableLines = [];
    }
  };

  for (const line of lines) {
    const isTableLine = /^\s*\|.*\|\s*$/.test(line);
    if (isTableLine) {
      flushParagraph();
      currentTableLines.push(line);
    } else {
      flushTable();
      currentParagraphLines.push(line);
    }
  }

  flushTable();
  flushParagraph();

  return (
    <div
      className={`space-y-2 leading-relaxed ${
        isUser ? 'text-text-primary text-sm' : 'text-text-primary text-[13.5px]'
      }`}
    >
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          return (
            <div
              key={bIdx}
              className="my-2.5 overflow-x-auto rounded-xl border border-glass-border bg-fill-subtle/80 shadow-md backdrop-blur-md"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-glass-border bg-bg-surface/80">
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="py-2 px-2.5 font-bold uppercase tracking-wider text-[10px] text-accent font-mono"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/40">
                  {block.rows.map((row, rIdx) => {
                    const isTotalRow = row.some((cell) => /total|মোট/i.test(cell));
                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isTotalRow
                            ? 'bg-accent/10 font-bold border-t border-accent/30'
                            : 'hover:bg-fill-muted/60'
                        }`}
                      >
                        {row.map((cell, cIdx) => {
                          const isPrice = /৳|bdt|tk/i.test(cell);
                          const isCategory = cIdx === 0 && !isTotalRow;
                          return (
                            <td
                              key={cIdx}
                              className={`py-1.5 px-2.5 whitespace-nowrap text-[12px] ${
                                isTotalRow
                                  ? 'text-accent font-extrabold text-[13px]'
                                  : isPrice
                                    ? 'text-accent font-semibold'
                                    : isCategory
                                      ? 'text-text-secondary font-mono text-[11px]'
                                      : 'text-text-primary'
                              }`}
                            >
                              {renderInlineFormatted(cell, isUser)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div key={bIdx} className="space-y-1.5">
            {block.lines.map((para, pIdx) => {
              const trimmed = para.trim();
              if (!trimmed) {
                return <div key={pIdx} className="h-1" />;
              }

              const isBullet = /^[•\-*]\s+/.test(trimmed);
              const content = isBullet ? trimmed.replace(/^[•\-*]\s+/, '') : trimmed;

              if (isBullet) {
                return (
                  <div key={pIdx} className="flex items-start gap-2 pl-1.5">
                    <span className="text-accent text-xs mt-1 shrink-0">•</span>
                    <span>{renderInlineFormatted(content, isUser)}</span>
                  </div>
                );
              }

              return <p key={pIdx}>{renderInlineFormatted(trimmed, isUser)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: 'Hello! I am **Tonima AI**, your next-generation PC Architect. I craft 100% compatible PC configurations, audit socket clearances, simulate real-time thermal/wattage overhead, and aggregate **live, lowest prices across 12 Bangladeshi stores**.\n\nWhat kind of PC setup are you planning to build today?',
    highlightChips: [
      {
        label: '🎮 1440p Gaming Under ৳150K',
        actionQuery: 'Build me a gaming PC for 1440p high-FPS gaming under ৳ 1,50,000',
      },
      {
        label: '🎬 4K Video Editing ৳220K',
        actionQuery:
          'Recommend a high-end 4K video editing workstation with 64GB RAM and fast NVMe storage around ৳ 2,20,000',
      },
      {
        label: '🧠 AI Deep Learning Rig ৳200K',
        actionQuery:
          'I need a PC for machine learning and deep learning. Budget is around 2 lakh taka.',
      },
    ],
    timestamp: 'Just now',
  },
];

const REFINEMENT_SHORTCUTS = [
  {
    label: '📉 Downgrade RAM (-৳5,000)',
    query: 'Can we downgrade RAM to save ৳5000?',
  },
  {
    label: '🎮 Swap GPU to RTX 4060',
    query: 'Change GPU to RTX 4060 to stay within budget',
  },
  {
    label: '🚀 Upgrade to RTX 4080',
    query: 'Upgrade GPU to RTX 4080 Super for 4K Ultra',
  },
  {
    label: '❄️ Upgrade to 360mm AIO Cooler',
    query: 'Swap air cooler for a 360mm AIO liquid cooler',
  },
  {
    label: '💾 Upgrade to 64GB RAM',
    query: 'Upgrade memory to 64GB DDR5 for heavy multitasking',
  },
];

export default function ChatWorkspace({
  initialPrompt = '',
  sessionId: propSessionId,
  onBuildUpdated,
  onResetSession,
  className = '',
}: ChatWorkspaceProps) {
  const { i18n } = useTranslation();
  const [sessionId, setSessionId] = useState<string>(
    () => propSessionId || `session-${Date.now()}`,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<string>('');
  const [hasActiveBuild, setHasActiveBuild] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, thinkingStatus]);

  const handleUserSubmit = useCallback(
    async (userQuery: string) => {
      if (!userQuery.trim() || isProcessing) return;

      const queryText = userQuery.trim();
      const userMsgId = `usr-${Date.now()}`;
      const botMsgId = `bot-${Date.now()}`;

      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Insert user message and prepare empty streaming bot message
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: botMsgId,
          sender: 'bot',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setInputVal('');
      setIsProcessing(true);
      setThinkingStatus('Tonima is analyzing hardware specifications...');

      // Determine endpoint: use /api/ai/refine if we already have an active build, otherwise /api/ai/build
      const isRefine =
        hasActiveBuild && !/build\s+(me|a)\s+new|start\s+over|reset/i.test(queryText);
      const endpoint = isRefine ? '/api/ai/refine' : '/api/ai/build';
      const bodyPayload = isRefine
        ? { sessionId, message: queryText, language: i18n.language === 'bn' ? 'bn' : 'en' }
        : { message: queryText, sessionId, language: i18n.language === 'bn' ? 'bn' : 'en' };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Readable stream not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        let currentAlternatives: Array<{
          category: string;
          id: string;
          delta_bdt: number;
          label: string;
        }> = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('event: ')) {
              currentEvent = trimmed.slice(7).trim();
              continue;
            }

            if (trimmed.startsWith('data: ')) {
              const rawData = trimmed.slice(6).trim();
              try {
                const data = JSON.parse(rawData);

                if (currentEvent === 'thinking') {
                  setThinkingStatus(data.message || 'Processing hardware constraints...');
                } else if (currentEvent === 'build') {
                  setHasActiveBuild(true);
                  if (data.sessionId) setSessionId(data.sessionId);
                  if (data.alternatives) currentAlternatives = data.alternatives;

                  // Propagate build payload to update HUD immediately
                  if (onBuildUpdated && data.parts) {
                    onBuildUpdated({
                      parts: data.parts,
                      totalBDT: data.totalBDT || 0,
                      validation: data.validation || {
                        score: 100,
                        wattage: 420,
                        psuWattage: 750,
                        ok: true,
                        violations: [],
                      },
                      alternatives: data.alternatives,
                      diff: data.diff,
                    });
                  }
                } else if (currentEvent === 'token') {
                  accumulatedText += data.token || '';
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMsgId ? { ...msg, text: accumulatedText } : msg,
                    ),
                  );
                } else if (currentEvent === 'done') {
                  if (data.sessionId) setSessionId(data.sessionId);
                } else if (currentEvent === 'error') {
                  throw new Error(data.message || 'Error from AI server');
                }
              } catch (jsonErr) {
                console.warn('[SSE Parse Warning]:', jsonErr);
              }
            }
          }
        }

        // Finalize bot message with dynamic chips from alternatives or starter recommendation chips
        let finalChips = currentAlternatives.map((alt) => ({
          label: alt.label,
          actionQuery: alt.label.replace(/^[^\w]+/, '').trim(),
        }));

        if (finalChips.length === 0 && !hasActiveBuild) {
          finalChips = [
            {
              label: '🎮 1440p Gaming Under ৳150K',
              actionQuery: 'Build me a gaming PC for 1440p high-FPS gaming under ৳ 1,50,000',
            },
            {
              label: '🎬 4K Video Editing ৳220K',
              actionQuery:
                'Recommend a high-end 4K video editing workstation with 64GB RAM and fast NVMe storage around ৳ 2,20,000',
            },
            {
              label: '🧠 AI Deep Learning Rig ৳200K',
              actionQuery:
                'I need a PC for machine learning and deep learning. Budget is around 2 lakh taka.',
            },
          ];
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: accumulatedText || 'Here is your configured PC architecture blueprint.',
                  highlightChips: finalChips.length > 0 ? finalChips : undefined,
                }
              : msg,
          ),
        );
      } catch (err: unknown) {
        console.error('[Tonima Chat Error]:', err);
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId
              ? {
                  ...msg,
                  text: `⚠️ **Connection Note**: Could not reach Tonima AI service (${errorMessage}). Please try again or refine your query.`,
                  isError: true,
                }
              : msg,
          ),
        );
      } finally {
        setIsProcessing(false);
        setThinkingStatus('');
      }
    },
    [hasActiveBuild, i18n.language, isProcessing, onBuildUpdated, sessionId],
  );

  // Handle incoming initial prompt from Hero
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleUserSubmit(initialPrompt);
    }
  }, [initialPrompt, handleUserSubmit]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserSubmit(inputVal);
  };

  const handleClear = () => {
    setMessages(DEFAULT_MESSAGES);
    setHasActiveBuild(false);
    setSessionId(`session-${Date.now()}`);
    if (onResetSession) {
      onResetSession();
    }
  };

  return (
    <div className={`tonima-chat-card-container ${className}`}>
      <div className="tonima-chat-card">
        {/* Sticky Top Header Bar inside Card */}
        <div className="tonima-chat-header">
          <div className="flex items-center gap-3">
            <div className="tonima-avatar-pulse">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-text-primary">Tonima AI Core</span>
                <span className="flex items-center gap-1.5 text-[11px] text-green font-semibold bg-green/10 px-2 py-0.5 rounded-full border border-green/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                  Live Engine
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-accent" />
                  Multi-Model (Groq Pool)
                </span>
                <span>•</span>
                <span className="text-accent font-medium">Real-Time Prices (BD)</span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl glass border border-glass-border text-text-muted hover:text-text-primary hover:border-accent hover:bg-fill-muted transition-all flex items-center gap-1.5 text-xs font-semibold"
              onClick={handleClear}
              title="Reset Conversation Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <FormattedMessageContent text={msg.text} isUser={msg.sender === 'user'} />

                {/* Interactive Suggestion Chips inside bot message */}
                {msg.sender === 'bot' && msg.highlightChips && msg.highlightChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3.5 pt-3 border-t border-glass-border">
                    {msg.highlightChips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        className="tonima-hardware-chip group"
                        onClick={() => chip.actionQuery && handleUserSubmit(chip.actionQuery)}
                        disabled={isProcessing}
                      >
                        <ArrowDownUp className="w-3 h-3 text-accent transition-transform group-hover:rotate-180" />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {msg.isError && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Connection interrupted. Click reset or submit another query to restart.</span>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 font-mono ${
                    msg.sender === 'bot' ? 'text-text-muted' : 'text-text-secondary text-right'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking / Streaming Indicator */}
          {isProcessing && (
            <motion.div
              className="tonima-msg-bot flex items-center gap-2.5 text-accent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Sparkles className="w-4 h-4 animate-spin text-accent shrink-0" />
              <span className="text-xs font-medium">
                {thinkingStatus ||
                  'Tonima is calculating hardware matrices & lowest store prices...'}
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

        {/* Interactive Refinement Quick Ticker Bar */}
        <div className="tonima-refine-bar-wrapper">
          <div
            className="tonima-refine-ticker-bar"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" /> Refine:
            </span>
            {REFINEMENT_SHORTCUTS.map((refine, idx) => (
              <button
                key={idx}
                type="button"
                className="tonima-refine-chip"
                onClick={() => handleUserSubmit(refine.query)}
                disabled={isProcessing}
              >
                <span>{refine.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pinned Multimodal Floating Input Bar */}
        <div className="tonima-input-bar-wrapper">
          <form className="tonima-input-bar" onSubmit={handleFormSubmit}>
            <button
              type="button"
              className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-fill-muted transition-colors shrink-0"
              title="Attach benchmark or requirement notes"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              className="tonima-input-field"
              placeholder={
                i18n.language === 'bn'
                  ? 'তনিমাকে জিজ্ঞাসা করুন: যেমন ২ লাখ টাকায় এআই ওয়ার্কস্টেশন পিসি বিল্ড করো...'
                  : 'Ask Tonima: e.g. AI workstation 2 lakh or 1440p gaming under 150k...'
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isProcessing}
            />

            <button
              type="button"
              className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-fill-muted transition-colors shrink-0"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-purple text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_var(--glass-glow)] shrink-0"
              disabled={!inputVal.trim() || isProcessing}
              aria-label="Send Message"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-text-muted mt-2 px-2">
            <span>Supports English & বাংলা natural queries</span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-fill-muted text-[10px] text-text-secondary border border-glass-border">
                <CornerDownLeft className="w-2.5 h-2.5 inline mr-0.5" /> Enter
              </kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
