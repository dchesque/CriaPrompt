import { supabase } from '../../lib/supabaseClient';
import { getSession } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const userId = session.user.id;

  // GET: Listar favoritos do usuário
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('favoritos')
        .select(`
          id,
          prompt_id,
          prompts (
            id,
            titulo,
            texto,
            categoria,
            publico,
            user_id
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: Adicionar aos favoritos
  if (req.method === 'POST') {
    const { promptId } = req.body;
    
    if (!promptId) {
      return res.status(400).json({ error: 'ID do prompt é obrigatório' });
    }

    try {
      // Verificar se o prompt existe e é público ou pertence ao usuário
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('id')
        .or(`publico.eq.true,user_id.eq.${userId}`)
        .eq('id', promptId)
        .single();

      if (promptError || !prompt) {
        return res.status(404).json({ error: 'Prompt não encontrado ou não acessível' });
      }

      // Adicionar aos favoritos
      const { data, error } = await supabase
        .from('favoritos')
        .insert([{ prompt_id: promptId, user_id: userId }])
        .select();

      if (error) {
        // Se já existe, não é um erro grave
        if (error.code === '23505') { // Código de erro de violação de restrição única
          return res.status(200).json({ message: 'Este prompt já está nos seus favoritos' });
        }
        throw error;
      }

      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('Erro ao adicionar aos favoritos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE: Remover dos favoritos
  if (req.method === 'DELETE') {
    const { promptId } = req.query;
    
    if (!promptId) {
      return res.status(400).json({ error: 'ID do prompt é obrigatório' });
    }

    try {
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('prompt_id', promptId)
        .eq('user_id', userId);

      if (error) throw error;

      return res.status(200).json({ message: 'Removido dos favoritos com sucesso' });
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}