// Bloco de Importações
import { supabase } from '../../lib/supabaseClient';

// Bloco Principal de Manipulação de Comentários e Avaliações
export default async function handler(req, res) {
  // Bloco de Verificação de Método e Autenticação
  const { method } = req;
  
  // Verificar sessão do usuário
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const userId = session.user.id;

  // Bloco de Roteamento de Métodos
  switch (method) {
    // Rota GET: Buscar comentários de um prompt
    case 'GET':
      try {
        const { promptId } = req.query;
        
        if (!promptId) {
          return res.status(400).json({ error: 'ID do prompt é obrigatório' });
        }
        
        const { data: comentarios, error } = await supabase
          .from('comentarios')
          .select(`
            id, 
            texto, 
            created_at, 
            users:user_id (
              email
            )
          `)
          .eq('prompt_id', promptId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return res.status(200).json(comentarios);
      } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        return res.status(500).json({ error: 'Erro ao buscar comentários' });
      }

    // Rota POST: Criar comentário ou avaliação
    case 'POST':
      try {
        const { tipo, promptId, texto, nota } = req.body;
        
        if (!promptId) {
          return res.status(400).json({ error: 'ID do prompt é obrigatório' });
        }
        
        // Verificar se o prompt existe e é público ou pertence ao usuário
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('id, publico, user_id')
          .eq('id', promptId)
          .single();
        
        if (promptError || !promptData) {
          return res.status(404).json({ error: 'Prompt não encontrado' });
        }
        
        if (!promptData.publico && promptData.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para comentar neste prompt' });
        }
        
        // Lógica para adicionar comentário
        if (tipo === 'comentario') {
          if (!texto) {
            return res.status(400).json({ error: 'Texto do comentário é obrigatório' });
          }
          
          const { data: novoComentario, error: comentarioError } = await supabase
            .from('comentarios')
            .insert({
              prompt_id: promptId,
              user_id: userId,
              texto
            })
            .select();
          
          if (comentarioError) throw comentarioError;
          
          return res.status(201).json(novoComentario[0]);
        }
        
        // Lógica para adicionar avaliação
        if (tipo === 'avaliacao') {
          if (!nota || nota < 1 || nota > 5) {
            return res.status(400).json({ error: 'Nota inválida. Deve ser entre 1 e 5' });
          }
          
          const { data: novaAvaliacao, error: avaliacaoError } = await supabase
            .from('avaliacoes')
            .upsert({
              prompt_id: promptId,
              user_id: userId,
              nota
            })
            .select();
          
          if (avaliacaoError) throw avaliacaoError;
          
          return res.status(201).json(novaAvaliacao[0]);
        }
        
        return res.status(400).json({ error: 'Tipo de ação inválido' });
      } catch (error) {
        console.error('Erro ao criar comentário/avaliação:', error);
        return res.status(500).json({ error: 'Erro ao criar comentário/avaliação' });
      }

    // Rota PUT: Atualizar comentário
    case 'PUT':
      try {
        const { id, texto } = req.body;
        
        if (!id || !texto) {
          return res.status(400).json({ error: 'ID e texto são obrigatórios' });
        }
        
        const { data: comentarioExistente, error: verificacaoError } = await supabase
          .from('comentarios')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (verificacaoError || !comentarioExistente) {
          return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        
        if (comentarioExistente.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para editar este comentário' });
        }
        
        const { data: comentarioAtualizado, error } = await supabase
          .from('comentarios')
          .update({ 
            texto, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', id)
          .select();
        
        if (error) throw error;
        
        return res.status(200).json(comentarioAtualizado[0]);
      } catch (error) {
        console.error('Erro ao atualizar comentário:', error);
        return res.status(500).json({ error: 'Erro ao atualizar comentário' });
      }

    // Rota DELETE: Excluir comentário
    case 'DELETE':
      try {
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ error: 'ID do comentário é obrigatório' });
        }
        
        const { data: comentarioExistente, error: verificacaoError } = await supabase
          .from('comentarios')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (verificacaoError || !comentarioExistente) {
          return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        
        if (comentarioExistente.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário' });
        }
        
        const { error } = await supabase
          .from('comentarios')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        return res.status(200).json({ message: 'Comentário excluído com sucesso' });
      } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        return res.status(500).json({ error: 'Erro ao excluir comentário' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Método ${method} Não Permitido`);
  }
}