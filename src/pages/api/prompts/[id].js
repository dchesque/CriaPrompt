import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  // Verificar ID
  if (!id) {
    return res.status(400).json({ error: 'ID do prompt é obrigatório' });
  }

  // Obter sessão do usuário
  const { data: { session } } = await supabase.auth.getSession({
    req: req
  });
  
  // Prompt por ID (GET)
  if (req.method === 'GET') {
    try {
      // Buscar o prompt
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select(`
          id,
          user_id,
          titulo,
          texto,
          categoria,
          publico,
          views,
          created_at,
          tags,
          campos_personalizados,
          users:user_id (
            email
          )
        `)
        .eq('id', id)
        .single();

      // Verificar erro na busca
      if (error) {
        if (error.code === 'PGRST116') { // Não encontrado
          return res.status(404).json({ error: 'Prompt não encontrado' });
        }
        throw error;
      }

      // Verificar permissões: permitir acesso apenas se o prompt for público ou pertencer ao usuário
      if (!prompt.publico && (!session || prompt.user_id !== session.user.id)) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este prompt' });
      }

      return res.status(200).json(prompt);
    } catch (error) {
      console.error('Erro ao buscar prompt:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Verificar autenticação para métodos que requerem autenticação
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const userId = session.user.id;

  // Atualizar prompt (PUT)
  if (req.method === 'PUT') {
    const { titulo, texto, categoria, publico, tags, campos_personalizados } = req.body;

    if (!titulo && !texto && categoria === undefined && publico === undefined && !tags && !campos_personalizados) {
      return res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
    }

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

      // Validar campos personalizados
      let camposValidados = undefined;
      if (campos_personalizados !== undefined) {
        if (Array.isArray(campos_personalizados) && campos_personalizados.length > 0) {
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
        } else {
          // Se não for um array não vazio, definir como null para remover campos personalizados
          camposValidados = null;
        }
      }
      
      // Validar tags
      let tagsValidadas = undefined;
      if (tags !== undefined) {
        if (Array.isArray(tags)) {
          // Limitar para no máximo 5 tags
          if (tags.length > 5) {
            return res.status(400).json({ error: 'Máximo de 5 tags permitidas' });
          }
          
          // Normalizar tags (lowercase, sem espaços)
          tagsValidadas = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        } else {
          tagsValidadas = [];
        }
      }

      // Preparar dados para atualização
      const dadosAtualizacao = {};
      
      if (titulo !== undefined) dadosAtualizacao.titulo = titulo;
      if (texto !== undefined) dadosAtualizacao.texto = texto;
      if (categoria !== undefined) dadosAtualizacao.categoria = categoria;
      if (publico !== undefined) dadosAtualizacao.publico = publico;
      if (tagsValidadas !== undefined) dadosAtualizacao.tags = tagsValidadas;
      if (camposValidados !== undefined) dadosAtualizacao.campos_personalizados = camposValidados;
      
      // Adicionar timestamp de atualização
      dadosAtualizacao.updated_at = new Date().toISOString();

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

  // Excluir prompt (DELETE)
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