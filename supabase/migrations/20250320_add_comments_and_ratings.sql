-- Tabela de comentários
CREATE TABLE IF NOT EXISTS public.comentarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS public.avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nota INTEGER CHECK (nota BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prompt_id, user_id)
);

-- Políticas de segurança para comentários
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem criar comentários" 
ON public.comentarios FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem ver comentários de prompts públicos ou próprios" 
ON public.comentarios FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts
        WHERE prompts.id = comentarios.prompt_id
        AND (prompts.publico = true OR prompts.user_id = auth.uid())
    )
);

CREATE POLICY "Usuários podem atualizar/excluir seus próprios comentários" 
ON public.comentarios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios comentários" 
ON public.comentarios FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas de segurança para avaliações
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem criar/atualizar suas avaliações" 
ON public.avaliacoes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem ver avaliações de prompts públicos ou próprios" 
ON public.avaliacoes FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.prompts
        WHERE prompts.id = avaliacoes.prompt_id
        AND (prompts.publico = true OR prompts.user_id = auth.uid())
    )
);

-- Função para calcular média de avaliações
CREATE OR REPLACE FUNCTION calcular_media_avaliacoes(p_prompt_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    media NUMERIC;
BEGIN
    SELECT COALESCE(AVG(nota), 0) INTO media
    FROM public.avaliacoes
    WHERE prompt_id = p_prompt_id;
    
    RETURN ROUND(media, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar tabela de prompts para incluir média de avaliações
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS media_avaliacoes NUMERIC DEFAULT 0;

-- Trigger para atualizar média de avaliações
CREATE OR REPLACE FUNCTION atualizar_media_avaliacoes()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar média de avaliações para o prompt
    UPDATE public.prompts
    SET media_avaliacoes = calcular_media_avaliacoes(NEW.prompt_id)
    WHERE id = NEW.prompt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para inserção e atualização de avaliações
CREATE TRIGGER trigger_atualizar_media_avaliacoes
AFTER INSERT OR UPDATE ON public.avaliacoes
FOR EACH ROW EXECUTE FUNCTION atualizar_media_avaliacoes();