import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface SupabaseContextType {
  matches: any[];
  rankings: any[];
  predictions: any[];
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; sessionCreated: boolean }>;
  updateProfileName: (fullName: string) => Promise<{ error: string | null }>;
  savePrediction: (matchId: string, predictedScoreA: number, predictedScoreB: number) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  matches: [],
  rankings: [],
  predictions: [],
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  error: null,
  authLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, sessionCreated: false }),
  updateProfileName: async () => ({ error: null }),
  savePrediction: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adminEmails = ((import.meta as any).env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
  const currentEmail = (user?.email || "").trim().toLowerCase();
  const currentUserId = user?.id ?? null;
  const currentEmailLocal = currentEmail.split("@")[0];

  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    adminEmails.includes(currentEmail) ||
    adminEmails.includes(currentEmailLocal);

  const fetchBaseData = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      const { data: rankingsData, error: rankingsError } = await supabase
        .from('rankings')
        .select('*')
        .order('total_points', { ascending: false });
      if (rankingsError) throw rankingsError;
      setRankings(rankingsData || []);
    } catch (err: any) {
      console.error("Error fetching from Supabase:", err);
      setError(err.message || 'Error connecting to Supabase');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictionsForCurrentUser = async (userId: string | null) => {
    try {
      if (!userId) {
        setPredictions([]);
        return;
      }

      const { data: predsData, error: predsError } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (predsError) throw predsError;
      setPredictions(predsData || []);
    } catch (err: any) {
      console.error("Error fetching predictions:", err);
      setError(err.message || 'Error connecting to Supabase');
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }

    initializeAuth();
    void fetchBaseData(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthLoading(false);
    });

    const interval = setInterval(() => {
      void fetchBaseData(false);
    }, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void fetchPredictionsForCurrentUser(currentUserId);

    if (!currentUserId) {
      return;
    }

    const interval = setInterval(() => {
      void fetchPredictionsForCurrentUser(currentUserId);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.message?.includes("predictions_user_id_fkey")) {
      return { error: "A base precisa receber a correção de usuários antes de salvar palpites." };
    }

    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });

    return {
      error: error?.message ?? null,
      sessionCreated: Boolean(data.session),
    };
  };

  const updateProfileName = async (fullName: string) => {
    const nextName = fullName.trim();
    if (!nextName) {
      return { error: "Informe um nome para atualizar." };
    }

    const { error } = await supabase.auth.updateUser({
      data: { full_name: nextName },
    });

    if (!error) {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session ?? null);
      setUser(sessionData.session?.user ?? null);
    }

    return { error: error?.message ?? null };
  };

  const savePrediction = async (matchId: string, predictedScoreA: number, predictedScoreB: number) => {
    if (!user) {
      return { error: "Faça login para salvar seu palpite." };
    }

    const { canSubmitPredictions } = await import("./predictionWindow");
    if (!canSubmitPredictions(matches)) {
      return { error: "Os palpites foram encerrados 1 hora antes do primeiro jogo." };
    }

    const payload = {
      user_id: user.id,
      match_id: matchId,
      predicted_score_a: predictedScoreA,
      predicted_score_b: predictedScoreB,
      status: "pending",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("predictions").upsert(payload, {
      onConflict: "user_id,match_id",
    });

    if (!error) {
      await fetchPredictionsForCurrentUser(user.id);
    }

    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  };

  return (
    <SupabaseContext.Provider value={{ matches, rankings, predictions, session, user, isAdmin, loading, error, authLoading, signIn, signUp, updateProfileName, savePrediction, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => useContext(SupabaseContext);
