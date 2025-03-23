import { supabase } from '../../../lib/supabaseClient';
import { temPlanoAtivo, obterDetalhesAssinatura } from '../../../lib/stripe';

export default async function handler(req, res) {
  // Verificar autenticação do usuário
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = session.user.id;
  
  // Manipular diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return await getAssinaturas(req, res, userId);
    case 'POST':
      return await criarAssinatura(req, res, userId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Obter assinaturas do usuário
async function getAssinaturas(req, res, userId) {
  try {
    // Buscar assinatura atual
    const assinaturaAtual = await obterDetalhesAssinatura(userId);
    
    // Verificar se o usuário tem plano ativo
    const planoAtivo = await temPlanoAtivo(userId);
    
    // Buscar histórico de assinaturas
    const { data: historicoAssinaturas, error: historicoError } = await supabase
      .from('assinaturas')
      .select(`
        id,
        status,
        data_inicio,
        data_termino,
        trial_ends_at,
        cancelamento_agendado,
        planos (
          id,
          nome,
          descricao,
          preco,
          intervalo,
          recursos
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (historicoError) {
      throw historicoError;
    }
    
    // Buscar transações
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (transacoesError) {
      throw transacoesError;
    }
    
    // Buscar todos os planos disponíveis
    const { data: planosDisponiveis, error: planosError } = await supabase
      .from('planos')
      .select('*')
      .eq('is_ativo', true)
      .order('preco', { ascending: true });
      
    if (planosError) {
      throw planosError;
    }
    
    return res.status(200).json({
      assinaturaAtual,
      planoAtivo,
      historicoAssinaturas,
      transacoes,
      planosDisponiveis
    });
    
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    return res.status(500).json({ error: 'Erro ao buscar assinaturas' });
  }
}

// Criar uma nova assinatura
async function criarAssinatura(req, res, userId) {
  try {
    // Verificar se o modo SaaS está ativo
    const { data: configData } = await supabase
      .from('configuracoes_app')
      .select('valor')
      .eq('chave', 'saas_ativo')
      .single();
      
    if (!configData || configData.valor !== 'true') {
      return res.status(403).json({ error: 'Funcionalidade de assinatura não está ativa' });
    }
    
    const { planoId, successUrl, cancelUrl } = req.body;
    
    if (!planoId) {
      return res.status(400).json({ error: 'ID do plano é obrigatório' });
    }
    
    // Buscar dados do usuário
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Importar dinamicamente as funções do Stripe
    // Isso é feito aqui para evitar problemas com o SSR do Next.js
    const { criarCheckoutSession, criarAssinatura } = await import('../../../lib/stripe');
    
    // Verificar se o plano é gratuito
    const { data: planoData } = await supabase
      .from('planos')
      .select('preco')
      .eq('id', planoId)
      .single();
      
    if (planoData && planoData.preco === 0) {
      // Para plano gratuito, criar assinatura diretamente
      const resultado = await criarAssinatura(user, planoId);
      return res.status(200).json(resultado);
    }
    
    // Para planos pagos, criar sessão de checkout
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'URLs de sucesso e cancelamento são obrigatórias' });
    }
    
    const session = await criarCheckoutSession(
      userId, 
      planoId, 
      successUrl, 
      cancelUrl
    );
    
    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
    
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
} 