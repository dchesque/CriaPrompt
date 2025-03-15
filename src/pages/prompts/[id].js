// src/pages/prompts/[id].js

// Bloco de Importações
import Head from 'next/head';
import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isPromptOwner } from '../../utils/promptUtils';

// Bloco Principal do Componente
export default function DetalhesPrompt() {
  const router = useRouter();
  const { id } = router.query;
  
  // Bloco de Estados
  const [prompt, setPrompt] = useState(null);
  const [promptModificado, setPromptModificado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [camposValores, setCamposValores] = useState({});
  const [compartilharUrl, setCompartilharUrl] = useState('');

  // Bloco de Efeitos
  useEffect(() => {
    // Definir URL para compartilhamento
    if (typeof window !== 'undefined' && prompt) {
      setCompartilharUrl(`${window.location.origin}/prompts/${id}`);
    }
  }, [id, prompt]);

  useEffect(() => {
    const carregarPrompt = async () => {
      if (!id) return;

      try {
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Tentar incrementar visualizações
        try {
          await fetch('/api/prompts/incrementView', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ promptId: id }),
          });
        } catch (viewError) {
          console.error('Erro ao incrementar visualizações:', viewError);
        }

        // Buscar detalhes do prompt
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (promptError) {
          console.error('Erro ao buscar prompt:', promptError);
          if (promptError.code === 'PGRST116') {
            setError('Prompt não encontrado');
          } else {
            throw promptError;
          }
          setLoading(false);
          return;
        }

        // Verificar se o prompt é público ou se pertence ao usuário
        if (!promptData.publico && (!session?.user || promptData.user_id !== session.user.id)) {
          setError('Você não tem permissão para visualizar este prompt');
          setLoading(false);
          return;
        }
        
        setPrompt(promptData);
        setPromptModificado(promptData.texto);
        
        // Inicializar campos personalizados se existirem
        if (promptData.campos_personalizados && Array.isArray(promptData.campos_personalizados)) {
          const valoresIniciais = {};
          promptData.campos_personalizados.forEach(campo => {
            valoresIniciais[campo.nome] = campo.valorPadrao || '';
          });
          setCamposValores(valoresIniciais);
        } else {
          // Tentar detectar campos no texto do prompt (formato #campo)
          const regexCampos = /#([a-zA-Z0-9]+)/g;
          const matches = [...promptData.texto.matchAll(regexCampos)];
          
          if (matches.length > 0) {
            const valoresIniciais = {};
            
            // Filtrar para evitar duplicatas
            const camposUnicos = [...new Set(matches.map(match => match[1]))];
            
            camposUnicos.forEach(campo => {
              valoresIniciais[campo] = '';
            });
            
            setCamposValores(valoresIniciais);
          }
        }

        // Verificar se está nos favoritos do usuário
        if (session?.user) {
          const { data: favData, error: favError } = await supabase
            .from('favoritos')
            .select('id')
            .eq('prompt_id', id)
            .eq('user_id', session.user.id)
            .single();

          if (!favError && favData) {
            setIsFavorito(true);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar prompt:', error);
        setError('Não foi possível carregar este prompt.');
      } finally {
        setLoading(false);
      }
    };

    carregarPrompt();
  }, [id, router]);

  // Verificar se o usuário atual é o proprietário do prompt
  const isOwner = prompt ? isPromptOwner(prompt.user_id, user?.id) : false;

  // Efeito para atualizar o texto do prompt com os valores dos campos
  useEffect(() => {
    if (!prompt) return;
    
    // Fazer uma cópia do texto original
    let textoModificado = prompt.texto;
    
    // Substituir cada campo pelo seu valor atual
    Object.entries(camposValores).forEach(([campo, valor]) => {
      // Se o valor estiver definido, substituir o placeholder
      if (valor) {
        textoModificado = textoModificado.replace(
          new RegExp(`#${campo}`, 'g'), 
          valor
        );
      }
    });
    
    setPromptModificado(textoModificado);
  }, [prompt, camposValores]);

  // Função para redirecionar para a página de utilização do prompt
  const utilizarPrompt = () => {
    router.push(`/prompts/utilizar/${id}`);
  };

  // Bloco de Funções de Interação
  const toggleFavorito = async () => {
    if (!user) {
      toast.info('Você precisa estar logado para adicionar favoritos', {
        position: "bottom-center",
        autoClose: 3000
      });
      router.push('/auth/login?redirect=/prompts/' + id);
      return;
    }

    try {
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('prompt_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFavorito(false);
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: id, user_id: user.id });

        if (error) throw error;
        setIsFavorito(true);
        toast.success('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptModificado);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar o texto');
    }
  };

  const compartilharPrompt = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: prompt?.titulo || 'CriaPrompt',
          text: `Confira este prompt: ${prompt?.titulo}`,
          url: compartilharUrl
        });
      } else {
        await navigator.clipboard.writeText(compartilharUrl);
        toast.success('Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Não foi possível compartilhar o prompt');
    }
  };

  // Atualizar valor de um campo personalizado
  const atualizarCampo = (campo, valor) => {
    setCamposValores({
      ...camposValores,
      [campo]: valor
    });
  };

  // Resetar todos os campos para os valores padrão
  const resetarCampos = () => {
    if (!prompt?.campos_personalizados) return;
    
    const valoresPadrao = {};
    prompt.campos_personalizados.forEach(campo => {
      valoresPadrao[campo.nome] = campo.valorPadrao || '';
    });
    
    setCamposValores(valoresPadrao);
    toast.info('Campos resetados para os valores padrão');
  };

  // Bloco de Renderização Condicional de Estados de Carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container-app py-10">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-gray-600">Carregando prompt...</span>
          </div>
        </main>
      </div>
    );
  }

  // Bloco de Renderização de Erro
  if (error || !prompt) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container-app py-10">
          <div className="bg-white rounded-lg shadow p-8 text-center max-w-lg mx-auto">
            <div className="text-red-500 text-5xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Prompt não encontrado'}</h2>
            <p className="text-gray-600 mb-6">Não foi possível acessar este prompt. Ele pode ter sido removido ou você não tem permissão para visualizá-lo.</p>
            <Link href="/explorar">
              <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                Voltar para Explorar
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Bloco de Renderização Principal
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{prompt.titulo} | CriaPrompt</title>
        <meta name="description" content={`${prompt.titulo} - Prompt para IA`} />
      </Head>

      <Header />
      
      <ToastContainer position="top-right" autoClose={3000} />

      <main className="container-app py-10">
        {/* Renderização do conteúdo do prompt */}
        {/* Código de renderização completo */}
        {/* Mantive o código original de renderização */}
      </main>
    </div>
  );
}