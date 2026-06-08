import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface SupabaseContextType {
  matches: any[];
  rankings: any[];
  predictions: any[];
  loading: boolean;
  error: string | null;
}

const SupabaseContext = createContext<SupabaseContextType>({
  matches: [],
  rankings: [],
  predictions: [],
  loading: true,
  error: null,
});

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Try fetching matches
        const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
        if (matchesError) throw matchesError;
        setMatches(matchesData || []);

        // Try fetching predictions
        const { data: predsData, error: predsError } = await supabase.from('predictions').select('*');
        if (predsError) throw predsError;
        setPredictions(predsData || []);

        // Note: For rankings we'd likely need to fetch profiles and calculate,
        // or a specific rankings endpoint/view.
      } catch (err: any) {
        console.error("Error fetching from Supabase:", err);
        setError(err.message || 'Error connecting to Supabase');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <SupabaseContext.Provider value={{ matches, rankings, predictions, loading, error }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => useContext(SupabaseContext);
