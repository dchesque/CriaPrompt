-- supabase/migrations/20250320_update_comments_relation.sql
CREATE TABLE IF NOT EXISTS public.comentarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas RLS
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para comentários
CREATE POLICY "Comentários públicos ou do próprio usuário" 
ON public.comentarios FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts p
        WHERE p.id = comentarios.prompt_id AND 
        (p.publico = true OR p.user_id = auth.uid())
    )
);

CREATE POLICY "Usuários podem criar comentários" 
ON public.comentarios FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar/excluir seus próprios comentários" 
ON public.comentarios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios comentários" 
ON public.comentarios FOR DELETE 
USING (auth.uid() = user_id);