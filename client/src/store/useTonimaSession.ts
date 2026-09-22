import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BuildComponentItem } from '../components/ai/BuildPreviewHUD';

export interface TonimaPrompt {
  id: string;
  text: string;
  budgetBDT?: number;
  source: 'hero' | 'preset' | 'chat' | 'chip';
}

export interface BuildValidation {
  score: number;
  wattage: number;
  psuWattage: number;
  ok: boolean;
  violations: Array<{ rule: string; detail: string }>;
}

export interface BuildAlternative {
  category: string;
  id: string;
  delta_bdt: number;
  label: string;
}

export interface BuildDiff {
  category: string;
  priceDelta: number;
  newPartName?: string;
}

export type TonimaStatus = 'idle' | 'thinking' | 'streaming' | 'ready' | 'error';

export interface TonimaBuildState {
  parts: BuildComponentItem[];
  totalBDT: number;
  validation: BuildValidation | null;
  alternatives: BuildAlternative[];
  diff: BuildDiff | null;
  budgetBDT: number | null;
  budgetStatus: 'met' | 'over' | 'under' | null;
  /** Agent purpose ('gaming' | 'ai_ml' | ...) behind the current build, for the builder handoff. */
  purpose: string | null;
  sessionId: string | null;
  status: TonimaStatus;
  lastUpdatedAt: string | null;
}

export const INITIAL_BUILD_STATE: TonimaBuildState = {
  parts: [],
  totalBDT: 0,
  validation: null,
  alternatives: [],
  diff: null,
  budgetBDT: null,
  budgetStatus: null,
  purpose: null,
  sessionId: null,
  status: 'idle',
  lastUpdatedAt: null,
};

/**
 * sessionStorage, not localStorage: the build survives navigating to the builder and
 * back, and a reload, but dies with the tab — which is what "leaving the project"
 * means to the user, and what keeps a new tab a genuinely new conversation.
 */
export const TONIMA_SESSION_KEY = 'pc-kinba.tonima-session';

interface TonimaSessionStore {
  pendingPrompt: TonimaPrompt | null;
  activeBuild: TonimaBuildState;
  /**
   * Target budget in BDT, or null when the user has not named one. Null is the honest
   * default: a phantom number here used to be injected into every message the user
   * sent, which turned "hi" into a ৳1,50,000 build request.
   */
  budgetBDT: number | null;

  dispatchPrompt: (prompt: TonimaPrompt) => void;
  consumePrompt: () => TonimaPrompt | null;
  setBudget: (budget: number | null) => void;
  setStatus: (status: TonimaStatus) => void;
  applyBuildEvent: (payload: {
    parts?: BuildComponentItem[];
    totalBDT?: number;
    validation?: BuildValidation;
    alternatives?: BuildAlternative[];
    diff?: BuildDiff;
    sessionId?: string;
    budgetStatus?: 'met' | 'over' | 'under';
    budgetBDT?: number | null;
    purpose?: string | null;
  }) => void;
  resetSession: () => void;
}

export const useTonimaSession = create<TonimaSessionStore>()(
  persist(
    (set, get) => ({
      pendingPrompt: null,
      activeBuild: { ...INITIAL_BUILD_STATE },
      budgetBDT: null,

      dispatchPrompt: (prompt: TonimaPrompt) => {
        set((state) => ({
          pendingPrompt: prompt,
          budgetBDT: prompt.budgetBDT !== undefined ? prompt.budgetBDT : state.budgetBDT,
          activeBuild: {
            ...state.activeBuild,
            budgetBDT:
              prompt.budgetBDT !== undefined ? prompt.budgetBDT : state.activeBuild.budgetBDT,
            status: 'thinking',
          },
        }));
      },

      consumePrompt: () => {
        const prompt = get().pendingPrompt;
        set({ pendingPrompt: null });
        return prompt;
      },

      setBudget: (budget: number | null) => {
        set((state) => ({
          budgetBDT: budget,
          activeBuild: {
            ...state.activeBuild,
            budgetBDT: budget,
          },
        }));
      },

      setStatus: (status: TonimaStatus) => {
        set((state) => ({
          activeBuild: {
            ...state.activeBuild,
            status,
          },
        }));
      },

      applyBuildEvent: (payload) => {
        set((state) => {
          const parts = payload.parts || state.activeBuild.parts;
          const totalBDT =
            payload.totalBDT !== undefined
              ? payload.totalBDT
              : parts.reduce((sum, p) => sum + (p.priceBDT || 0), 0);
          const budgetBDT =
            payload.budgetBDT !== undefined && payload.budgetBDT !== null
              ? payload.budgetBDT
              : state.activeBuild.budgetBDT;

          let budgetStatus = payload.budgetStatus || state.activeBuild.budgetStatus;
          if (!budgetStatus && budgetBDT && totalBDT > 0) {
            budgetStatus = totalBDT <= budgetBDT ? 'met' : 'over';
          }

          return {
            // The agent's own budget reading wins over a stale slider value so the HUD
            // and the chat never quote two different targets.
            budgetBDT:
              payload.budgetBDT !== undefined && payload.budgetBDT !== null
                ? payload.budgetBDT
                : state.budgetBDT,
            activeBuild: {
              ...state.activeBuild,
              parts,
              totalBDT,
              validation:
                payload.validation !== undefined
                  ? payload.validation
                  : state.activeBuild.validation,
              alternatives:
                payload.alternatives !== undefined
                  ? payload.alternatives
                  : state.activeBuild.alternatives,
              diff: payload.diff !== undefined ? payload.diff : state.activeBuild.diff,
              sessionId: payload.sessionId || state.activeBuild.sessionId,
              purpose:
                payload.purpose !== undefined && payload.purpose !== null
                  ? payload.purpose
                  : state.activeBuild.purpose,
              budgetBDT,
              budgetStatus,
              status: 'ready',
              lastUpdatedAt: new Date().toISOString(),
            },
          };
        });
      },

      resetSession: () => {
        set({
          pendingPrompt: null,
          activeBuild: { ...INITIAL_BUILD_STATE },
          budgetBDT: null,
        });
      },
    }),
    {
      name: TONIMA_SESSION_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // pendingPrompt is deliberately excluded: rehydrating it would re-fire the
      // prompt against the backend every time the page is revisited.
      partialize: (state) => ({
        activeBuild: state.activeBuild,
        budgetBDT: state.budgetBDT,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A stream that was mid-flight when the tab navigated away is over; never come
        // back showing a spinner that will not resolve.
        if (state.activeBuild.status === 'thinking' || state.activeBuild.status === 'streaming') {
          state.activeBuild = {
            ...state.activeBuild,
            status: state.activeBuild.parts.length > 0 ? 'ready' : 'idle',
          };
        }
      },
    },
  ),
);
