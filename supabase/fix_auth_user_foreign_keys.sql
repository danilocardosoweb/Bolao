-- Corrige as chaves estrangeiras de usuários para usar auth.users.
-- Rode este arquivo no SQL Editor do Supabase.

BEGIN;

-- Remove vínculos antigos com public.users, se ainda existirem no banco remoto.
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_user_id_fkey;
ALTER TABLE public.audit_points DROP CONSTRAINT IF EXISTS audit_points_user_id_fkey;
ALTER TABLE public.rankings DROP CONSTRAINT IF EXISTS rankings_user_id_fkey;

-- Se existirem registros antigos ligados a public.users, tenta migrar pelo e-mail.
WITH user_map AS (
  SELECT
    legacy.id AS old_user_id,
    auth_user.id AS new_user_id
  FROM public.users legacy
  JOIN auth.users auth_user
    ON lower(legacy.email) = lower(auth_user.email)
  WHERE legacy.email IS NOT NULL
)
UPDATE public.predictions prediction
SET user_id = user_map.new_user_id
FROM user_map
WHERE prediction.user_id = user_map.old_user_id;

WITH user_map AS (
  SELECT
    legacy.id AS old_user_id,
    auth_user.id AS new_user_id
  FROM public.users legacy
  JOIN auth.users auth_user
    ON lower(legacy.email) = lower(auth_user.email)
  WHERE legacy.email IS NOT NULL
)
UPDATE public.audit_points audit
SET user_id = user_map.new_user_id
FROM user_map
WHERE audit.user_id = user_map.old_user_id;

WITH user_map AS (
  SELECT
    legacy.id AS old_user_id,
    auth_user.id AS new_user_id
  FROM public.users legacy
  JOIN auth.users auth_user
    ON lower(legacy.email) = lower(auth_user.email)
  WHERE legacy.email IS NOT NULL
)
UPDATE public.rankings ranking
SET user_id = user_map.new_user_id
FROM user_map
WHERE ranking.user_id = user_map.old_user_id;

-- Remove registros antigos que não pertencem a nenhum usuário autenticado.
DELETE FROM public.predictions prediction
WHERE prediction.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users auth_user
    WHERE auth_user.id = prediction.user_id
  );

DELETE FROM public.audit_points audit
WHERE audit.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users auth_user
    WHERE auth_user.id = audit.user_id
  );

DELETE FROM public.rankings ranking
WHERE ranking.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users auth_user
    WHERE auth_user.id = ranking.user_id
  );

-- Recria os vínculos corretos com os usuários autenticados do Supabase.
ALTER TABLE public.predictions
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN match_id SET NOT NULL,
  ADD CONSTRAINT predictions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.audit_points
  ADD CONSTRAINT audit_points_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rankings
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT rankings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- O sistema usa multiplicadores como 1.2, 1.5 e 2.5.
ALTER TABLE public.predictions
  ALTER COLUMN multiplier_applied TYPE NUMERIC
  USING multiplier_applied::NUMERIC;

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

-- Garante permissões e RLS esperadas pelo app.
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT ON public.rankings TO anon, authenticated;

DROP POLICY IF EXISTS "Leitura pública de predictions" ON public.predictions;
DROP POLICY IF EXISTS "Acesso completo de predictions" ON public.predictions;
DROP POLICY IF EXISTS "Usuário vê seus palpites" ON public.predictions;
DROP POLICY IF EXISTS "Usuário cria palpite enquanto janela aberta" ON public.predictions;
DROP POLICY IF EXISTS "Usuário atualiza palpite enquanto janela aberta" ON public.predictions;
DROP POLICY IF EXISTS "Usuário remove palpite enquanto janela aberta" ON public.predictions;

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

COMMIT;
