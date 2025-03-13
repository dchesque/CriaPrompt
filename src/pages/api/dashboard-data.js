import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  try {
    // Verificar se é uma requisição GET
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Obter o token do cabeçalho de autorização
    const authHeader = req.headers.authorization;
    let user;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Se tiver o cabeçalho de autorização, usar o token para obter o usuário
      const token = authHeader.substring(7);
      
      try {
        const { data, error } = await supabase.auth.getUser(token);
        
        if (error || !data.user) {
          console.error('Erro na autenticação com token:', error);
          return res.status(401).json({ error: 'Não autorizado - token inválido' });
        }
        
        user = data.user;
      } catch (authError) {
        console.error('Erro ao verificar token:', authError);
        return res.status(401).json({ error: 'Erro na autenticação' });
      }
    } else {
      // Tentar obter a sessão do cookie
      try {
        const { data: sessionData } = await supabase.auth.getSession({
          req: {
            headers: {
              cookie: req.headers.cookie || ''
            }
          }
        });
        
        if (!sessionData.session) {
          console.error('Sem sessão de autenticação');
          return res.status(401).json({ error: 'Não autorizado - sem sessão' });
        }
        
        user = sessionData.session.user;
      } catch (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        return res.status(401).json({ error: 'Erro ao verificar sessão' });
      }
    }

    // Verificação adicional
    if (!user || !user.id) {
      console.error('Usuário não definido ou sem ID');
      return res.status(401).json({ error: 'Usuário não identificado' });
    }

    const userId = user.id;

    // Buscar prompts do usuário
    try {
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select(`
          id,
          titulo,
          texto,
          categoria,
          publico,
          views,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (promptsError) {
        console.error('Erro ao buscar prompts:', promptsError);
        throw promptsError;
      }
      
      // Buscar contagem de favoritos
      const { count: favoritosCount, error: favoritosError } = await supabase
        .from('favoritos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (favoritosError) {
        console.error('Erro ao buscar favoritos:', favoritosError);
        throw favoritosError;
      }
      
      // Calcular estatísticas
      const totalPrompts = prompts ? prompts.length : 0;
      const publicPrompts = prompts ? prompts.filter(p => p.publico).length : 0;
      const privatePrompts = totalPrompts - publicPrompts;
      const totalViews = prompts ? prompts.reduce((sum, prompt) => sum + (prompt.views || 0), 0) : 0;
      
      // Contar categorias usadas
      const categorias = {};
      if (prompts) {
        prompts.forEach(prompt => {
          const categoria = prompt.categoria || 'geral';
          categorias[categoria] = (categorias[categoria] || 0) + 1;
        });
      }
      
      const categoriasUsadas = Object.entries(categorias)
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count);
      
      // Retornar todos os dados em um único objeto
      return res.status(200).json({
        prompts: prompts || [],
        stats: {
          totalPrompts,
          publicPrompts,
          privatePrompts,
          totalViews,
          favoritos: favoritosCount || 0,
          categoriasUsadas
        }
      });
    } catch (dataError) {
      console.error('Erro ao processar dados:', dataError);
      return res.status(500).json({ error: 'Erro ao processar dados: ' + (dataError.message || 'Erro desconhecido') });
    }
  } catch (error) {
    console.error('Erro não tratado na API:', error);
    return res.status(500).json({ error: 'Erro interno do servidor: ' + (error.message || 'Erro desconhecido') });
  }
}