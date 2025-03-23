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
      return await getModelos(req, res, userId);
    case 'POST':
      // Verificar limites do plano antes de criar um novo modelo
      const verificacao = await verificarLimites(req, res, 'modelos');
      
      if (!verificacao.permitido) {
        return res.status(verificacao.status || 403).json({ 
          error: verificacao.erro,
          planoAtual: verificacao.planoAtual,
          limite: verificacao.limite,
          utilizado: verificacao.utilizado
        });
      }
      
      return await createModelo(req, res, userId);
    default:
      return res.status(405).json({ error: 'Método não permitido' });
  }
}

// Obter todos os modelos do usuário
async function getModelos(req, res, userId) {
  const { categoria, search, sort, page = 1, per_page = 10 } = req.query;
  
  try {
    let query = supabase
      .from('modelos_inteligentes')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Adicionar filtros se fornecidos
    if (categoria) {
      query = query.eq('categoria', categoria);
    }
    
    if (search) {
      query = query.or(`nome.ilike.%${search}%,descricao.ilike.%${search}%`);
    }
    
    // Adicionar ordenação
    if (sort === 'recente') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'nome') {
      query = query.order('nome', { ascending: true });
    } else if (sort === 'categoria') {
      query = query.order('categoria', { ascending: true });
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
      modelos: data, 
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil(count / per_page)
    });
    
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return res.status(500).json({ error: 'Erro ao buscar modelos' });
  }
}

// Criar um novo modelo
async function createModelo(req, res, userId) {
  const { nome, descricao, categoria, template, campos_variaveis } = req.body;
  
  if (!nome || !template) {
    return res.status(400).json({ error: 'Nome e template são obrigatórios' });
  }
  
  try {
    // Criar o modelo
    const { data, error } = await supabase
      .from('modelos_inteligentes')
      .insert({
        nome,
        descricao: descricao || '',
        categoria: categoria || 'Geral',
        template,
        campos_variaveis: campos_variaveis || [],
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
      .select('id, modelos_criados')
      .eq('data', hoje)
      .single();
      
    if (estatisticaExistente) {
      // Atualizar contagem
      await supabase
        .from('estatisticas')
        .update({
          modelos_criados: estatisticaExistente.modelos_criados + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', estatisticaExistente.id);
    } else {
      // Criar novo registro
      await supabase.from('estatisticas').insert({
        data: hoje,
        modelos_criados: 1
      });
    }
    
    return res.status(201).json(data);
    
  } catch (error) {
    console.error('Erro ao criar modelo:', error);
    return res.status(500).json({ error: 'Erro ao criar modelo' });
  }
} 