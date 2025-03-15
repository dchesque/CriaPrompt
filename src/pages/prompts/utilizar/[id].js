// src/pages/prompts/utilizar/[id].js
import Head from 'next/head';
import Header from '../../../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiSave, FiCopy, FiArrowLeft } from 'react-icons/fi';
import { extractCustomFields, applyCustomFieldValues } from '../../../utils/promptUtils';

export default function UtilizarPrompt() {
  const router = useRouter();
  const { id } = router.query;
  
  const [prompt, setPrompt] = useState(null);
  const [promptModificado, setPromptModificado] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [camposValores, setCamposValores] = useState({});
  const [promptOriginal, setPromptOriginal] = useState(null);

  useEffect(() => {
    const carregarPrompt = async () => {
      if (!id) return;

      try {
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

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

        // Verificar se o prompt é público
        if (!promptData.publico) {
          setError('Este prompt não está disponível para utilização');
          setLoading(false);
          return;
        }
        
        setPrompt(promptData);
        setPromptOriginal(promptData);
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
          const camposDetectados = extractCustomFields(promptData.texto);
          
          if (camposDetectados.length > 0) {
            const valoresIniciais = {};
            camposDetectados.forEach(campo => {
              valoresIniciais[campo.nome] = campo.valorPadrao || '';
            });
            
            setCamposValores(valoresIniciais);
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
        const regex = new RegExp(`#${campo}`, 'g');
        textoModificado = textoModificado.replace(regex, valor);
      }
    });
    
    setPromptModificado(textoModificado);
  }, [prompt, camposValores]);

  // Atualizar valor de um campo personalizado
  const atualizarCampo = (campo, valor) => {
    setCamposValores(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Copiar prompt para o clipboard
  const copiarPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptModificado);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar o texto');
    }
  };

  // Salvar como um novo prompt
  const salvarNovoPrompt = async () => {
    if (!user) {
      toast.info('Você precisa estar logado para salvar um prompt');
      router.push(`/auth/login?redirect=/prompts/utilizar/${id}`);
      return;
    }

    setSaving(true);
    
    try {
      // Verificar se todos os campos foram preenchidos
      const camposVazios = Object.entries(camposValores).filter(([_, valor]) => !valor.trim());
      
      if (camposVazios.length > 0) {
        if (!confirm('Alguns campos personalizados estão vazios. Deseja continuar mesmo assim?')) {
          setSaving(false);
          return;
        }
      }
      
      // Criar novo prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          titulo: `${prompt.titulo} (Personalizado)`,
          texto: promptModificado,
          categoria: prompt.categoria,
          publico: false, // Por padrão, o novo prompt será privado
          user_id: user.id,
          views: 0,
          tags: prompt.tags || [],
          campos_personalizados: promptOriginal.campos_personalizados || []
        })
        .select();
      
      if (error) throw error;
      
      toast.success('Prompt criado com sucesso!');
      
      // Redirecionar para o novo prompt
      setTimeout(() => {
        router.push(`/prompts/${data[0].id}`);
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar prompt. Tente novamente.');
    } finally {
      setSaving(false);
    }
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
            <p className="text-gray-600 mb-6">Não foi possível acessar este prompt. Ele pode ter sido removido ou você não tem permissão para utilizá-lo.</p>
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
        <title>Utilizar Prompt: {prompt.titulo} | CriaPrompt</title>
        <meta name="description" content={`Personalize o prompt: ${prompt.titulo}`} />
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
              Personalizar: {prompt.titulo}
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
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Personalize este prompt substituindo os campos abaixo com seus próprios valores. 
                  Após personalizar, você pode copiar o resultado ou salvar como um novo prompt em sua conta.
                </p>
                
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
                      Personalize o prompt:
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
                    <h3 className="text-lg font-semibold">Resultado:</h3>
                    <button
                      onClick={copiarPrompt}
                      className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      <FiCopy className="mr-1" size={16} />
                      Copiar
                    </button>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="whitespace-pre-wrap">{promptModificado}</div>
                  </div>
                </div>
                
                {/* Botões de ação */}
                <div className="flex justify-between items-center mt-8">
                  <Link href={`/prompts/${id}`}>
                    <span className="text-indigo-600 hover:text-indigo-800 transition-colors">
                      Voltar para o prompt original
                    </span>
                  </Link>
                  
                  <button
                    onClick={salvarNovoPrompt}
                    disabled={saving}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <FiSave className="mr-2" size={18} />
                        Salvar como meu prompt
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}