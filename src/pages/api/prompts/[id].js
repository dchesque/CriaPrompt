// src/pages/api/prompts/[id].js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  // Verificar ID
  if (!id) {
    return res.status(400).json({ error: 'ID do prompt é obrigatório' });
  }

  console.log(`API prompts/${id} - método: ${req.method}`);

  // Obter sessão do usuário de forma mais robusta
  let userId = null;
  try {
    // Verificar se há um token de autorização no cabeçalho
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token recebido no header de autorização');

      // Usar o token para obter o usuário
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('Erro ao validar token:', error);
      } else if (data?.user) {
        userId = data.user.id;
        console.log(`Usuário autenticado via token: ${userId}`);
      }
    } else {
      // Tentar obter a sessão pelo cookie
      const { data: { session }, error } = await supabase.auth.getSession({
        req: req
      });
      
      if (error) {
        console.error('Erro ao obter sessão:', error);
      } else if (session?.user) {
        userId = session.user.id;
        console.log(`Usuário autenticado via sessão: ${userId}`);
      }
    }
  } catch (authError) {
    console.error('Erro na autenticação:', authError);
  }

  // GET: Buscar prompt por ID
  if (req.method === 'GET') {
    try {
      // Buscar o prompt diretamente
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (promptError) {
        console.error('Erro ao buscar prompt:', promptError);
        if (promptError.code === 'PGRST116') { // Não encontrado
          return res.status(404).json({ error: 'Prompt não encontrado' });
        }
        throw promptError;
      }

      // Verificar permissões: permitir acesso apenas se o prompt for público ou pertencer ao usuário
      if (!prompt.publico && (!userId || prompt.user_id !== userId)) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este prompt' });
      }

      // Incrementar visualizações, mas apenas se o prompt for público ou se o usuário não for o dono
      if (prompt.publico && (!userId || prompt.user_id !== userId)) {
        try {
          await supabase.rpc('increment_views', { prompt_id: id });
        } catch (viewError) {
          console.error('Erro ao incrementar visualizações:', viewError);
          // Continuar mesmo se falhar o incremento de visualizações
        }
      }

      return res.status(200).json(prompt);
    } catch (error) {
      console.error('Erro ao buscar prompt:', error);
      return res.status(500).json({ error: 'Erro ao buscar prompt' });
    }
  }

  // Verificar autenticação para métodos que requerem autenticação
  if (!userId) {
    console.error('Tentativa de operação não autorizada. Usuário não autenticado.');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // PUT: Atualizar prompt
  if (req.method === 'PUT') {
    try {
      // Validar e sanitizar os dados
      const { titulo, texto, categoria, publico, tags, campos_personalizados } = req.body;
  
      // Preparar objeto de atualização
      const dadosAtualizacao = {
        titulo: titulo.trim(),
        texto: texto.trim(),
        categoria: categoria || 'geral',
        publico: publico !== false,
        tags: tags || [],
        campos_personalizados: campos_personalizados 
          ? JSON.parse(JSON.stringify(campos_personalizados)) 
          : null
        // Remover a atualização manual de updated_at
      };
  
      // Resto do código permanece o mesmo...
    } catch (error) {
      console.error('Erro no método PUT:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE: Excluir prompt
  if (req.method === 'DELETE') {
    try {
      // Verificar se o prompt pertence ao usuário
      const { data: promptExistente, error: promptError } = await supabase
        .from('prompts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (promptError) {
        if (promptError.code === 'PGRST116') { // Não encontrado
          return res.status(404).json({ error: 'Prompt não encontrado' });
        }
        throw promptError;
      }

      // Verificar permissões
      if (promptExistente.user_id !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para excluir este prompt' });
      }

      // Excluir prompt
      const { error: deleteError } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return res.status(200).json({ message: 'Prompt excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Método não suportado
  return res.status(405).json({ error: 'Método não permitido' });
}