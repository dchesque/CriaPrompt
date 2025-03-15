import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  console.log("API prompts - método:", req.method);
  console.log("API prompts - headers:", JSON.stringify(req.headers, null, 2));
  
  // Verificar a sessão do cookie e do header de autorização
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    console.log("Token encontrado no header:", token ? "Presente" : "Ausente");
  }
  
  // Tentar obter sessão
  const { data: sessionData, error: sessionError } = token 
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getSession({ req });
    
  if (sessionError) {
    console.error("Erro ao obter sessão:", sessionError);
  }
  
  // Verificar se existe sessão válida
  const session = token 
    ? { user: sessionData?.user } 
    : sessionData?.session;
    
  console.log("Sessão encontrada:", session ? "Sim" : "Não");
  
  if (session?.user) {
    console.log("Usuário autenticado:", session.user.id);
  }

  // Verificar autenticação para métodos POST (criar)
  if (req.method === 'POST') {
    if (!session || !session.user) {
      console.log("Tentativa de criar prompt sem autenticação");
      return res.status(401).json({ error: 'Não autorizado - Faça login para criar um prompt' });
    }
    
    const userId = session.user.id;
    console.log("POST com usuário autenticado:", userId);
    
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

      console.log("Inserindo prompt para usuário:", userId);
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

      if (error) {
        console.error("Erro no Supabase ao inserir prompt:", error);
        throw error;
      }

      console.log("Prompt criado com sucesso:", data[0].id);
      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('Erro ao criar prompt:', error);
      return res.status(500).json({ error: error.message || 'Erro ao criar prompt' });
    }
  }

  // GET: Listar prompts (com filtros)
  if (req.method === 'GET') {
    // Código existente para GET...
    const userId = session?.user?.id;
    // Resto do código de GET...
  }

  // Método não suportado
  return res.status(405).json({ error: 'Método não permitido' });
}