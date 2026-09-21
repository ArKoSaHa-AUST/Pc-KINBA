import { create } from 'zustand';
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
  sessionId: null,
  status: 'idle',
  lastUpdatedAt: null,
};

interface TonimaSessionStore {
  pendingPrompt: TonimaPrompt | null;
  activeBuild: TonimaBuildState;
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
    budgetBDT?: number;
  }) => void;
  resetSession: () => void;
}

export const useTonimaSession = create<TonimaSessionStore>((set, get) => ({
  pendingPrompt: null,
  activeBuild: { ...INITIAL_BUILD_STATE },
  budgetBDT: 150000,

  dispatchPrompt: (prompt: TonimaPrompt) => {
    set((state) => ({
      pendingPrompt: prompt,
      budgetBDT: prompt.budgetBDT !== undefined ? prompt.budgetBDT : state.budgetBDT,
      activeBuild: {
        ...state.activeBuild,
        budgetBDT: prompt.budgetBDT !== undefined ? prompt.budgetBDT : state.activeBuild.budgetBDT,
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
        payload.budgetBDT !== undefined ? payload.budgetBDT : state.activeBuild.budgetBDT;

      let budgetStatus = payload.budgetStatus || state.activeBuild.budgetStatus;
      if (!budgetStatus && budgetBDT && totalBDT > 0) {
        if (totalBDT <= budgetBDT) {
          budgetStatus = 'met';
        } else if (totalBDT <= budgetBDT * 1.05) {
          budgetStatus = 'over';
        } else {
          budgetStatus = 'over';
        }
      }

      return {
        activeBuild: {
          ...state.activeBuild,
          parts,
          totalBDT,
          validation:
            payload.validation !== undefined ? payload.validation : state.activeBuild.validation,
          alternatives:
            payload.alternatives !== undefined
              ? payload.alternatives
              : state.activeBuild.alternatives,
          diff: payload.diff !== undefined ? payload.diff : state.activeBuild.diff,
          sessionId: payload.sessionId || state.activeBuild.sessionId,
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
    });
  },
}));
