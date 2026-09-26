"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

import { apiFetch } from "@/lib/api";
import { getLocalToken, localLogout, LOCAL_AUTH } from "@/lib/localAuth";
import { supabase } from "@/lib/supabaseClient";
import { AppUser, FamilyDetail } from "@/lib/types";

interface AppContextValue {
  authed: boolean;
  currentUser: AppUser | null;
  loading: boolean;
  viewedUserId: string | null;
  setViewedUserId: (id: string | null) => void;
  users: AppUser[];
  refreshUsers: () => Promise<void>;
  family: FamilyDetail | null;
  isFamilyChief: boolean;
  refreshFamily: () => Promise<void>;
  viewableUsers: { id: string; full_name: string }[];
  refreshAuth: () => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [family, setFamily] = useState<FamilyDetail | null>(null);

  const refreshUsers = useCallback(async () => {
    if (currentUser?.role !== "admin") return;
    try {
      const list = await apiFetch<AppUser[]>("/users");
      setUsers(list);
    } catch {
      // silencioso — não bloqueia a navegação
    }
  }, [currentUser]);

  const refreshFamily = useCallback(async () => {
    if (!currentUser) return;
    try {
      const detail = await apiFetch<FamilyDetail>("/families/me");
      setFamily(detail);
    } catch {
      setFamily(null);
    }
  }, [currentUser]);

  const refreshAuth = useCallback(() => {
    if (LOCAL_AUTH) {
      setAuthed(!!getLocalToken());
      setAuthChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAuth();
    if (LOCAL_AUTH) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuthed(!!newSession);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      if (!authed) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const me = await apiFetch<AppUser>("/users/me");
        if (!cancelled) setCurrentUser(me);
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (authChecked) loadMe();
    return () => {
      cancelled = true;
    };
  }, [authed, authChecked]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshFamily();
  }, [refreshFamily]);

  const signOut = useCallback(async () => {
    if (LOCAL_AUTH) {
      localLogout();
      setAuthed(false);
    } else {
      await supabase.auth.signOut();
    }
    setViewedUserId(null);
  }, []);

  const isFamilyChief = !!(
    family &&
    currentUser &&
    family.membros.some((m) => m.user_id === currentUser.id && m.papel === "chefe")
  );

  const viewableUsers: { id: string; full_name: string }[] =
    currentUser?.role === "admin"
      ? users.map((u) => ({ id: u.id, full_name: u.full_name }))
      : isFamilyChief && family
        ? family.membros.map((m) => ({ id: m.user_id, full_name: m.full_name }))
        : [];

  return (
    <AppContext.Provider
      value={{
        authed,
        currentUser,
        loading,
        viewedUserId,
        setViewedUserId,
        users,
        refreshUsers,
        family,
        isFamilyChief,
        refreshFamily,
        viewableUsers,
        refreshAuth,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
