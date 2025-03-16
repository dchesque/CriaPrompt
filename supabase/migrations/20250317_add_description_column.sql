-- supabase/migrations/20250317_add_description_column.sql
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Atualizar as políticas RLS se necessário para incluir o novo campo