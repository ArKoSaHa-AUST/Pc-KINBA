import { createContext } from 'react';

/** The supported UI themes. */
export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The currently active, resolved theme applied to <html data-theme>. */
  theme: Theme;
  /** Explicitly set a theme (persisted to localStorage). */
  setTheme: (theme: Theme) => void;
  /** Cycle light -> dark -> light. Used by the compact switcher. */
  cycleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'pckinba.theme';
export const THEME_ORDER: Theme[] = ['light', 'dark'];

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
