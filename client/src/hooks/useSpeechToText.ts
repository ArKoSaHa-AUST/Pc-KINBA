import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal typings for the (still non-standard, vendor-prefixed on some browsers) Web
 * Speech API. No `@types` package ships these, so they are declared locally rather than
 * pulled in as `any`.
 */
interface SpeechRecognitionResultEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

function getSpeechRecognitionClass(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

interface UseSpeechToTextOptions {
  lang?: string;
  /** Called with the recognized transcript once speech recognition finishes. */
  onResult: (transcript: string) => void;
}

/**
 * Wraps the browser's SpeechRecognition API behind a `{ isListening, toggleListening,
 * isSupported }` interface, with a graceful simulated-pulse fallback (no transcript, just
 * a brief "listening" UI state) on browsers that don't implement it at all — Firefox,
 * notably, has no SpeechRecognition support as of this writing.
 *
 * Shared by TonimaHero's prompt launcher and ChatWorkspace's message input so voice entry
 * behaves identically in both places instead of one having a real implementation and the
 * other a decorative button with no handler.
 */
export function useSpeechToText({ lang = 'en-US', onResult }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const isSupported = typeof window !== 'undefined' && !!getSpeechRecognitionClass();

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = lang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) onResultRef.current(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
      } catch {
        // A browser can advertise SpeechRecognition and still throw on construction
        // (e.g. mic permission denied outright) — fall back to a brief listening pulse
        // rather than silently doing nothing.
        setIsListening(true);
        setTimeout(() => setIsListening(false), 2500);
      }
    } else {
      setIsListening(true);
      setTimeout(() => setIsListening(false), 2500);
    }
  }, [isListening, lang]);

  // Stop any in-flight recognition if the component unmounts mid-listen.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { isListening, toggleListening, isSupported };
}
