import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { promptId } = req.body;

  if (!promptId) {
    return res.status(400).json({ error: 'ID do prompt é obrigatório' });
  }

  try {
    // Buscar o prompt para verificar se existe
    const { data: promptExists, error: promptError } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', promptId)
      .single();

    if (promptError || !promptExists) {
      return res.status(404).json({ error: 'Prompt não encontrado' });
    }

    // Incrementar a visualização
    const { data, error } = await supabase
      .from('prompts')
      .update({ views: supabase.sql`views + 1` })
      .eq('id', promptId)
      .select('views');

    if (error) {
      throw error;
    }

    return res.status(200).json({ views: data[0].views });
  } catch (error) {
    console.error('Erro ao incrementar visualização:', error);
    return res.status(500).json({ error: error.message });
  }
}