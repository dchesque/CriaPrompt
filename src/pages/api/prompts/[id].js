import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  // Verificar ID
  if (!id) {
    return res.status(400).json({ error: 'ID do prompt é obrigatório' });
  }

  console.log(`API prompts/${id} - método: ${req.method}`);

  // Obter sessão do usuário
  const { data: { session } } = await supabase.auth.getSession({
    req: req
  });
  
  const userId = session?.user?.id;
  console.log(`Usuário autenticado: ${userId || 'Não'}`);

  // GET: Buscar prompt por ID
  if (req.method === 'GET') {
    try {
      // Buscar o prompt diretamente com uma consulta mais simples
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*, users:user_id(email)')
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
  if (!session || !userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // PUT: Atualizar prompt
  if (req.method === 'PUT') {
    const { titulo, texto, categoria, publico, tags, campos_personalizados } = req.body;

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
        return res.status(403).json({ error: 'Você não tem permissão para atualizar este prompt' });
      }

      // Preparar dados para atualização
      const dadosAtualizacao = {
        updated_at: new Date().toISOString()
      };
      
      if (titulo !== undefined) dadosAtualizacao.titulo = titulo;
      if (texto !== undefined) dadosAtualizacao.texto = texto;
      if (categoria !== undefined) dadosAtualizacao.categoria = categoria;
      if (publico !== undefined) dadosAtualizacao.publico = publico;
      if (tags !== undefined) dadosAtualizacao.tags = tags;
      if (campos_personalizados !== undefined) dadosAtualizacao.campos_personalizados = campos_personalizados;

      // Atualizar prompt
      const { data, error: updateError } = await supabase
        .from('prompts')
        .update(dadosAtualizacao)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      return res.status(200).json(data[0]);
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
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