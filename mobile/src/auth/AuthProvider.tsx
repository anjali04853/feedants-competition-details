import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { api } from '@/api/endpoints';
import type { User } from '@/api/types';

const STORAGE_KEY = 'feedants.session';

interface Session {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  error: string | null;
  switchUser: (userId: string) => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(session: Session | null) {
  setAuthToken(session?.token ?? null);
  if (session) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session)).catch(() => {});
  else await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

async function loginAs(userId: string): Promise<Session> {
  const session = await api.devLogin(userId);
  await persist(session);
  return session;
}

/** Restores the stored session if its token is still valid, otherwise signs in as the first seeded user. */
async function restoreSession(): Promise<Session> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  if (raw) {
    const stored = JSON.parse(raw) as Session;
    setAuthToken(stored.token);
    try {
      const user = await api.me(); // validates the token and that the user still exists
      return { token: stored.token, user };
    } catch {
      setAuthToken(null);
    }
  }
  const users = await api.devUsers();
  if (!users.length) throw new Error('No users found. Run `npm run seed` in the backend.');
  return loginAs(users[0].id);
}

/**
 * Demo authentication: the app signs in as the first seeded user on first
 * launch, and Profile lets you switch between seeded users to simulate several
 * participants. A real build would replace this with phone OTP login; the rest
 * of the app only depends on `user` and the bearer token.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const bootstrapping = useRef(false);

  useEffect(() => {
    let active = true;
    bootstrapping.current = true;
    restoreSession()
      .then(
        (s) => {
          if (!active) return;
          setSession(s);
          setError(null);
        },
        (e: unknown) => active && setError(e instanceof Error ? e.message : 'Unable to sign in'),
      )
      .finally(() => {
        bootstrapping.current = false;
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    // Expired / invalid token: drop the session and sign in again.
    setUnauthorizedHandler(() => {
      if (bootstrapping.current) return; // bootstrap handles its own 401s
      persist(null).then(() => setAttempt((a) => a + 1));
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  const switchUser = useCallback(
    async (userId: string) => {
      setSession(await loginAs(userId));
      queryClient.removeQueries({ queryKey: ['viewer'] });
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, ready, error, switchUser, retry }),
    [session, ready, error, switchUser, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
