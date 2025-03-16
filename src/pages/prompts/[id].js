// src/pages/prompts/[id].js

// Bloco de Importações
import Head from 'next/head';
import Header from '../../components/Header';
import ComentariosAvaliacao from '../../components/ComentariosAvaliacao';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isPromptOwner } from '../../utils/promptUtils';

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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        {/* Cabeçalho com informações do prompt */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="inline-block px-3 py-1 bg-white text-indigo-800 rounded-full text-sm font-medium">
                {prompt.categoria}
              </span>
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="ml-3 flex space-x-2">
                  {prompt.tags.slice(0, 3).map((tag, index) => (
                    <span 
                      key={index} 
                      className="bg-white/20 px-2 py-1 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleFavorito}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isFavorito 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-6 w-6 ${isFavorito ? 'fill-current' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo do Prompt */}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{prompt.titulo}</h1>

          {/* Descrição do Prompt (se existir) */}
          {prompt.descricao && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-gray-700 italic">{prompt.descricao}</p>
            </div>
          )}

          {/* Campos Personalizáveis */}
          {Object.keys(camposValores).length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Campos Personalizáveis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(camposValores).map(([campo, valor]) => (
                  <div key={campo} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      #{campo}
                    </label>
                    <input
                      type="text"
                      value={valor}
                      onChange={(e) => atualizarCampo(campo, e.target.value)}
                      placeholder={`Digite o valor para ${campo}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={resetarCampos}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Resetar valores padrão
              </button>
            </div>
          )}

          {/* Texto do Prompt */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <pre className="whitespace-pre-wrap font-sans text-gray-800">
              {promptModificado}
            </pre>
          </div>

          {/* Ações */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={utilizarPrompt}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" 
                    clipRule="evenodd" 
                  />
                </svg>
                Utilizar Prompt
              </button>
              <button
                onClick={copiarPrompt}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                Copiar Prompt
              </button>
            </div>
            <button
              onClick={compartilharPrompt}
              className="text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Seção de Comentários e Avaliações */}
      {!loading && !error && (
        <ComentariosAvaliacao 
          promptId={prompt.id} 
          userId={user?.id} 
        />
      )}
    </main>
  </div>
);
}