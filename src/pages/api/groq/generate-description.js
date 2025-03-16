// src/pages/api/groq/generate-description.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Aceitar apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Texto do prompt é obrigatório' });
    }

    // Verificar se a variável de ambiente existe
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'API do Groq não configurada' });
    }

    // Chama a API do Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // Modelo do Groq
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em criar descrições concisas e claras. Crie uma descrição objetiva em português explicando o que o prompt faz, limitando a resposta a 1-2 frases curtas.'
          },
          {
            role: 'user',
            content: `Crie uma descrição concisa para este prompt: "${prompt}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro na API do Groq');
    }

    const description = data.choices[0].message.content.trim();
    
    return res.status(200).json({ description });
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    return res.status(500).json({ error: error.message || 'Erro ao gerar descrição' });
  }
}