import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Obter sessão do usuário
  const { data: { session } } = await supabase.auth.getSession({
    req: req
  });
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const userId = session.user.id;

  // GET: Listar prompts (com filtros)
  if (req.method === 'GET') {
    const { publico, categoria, termo, limit = 50, meusPosts, tags } = req.query;
    
    try {
      let query = supabase
        .from('prompts')
        .select(`
          id,
          titulo,
          texto,
          categoria,
          publico,
          views,
          created_at,
          user_id,
          tags,
          campos_personalizados,
          users:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Filtrar por prompts públicos ou do próprio usuário
      if (publico === 'true') {
        query = query.eq('publico', true);
      } else if (meusPosts === 'true') {
        query = query.eq('user_id', userId);
      } else {
        // Se não especificar, mostra os públicos e os próprios
        query = query.or(`publico.eq.true,user_id.eq.${userId}`);
      }

      // Filtrar por categoria se fornecida
      if (categoria && categoria !== 'todos') {
        query = query.eq('categoria', categoria);
      }

      // Filtrar por termo de busca se fornecido
      if (termo) {
        query = query.or(`titulo.ilike.%${termo}%,texto.ilike.%${termo}%`);
      }
      
      // Filtrar por tags se fornecidas
      if (tags) {
        const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        query = query.contains('tags', tagsArray);
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Erro ao buscar prompts:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: Criar novo prompt
  if (req.method === 'POST') {
    const { titulo, texto, categoria, publico, tags, campos_personalizados } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ error: 'Título e texto são obrigatórios' });
    }

    try {
      // Validar campos personalizados
      let camposValidados = null;
      if (campos_personalizados && Array.isArray(campos_personalizados)) {
        // Verificar se todos os campos têm nome
        const camposSemNome = campos_personalizados.filter(campo => !campo.nome);
        if (camposSemNome.length > 0) {
          return res.status(400).json({ error: 'Todos os campos personalizados devem ter um nome' });
        }
        
        // Limitar para no máximo 10 campos personalizados
        if (campos_personalizados.length > 10) {
          return res.status(400).json({ error: 'Máximo de 10 campos personalizados permitidos' });
        }
        
        camposValidados = campos_personalizados;
      }
      
      // Validar tags
      let tagsValidadas = null;
      if (tags && Array.isArray(tags)) {
        // Limitar para no máximo 5 tags
        if (tags.length > 5) {
          return res.status(400).json({ error: 'Máximo de 5 tags permitidas' });
        }
        
        // Normalizar tags (lowercase, sem espaços)
        tagsValidadas = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
      }

      const { data, error } = await supabase
        .from('prompts')
        .insert([
          { 
            titulo, 
            texto, 
            categoria: categoria || 'geral', 
            publico: publico !== false, 
            user_id: userId,
            views: 0,
            tags: tagsValidadas || [],
            campos_personalizados: camposValidados
          }
        ])
        .select();

      if (error) throw error;

      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('Erro ao criar prompt:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Método não suportado
  return res.status(405).json({ error: 'Método não permitido' });
}