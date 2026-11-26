import { useSyncExternalStore } from 'react';

/** Tema por aparelho (não vai para a conta): claro, escuro monocromático ou o do sistema. */
export type ThemeChoice = 'claro' | 'escuro' | 'auto';

const KEY = 'deck-review:tema';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemeChoice(): ThemeChoice {
  const v = localStorage.getItem(KEY);
  return v === 'claro' || v === 'escuro' ? v : 'auto';
}

function resolved(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'auto') return media?.matches ? 'dark' : 'light';
  return choice === 'escuro' ? 'dark' : 'light';
}

export function applyTheme(): void {
  const mode = resolved(getThemeChoice());
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0f0f10' : '#efede6');
}

export function setThemeChoice(choice: ThemeChoice): void {
  localStorage.setItem(KEY, choice);
  applyTheme();
  listeners.forEach((l) => l());
}

media?.addEventListener('change', () => {
  if (getThemeChoice() === 'auto') {
    applyTheme();
    listeners.forEach((l) => l());
  }
});

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getThemeChoice,
  );
}

export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'escuro', label: 'Escuro' },
  { value: 'auto', label: 'Automático' },
];
