import { supabase } from '../../../lib/supabaseClient';
import { verificarLimites } from '../../../middleware/verificarLimites';

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
      return await getPrompts(req, res, userId);
    case 'POST':
      // Verificar limites do plano antes de criar um novo prompt
      const verificacao = await verificarLimites(req, res, 'prompts');
      
      if (!verificacao.permitido) {
        return res.status(verificacao.status || 403).json({ 
          error: verificacao.erro,
          planoAtual: verificacao.planoAtual,
          limite: verificacao.limite,
          utilizado: verificacao.utilizado
        });
      }
      
      return await createPrompt(req, res, userId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Obter todos os prompts do usuário
async function getPrompts(req, res, userId) {
  const { category, search, sort, page = 1, per_page = 10 } = req.query;
  
  try {
    let query = supabase
      .from('prompts')
      .select('*, favoritos!inner(*)', { count: 'exact' })
      .eq('user_id', userId);
    
    // Adicionar filtros se fornecidos
    if (category) {
      query = query.eq('categoria', category);
    }
    
    if (search) {
      query = query.or(`titulo.ilike.%${search}%,conteudo.ilike.%${search}%`);
    }
    
    // Adicionar ordenação
    if (sort === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'favorite') {
      query = query.order('favorito', { ascending: false });
    } else if (sort === 'alfa') {
      query = query.order('titulo', { ascending: true });
    } else {
      // Ordenação padrão
      query = query.order('created_at', { ascending: false });
    }
    
    // Adicionar paginação
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);
    
    const { data, count, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({ 
      prompts: data, 
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil(count / per_page)
    });
    
  } catch (error) {
    console.error('Erro ao buscar prompts:', error);
    return res.status(500).json({ error: 'Erro ao buscar prompts' });
  }
}

// Criar um novo prompt
async function createPrompt(req, res, userId) {
  const { titulo, conteudo, categoria, modelo_ia, tags, variaveis } = req.body;
  
  if (!titulo || !conteudo) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }
  
  try {
    // Criar o prompt
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        titulo,
        conteudo,
        categoria: categoria || 'Geral',
        modelo_ia: modelo_ia || 'GPT-3.5',
        tags: tags || [],
        variaveis: variaveis || [],
        user_id: userId
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Atualizar estatísticas diárias
    const hoje = new Date().toISOString().split('T')[0];
    
    // Verificar se já existe registro para o dia
    const { data: estatisticaExistente } = await supabase
      .from('estatisticas')
      .select('id, prompts_criados')
      .eq('data', hoje)
      .single();
      
    if (estatisticaExistente) {
      // Atualizar contagem
      await supabase
        .from('estatisticas')
        .update({
          prompts_criados: estatisticaExistente.prompts_criados + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', estatisticaExistente.id);
    } else {
      // Criar novo registro
      await supabase.from('estatisticas').insert({
        data: hoje,
        prompts_criados: 1
      });
    }
    
    return res.status(201).json(data);
    
  } catch (error) {
    console.error('Erro ao criar prompt:', error);
    return res.status(500).json({ error: 'Erro ao criar prompt' });
  }
} 