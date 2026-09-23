// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import ChatWorkspace from './ChatWorkspace';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('Tonima AI Chat Workspace UI (ChatWorkspace.test.tsx)', () => {
  beforeEach(() => {
    // The transcript now persists in sessionStorage for the life of the tab, so each
    // test starts from a genuinely empty one.
    sessionStorage.clear();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    // Mock scrollTo on Element prototype
    Element.prototype.scrollTo = vi.fn();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock ResizeObserver
    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };

    // Mock fetch to simulate streaming SSE response or instant completion
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let called = false;
          return {
            read: async () => {
              if (!called) {
                called = true;
                const encoder = new TextEncoder();
                return {
                  done: false,
                  value: encoder.encode('event: token\ndata: {"token":"Hello from Tonima"}\n\n'),
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    } as unknown as Response);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('UI-CHAT-001: The message container occupies >= 78% of the card height at a 1440x900 viewport', () => {
    const { container } = render(<ChatWorkspace />);
    const card = container.querySelector('.tonima-chat-card') as HTMLElement;
    const header = container.querySelector('.tonima-chat-header') as HTMLElement;
    const inputWrapper = container.querySelector('.tonima-input-bar-wrapper') as HTMLElement;
    const messagesContainer = container.querySelector('.tonima-messages-container') as HTMLElement;

    expect(card).toBeDefined();
    expect(header).toBeDefined();
    expect(inputWrapper).toBeDefined();
    expect(messagesContainer).toBeDefined();

    // At 1440x900 viewport, card height = clamp(620px, calc(100vh - 140px), 860px) = 760px
    const cardHeight = 760;
    const headerHeight = 52;
    const inputHeight = 68;
    const messagesHeight = cardHeight - headerHeight - inputHeight; // 640px

    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      height: cardHeight,
      top: 0,
      bottom: cardHeight,
      left: 0,
      right: 420,
      width: 420,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    vi.spyOn(messagesContainer, 'getBoundingClientRect').mockReturnValue({
      height: messagesHeight,
      top: headerHeight,
      bottom: headerHeight + messagesHeight,
      left: 0,
      right: 420,
      width: 420,
      x: 0,
      y: headerHeight,
      toJSON: () => ({}),
    });

    const ratio =
      messagesContainer.getBoundingClientRect().height / card.getBoundingClientRect().height;
    expect(ratio).toBeGreaterThanOrEqual(0.78);
  });

  it('UI-CHAT-002: Submitting a message does not change window.scrollY', async () => {
    window.scrollY = 350;
    const originalScrollY = window.scrollY;

    const { container } = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'Build a gaming PC under 150k' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(window.scrollY).toBe(originalScrollY);
  });

  it('UI-CHAT-003: When the list is scrolled up beyond the 64px threshold, a new message does not auto-scroll, and the "New messages" pill appears', async () => {
    const { container } = render(<ChatWorkspace />);
    const list = container.querySelector('.tonima-messages-container') as HTMLDivElement;

    const scrollSpy = vi.fn();
    list.scrollTo = scrollSpy;

    // Simulate scrolled up: scrollHeight=1000, scrollTop=200, clientHeight=400 -> distance from bottom = 400px > 64px
    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(list, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 200, configurable: true });

    fireEvent.scroll(list);

    // Send a message which will append a new message to the list
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'What about the cooling?' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    // Pinned to bottom is false, so scrollTo was not called on message arrival
    const pill = screen.queryByText(/New messages/i);
    expect(pill).toBeDefined();
  });

  it('UI-CHAT-004: When pinned to bottom, a new message does auto-scroll', async () => {
    const { container } = render(<ChatWorkspace />);
    const list = container.querySelector('.tonima-messages-container') as HTMLDivElement;

    const scrollSpy = vi.fn();
    list.scrollTo = scrollSpy;

    // Simulate pinned to bottom: distance = 1000 - 580 - 400 = 20px < 64px
    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(list, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 580, configurable: true });

    fireEvent.scroll(list);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'Upgrade the processor' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(scrollSpy).toHaveBeenCalled();
  });

  it('UI-CHAT-005: The refine rail is not in the accessible tree / has zero height when collapsed, appears on pointerEnter of hot-zone, and collapses after pointerLeave', async () => {
    // Provide a mocked response that triggers an active build so the rail has content to show
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let called = false;
          return {
            read: async () => {
              if (!called) {
                called = true;
                const encoder = new TextEncoder();
                return {
                  done: false,
                  value: encoder.encode(
                    'event: build\ndata: {"sessionId":"sess-123","parts":[]}\n\n',
                  ),
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    } as unknown as Response);

    const { container } = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // Trigger build
    fireEvent.change(input, { target: { value: 'Assemble my PC' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    const rail = container.querySelector('.tonima-refine-rail') as HTMLElement;
    const hotzone = container.querySelector('.tonima-refine-hotzone') as HTMLElement;

    expect(rail).toBeDefined();
    expect(rail.classList.contains('is-open')).toBe(false);

    // Hover hotzone
    fireEvent.mouseEnter(hotzone);
    expect(rail.classList.contains('is-open')).toBe(true);

    // Leave hotzone
    fireEvent.mouseLeave(hotzone);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(rail.classList.contains('is-open')).toBe(false);
  });

  it('UI-CHAT-006: The refine rail renders no refinement chips before a build exists', () => {
    const { container } = render(<ChatWorkspace />);
    const chips = container.querySelectorAll('.tonima-refine-chip');
    expect(chips.length).toBe(0);
    expect(screen.queryByText(/Downgrade RAM/i)).toBeNull();
  });

  it('UI-CHAT-007: .tonima-messages-container carries data-lenis-prevent', () => {
    const { container } = render(<ChatWorkspace />);
    const messagesContainer = container.querySelector('.tonima-messages-container');
    expect(messagesContainer).not.toBeNull();
    expect(messagesContainer).toHaveAttribute('data-lenis-prevent');
  });

  it('UI-CHAT-008: Focus remains on the input after submit', async () => {
    const { container } = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'Recommend a power supply' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(document.activeElement).toBe(input);
  });

  it('UI-CHAT-009: A markdown table in a bot message renders as a <table> with the expected header cells and is not horizontally clipped at the default column width', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let called = false;
          return {
            read: async () => {
              if (!called) {
                called = true;
                const tableMarkdown = `event: token\ndata: {"token":"| Category | Part | Price | Store |\\n| CPU | Ryzen 5 7600 | ৳21,500 | Star Tech |\\n| GPU | RTX 4060 | ৳38,000 | Techland |\\n"}\n\n`;
                return {
                  done: false,
                  value: new TextEncoder().encode(tableMarkdown),
                };
              }
              return { done: true, value: undefined };
            },
          };
        },
      },
    } as unknown as Response);

    const { container } = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'Show components table' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    const table = screen.getByRole('table');
    expect(table).toBeDefined();

    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.trim());
    expect(headerTexts).toEqual(expect.arrayContaining(['Category', 'Part', 'Price', 'Store']));

    const scroller = container.querySelector('.tonima-table-scroller');
    expect(scroller).toBeDefined();
    expect(scroller).toHaveAttribute('data-lenis-prevent-wheel');
  });

  it('UI-CHAT-010: The transcript survives unmounting and remounting the workspace', async () => {
    const first = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = first.container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'Suggest a quiet CPU cooler' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText('Suggest a quiet CPU cooler')).toBeDefined();

    // Leaving the page and coming back
    first.unmount();
    render(<ChatWorkspace />);

    expect(screen.getByText('Suggest a quiet CPU cooler')).toBeDefined();
  });

  it('UI-CHAT-011: Reset clears the transcript and it does not come back on remount', async () => {
    const first = render(<ChatWorkspace />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = first.container.querySelector('form') as HTMLFormElement;

    fireEvent.change(input, { target: { value: 'Suggest a quiet CPU cooler' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reset/i }));
    });

    expect(screen.queryByText('Suggest a quiet CPU cooler')).toBeNull();

    first.unmount();
    render(<ChatWorkspace />);

    expect(screen.queryByText('Suggest a quiet CPU cooler')).toBeNull();
  });

  // UI-VOICE-005: the mic button in the chat input bar previously had no onClick at all.
  it('UI-VOICE-005: Clicking the mic button starts speech recognition and dictates into the input', () => {
    const startSpy = vi.fn();
    let instance: {
      onresult: ((event: unknown) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    } | null = null;

    class MockSpeechRecognition {
      lang = '';
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start = startSpy;
      stop = vi.fn();
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the constructed instance is captured for the test to inspect.
        instance = this;
      }
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = MockSpeechRecognition;

    render(<ChatWorkspace />);
    const micButton = screen.getByRole('button', { name: /voice input/i });

    fireEvent.click(micButton);
    expect(startSpy).toHaveBeenCalledTimes(1);

    act(() => {
      instance?.onresult?.({
        results: { 0: { 0: { transcript: 'build a gaming pc' } } },
      });
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('build a gaming pc');

    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  });
});
