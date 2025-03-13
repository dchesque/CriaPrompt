-- Estrutura completa do banco de dados CriaPrompt

-- Tabela de prompts
CREATE TABLE IF NOT EXISTS public.prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    categoria TEXT DEFAULT 'geral',
    publico BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    nome TEXT,
    bio TEXT,
    email_notificacoes BOOLEAN DEFAULT TRUE,
    perfil_publico BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    notificacoes_app BOOLEAN DEFAULT TRUE,
    auto_save BOOLEAN DEFAULT TRUE,
    template_padrao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Prompts: políticas
CREATE POLICY "Prompts públicos são visíveis para todos" ON public.prompts
    FOR SELECT USING (publico = true);

CREATE POLICY "Usuários podem gerenciar seus próprios prompts" ON public.prompts
    FOR ALL USING (auth.uid() = user_id);

-- Favoritos: políticas
CREATE POLICY "Ver favoritos de prompts públicos ou próprios" ON public.favoritos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.prompts
            WHERE prompts.id = favoritos.prompt_id
            AND (prompts.publico = true OR prompts.user_id = auth.uid())
        )
    );

CREATE POLICY "Usuários podem adicionar aos favoritos" ON public.favoritos
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.prompts
            WHERE prompts.id = favoritos.prompt_id
            AND (prompts.publico = true OR prompts.user_id = auth.uid())
        )
    );

CREATE POLICY "Usuários podem gerenciar seus favoritos" ON public.favoritos
    FOR DELETE USING (auth.uid() = user_id);

-- Perfis: políticas
CREATE POLICY "Perfis públicos são visíveis para todos" ON public.perfis
    FOR SELECT USING (perfil_publico = true);

CREATE POLICY "Usuários podem gerenciar seus próprios perfis" ON public.perfis
    FOR ALL USING (auth.uid() = user_id);

-- Configurações: políticas
CREATE POLICY "Usuários podem gerenciar suas próprias configurações" ON public.configuracoes
    FOR ALL USING (auth.uid() = user_id);

-- Funções

-- Incrementar visualizações
CREATE OR REPLACE FUNCTION increment_views(prompt_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.prompts
    SET views = COALESCE(views, 0) + 1
    WHERE id = prompt_id AND (publico = true OR user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Excluir conta de usuário
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    v_user_id uuid;
BEGIN
    -- Obter o ID do usuário atual
    v_user_id := auth.uid();
    
    -- Verificar se o usuário existe
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Excluir dados do usuário (as exclusões em cascata cuidarão dos relacionamentos)
    -- 1. Favoritos
    DELETE FROM public.favoritos WHERE user_id = v_user_id;
    
    -- 2. Prompts
    DELETE FROM public.prompts WHERE user_id = v_user_id;
    
    -- 3. Perfil
    DELETE FROM public.perfis WHERE user_id = v_user_id;
    
    -- 4. Configurações
    DELETE FROM public.configuracoes WHERE user_id = v_user_id;
    
    -- 5. Excluir a conta de usuário
    DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;