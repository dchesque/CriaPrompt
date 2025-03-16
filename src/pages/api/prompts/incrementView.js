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
    // Usar função do Supabase para incrementar views
    const { data, error } = await supabase.rpc('increment_views', { 
      prompt_id: promptId 
    });

    if (error) {
      console.error('Erro ao incrementar visualizações:', error);
      return res.status(500).json({ error: 'Erro ao incrementar visualizações' });
    }

    return res.status(200).json({ views: data });
  } catch (error) {
    console.error('Erro ao processar incremento de visualizações:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}