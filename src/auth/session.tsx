import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { watchAuth, type User } from '../firebase/auth';
import { saveProfile, subscribeUserData, writeOps } from '../firebase/db';
import { diffOps, LISTS, type ListKey } from '../firebase/diff';
import { applyRemote, emptyData, endSession, setStoreError, startSession } from '../store/store';
import type { AppData } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

const PARTS = Object.keys(LISTS).length + 2; // listas + meta + preferências

/** Liga o usuário logado aos dados dele no Firestore (e desliga no logout). */
function bindUser(user: User): () => void {
  const uid = user.uid;
  startSession((prev, next) => writeOps(uid, diffOps(prev, next)));
  void saveProfile(uid, { ...(user.displayName ? { nome: user.displayName } : {}), email: user.email ?? '' }).catch(() => undefined);

  const loaded = new Set<string>();
  const base = emptyData();
  const unsub = subscribeUserData(
    uid,
    (p) => {
      let patch: Partial<AppData>;
      if (p.kind === 'list') {
        loaded.add(p.key);
        patch = { [p.key as ListKey]: p.items } as Partial<AppData>;
      } else if (p.kind === 'meta') {
        loaded.add('meta');
        patch = { meta: { ...base.meta, ...(p.value ?? {}), entries: p.value?.entries ?? [] } };
      } else {
        loaded.add('settings');
        patch = { settings: { ...base.settings, ...(p.value ?? {}) } };
      }
      applyRemote(patch, loaded.size >= PARTS);
    },
    (e) => setStoreError(e.message.includes('permission') ? 'Sem permissão para ler os dados. Confira se as regras do Firestore foram publicadas.' : e.message),
  );
  return () => {
    unsub();
    endSession();
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => watchAuth((user) => setState({ user, loading: false })), []);

  const uid = state.user?.uid;
  useEffect(() => {
    if (!state.user) return;
    return bindUser(state.user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
