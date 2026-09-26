"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { PersonSlug } from "@/lib/types";

const PERSON_STORAGE_KEY = "teamfit_person";

interface AppContextValue {
  authOk: boolean;
  authChecked: boolean;
  verifyPassword: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  person: PersonSlug;
  setPerson: (person: PersonSlug) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authOk, setAuthOk] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [person, setPersonState] = useState<PersonSlug>("paulo");

  useEffect(() => {
    const stored = window.localStorage.getItem(PERSON_STORAGE_KEY);
    if (stored === "paulo" || stored === "barbara") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonState(stored);
    }
  }, []);

  const setPerson = useCallback((next: PersonSlug) => {
    setPersonState(next);
    window.localStorage.setItem(PERSON_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/auth/session")
      .then(() => {
        if (!cancelled) setAuthOk(true);
      })
      .catch(() => {
        if (!cancelled) setAuthOk(false);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const verifyPassword = useCallback(async (password: string) => {
    try {
      await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
      setAuthOk(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      setAuthOk(false);
    }
  }, []);

  return (
    <AppContext.Provider value={{ authOk, authChecked, verifyPassword, logout, person, setPerson }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
