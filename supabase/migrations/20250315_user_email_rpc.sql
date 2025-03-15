-- Função RPC para buscar o email de um usuário
-- Isso é necessário porque não podemos selecionar diretamente de auth.users 
-- a partir do frontend, mas podemos chamar RPCs

CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Verificar se o usuário existe em public.users
    SELECT email INTO user_email
    FROM public.users
    WHERE id = user_id;
    
    -- Se não encontrar na tabela public.users, buscar em auth.users
    IF user_email IS NULL THEN
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = user_id;
    END IF;
    
    RETURN user_email;
END;
$$;