import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  // Verificar se é método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
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

  // Verificar autenticação
  if (!userId) {
    console.error('Tentativa de operação não autorizada. Usuário não autenticado.');
    return res.status(401).json({ error: 'Não autorizado' });
  }

  console.log('API modelos/gerar - recebida solicitação');

  try {
    // Extrair o input do usuário
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'É necessário fornecer um input para gerar o modelo' });
    }

    console.log('Input recebido:', input);

    // Buscar modelos existentes do usuário para referência (opcional)
    const { data: modelosExistentes, error: modelosError } = await supabase
      .from('modelos_inteligentes')
      .select('categoria')
      .eq('user_id', userId);
    
    if (modelosError) {
      console.error('Erro ao buscar modelos do usuário:', modelosError);
    }
    
    // Extrair categorias únicas dos modelos existentes
    const categoriasExistentes = modelosExistentes 
      ? [...new Set(modelosExistentes.map(m => m.categoria))]
      : [];
    
    console.log('Categorias existentes do usuário:', categoriasExistentes);

    // Aqui implementaríamos a chamada para um serviço de IA
    // Por enquanto, vamos simular a resposta da IA com base em templates
    
    // Template para post no Instagram
    if (input.toLowerCase().includes('instagram') || input.toLowerCase().includes('post') || input.toLowerCase().includes('rede social')) {
      const modeloGerado = gerarModeloRedesSociais(input);
      return res.status(200).json(modeloGerado);
    }
    
    // Template para email marketing
    else if (input.toLowerCase().includes('email') || input.toLowerCase().includes('marketing')) {
      const modeloGerado = gerarModeloEmail(input);
      return res.status(200).json(modeloGerado);
    }
    
    // Template para descrição de produto
    else if (input.toLowerCase().includes('produto') || input.toLowerCase().includes('venda') || input.toLowerCase().includes('anúncio')) {
      const modeloGerado = gerarModeloProduto(input);
      return res.status(200).json(modeloGerado);
    }
    
    // Template genérico para outros casos
    else {
      const modeloGerado = gerarModeloGenerico(input);
      return res.status(200).json(modeloGerado);
    }
    
  } catch (error) {
    console.error('Erro ao gerar modelo:', error);
    return res.status(500).json({ error: 'Erro ao gerar modelo com IA' });
  }
}

// Funções auxiliares para gerar modelos baseados em templates
function gerarModeloRedesSociais(input) {
  // Extrair informações básicas do input
  const plataforma = input.toLowerCase().includes('instagram') 
    ? 'Instagram' 
    : input.toLowerCase().includes('facebook')
      ? 'Facebook'
      : input.toLowerCase().includes('linkedin')
        ? 'LinkedIn'
        : 'Redes Sociais';
  
  // Tentar extrair o tema/assunto do input
  let tema = 'geral';
  if (input.includes('curso')) tema = 'curso';
  else if (input.includes('produto')) tema = 'produto';
  else if (input.includes('serviço')) tema = 'serviço';
  
  return {
    nome: `Post para ${plataforma} - ${tema.charAt(0).toUpperCase() + tema.slice(1)}`,
    categoria: 'redes sociais',
    descricao: `Modelo de prompt para criar postagens atraentes para ${plataforma}. Ideal para promover ${tema}s com chamadas para ação eficientes.`,
    estrutura_prompt: `Crie um post envolvente para ${plataforma} promovendo {nome_item}. O público-alvo são {publico_alvo}, e o principal benefício a ser destacado é {beneficio_principal}. \n\nUse um tom de voz {tom_de_voz} e inclua uma chamada para ação como "{chamada_para_acao}". \n\nDestaque também {detalhe_extra}, e adicione {quantidade_hashtags} hashtags relevantes.`,
    campos_variaveis: [
      {
        nome: "nome_item",
        descricao: `Nome do ${tema} a ser promovido`,
        valorPadrao: `Meu ${tema} incrível`
      },
      {
        nome: "publico_alvo",
        descricao: "Público-alvo da publicação",
        valorPadrao: "pessoas interessadas neste tema"
      },
      {
        nome: "beneficio_principal",
        descricao: "Principal benefício ou vantagem oferecida",
        valorPadrao: "solução prática para um problema comum"
      },
      {
        nome: "tom_de_voz",
        descricao: "Estilo de comunicação desejado",
        valorPadrao: "amigável e entusiástico"
      },
      {
        nome: "chamada_para_acao",
        descricao: "O que você quer que o leitor faça",
        valorPadrao: "Clique no link para saber mais!"
      },
      {
        nome: "detalhe_extra",
        descricao: "Informação adicional importante",
        valorPadrao: "oferta por tempo limitado"
      },
      {
        nome: "quantidade_hashtags",
        descricao: "Quantas hashtags incluir",
        valorPadrao: "5"
      }
    ]
  };
}

