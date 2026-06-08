-- Bolão Copa 2026 - Supabase Schema
-- Este arquivo contém a modelagem completa para o PostgreSQL no Supabase

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE match_stage AS ENUM ('group_stage', 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final');
CREATE TYPE prediction_status AS ENUM ('pending', 'locked', 'scored');

-- 3. TABLES

-- Users (Estendendo auth.users do Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    email TEXT UNIQUE NOT NULL,
    city TEXT,
    favorite_team TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups (Bolões)
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    password_hash TEXT, -- Nulo para grupos públicos
    is_public BOOLEAN DEFAULT true,
    logo_url TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group Members
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 11. Teams (API-Football integration)
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_id INT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    flag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_fixture_id INT UNIQUE, -- From API-Football
    team_a_code TEXT,
    team_b_code TEXT,
    team_a_name TEXT,
    team_b_name TEXT,
    team_a_flag TEXT,
    team_b_flag TEXT,
    home_team_id UUID REFERENCES public.teams(id),
    away_team_id UUID REFERENCES public.teams(id),
    match_date TIMESTAMPTZ NOT NULL,
    stadium TEXT,
    city TEXT,
    stage match_stage NOT NULL,
    group_name TEXT,
    home_goals INT DEFAULT NULL,
    away_goals INT DEFAULT NULL,
    status TEXT DEFAULT 'NS', -- NS (Not Started), FT (Full Time), etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. API Usage Logs
CREATE TABLE public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_date DATE DEFAULT CURRENT_DATE,
    endpoint TEXT NOT NULL,
    requests_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(request_date, endpoint)
);

-- 6. Predictions (Palpites)
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    predicted_score_a INT NOT NULL,
    predicted_score_b INT NOT NULL,
    points_earned INT DEFAULT 0,
    multiplier_applied DECIMAL(3,1) DEFAULT 1.0,
    base_points INT DEFAULT 0,
    status prediction_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- 7. Rankings
CREATE TABLE public.rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    total_points INT DEFAULT 0,
    exact_matches INT DEFAULT 0,
    correct_results INT DEFAULT 0,
    ties INT DEFAULT 0,
    errors INT DEFAULT 0,
    position INT,
    previous_position INT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 8. Achievements (Conquistas baseadas nas novas regras)
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL, -- e.g., 'SEER', 'KING_OF_SCORE', 'TIE_SPECIALIST', 'CAPTAIN_OF_ROUND'
    points_rewarded INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Points Log (Tabela de auditoria do cálculo de pontos)
CREATE TABLE public.audit_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    match_id UUID REFERENCES public.matches(id),
    rule_applied TEXT NOT NULL, -- ex: 'PLACAR_EXATO', 'VENCEDOR_SALDO', etc.
    base_points INT NOT NULL,
    multiplier DECIMAL(3,1) NOT NULL,
    final_points INT NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus Predictions
CREATE TABLE public.bonus_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    champion_team TEXT,
    runner_up_team TEXT,
    top_scorer_name TEXT,
    best_player_name TEXT,
    points_earned INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS (Row Level Security)

-- Ativando RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- Políticas de Exemplo (Podem ser ajustadas conforme a regra de negócio)
CREATE POLICY "Usuários podem ver o próprio perfil e perfis públicos"
ON public.users FOR SELECT USING (true);

CREATE POLICY "Usuários podem atualizar o próprio perfil"
ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Todos podem ver grupos públicos"
ON public.groups FOR SELECT USING (is_public = true OR auth.uid() IN (SELECT user_id FROM public.group_members WHERE group_id = id));

CREATE POLICY "Apenas admins podem modificar a partida"
ON public.matches FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY "Todos podem ver as partidas"
ON public.matches FOR SELECT USING (true);

CREATE POLICY "Usuários veem todos os palpites, mas só modificam o seu"
ON public.predictions FOR SELECT USING (true);

CREATE POLICY "Usuário edita apenas o próprio palpite se não estiver bloqueado"
ON public.predictions FOR ALL USING (auth.uid() = user_id AND status = 'pending');
