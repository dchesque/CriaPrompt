// src/pages/api/groq/generate-description.js
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Aceitar apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação via cookie de sessão ou token de autorização
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
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      if (data?.user) {
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
    
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
  } catch (authError) {
    console.error('Erro na autenticação:', authError);
    return res.status(401).json({ error: 'Erro na autenticação' });
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
    // src/pages/api/groq/generate-description.js
// Atualizando a parte de instruções para o modelo

// Na seção onde chamamos a API do Groq, vou modificar o conteúdo da mensagem do sistema
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
        content: `Você é um especialista em criar descrições concisas e atraentes para prompts de IA.
        
        INSTRUÇÕES DE FORMATAÇÃO:
        - Escreva SEMPRE em português brasileiro
        - Comece a descrição com "Este prompt" ou "Um prompt que"
        - Use linguagem direta e objetiva
        - Limite a resposta a 100-120 caracteres (aproximadamente 1-2 frases curtas)
        - Foque no PROPÓSITO principal do prompt, não em detalhes técnicos
        - NÃO use frases como "Este é um prompt" ou "Este prompt foi criado para"
        - NÃO inclua informações sobre tokens, modelos ou limitações técnicas
        - Mantenha um tom profissional mas acessível
        - NÃO use emojis ou símbolos especiais
        - Não repoduza nomes de apps, objetos, entre outras coisas semelhantes.
        - Se o prompt houver nomes com # antes (exemplo #sobreoapp), nao inclua essas palavras após a # na descrição
        - Termine com ponto final
      
        
        EXEMPLO DE FORMATO DESEJADO:
        "Este prompt ajuda a criar resumos concisos de artigos científicos mantendo os pontos principais."
        "Um prompt que transforma textos técnicos em explicações simples para leigos."
        "Este prompt ajuda a criar um aplicatico com paginas de contato, ia integrada, banco de dados supabase."
        
        Sua resposta deve conter APENAS a descrição, sem introdução ou explicação adicional.`
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