function gerarModeloEmail(input) {
  // Extrair tipo de email
  const tipoEmail = input.toLowerCase().includes('newsletter') 
    ? 'Newsletter' 
    : input.toLowerCase().includes('venda')
      ? 'Venda Direta'
      : input.toLowerCase().includes('lançamento')
        ? 'Lançamento'
        : 'Email Marketing';
  
  return {
    nome: `${tipoEmail} - Campanha`,
    categoria: 'email',
    descricao: `Modelo para criar emails de ${tipoEmail} que engajam o leitor e geram conversões.`,
    estrutura_prompt: `Escreva um email de ${tipoEmail} para {segmento_publico} com o assunto "{assunto_email}".\n\nO objetivo principal é {objetivo_email}. Mencione {produto_servico} e destaque os seguintes benefícios principais:\n\n1. {beneficio_1}\n2. {beneficio_2}\n3. {beneficio_3}\n\nUtilize um tom {tom_email} e inclua uma chamada para ação clara: "{chamada_acao}"\n\nAdicione um PS que mencione {detalhe_especial}.`,
    campos_variaveis: [
      {
        nome: "segmento_publico",
        descricao: "Segmento do público-alvo",
        valorPadrao: "clientes existentes"
      },
      {
        nome: "assunto_email",
        descricao: "Linha de assunto do email",
        valorPadrao: "Uma oferta especial para você"
      },
      {
        nome: "objetivo_email",
        descricao: "Objetivo principal da comunicação",
        valorPadrao: "informar sobre um novo lançamento e gerar vendas"
      },
      {
        nome: "produto_servico",
        descricao: "Produto ou serviço sendo promovido",
        valorPadrao: "nosso novo produto"
      },
      {
        nome: "beneficio_1",
        descricao: "Primeiro benefício-chave",
        valorPadrao: "Economia de tempo"
      },
      {
        nome: "beneficio_2",
        descricao: "Segundo benefício-chave",
        valorPadrao: "Maior produtividade"
      },
      {
        nome: "beneficio_3",
        descricao: "Terceiro benefício-chave",
        valorPadrao: "Facilidade de uso"
      },
      {
        nome: "tom_email",
        descricao: "Tom da comunicação",
        valorPadrao: "profissional mas amigável"
      },
      {
        nome: "chamada_acao",
        descricao: "Chamada para ação principal",
        valorPadrao: "Clique aqui para aproveitar esta oferta exclusiva"
      },
      {
        nome: "detalhe_especial",
        descricao: "Detalhe adicional para destacar no PS",
        valorPadrao: "desconto especial para os primeiros 50 clientes"
      }
    ]
  };
}

