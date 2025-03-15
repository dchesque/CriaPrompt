import Head from 'next/head';
import Header from '../../components/Header';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FiCopy, 
  FiEdit2, 
  FiHeart, 
  FiShare2, 
  FiArrowLeft,
  FiEye,
  FiTag,
  FiUser,
  FiCalendar,
  FiInfo
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function DetalhesPrompt() {
  const router = useRouter();
  const { id } = router.query;
  
  const [prompt, setPrompt] = useState(null);
  const [promptModificado, setPromptModificado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [promptsRelacionados, setPromptsRelacionados] = useState([]);
  const [camposValores, setCamposValores] = useState({});
  const [compartilharUrl, setCompartilharUrl] = useState('');
  const [compartilhando, setCompartilhando] = useState(false);

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

        // Incrementar visualizações usando o RPC
        try {
          await supabase.rpc('increment_views', { prompt_id: id });
        } catch (viewError) {
          console.error('Erro ao incrementar visualizações:', viewError);
        }

        // Buscar detalhes do prompt via API
        const response = await fetch(`/api/prompts/${id}`);
        
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            router.push('/explorar');
            return;
          }
          throw new Error('Erro ao carregar prompt');
        }
        
        const data = await response.json();
        setPrompt(data);
        setPromptModificado(data.texto);
        
        // Inicializar campos personalizados se existirem
        if (data.campos_personalizados && Array.isArray(data.campos_personalizados)) {
          const valoresIniciais = {};
          data.campos_personalizados.forEach(campo => {
            valoresIniciais[campo.nome] = campo.valorPadrao || '';
          });
          setCamposValores(valoresIniciais);
        } else {
          // Tentar detectar campos no texto do prompt (formato #campo)
          const regexCampos = /#([a-zA-Z0-9]+)/g;
          const matches = [...data.texto.matchAll(regexCampos)];
          
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
        
        // Buscar prompts relacionados (se houver tags)
        if (data.tags && data.tags.length > 0) {
          // Buscar prompts com tags em comum
          const { data: relacionados, error: relError } = await supabase
            .from('prompts')
            .select(`
              id,
              titulo,
              categoria,
              tags,
              views
            `)
            .eq('publico', true)
            .neq('id', id) // Excluir o prompt atual
            .contains('tags', data.tags)
            .order('views', { ascending: false })
            .limit(3);
            
          if (!relError && relacionados?.length > 0) {
            setPromptsRelacionados(relacionados);
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
    setCompartilhando(true);
    
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
    } finally {
      setCompartilhando(false);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header />
        <main className="container-app py-10">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-lg mx-auto">
            <div className="text-red-500 text-5xl mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Prompt não encontrado'}</h2>
            <p className="text-gray-600 mb-6">Não foi possível acessar este prompt. Ele pode ter sido removido ou você não tem permissão para visualizá-lo.</p>
            <Link href="/explorar">
              <span className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer">
                Voltar para Explorar
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
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
              <FiArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-800 truncate flex-1">
              {prompt.titulo}
            </h1>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 transition-all duration-300 hover:shadow-xl">
            {/* Cabeçalho com informações do prompt */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="inline-block px-3 py-1 bg-white text-indigo-800 rounded-full text-sm font-medium">
                    {prompt.categoria}
                  </span>
                  <span className="ml-3 flex items-center text-sm">
                    <FiEye className="mr-1" /> {prompt.views || 0} visualizações
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
                    <FiHeart className={isFavorito ? "fill-current" : ""} />
                  </button>
                  
                  <button 
                    onClick={compartilharPrompt}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    title="Compartilhar"
                    disabled={compartilhando}
                  >
                    <FiShare2 />
                  </button>
                  
                  {user && prompt.user_id === user.id && (
                    <Link href={`/prompts/editar/${prompt.id}`}>
                      <span className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer" title="Editar prompt">
                        <FiEdit2 />
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
                  <FiUser className="mr-1" /> 
                  {prompt.users?.email ? (
                    <Link href={`/usuarios/${prompt.user_id}`}>
                      <span className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer">
                        {prompt.users.email}
                      </span>
                    </Link>
                  ) : (
                    <span>Usuário anônimo</span>
                  )}
                </div>
                <div className="flex items-center">
                  <FiCalendar className="mr-1" /> {new Date(prompt.created_at).toLocaleDateString()}
                </div>
              </div>
              
              {/* Tags */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <FiTag className="mr-1" /> Tags:
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
                    <FiInfo className="mr-2 text-indigo-600" /> Personalize este prompt:
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
                    <FiCopy className="mr-1" /> Copiar
                  </button>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="whitespace-pre-wrap">{promptModificado}</div>
                </div>
              </div>
              
              {/* Botão de copiar fixo para mobile */}
              <div className="md:hidden fixed bottom-6 right-6 z-10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copiarPrompt}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                >
                  <FiCopy size={24} />
                </motion.button>
              </div>
            </div>
          </div>
          
          {/* Prompts relacionados */}
          {promptsRelacionados.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Prompts Relacionados</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {promptsRelacionados.map(p => (
                  <Link href={`/prompts/${p.id}`} key={p.id}>
                    <div className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-indigo-200">
                      <h3 className="font-medium text-indigo-600 mb-2 line-clamp-2">{p.titulo}</h3>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{p.categoria}</span>
                        <span className="flex items-center">
                          <FiEye className="mr-1" /> {p.views || 0}
                        </span>
                      </div>
                      {p.tags && p.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.tags.filter(tag => prompt.tags.includes(tag)).slice(0, 3).map((tag, i) => (
                            <span key={i} className="bg-gray-200 px-1.5 py-0.5 rounded-full text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}