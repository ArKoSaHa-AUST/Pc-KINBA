import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  Mic,
  MicOff,
  Paperclip,
  CornerDownLeft,
  ArrowDownUp,
  AlertCircle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ArrowDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BuildComponentItem } from './BuildPreviewHUD';
import { useTonimaSession } from '../../store/useTonimaSession';
import { useSpeechToText } from '../../hooks/useSpeechToText';
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
  budgetStatus?: 'met' | 'over' | 'under';
  budgetBDT?: number | null;
  /** Agent purpose behind the build ('gaming' | 'ai_ml' | ...), used by the builder handoff. */
  purpose?: string | null;
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
    { type: 'table'; headers: string[]; rows: string[][] } | { type: 'paragraph'; lines: string[] }
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
            <div key={bIdx} className="tonima-table-scroller" data-lenis-prevent-wheel>
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

/**
 * Chat transcript lives in sessionStorage: it survives navigating to the PC Builder and
 * back and a page reload, and is dropped when the tab closes (leaving the site) or when
 * the user hits Reset. It is deliberately NOT localStorage — a new tab is a new chat.
 */
const TONIMA_CHAT_KEY = 'pc-kinba.tonima-chat';
const TONIMA_CHAT_VERSION = 1;

interface PersistedChat {
  version: number;
  sessionId: string;
  messages: ChatMessage[];
  hasActiveBuild: boolean;
}