function gerarModeloProduto(input) {
  // Determinar tipo de produto/plataforma
  const plataforma = input.toLowerCase().includes('amazon') 
    ? 'Amazon' 
    : input.toLowerCase().includes('shopee')
      ? 'Shopee'
      : input.toLowerCase().includes('mercado livre')
        ? 'Mercado Livre'
        : 'E-commerce';
  
  return {
    nome: `Descrição de Produto - ${plataforma}`,
    categoria: 'produto',
    descricao: `Modelo para criar descrições atraentes de produtos para ${plataforma}, otimizadas para conversão.`,
    estrutura_prompt: `Escreva uma descrição persuasiva para {nome_produto} sendo vendido no ${plataforma}.\n\nDescreva o produto como: {descricao_curta}.\n\nIncluir estas características principais:\n\n- {caracteristica_1}\n- {caracteristica_2}\n- {caracteristica_3}\n- {caracteristica_4}\n\nDestaque os seguintes benefícios para o usuário:\n\n1. {beneficio_1}\n2. {beneficio_2}\n3. {beneficio_3}\n\nO produto é ideal para {publico_alvo} que desejam {objetivo_usuario}.\n\nTermine com uma garantia ou política destacando {garantia_politica} e uma chamada para ação: "{chamada_acao}".`,
    campos_variaveis: [
      {
        nome: "nome_produto",
        descricao: "Nome do produto",
        valorPadrao: "Produto Multifuncional XYZ"
      },
      {
        nome: "descricao_curta",
        descricao: "Descrição resumida do produto",
        valorPadrao: "uma solução completa para necessidades diárias"
      },
      {
        nome: "caracteristica_1",
        descricao: "Primeira característica importante",
        valorPadrao: "Material de alta qualidade"
      },
      {
        nome: "caracteristica_2",
        descricao: "Segunda característica importante",
        valorPadrao: "Design inovador"
      },
      {
        nome: "caracteristica_3",
        descricao: "Terceira característica importante",
        valorPadrao: "Fácil de usar"
      },
      {
        nome: "caracteristica_4",
        descricao: "Quarta característica importante",
        valorPadrao: "Durabilidade comprovada"
      },
      {
        nome: "beneficio_1",
        descricao: "Primeiro benefício para o usuário",
        valorPadrao: "Economia de tempo e esforço"
      },
      {
        nome: "beneficio_2",
        descricao: "Segundo benefício para o usuário",
        valorPadrao: "Maior conforto no dia a dia"
      },
      {
        nome: "beneficio_3",
        descricao: "Terceiro benefício para o usuário",
        valorPadrao: "Resultados superiores aos concorrentes"
      },
      {
        nome: "publico_alvo",
        descricao: "Público-alvo do produto",
        valorPadrao: "consumidores exigentes"
      },
      {
        nome: "objetivo_usuario",
        descricao: "O que o usuário busca resolver",
        valorPadrao: "melhorar sua experiência diária"
      },
      {
        nome: "garantia_politica",
        descricao: "Garantia ou política relevante",
        valorPadrao: "garantia de 30 dias"
      },
      {
        nome: "chamada_acao",
        descricao: "Chamada para ação final",
        valorPadrao: "Compre agora e receba em sua casa"
      }
    ]
  };
}

function gerarModeloGenerico(input) {
  return {
    nome: "Modelo Inteligente Personalizado",
    categoria: "geral",
    descricao: "Modelo inteligente gerado automaticamente com base na sua solicitação.",
    estrutura_prompt: `Crie conteúdo sobre {tema_principal} para {finalidade}. \n\nO público-alvo são {publico_alvo} e o tom deve ser {tom_comunicacao}. \n\nDeve incluir informações sobre {topico_1}, {topico_2} e {topico_3}. \n\nO formato deve ser adequado para {plataforma_midia} e deve ter aproximadamente {extensao_conteudo} de extensão. \n\nFinalizar com uma chamada para ação relacionada a {objetivo_final}.`,
    campos_variaveis: [
      {
        nome: "tema_principal",
        descricao: "Tema principal do conteúdo",
        valorPadrao: "seu principal assunto"
      },
      {
        nome: "finalidade",
        descricao: "Objetivo do conteúdo",
        valorPadrao: "informar e engajar o público"
      },
      {
        nome: "publico_alvo",
        descricao: "Público-alvo do conteúdo",
        valorPadrao: "interessados no assunto"
      },
      {
        nome: "tom_comunicacao",
        descricao: "Tom de voz desejado",
        valorPadrao: "informal e educativo"
      },
      {
        nome: "topico_1",
        descricao: "Primeiro tópico a abordar",
        valorPadrao: "aspectos introdutórios"
      },
      {
        nome: "topico_2",
        descricao: "Segundo tópico a abordar",
        valorPadrao: "benefícios e vantagens"
      },
      {
        nome: "topico_3",
        descricao: "Terceiro tópico a abordar",
        valorPadrao: "considerações finais"
      },
      {
        nome: "plataforma_midia",
        descricao: "Onde o conteúdo será publicado",
        valorPadrao: "blog ou site"
      },
      {
        nome: "extensao_conteudo",
        descricao: "Extensão aproximada do conteúdo",
        valorPadrao: "500 palavras"
      },
      {
        nome: "objetivo_final",
        descricao: "Objetivo final da comunicação",
        valorPadrao: "contato para mais informações"
      }
    ]
  };
} 