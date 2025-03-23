import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Obter ID da assinatura da URL
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'ID da assinatura é obrigatório' });
  }
  
  // Verificar autenticação do usuário
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = session.user.id;
  
  // Verificar se a assinatura pertence ao usuário ou se é admin
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: userId });
  const isUserAdmin = isAdmin || false;
  
  if (!isUserAdmin) {
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
      
    if (assinaturaError || !assinaturaData) {
      return res.status(404).json({ error: 'Assinatura não encontrada ou não pertence ao usuário' });
    }
  }
  
  // Manipular diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return await getAssinatura(req, res, id, userId, isUserAdmin);
    case 'PUT':
      return await updateAssinatura(req, res, id, userId, isUserAdmin);
    case 'DELETE':
      return await cancelarAssinatura(req, res, id, userId, isUserAdmin);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Obter detalhes de uma assinatura específica
async function getAssinatura(req, res, id, userId, isAdmin) {
  try {
    // Query base
    let query = supabase
      .from('assinaturas')
      .select(`
        *,
        planos (*),
        transacoes (*)
      `)
      .eq('id', id);
      
    // Se não for admin, filtrar pelo usuário
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
}

// Atualizar uma assinatura
async function updateAssinatura(req, res, id, userId, isAdmin) {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    // Verificar se o status é válido
    if (!['ativa', 'cancelada', 'pendente', 'teste', 'expirada'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    // Se não for admin, rejeitar a operação
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem atualizar o status de assinaturas' });
    }
    
    // Atualizar o status da assinatura
    const { data, error } = await supabase
      .from('assinaturas')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    // Se o status for 'cancelada', atualizar o perfil do usuário para o plano gratuito
    if (status === 'cancelada') {
      await supabase
        .from('perfis_usuario')
        .update({
          plano_atual: 1, // Plano gratuito
          updated_at: new Date().toISOString()
        })
        .eq('user_id', data.user_id);
    }
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao atualizar assinatura' });
  }
}

// Cancelar uma assinatura
async function cancelarAssinatura(req, res, id, userId, isAdmin) {
  try {
    // Buscar dados da assinatura
    let query = supabase
      .from('assinaturas')
      .select('*')
      .eq('id', id);
      
    // Se não for admin, filtrar pelo usuário
    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }
    
    const { data: assinaturaData, error: assinaturaError } = await query.single();
    
    if (assinaturaError || !assinaturaData) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }
    
    // Importar dinamicamente a função do Stripe
    const { cancelarAssinatura } = await import('../../../lib/stripe');
    
    // Cancelar a assinatura
    const resultado = await cancelarAssinatura(id, assinaturaData.user_id);
    
    // Registrar atividade de auditoria
    await supabase.from('logs_auditoria').insert({
      user_id: userId,
      acao: 'cancelamento',
      tabela_afetada: 'assinaturas',
      registro_id: id,
      dados_antigos: assinaturaData,
      dados_novos: { status: 'cancelada', cancelamento_agendado: true }
    });
    
    return res.status(200).json(resultado);
    
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
} 