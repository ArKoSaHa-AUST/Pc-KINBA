// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from './useSpeechToText';

interface MockRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

describe('useSpeechToText', () => {
  let lastInstance: MockRecognitionInstance | null = null;
  let startSpy: ReturnType<typeof vi.fn>;
  let stopSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    startSpy = vi.fn();
    stopSpy = vi.fn();
    lastInstance = null;

    // Deliberately not `implements MockRecognitionInstance`: vi.fn()'s mock type carries
    // a `new (...args) => any` construct signature alongside its call signature, which TS
    // treats as incompatible with a plain `() => void` interface member. The object shape
    // at runtime is exactly what SpeechRecognition instances look like; only the static
    // type-check is being worked around here.
    class MockSpeechRecognition {
      lang = '';
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;
      start = startSpy;
      stop = stopSpy;
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the constructed instance is captured for the test to inspect.
        lastInstance = this;
      }
    }

    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
      MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  // UI-VOICE-001: the mic button previously had no handler at all — this is the
  // regression guard for it doing something when clicked.
  it('UI-VOICE-001: toggleListening starts recognition and flips isListening', () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onResult }));

    expect(result.current.isListening).toBe(false);

    act(() => {
      result.current.toggleListening();
    });

    expect(result.current.isListening).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);
  });

  it('UI-VOICE-002: a recognized transcript reaches onResult and clears the listening state', () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onResult }));

    act(() => {
      result.current.toggleListening();
    });

    act(() => {
      lastInstance?.onresult?.({ results: { 0: { 0: { transcript: 'gaming pc under 150k' } } } });
    });

    expect(onResult).toHaveBeenCalledWith('gaming pc under 150k');
    expect(result.current.isListening).toBe(false);
  });

  it('UI-VOICE-003: toggling while listening stops recognition instead of starting a second one', () => {
    const { result } = renderHook(() => useSpeechToText({ onResult: vi.fn() }));

    act(() => {
      result.current.toggleListening();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.toggleListening();
    });

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(false);
  });

  it('UI-VOICE-004: an unsupported browser still gives visible feedback instead of doing nothing', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    vi.useFakeTimers();

    const { result } = renderHook(() => useSpeechToText({ onResult: vi.fn() }));
    expect(result.current.isSupported).toBe(false);

    act(() => {
      result.current.toggleListening();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isListening).toBe(false);

    vi.useRealTimers();
  });
});
