import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "doctor" | "assistant";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  fullName: string;
  loading: boolean;
  isClinical: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMeta = async (userId: string) => {
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setRole((roleRow?.role as AppRole | undefined) ?? null);
      setFullName(profile?.full_name ?? "");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) void loadMeta(newSession.user.id);
      else {
        setRole(null);
        setFullName("");
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadMeta(data.session.user.id);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      fullName,
      loading,
      isClinical: role === "admin" || role === "doctor",
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, role, fullName, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
