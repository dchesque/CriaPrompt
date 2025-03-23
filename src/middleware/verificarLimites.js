import { supabase } from '../lib/supabaseClient';

/**
 * Middleware para verificar se o usuário atingiu o limite do seu plano
 * @param {string} tipo - Tipo de verificação: 'prompts' ou 'modelos'
 */
export async function verificarLimites(req, res, tipo) {
  try {
    // Verificar se o modo SaaS está ativo
    const { data: configData } = await supabase
      .from('configuracoes_app')
      .select('valor')
      .eq('chave', 'saas_ativo')
      .single();
      
    // Se o modo SaaS não estiver ativo, permitir a ação
    if (!configData || configData.valor !== 'true') {
      return { permitido: true };
    }
    
    // Verificar autenticação do usuário
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { permitido: false, erro: 'Não autorizado', status: 401 };
    }
    
    const userId = session.user.id;
    
    // Verificar se o usuário é administrador
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: userId });
    
    // Administradores não têm limites
    if (isAdmin) {
      return { permitido: true };
    }
    
    // Buscar plano atual do usuário
    const { data: perfilData } = await supabase
      .from('perfis_usuario')
      .select('plano_atual')
      .eq('user_id', userId)
      .single();
      
    // Se o usuário não tiver perfil/plano, assumir plano gratuito (id 1)
    const planoId = perfilData?.plano_atual || 1;
    
    // Buscar limites do plano
    const { data: planoData } = await supabase
      .from('planos')
      .select(tipo === 'prompts' ? 'limite_prompts' : 'limite_modelos')
      .eq('id', planoId)
      .single();
      
    if (!planoData) {
      return { permitido: false, erro: 'Plano não encontrado', status: 400 };
    }
    
    const limite = tipo === 'prompts' ? planoData.limite_prompts : planoData.limite_modelos;
    
    // -1 significa sem limite
    if (limite === -1) {
      return { permitido: true };
    }
    
    // Contar quantos itens o usuário já tem
    const { count, error: countError } = await supabase
      .from(tipo === 'prompts' ? 'prompts' : 'modelos_inteligentes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (countError) {
      console.error('Erro ao contar itens:', countError);
      return { permitido: true }; // Em caso de erro, permitir por segurança
    }
    
    // Verificar se atingiu o limite
    if (count >= limite) {
      return { 
        permitido: false, 
        erro: `Você atingiu o limite de ${limite} ${tipo === 'prompts' ? 'prompts' : 'modelos'} do seu plano.`,
        status: 403,
        planoAtual: planoId,
        limite,
        utilizado: count
      };
    }
    
    return { 
      permitido: true,
      planoAtual: planoId,
      limite,
      utilizado: count
    };
    
  } catch (error) {
    console.error('Erro ao verificar limites:', error);
    return { permitido: true }; // Em caso de erro, permitir por segurança
  }
} 