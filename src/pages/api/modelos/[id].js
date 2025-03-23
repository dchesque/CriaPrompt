import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  // Verificar ID
  if (!id) {
    return res.status(400).json({ error: 'ID do modelo é obrigatório' });
  }

  console.log(`API modelos/${id} - método: ${req.method}`);

  // Obter sessão do usuário de forma mais robusta
  let userId = null;
  try {
    // Verificar se há um token de autorização no cabeçalho
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Usar o token para obter o usuário
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('Erro ao validar token:', error);
      } else if (data?.user) {
        userId = data.user.id;
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
      }
    }
  } catch (authError) {
    console.error('Erro na autenticação:', authError);
  }

  // Verificar autenticação para métodos que requerem autenticação
  if (!userId) {
    console.error('Tentativa de operação não autorizada. Usuário não autenticado.');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Roteamento correto de métodos
  switch (req.method) {
    case 'GET':
      try {
        const { data: modelo, error: promptError } = await supabase
          .from('modelos_inteligentes')
          .select('*')
          .eq('id', id)
          .single();

        if (promptError) {
          console.error('Erro ao buscar modelo:', promptError);
          if (promptError.code === 'PGRST116') { // Não encontrado
            return res.status(404).json({ error: 'Modelo não encontrado' });
          }
          throw promptError;
        }

        // Verificar permissões: apenas o próprio usuário pode acessar seus modelos
        if (modelo.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para acessar este modelo' });
        }

        return res.status(200).json(modelo);
      } catch (error) {
        console.error('Erro ao buscar modelo:', error);
        return res.status(500).json({ error: 'Erro ao buscar modelo' });
      }

    case 'PUT':
      try {
        // Log do corpo da requisição para debug
        console.log('Corpo da requisição PUT:', JSON.stringify(req.body));
        
        const { nome, descricao, categoria, estrutura_prompt, campos_variaveis } = req.body;

        // Verificar se o modelo pertence ao usuário
        const { data: modeloExistente, error: promptError } = await supabase
          .from('modelos_inteligentes')
          .select('user_id')
          .eq('id', id)
          .single();

        if (promptError) {
          if (promptError.code === 'PGRST116') { // Não encontrado
            return res.status(404).json({ error: 'Modelo não encontrado' });
          }
          throw promptError;
        }

        // Verificar permissões
        if (modeloExistente.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para atualizar este modelo' });
        }

        // Sanitizar e validar os dados antes da atualização
        const dadosAtualizacao = {};
        
        if (nome !== undefined) dadosAtualizacao.nome = String(nome).trim();
        if (descricao !== undefined) dadosAtualizacao.descricao = String(descricao).trim();
        if (categoria !== undefined) dadosAtualizacao.categoria = String(categoria);
        if (estrutura_prompt !== undefined) dadosAtualizacao.estrutura_prompt = String(estrutura_prompt).trim();
        
        // Garantir que campos_variaveis seja um array ou null
        if (campos_variaveis !== undefined) {
          if (Array.isArray(campos_variaveis) && campos_variaveis.length > 0) {
            // Sanitizar cada campo variável
            dadosAtualizacao.campos_variaveis = campos_variaveis.map(campo => ({
              nome: String(campo.nome || '').trim(),
              descricao: String(campo.descricao || '').trim(),
              valorPadrao: String(campo.valorPadrao || '').trim()
            }));
          } else {
            // Se não for um array válido ou estiver vazio, definir como null
            dadosAtualizacao.campos_variaveis = null;
          }
        }

        console.log('Dados sanitizados para atualização:', dadosAtualizacao);

        // Atualizar modelo
        const { data, error: updateError } = await supabase
          .from('modelos_inteligentes')
          .update(dadosAtualizacao)
          .eq('id', id)
          .select();

        if (updateError) {
          console.error('Erro ao atualizar no Supabase:', updateError);
          throw updateError;
        }

        return res.status(200).json(data[0] || {success: true});
      } catch (error) {
        console.error('Erro ao atualizar modelo:', error);
        return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
      }

    case 'DELETE':
      try {
        // Verificar se o modelo pertence ao usuário
        const { data: modeloExistente, error: promptError } = await supabase
          .from('modelos_inteligentes')
          .select('user_id')
          .eq('id', id)
          .single();

        if (promptError) {
          if (promptError.code === 'PGRST116') { // Não encontrado
            return res.status(404).json({ error: 'Modelo não encontrado' });
          }
          throw promptError;
        }

        // Verificar permissões
        if (modeloExistente.user_id !== userId) {
          return res.status(403).json({ error: 'Você não tem permissão para excluir este modelo' });
        }

        // Excluir modelo
        const { error: deleteError } = await supabase
          .from('modelos_inteligentes')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        return res.status(200).json({ message: 'Modelo excluído com sucesso' });
      } catch (error) {
        console.error('Erro ao excluir modelo:', error);
        return res.status(500).json({ error: error.message });
      }

    default:
      // Método não suportado
      console.log(`Método não suportado: ${req.method}`);
      return res.status(405).json({ error: 'Método não permitido' });
  }
} 