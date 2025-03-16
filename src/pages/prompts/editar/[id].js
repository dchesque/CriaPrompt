// src/pages/prompts/editar/[id].js

// Bloco de importações
import Head from 'next/head';
import Header from '../../../components/Header';
import AuthGuard from '../../../components/AuthGuard';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiEye, FiEyeOff, FiCopy, FiPlusCircle, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi';
import { FaWandMagicSparkles } from "react-icons/fa6";

// Bloco principal do componente
export default function EditarPrompt() {
  const router = useRouter();
  const { id } = router.query;

  // Bloco de estados
  const [titulo, setTitulo] = useState('');
  const [prompt, setPrompt] = useState('');
  // Estado para o campo de descrição
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [isPublico, setIsPublico] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userSession, setUserSession] = useState(null);
  const promptRef = useRef(null);
  
  // Estado para geração de descrição
  const [gerandoDescricao, setGerandoDescricao] = useState(false);
  
  // Estados para campos personalizáveis
  const [camposPersonalizados, setCamposPersonalizados] = useState([]);
  const [mostrarAddCampo, setMostrarAddCampo] = useState(false);
  const [novoCampoNome, setNovoCampoNome] = useState('');
  const [novoCampoDescricao, setNovoCampoDescricao] = useState('');
  const [novoCampoValorPadrao, setNovoCampoValorPadrao] = useState('');
  
  // Estados para tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sugestoesTags, setSugestoesTags] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  
  // Estado para previsualização do prompt
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Bloco de efeitos
  // Efeito para atualizar a previsualização do prompt
  useEffect(() => {
    atualizarPreview();
  }, [prompt, camposPersonalizados]);

  // Função para atualizar a previsualização
  const atualizarPreview = () => {
    let promptPreview = prompt;
    camposPersonalizados.forEach(campo => {
      const placeholder = `#${campo.nome}`;
      if (promptPreview.includes(placeholder)) {
        promptPreview = promptPreview.replace(
          new RegExp(placeholder, 'g'), 
          `<span class="bg-indigo-100 text-indigo-800 px-1 rounded">${campo.valorPadrao || placeholder}</span>`
        );
      }
    });
    setPreviewPrompt(promptPreview);
  };

