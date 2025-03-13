-- Função para excluir a conta e todos os dados do usuário
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