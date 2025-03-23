import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Verificar autenticação do usuário
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = session.user.id;
  
  // Verificar se é método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({ error: 'URL de retorno é obrigatória' });
    }
    
    // Importar dinamicamente a função do Stripe
    const { criarPortalSession } = await import('../../../lib/stripe');
    
    // Criar sessão do portal
    const session = await criarPortalSession(userId, returnUrl);
    
    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url 
    });
    
  } catch (error) {
    console.error('Erro ao criar sessão do portal:', error);
    
    // Retornar erro específico se o usuário não tiver assinatura
    if (error.message?.includes('não possui assinatura')) {
      return res.status(400).json({ error: 'Usuário não possui assinatura ativa' });
    }
    
    return res.status(500).json({ error: 'Erro ao criar sessão do portal' });
  }
} 