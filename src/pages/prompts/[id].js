import Head from 'next/head';
import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function DetalhesPrompt() {
  const router = useRouter();
  const { id } = router.query;
  
  const [prompt, setPrompt] = useState(null);
  const [promptModificado, setPromptModificado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [camposValores, setCamposValores] = useState({});
  const [compartilharUrl, setCompartilharUrl] = useState('');

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{prompt.titulo} | CriaPrompt</title>
        <meta name="description" content={`${prompt.titulo} - Prompt para IA`} />
      </Head>

      <Header />
      
      <ToastContainer position="top-right" autoClose={3000} />

      <main className="container-app py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 truncate flex-1">
              {prompt.titulo}
            </h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            {/* Cabeçalho com informações do prompt */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="inline-block px-3 py-1 bg-white text-indigo-800 rounded-full text-sm font-medium">
                    {prompt.categoria}
                  </span>
                  <span className="ml-3 flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {prompt.views || 0} visualizações
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={toggleFavorito}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorito ? 'bg-pink-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFavorito ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={compartilharPrompt}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Compartilhar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  
                  {user && prompt.user_id === user.id && (
                    <Link href={`/prompts/editar/${prompt.id}`}>
                      <span className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer" title="Editar prompt">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Informações do autor */}
              <div className="flex justify-between items-center mb-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>ID do usuário: {prompt.user_id}</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg> 
                  {new Date(prompt.created_at).toLocaleDateString()}
                </div>
              </div>
              
              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tags:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag, index) => (
                      <Link href={`/busca?tags=${tag}`} key={index}>
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200 transition-colors">
                          #{tag}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Campos personalizáveis */}
              {Object.keys(camposValores).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Personalize este prompt:
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Object.entries(camposValores).map(([campo, valor]) => {
                        // Encontrar a descrição do campo, se disponível
                        const campoInfo = prompt.campos_personalizados?.find(c => c.nome === campo);
                        const descricao = campoInfo?.descricao || `Campo ${campo}`;
                        
                        return (
                          <div key={campo} className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {descricao}
                            </label>
                            <input
                              type="text"
                              value={valor}
                              onChange={(e) => atualizarCampo(campo, e.target.value)}
                              placeholder={`Valor para #${campo}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={resetarCampos}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Resetar valores
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Texto do prompt */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Prompt:</h3>
                  <button
                    onClick={copiarPrompt}
                    className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l-3-3" />
                    </svg>
                    Copiar
                  </button>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="whitespace-pre-wrap">{promptModificado}</div>
                </div>
              </div>
              
              {/* Botão de copiar para mobile */}
              <div className="md:hidden fixed bottom-6 right-6 z-10">
                <button
                  onClick={copiarPrompt}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-12a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l-3-3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}