import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, User, getSession, login as doLogin, logout as doLogout, setSession } from "./auth";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setLocalSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setLocalSession(s);
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (u: string, p: string) => {
    const s = await doLogin(u, p);
    setLocalSession(s);
  }, []);

  const signOut = useCallback(async () => {
    await doLogout();
    setLocalSession(null);
  }, []);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
