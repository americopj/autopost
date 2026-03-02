-- Atualizar tabela user_profiles no Supabase
-- Execute este SQL no Supabase SQL Editor

-- Adicionar novas colunas se não existirem
DO $$ 
BEGIN
  -- Adicionar logo_1_url se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'logo_1_url') THEN
    ALTER TABLE user_profiles ADD COLUMN logo_1_url TEXT;
  END IF;

  -- Adicionar logo_2_url se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'logo_2_url') THEN
    ALTER TABLE user_profiles ADD COLUMN logo_2_url TEXT;
  END IF;

  -- Adicionar logo_3_url se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'logo_3_url') THEN
    ALTER TABLE user_profiles ADD COLUMN logo_3_url TEXT;
  END IF;

  -- Adicionar selected_logo_index se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'selected_logo_index') THEN
    ALTER TABLE user_profiles ADD COLUMN selected_logo_index INTEGER DEFAULT 1;
  END IF;
END $$;

-- POLÍTICAS PARA O BUCKET "logos" (execute após criar o bucket)
-- Remover políticas se já existirem
DROP POLICY IF EXISTS "Permitir upload público de logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização pública de logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública de logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir deleção pública de logos" ON storage.objects;

-- Permitir upload público
CREATE POLICY "Permitir upload público de logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos');

-- Permitir atualização pública
CREATE POLICY "Permitir atualização pública de logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública de logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Permitir deleção pública
CREATE POLICY "Permitir deleção pública de logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos');