function loadPersistedChat(): PersistedChat | null {
  try {
    const raw = sessionStorage.getItem(TONIMA_CHAT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedChat;
    if (!data || data.version !== TONIMA_CHAT_VERSION) return null;
    if (!Array.isArray(data.messages) || data.messages.length === 0) return null;
    return data;
  } catch (err) {
    console.warn('[Tonima Chat] Session restore failed:', err);
    return null;
  }
}

function savePersistedChat(snapshot: PersistedChat): void {
  try {
    sessionStorage.setItem(TONIMA_CHAT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[Tonima Chat] Session save failed:', err);
  }
}

function clearPersistedChat(): void {
  try {
    sessionStorage.removeItem(TONIMA_CHAT_KEY);
  } catch {
    // Ignore storage deletion errors
  }
}

/** Mirrors the greeting branch of the server-side intent parser (lib/ai/intent.js). */
const GREETING_RE =
  /^(hi|hello|hey|greetings|howdy|hola|yo|assalamu\s*alaikum|salam|kemon\s*acho|kemon\s*achen|thanks|thank\s*you|ok|okay|good\s*(morning|afternoon|evening|night))(?:\s+tonima)?[\s!.,?]*$/i;

/** Message shapes that a target budget is actually relevant to. */
const HARDWARE_INTENT_RE =
  /\b(build|rig|setup|pc|computer|config|configuration|workstation|machine|upgrade|downgrade|swap|replace|gaming|gamer|editing|render|streaming|office|cpu|gpu|ram|psu|motherboard|storage|cooler)\b|পিসি|বিল্ড|সেটআপ|কম্পিউটার|বানাও|বানিয়ে|আপগ্রেড/i;

/** Text that already names a budget, so a second one must not be appended. */
const BUDGET_MENTION_RE = /\b(budget|taka|bdt|tk|lakh|lac|k)\b|৳|বাজেট|টাকা|লাখ|হাজার/i;

/**
 * Whether to append the session's target budget to an outgoing message.
 *
 * Previously every message got the budget stapled on, so typing "hi" reached the agent
 * as "hi (Target budget: ৳1,50,000)" — which the intent parser correctly read as a
 * build request, so Tonima answered a greeting with a full ৳1.5 lakh machine.
 */
function shouldAttachBudget(text: string, budget: number | null): boolean {
  if (!budget || budget <= 0) return false;
  const trimmed = text.trim();
  if (!trimmed || GREETING_RE.test(trimmed)) return false;
  if (BUDGET_MENTION_RE.test(trimmed)) return false;
  return HARDWARE_INTENT_RE.test(trimmed);
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
  const pendingPrompt = useTonimaSession((s) => s.pendingPrompt);

  // Restored once, on mount: the transcript this tab was in the middle of.
  const [restoredChat] = useState<PersistedChat | null>(() => loadPersistedChat());

  const [sessionId, setSessionId] = useState<string>(
    () => propSessionId || restoredChat?.sessionId || `session-${Date.now()}`,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => restoredChat?.messages ?? DEFAULT_MESSAGES,
  );
  const [inputVal, setInputVal] = useState('');
  const { isListening: isVoiceActive, toggleListening: toggleVoiceInput } = useSpeechToText({
    lang: i18n.language === 'bn' ? 'bn-BD' : 'en-US',
    // Appends rather than replaces: unlike the hero's one-shot prompt field, this input
    // is meant to be dictated into mid-conversation without losing whatever was already
    // typed.
    onResult: (transcript) =>
      setInputVal((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript)),
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<string>('');
  const [hasActiveBuild, setHasActiveBuild] = useState(() => restoredChat?.hasActiveBuild ?? false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isRailHovered, setIsRailHovered] = useState(false);
  const [isRailPinned, setIsRailPinned] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const railLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = listRef.current;
    if (el) {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
    setPinnedToBottom(true);
    setHasUnreadMessages(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    setPinnedToBottom(isNearBottom);
    if (isNearBottom) {
      setHasUnreadMessages(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener?.('change', listener);
      return () => mq.removeEventListener?.('change', listener);
    }
  }, []);

  // Persist the transcript so it is still here after a trip to the PC Builder page.
  // Writes are skipped mid-stream (one write per token would be wasteful) and flushed
  // on unmount, so a turn that finishes right before navigation is not lost.
  const chatSnapshotRef = useRef<PersistedChat>({
    version: TONIMA_CHAT_VERSION,
    sessionId,
    messages,
    hasActiveBuild,
  });
  useEffect(() => {
    chatSnapshotRef.current = {
      version: TONIMA_CHAT_VERSION,
      sessionId,
      messages,
      hasActiveBuild,
    };
    if (isProcessing) return;
    savePersistedChat(chatSnapshotRef.current);
  }, [messages, sessionId, hasActiveBuild, isProcessing]);

  useEffect(() => {
    return () => {
      savePersistedChat(chatSnapshotRef.current);
    };
  }, []);

  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      if (pinnedToBottom) {
        scrollToBottom(prefersReducedMotion ? 'auto' : 'smooth');
      } else {
        setHasUnreadMessages(true);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, pinnedToBottom, prefersReducedMotion, scrollToBottom]);

  // Smooth resize observer for streaming token growth
  useEffect(() => {
    if (!isProcessing || !lastMessageRef.current || !pinnedToBottom) return;

    const ro = new ResizeObserver(() => {
      if (pinnedToBottom && listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });

    ro.observe(lastMessageRef.current);
    return () => ro.disconnect();
  }, [isProcessing, pinnedToBottom]);

  const handleUserSubmit = useCallback(
    async (userQuery: string, options?: { budgetBDT?: number }) => {
      if (!userQuery.trim() || isProcessing) return;

      let queryText = userQuery.trim();
      const targetBudget =
        options?.budgetBDT !== undefined
          ? options.budgetBDT
          : useTonimaSession.getState().budgetBDT;

      // Natural-language budget injection, but only on messages a budget belongs on.
      // A greeting or a general hardware question goes to the agent untouched.
      if (shouldAttachBudget(queryText, targetBudget)) {
        const budgetStr = (targetBudget as number).toLocaleString('en-IN');
        const budgetSentence =
          i18n.language === 'bn'
            ? `(টার্গেট বাজেট: ৳${budgetStr})`
            : `(Target budget: ৳${budgetStr})`;
        queryText = `${queryText}\n\n${budgetSentence}`;
      }

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
      useTonimaSession.getState().setStatus('thinking');

      // Determine endpoint: use /api/ai/refine if we already have an active build, otherwise /api/ai/build
      const isRefine =
        hasActiveBuild && !/build\s+(me|a)\s+new|start\s+over|reset/i.test(queryText);
      const endpoint = isRefine ? '/api/ai/refine' : '/api/ai/build';
      const bodyPayload = isRefine
        ? {
            sessionId,
            message: queryText,
            language: i18n.language === 'bn' ? 'bn' : 'en',
            budgetBDT: targetBudget || undefined,
          }
        : {
            message: queryText,
            sessionId,
            language: i18n.language === 'bn' ? 'bn' : 'en',
            budgetBDT: targetBudget || undefined,
          };

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

                  const rawParts = Array.isArray(data.parts) ? data.parts : [];
                  const mappedParts: BuildComponentItem[] = rawParts.map(
                    (p: Record<string, unknown>) => ({
                      category: String(p.category || ''),
                      name: String(p.name || ''),
                      priceBDT: Number(p.priceBDT || p.price || 0),
                      retailer: String(p.retailer || 'Star Tech'),
                      inStock: p.inStock !== undefined ? Boolean(p.inStock) : true,
                      productId: p.productId
                        ? String(p.productId)
                        : p.id
                          ? String(p.id)
                          : undefined,
                      listingId: p.listingId ? String(p.listingId) : undefined,
                      productUrl: p.productUrl ? String(p.productUrl) : undefined,
                      priceAsOf: p.priceAsOf ? String(p.priceAsOf) : undefined,
                      buySignal: p.buySignal as BuildComponentItem['buySignal'],
                    }),
                  );

                  const buildPayload: BuildUpdatePayload = {
                    parts: mappedParts,
                    totalBDT: typeof data.totalBDT === 'number' ? data.totalBDT : 0,
                    validation: data.validation || {
                      score: 100,
                      wattage: 420,
                      psuWattage: 750,
                      ok: true,
                      violations: [],
                    },
                    alternatives: data.alternatives,
                    diff: data.diff,
                    budgetStatus: data.budget_status || data.budgetStatus,
                    // The agent reports the budget it actually planned against — which is
                    // the budget stated in the message, not whatever the slider last held.
                    budgetBDT: data.budgetBDT ?? targetBudget ?? null,
                    purpose: data.purpose ?? null,
                  };

                  // Propagate build payload to update HUD and session store immediately
                  if (onBuildUpdated) {
                    onBuildUpdated(buildPayload);
                  }
                  useTonimaSession.getState().applyBuildEvent(buildPayload);
                } else if (currentEvent === 'token') {
                  accumulatedText += data.token || '';
                  // Flip the status once, not once per token: the session store persists
                  // itself on every write, and a sessionStorage write per token would
                  // stutter the stream.
                  if (useTonimaSession.getState().activeBuild.status !== 'streaming') {
                    useTonimaSession.getState().setStatus('streaming');
                  }
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
        useTonimaSession.getState().setStatus('error');
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
        if (useTonimaSession.getState().activeBuild.status !== 'error') {
          useTonimaSession.getState().setStatus('ready');
        }
      }
    },
    [hasActiveBuild, i18n.language, isProcessing, onBuildUpdated, sessionId],
  );

  // Handle incoming prompt events from Hero or presets via useTonimaSession
  const lastConsumedPromptId = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingPrompt || pendingPrompt.id === lastConsumedPromptId.current) return;
    lastConsumedPromptId.current = pendingPrompt.id;
    handleUserSubmit(pendingPrompt.text, { budgetBDT: pendingPrompt.budgetBDT });
  }, [pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps -- guarded by lastConsumedPromptId ref to prevent re-submitting on render/identity flips

  // Backward compatibility for direct initialPrompt prop
  const initialPromptConsumedRef = useRef(false);
  useEffect(() => {
    if (
      initialPrompt &&
      initialPrompt.trim() &&
      !initialPromptConsumedRef.current &&
      !pendingPrompt
    ) {
      initialPromptConsumedRef.current = true;
      handleUserSubmit(initialPrompt.trim());
    }
  }, [initialPrompt, pendingPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isProcessing) return;
    handleUserSubmit(inputVal);
    inputRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const handleRailMouseEnter = () => {
    if (railLeaveTimerRef.current) {
      clearTimeout(railLeaveTimerRef.current);
      railLeaveTimerRef.current = null;
    }
    setIsRailHovered(true);
  };

  const handleRailMouseLeave = () => {
    railLeaveTimerRef.current = setTimeout(() => {
      setIsRailHovered(false);
    }, 250);
  };

  const isRailOpen = hasActiveBuild && (isRailHovered || isRailPinned);

  const handleClear = () => {
    const freshSessionId = `session-${Date.now()}`;
    setMessages(DEFAULT_MESSAGES);
    setHasActiveBuild(false);
    setSessionId(freshSessionId);
    setInputVal('');
    // Reset is the one action that is meant to destroy the transcript. Drop the stored
    // copy too, or the old conversation reappears on the next visit to the page.
    clearPersistedChat();
    chatSnapshotRef.current = {
      version: TONIMA_CHAT_VERSION,
      sessionId: freshSessionId,
      messages: DEFAULT_MESSAGES,
      hasActiveBuild: false,
    };
    useTonimaSession.getState().resetSession();
    if (onResetSession) {
      onResetSession();
    }
  };

  return (
    <div className={`tonima-chat-card-container ${className}`}>
      <div className="tonima-chat-card">
        {/* Compact Header Bar (<= 56px) */}
        <div className="tonima-chat-header">
          <div className="flex items-center gap-2.5">
            <div className="tonima-avatar-compact">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="tonima-header-title">Tonima AI Core</span>
              <span
                className="tonima-live-badge"
                title="Multi-Model (Groq Pool) • Real-Time Prices (BD)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                Live Engine
              </span>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="tonima-reset-btn"
              onClick={handleClear}
              title="Reset Conversation Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Container (Container-Local, No Document Yank) */}
        <div
          ref={listRef}
          className="tonima-messages-container"
          data-lenis-prevent
          onScroll={handleScroll}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, mIdx) => {
              const isLastMsg = mIdx === messages.length - 1;
              const isStreamingBot = isProcessing && isLastMsg && msg.sender === 'bot';
              const hasTable = /^\s*\|.*\|\s*$/m.test(msg.text);

              return (
                <motion.div
                  key={msg.id}
                  ref={isLastMsg ? lastMessageRef : null}
                  className={
                    msg.sender === 'bot'
                      ? `tonima-msg-bot ${hasTable ? 'has-table' : ''}`
                      : 'tonima-msg-user'
                  }
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isStreamingBot && !msg.text ? (
                    <div className="tonima-thinking-inline">
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
                      <span className="text-xs font-medium">
                        {thinkingStatus ||
                          'Tonima is calculating hardware matrices & lowest store prices...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <FormattedMessageContent text={msg.text} isUser={msg.sender === 'user'} />
                      {isStreamingBot && (
                        <span className="tonima-caret" aria-hidden="true">
                          ▍
                        </span>
                      )}
                    </>
                  )}

                  {/* Interactive Suggestion Chips inside bot message */}
                  {msg.sender === 'bot' && msg.highlightChips && msg.highlightChips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-glass-border">
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

                  {/* Consolidated Error Notice with Retry */}
                  {msg.isError && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-warning bg-warning/10 p-2.5 rounded-lg border border-warning/20">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-warning" />
                        <span>Connection interrupted. Click retry or submit another query.</span>
                      </div>
                      {lastUserMsg && (
                        <button
                          type="button"
                          onClick={() => handleUserSubmit(lastUserMsg.text)}
                          className="px-2.5 py-1 rounded bg-warning/20 hover:bg-warning/30 text-warning font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="tonima-msg-timestamp">{msg.timestamp}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Floating "New Messages" Pill */}
          {hasUnreadMessages && !pinnedToBottom && (
            <button
              type="button"
              className="tonima-scroll-bottom-pill"
              onClick={() => scrollToBottom()}
            >
              <ArrowDown className="w-3 h-3" />
              <span>New messages</span>
            </button>
          )}
        </div>

        {/* Collapsible Refinement Suggestion Rail (Task 4: Zero Height when Collapsed) */}
        <div
          className="tonima-refine-hotzone"
          onMouseEnter={handleRailMouseEnter}
          onMouseLeave={handleRailMouseLeave}
        />
        <div
          className={`tonima-refine-rail ${isRailOpen ? 'is-open' : ''}`}
          role="group"
          aria-label="Refinement suggestions"
          aria-expanded={isRailOpen}
          onMouseEnter={handleRailMouseEnter}
          onMouseLeave={handleRailMouseLeave}
        >
          <span className="tonima-refine-label">
            <Sparkles className="w-3 h-3" /> Refine:
          </span>
          <div className="tonima-refine-rail-inner">
            {hasActiveBuild &&
              REFINEMENT_SHORTCUTS.map((refine, idx) => (
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
          <button
            type="button"
            className="tonima-refine-toggle-btn"
            onClick={() => setIsRailPinned((p) => !p)}
            title={isRailPinned ? 'Unpin suggestions' : 'Pin suggestions'}
            aria-label="Toggle suggestions rail"
          >
            {isRailPinned ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Multimodal Input Bar (Target <= 72px) */}
        <div className="tonima-input-bar-wrapper">
          <form className="tonima-input-bar" onSubmit={handleFormSubmit}>
            <button
              type="button"
              className="tonima-input-btn"
              title="Attach benchmark or requirement notes"
              aria-label="Attach notes"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              ref={inputRef}
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
              className={`tonima-input-btn ${isVoiceActive ? 'is-listening' : ''}`}
              title={isVoiceActive ? 'Listening… click to stop' : 'Voice input'}
              aria-label="Voice input"
              aria-pressed={isVoiceActive}
              onClick={toggleVoiceInput}
              disabled={isProcessing}
            >
              {isVoiceActive ? (
                <Mic className="w-4 h-4 animate-pulse text-accent" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </button>

            <button
              type="submit"
              className="tonima-send-btn"
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
          <div className="tonima-input-hint-row">
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
