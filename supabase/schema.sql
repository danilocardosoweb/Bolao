-- Bolão Copa 2026 - Supabase Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id INTEGER UNIQUE,
    name VARCHAR,
    code VARCHAR,
    flag VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Matches
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_fixture_id INTEGER UNIQUE NOT NULL,
    league_id INTEGER,
    season INTEGER,
    match_date TIMESTAMPTZ,
    stadium VARCHAR,
    city VARCHAR,
    stage VARCHAR,
    group_name VARCHAR,

    home_team_id UUID REFERENCES public.teams(id),
    team_a_code VARCHAR,
    team_a_name VARCHAR,
    team_a_flag VARCHAR,

    away_team_id UUID REFERENCES public.teams(id),
    team_b_code VARCHAR,
    team_b_name VARCHAR,
    team_b_flag VARCHAR,

    home_goals INTEGER,
    away_goals INTEGER,
    status VARCHAR,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. API usage logs
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_date DATE NOT NULL,
    endpoint VARCHAR NOT NULL,
    requests_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. App users/profile table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE,
    role VARCHAR DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';

-- 5. Predictions
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    match_id UUID REFERENCES public.matches(id),
    predicted_score_a INTEGER,
    predicted_score_b INTEGER,
    status VARCHAR DEFAULT 'pending',
    points_earned INTEGER DEFAULT 0,
    base_points INTEGER DEFAULT 0,
    multiplier_applied NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 6. Points audit
CREATE TABLE IF NOT EXISTS public.audit_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    match_id UUID REFERENCES public.matches(id),
    rule_applied VARCHAR,
    base_points NUMERIC,
    multiplier NUMERIC,
    final_points NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Rankings
CREATE TABLE IF NOT EXISTS public.rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    total_points INTEGER DEFAULT 0,
    exact_matches INTEGER DEFAULT 0,
    correct_results INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT SELECT ON public.rankings TO anon, authenticated;
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_points TO authenticated;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON public.matches (match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions (user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions (match_id);

-- Helper function: predictions are open until 1h before the first match
CREATE OR REPLACE FUNCTION public.predictions_are_open()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE match_date IS NOT NULL
    )
    AND NOW() < (
        SELECT MIN(match_date) - INTERVAL '1 hour'
        FROM public.matches
        WHERE match_date IS NOT NULL
    );
$$;

-- Clean up previous policies
DROP POLICY IF EXISTS "Leitura pública de matches" ON public.matches;
DROP POLICY IF EXISTS "Todos podem ver as partidas" ON public.matches;
DROP POLICY IF EXISTS "Leitura pública de rankings" ON public.rankings;
DROP POLICY IF EXISTS "Leitura pública de predictions" ON public.predictions;
DROP POLICY IF EXISTS "Usuários veem todos os palpites, mas só modificam o seu" ON public.predictions;
DROP POLICY IF EXISTS "Acesso completo de matches" ON public.matches;
DROP POLICY IF EXISTS "Acesso completo de predictions" ON public.predictions;
DROP POLICY IF EXISTS "Acesso completo de rankings" ON public.rankings;
DROP POLICY IF EXISTS "Usuário vê seus palpites" ON public.predictions;
DROP POLICY IF EXISTS "Usuário cria palpite enquanto janela aberta" ON public.predictions;
DROP POLICY IF EXISTS "Usuário atualiza palpite enquanto janela aberta" ON public.predictions;
DROP POLICY IF EXISTS "Usuário remove palpite enquanto janela aberta" ON public.predictions;

-- Public read access for official data
CREATE POLICY "Leitura pública de matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Leitura pública de rankings" ON public.rankings FOR SELECT USING (true);

-- User-only access for predictions
CREATE POLICY "Usuário vê seus palpites" ON public.predictions
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Usuário cria palpite enquanto janela aberta" ON public.predictions
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id AND public.predictions_are_open());

CREATE POLICY "Usuário atualiza palpite enquanto janela aberta" ON public.predictions
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id AND public.predictions_are_open());

CREATE POLICY "Usuário remove palpite enquanto janela aberta" ON public.predictions
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND public.predictions_are_open());

-- Upsert helper for matches
CREATE OR REPLACE FUNCTION upsert_matches(matches_data JSONB)
RETURNS VOID AS $$
DECLARE
    match_record JSONB;
BEGIN
    FOR match_record IN SELECT * FROM jsonb_array_elements(matches_data)
    LOOP
        INSERT INTO public.matches (
            api_fixture_id,
            league_id,
            season,
            match_date,
            stadium,
            city,
            stage,
            group_name,
            team_a_code,
            team_a_name,
            team_a_flag,
            team_b_code,
            team_b_name,
            team_b_flag,
            home_goals,
            away_goals,
            status,
            updated_at
        ) VALUES (
            (match_record->>'api_fixture_id')::INTEGER,
            (match_record->>'league_id')::INTEGER,
            (match_record->>'season')::INTEGER,
            (match_record->>'match_date')::TIMESTAMPTZ,
            match_record->>'stadium',
            match_record->>'city',
            match_record->>'stage',
            match_record->>'group_name',
            match_record->>'team_a_code',
            match_record->>'team_a_name',
            match_record->>'team_a_flag',
            match_record->>'team_b_code',
            match_record->>'team_b_name',
            match_record->>'team_b_flag',
            (match_record->>'home_goals')::INTEGER,
            (match_record->>'away_goals')::INTEGER,
            match_record->>'status',
            NOW()
        )
        ON CONFLICT (api_fixture_id) DO UPDATE SET
            match_date = EXCLUDED.match_date,
            stadium = EXCLUDED.stadium,
            city = EXCLUDED.city,
            stage = EXCLUDED.stage,
            group_name = EXCLUDED.group_name,
            team_a_code = EXCLUDED.team_a_code,
            team_a_name = EXCLUDED.team_a_name,
            team_a_flag = EXCLUDED.team_a_flag,
            team_b_code = EXCLUDED.team_b_code,
            team_b_name = EXCLUDED.team_b_name,
            team_b_flag = EXCLUDED.team_b_flag,
            home_goals = EXCLUDED.home_goals,
            away_goals = EXCLUDED.away_goals,
            status = EXCLUDED.status,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;
