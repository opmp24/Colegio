import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import type { Profile } from "@/types";

interface AuthState {
  user: import("@supabase/supabase-js").User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (pin: string) => Promise<{ blocked: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (pin: string) => {
    const { data: loginData, error: rpcError } = await db
      .rpc("login_with_pin", { p_pin: pin })
      .single() as {
        data: { auth_email: string; user_id: string; full_name: string; role: string; is_blocked: boolean } | null;
        error: any;
      };

    if (rpcError || !loginData) {
      const msg = rpcError?.message ?? "";
      if (msg === "CUENTA_BLOQUEADA") return { blocked: true };
      throw new Error("Código inválido");
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginData.auth_email,
      password: pin,
    });

    if (authError) throw new Error("Error al iniciar sesión");

    return { blocked: false };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
