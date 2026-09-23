// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TonimaHero from './TonimaHero';
import { useTonimaSession, INITIAL_BUILD_STATE } from '../../store/useTonimaSession';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return { ...actual, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

describe('TonimaHero prompt field (TonimaHero.test.tsx)', () => {
  beforeEach(() => {
    useTonimaSession.setState({
      pendingPrompt: null,
      activeBuild: { ...INITIAL_BUILD_STATE },
      budgetBDT: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // UI-PROMPT-001: the field used to be a single-line <input>, which clipped long text
  // rather than growing to show it.
  it('UI-PROMPT-001: The prompt field is a textarea, not a single-line input', () => {
    render(<TonimaHero />);
    const field = screen.getByLabelText('PC Requirement Prompt');
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('UI-PROMPT-002: A long prompt is retained in full, not truncated', () => {
    render(<TonimaHero />);
    const field = screen.getByLabelText('PC Requirement Prompt') as HTMLTextAreaElement;

    const longText =
      'Build me a white aesthetic 1440p high refresh rate gaming PC under ৳1,80,000 with a ' +
      'liquid cooler, RGB fans, at least 32GB of DDR5 RAM and a 1TB Gen4 NVMe drive, optimized for both gaming and light video editing work.';

    fireEvent.change(field, { target: { value: longText } });

    expect(field.value).toBe(longText);
    expect(field.value.length).toBe(longText.length);
  });

  it('UI-PROMPT-003: Enter (no Shift) submits the prompt', () => {
    // A fresh spy per test, cleared immediately after creation: `vi.spyOn` on a Zustand
    // action mutates the property on the store's CURRENT state object, but the action's
    // own `set()` call copies that mutated reference into the NEXT state object it
    // produces (a plain merge, unaware anything was spied) — so the spy outlives
    // `vi.restoreAllMocks()` in the store's internals and its call history can leak into
    // whichever test asks for a spy next. Clearing right after creation keeps the
    // assertions below scoped to only what happens inside this test.
    const dispatchSpy = vi.spyOn(useTonimaSession.getState(), 'dispatchPrompt');
    dispatchSpy.mockClear();

    render(<TonimaHero />);
    const field = screen.getByLabelText('PC Requirement Prompt') as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: 'Build a budget office PC' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: false });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls[0][0]).toMatchObject({ text: 'Build a budget office PC' });
  });

  it('UI-PROMPT-004: Shift+Enter does not submit, so a multi-line prompt can be composed', () => {
    const dispatchSpy = vi.spyOn(useTonimaSession.getState(), 'dispatchPrompt');
    dispatchSpy.mockClear();

    render(<TonimaHero />);
    const field = screen.getByLabelText('PC Requirement Prompt') as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: 'Build a budget office PC' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('UI-PROMPT-005: Textarea has overflow-y set to hidden initially to prevent scrollbar thumb artifacts', () => {
    render(<TonimaHero />);
    const field = screen.getByLabelText('PC Requirement Prompt') as HTMLTextAreaElement;
    expect(field.style.overflowY).toBe('hidden');
  });
});