// Função para gerar descrição automática
const gerarDescricao = async () => {
  if (!prompt || prompt.trim() === '') {
    toast.warning('Digite o texto do prompt primeiro');
    return;
  }
  
  setGerandoDescricao(true);
  
  try {
    // Obter o token de autenticação atual
    const { data: authData } = await supabase.auth.getSession();
    
    if (!authData.session) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    
    const token = authData.session.access_token;
    
    const response = await fetch('/api/groq/generate-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Adicionar token no header
      },
      credentials: 'include', // Incluir cookies
      body: JSON.stringify({
        prompt: prompt
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao gerar descrição');
    }
    
    setDescricao(data.description);
    toast.success('Descrição gerada com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar descrição:', error);
    toast.error('Falha ao gerar descrição automática: ' + error.message);
  } finally {
    setGerandoDescricao(false);
  }
};

  // Buscar sessão do usuário
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Se não houver sessão, redirecionar para login
          router.push('/auth/login?redirect=/prompts/editar/' + id);
          return;
        }
        
        setUserSession(session);
      } catch (error) {
        console.error('Erro ao buscar sessão:', error);
        router.push('/auth/login?redirect=/prompts/editar/' + id);
      }
    };
    
    fetchSession();
  }, [router, id]);

  // Carregar prompt para edição
  useEffect(() => {
    const carregarPrompt = async () => {
      // Se não tiver ID ou sessão, não carregar
      if (!id || !userSession) return;

      try {
        setLoading(true);
        setError(null);
        
        console.log("Carregando prompt para edição. ID:", id);
        console.log("Usuário autenticado:", userSession.user.id);
        
        // Buscar o prompt diretamente via Supabase para garantir acesso
        const { data: promptData, error: promptError } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', id)
          .eq('user_id', userSession.user.id)
          .single();
        
        if (promptError) {
          console.error('Erro ao buscar prompt:', promptError);
          
          if (promptError.code === 'PGRST116') {
            setError('Prompt não encontrado ou você não tem permissão para editá-lo.');
          } else {
            setError(`Erro ao buscar prompt: ${promptError.message}`);
          }
          
          return;
        }
        
        // Preencher os campos do formulário com os dados existentes
        setTitulo(promptData.titulo);
        setPrompt(promptData.texto);
        // Carregando o campo de descrição (com fallback para string vazia se for null)
        setDescricao(promptData.descricao || '');
        setCategoria(promptData.categoria);
        setIsPublico(promptData.publico);
        setTags(promptData.tags || []);
        
        // Carregar campos personalizados se existirem
        if (promptData.campos_personalizados && Array.isArray(promptData.campos_personalizados)) {
          setCamposPersonalizados(promptData.campos_personalizados);
        } else {
          // Tentar detectar campos no texto do prompt (formato #campo)
          const regexCampos = /#([a-zA-Z0-9]+)/g;
          const matches = [...promptData.texto.matchAll(regexCampos)];
          
          if (matches.length > 0) {
            const camposDetectados = matches.map(match => ({
              nome: match[1],
              descricao: `Campo ${match[1]}`,
              valorPadrao: ''
            }));
            
            // Filtrar para evitar duplicatas
            const camposUnicos = camposDetectados.filter((campo, index, self) => 
              index === self.findIndex(c => c.nome === campo.nome)
            );
            
            setCamposPersonalizados(camposUnicos);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar prompt:', error);
        setError('Não foi possível carregar este prompt. ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    carregarPrompt();
  }, [id, userSession, router]);

  // Função para buscar sugestões de tags ao digitar
  const buscarSugestoesTags = async (valor) => {
    if (!valor.trim()) {
      setSugestoesTags([]);
      return;
    }
    
    setCarregandoSugestoes(true);
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('nome')
        .ilike('nome', `${valor}%`)
        .order('count', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      // Filtrar tags que já estão adicionadas
      const sugestoesFiltradas = data
        ?.map(tag => tag.nome)
        .filter(nome => !tags.includes(nome)) || [];
        
      setSugestoesTags(sugestoesFiltradas);
    } catch (error) {
      console.error('Erro ao buscar sugestões de tags:', error);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  // Atualizar sugestões ao digitar
  useEffect(() => {
    const handler = setTimeout(() => {
      buscarSugestoesTags(tagInput);
    }, 300);
    
    return () => clearTimeout(handler);
  }, [tagInput, tags]);

  // Adicionar tag
  const adicionarTag = (tag) => {
    const tagFormatada = tag.trim().toLowerCase();
    
    if (!tagFormatada || tags.includes(tagFormatada)) {
      return;
    }
    
    if (tags.length >= 5) {
      toast.warning('Você pode adicionar no máximo 5 tags');
      return;
    }
    
    setTags([...tags, tagFormatada]);
    setTagInput('');
    setSugestoesTags([]);
  };

  // Remover tag
  const removerTag = (tagParaRemover) => {
    setTags(tags.filter(tag => tag !== tagParaRemover));
  };

  // Lidar com tecla Enter no input de tags
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(tagInput);
    }
  };
  
  // Bloco de funções de manipulação de campos
  // Adicionar campo personalizado
  const adicionarCampoPersonalizado = () => {
    if (!novoCampoNome) {
      toast.error('O nome do campo é obrigatório');
      return;
    }
    
    const nomeCampo = novoCampoNome.trim().replace(/\s+/g, '');
    
    // Verificar se já existe um campo com esse nome
    if (camposPersonalizados.some(campo => campo.nome === nomeCampo)) {
      toast.error('Já existe um campo com esse nome');
      return;
    }
    
    // Adicionar explicitamente o novo campo ao array existente
    const novosCampos = [
      ...camposPersonalizados,
      {
        nome: nomeCampo,
        descricao: novoCampoDescricao.trim() || `Campo ${nomeCampo}`,
        valorPadrao: novoCampoValorPadrao.trim()
      }
    ];
    
    setCamposPersonalizados(novosCampos);
    console.log("Campos atualizados:", novosCampos);
    
    // Adicionar o campo ao texto do prompt
    if (!prompt.includes(`#${nomeCampo}`)) {
      setPrompt(prompt + (prompt.endsWith(' ') ? '' : ' ') + `#${nomeCampo}`);
    }
    
    // Limpar os campos
    setNovoCampoNome('');
    setNovoCampoDescricao('');
    setNovoCampoValorPadrao('');
    setMostrarAddCampo(false);
  };
  
  // Remover campo personalizado
  const removerCampoPersonalizado = (index) => {
    const campoRemovido = camposPersonalizados[index];
    const novosCampos = camposPersonalizados.filter((_, i) => i !== index);
    setCamposPersonalizados(novosCampos);
    console.log("Campos após remoção:", novosCampos);
  };
  
  // Inserir campo no prompt
  const inserirCampoNoPrompt = (campo) => {
    if (promptRef.current) {
      const cursorPos = promptRef.current.selectionStart;
      const textBefore = prompt.substring(0, cursorPos);
      const textAfter = prompt.substring(cursorPos);
      setPrompt(textBefore + `#${campo.nome}` + textAfter);
      
      // Focar de volta no textarea e colocar o cursor após o texto inserido
      setTimeout(() => {
        promptRef.current.focus();
        promptRef.current.selectionStart = promptRef.current.selectionEnd = cursorPos + campo.nome.length + 1;
      }, 0);
    } else {
      setPrompt(prompt + (prompt.endsWith(' ') ? '' : ' ') + `#${campo.nome}`);
    }
  };
  
  // Copiar prompt para o clipboard
  const copiarPrompt = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      toast.success('Prompt copiado para a área de transferência!');
    }).catch(err => {
      console.error('Falha ao copiar texto:', err);
      toast.error('Falha ao copiar texto');
    });
  };

  // Bloco de funções de submissão
  // MÉTODO ATUALIZADO: Salvar diretamente no Supabase sem usar a API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
  
    try {
      // Validações básicas
      if (!titulo.trim()) {
        throw new Error('O título é obrigatório');
      }
      
      if (!prompt.trim()) {
        throw new Error('O texto do prompt é obrigatório');
      }
  
      // Verificar se a sessão ainda é válida
      if (!userSession) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
  
      // Preparar dados para atualização
      const dadosAtualizacao = {
        titulo: titulo.trim(),
        texto: prompt.trim(),
        descricao: descricao.trim(), // Incluindo o campo de descrição
        categoria,
        publico: isPublico,
        tags: Array.isArray(tags) ? tags : [],
        campos_personalizados: camposPersonalizados.length > 0 
          ? camposPersonalizados.map(campo => ({
              nome: campo.nome,
              descricao: campo.descricao || '',
              valorPadrao: campo.valorPadrao || ''
            }))
          : null,
        updated_at: new Date().toISOString()
      };
      
      console.log("Dados a serem atualizados:", dadosAtualizacao);
      
      // Atualizar diretamente no Supabase
      const { data, error } = await supabase
        .from('prompts')
        .update(dadosAtualizacao)
        .eq('id', id)
        .eq('user_id', userSession.user.id)
        .select();
  
      if (error) {
        console.error('Erro ao atualizar no Supabase:', error);
        throw new Error(`Erro ao atualizar prompt: ${error.message}`);
      }
  
      console.log("Resposta do Supabase:", data);
      
      if (!data || data.length === 0) {
        throw new Error('Nenhuma alteração foi aplicada. Verifique se você tem permissão para editar este prompt.');
      }
      
      toast.success('Prompt atualizado com sucesso!');
      
      // Aguardar um pouco para garantir que o toast seja exibido
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      setError(error.message || 'Falha ao atualizar o prompt. Por favor, tente novamente.');
      toast.error(error.message || 'Falha ao atualizar o prompt');
    } finally {
      setSaving(false);
    }
  };

  // Bloco de renderização
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Head>
          <title>Editar Prompt | CriaPrompt</title>
          <meta name="description" content="Edite seu prompt" />
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
              <h1 className="text-3xl font-bold text-gray-800 relative">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  Editar Prompt
                </span>
              </h1>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 transition-all duration-300 hover:shadow-xl">
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border-l-4 border-red-500 animate-fade-in">
                  <p className="font-medium">Erro:</p>
                  <p>{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  <span className="ml-3 text-gray-600">Carregando...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="titulo" className="block text-gray-700 font-medium mb-2">
                        Título
                      </label>
                      <input
                        id="titulo"
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        placeholder="Dê um título para seu prompt"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="categoria" className="block text-gray-700 font-medium mb-2">
                        Categoria
                      </label>
                      <select
                        id="categoria"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                      >
                        <option value="geral">Geral</option>
                        <option value="criativo">Criativo</option>
                        <option value="academico">Acadêmico</option>
                        <option value="profissional">Profissional</option>
                        <option value="imagem">Geração de Imagem</option>
                        <option value="codigo">Programação</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  {/* Campo de descrição modificado com botão de geração automática */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="descricao" className="block text-gray-700 font-medium">
                        Descrição
                      </label>
                      <button
                        type="button"
                        onClick={gerarDescricao}
                        disabled={gerandoDescricao || !prompt}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaWandMagicSparkles className="mr-1" />
                        {gerandoDescricao ? 'Gerando...' : 'Gerar descrição automática'}
                      </button>
                    </div>
                    <textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      placeholder="Adicione uma breve descrição sobre o que esse prompt faz"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Uma boa descrição ajuda outros usuários a entenderem o propósito do seu prompt
                    </p>
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-gray-700 font-medium mb-2">
                      Tags (até 5)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center group"
                        >
                          #{tag}
                          <button 
                            type="button"
                            onClick={() => removerTag(tag)}
                            className="ml-2 text-indigo-600 hover:text-indigo-800 opacity-70 group-hover:opacity-100"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        id="tags"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        placeholder="Digite tags e pressione Enter"
                      />
                      {sugestoesTags.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {sugestoesTags.map((sugestao, index) => (
                            <div 
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-indigo-50 transition-colors duration-150"
                              onClick={() => {
                                adicionarTag(sugestao);
                              }}
                            >
                              #{sugestao}
                            </div>
                          ))}
                        </div>
                      )}
                      {carregandoSugestoes && (
                        <div className="absolute right-3 top-3">
                          <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pressione Enter para adicionar cada tag. Tags ajudam na descoberta do seu prompt.
                    </p>
                  </div>
                  
                  {/* Campos personalizados */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-gray-700 font-medium">
                        Campos Personalizáveis
                      </label>
                      <button
                        type="button"
                        onClick={() => setMostrarAddCampo(!mostrarAddCampo)}
                        className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-150"
                      >
                        <FiPlusCircle className="mr-1" /> Adicionar Campo
                      </button>
                    </div>
                    
                    {mostrarAddCampo && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label htmlFor="nomeCampo" className="block text-gray-700 text-sm font-medium mb-1">
                              Nome do Campo*
                            </label>
                            <input
                              id="nomeCampo"
                              type="text"
                              value={novoCampoNome}
                              onChange={(e) => setNovoCampoNome(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                              placeholder="Ex: objeto, cenario"
                            />
                          </div>
                          <div>
                            <label htmlFor="descCampo" className="block text-gray-700 text-sm font-medium mb-1">
                              Descrição (opcional)
                            </label>
                            <input
                              id="descCampo"
                              type="text"
                              value={novoCampoDescricao}
                              onChange={(e) => setNovoCampoDescricao(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                              placeholder="Ex: Objeto principal da imagem"
                            />
                          </div>
                          <div>
                            <label htmlFor="valorPadrao" className="block text-gray-700 text-sm font-medium mb-1">
                              Valor Padrão (opcional)
                            </label>
                            <input
                              id="valorPadrao"
                              type="text"
                              value={novoCampoValorPadrao}
                              onChange={(e) => setNovoCampoValorPadrao(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                              placeholder="Ex: gato"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setMostrarAddCampo(false)}
                            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors duration-150"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={adicionarCampoPersonalizado}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-150"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {camposPersonalizados.length > 0 && (
                      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Campos adicionados:</h3>
                        <div className="space-y-2">
                          {camposPersonalizados.map((campo, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                              <div className="flex-1">
                                <span className="font-medium text-indigo-600">#{campo.nome}</span>
                                {campo.descricao && <p className="text-xs text-gray-500">{campo.descricao}</p>}
                                {campo.valorPadrao && <p className="text-xs text-gray-600">Valor padrão: {campo.valorPadrao}</p>}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  onClick={() => inserirCampoNoPrompt(campo)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors duration-150"
                                  title="Inserir no prompt"
                                >
                                  <FiPlusCircle size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removerCampoPersonalizado(index)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors duration-150"
                                  title="Remover campo"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Dica: Use os campos inserindo #{"{nome do campo}"} no texto do prompt
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="prompt" className="block text-gray-700 font-medium">
                        Seu Prompt
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setMostrarPreview(!mostrarPreview)}
                          className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-150"
                          title={mostrarPreview ? "Ocultar prévia" : "Mostrar prévia"}
                        >
                          {mostrarPreview ? <FiEyeOff className="mr-1" /> : <FiEye className="mr-1" />}
                          {mostrarPreview ? "Ocultar prévia" : "Mostrar prévia"}
                        </button>
                        <button
                          type="button"
                          onClick={copiarPrompt}
                          className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-150"
                          title="Copiar para área de transferência"
                        >
                          <FiCopy className="mr-1" /> Copiar
                        </button>
                      </div>
                    </div>
                    
                    {mostrarPreview && (
                      <div 
                        className="bg-gray-50 p-4 rounded-lg mb-3 border border-dashed border-gray-300"
                        dangerouslySetInnerHTML={{ __html: previewPrompt }}
                      ></div>
                    )}
                    
                    <textarea
                      id="prompt"
                      ref={promptRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={camposPersonalizados.length > 0 ? 8 : 10}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      placeholder="Digite seu prompt aqui... Use #nomeDoCampo para inserir campos personalizáveis"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublico}
                        onChange={(e) => setIsPublico(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-3 text-gray-700">Tornar público</span>
                    </label>
                    
                    <p className="text-xs text-gray-500 ml-4">
                      Prompts públicos podem ser visualizados por outros usuários
                    </p>
                  </div>

                  <div className="flex justify-end pt-4 space-x-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-all duration-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
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
                          <FiSave className="mr-2" /> Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}