// src/pages/explorar.js
import Head from 'next/head';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import PromptCard from '../components/PromptCard';
import PromptPreview from '../components/PromptPreview';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Explorar() {
  // Bloco de estados
  const router = useRouter();
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [userId, setUserId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [tagsFiltro, setTagsFiltro] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sugestoesTags, setSugestoesTags] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  
  // Estados para a prévia do prompt
  const [promptSelecionado, setPromptSelecionado] = useState(null);
  const [favoritosContagem, setFavoritosContagem] = useState({});

  // Função para exibir a prévia do prompt
  const exibirPrevia = async (prompt) => {
    setPromptSelecionado(prompt);
    
    // Carregar contagem de favoritos se ainda não tiver
    if (!favoritosContagem[prompt.id]) {
      try {
        const { count, error } = await supabase
          .from('favoritos')
          .select('*', { count: 'exact', head: true })
          .eq('prompt_id', prompt.id);
          
        if (!error) {
          setFavoritosContagem(prev => ({ 
            ...prev, 
            [prompt.id]: count || 0 
          }));
        }
      } catch (error) {
        console.error('Erro ao contar favoritos:', error);
      }
    }
  };

  // Função para fechar a prévia
  const fecharPrevia = () => {
    setPromptSelecionado(null);
  };

  // Função para buscar sugestões de tags ao digitar (sem depender da tabela tags)
  const buscarSugestoesTags = async (valor) => {
    if (!valor.trim()) {
      setSugestoesTags([]);
      return;
    }
    
    setCarregandoSugestoes(true);
    
    try {
      // Em vez de buscar na tabela tags, vamos buscar tags existentes nos prompts
      const { data, error } = await supabase
        .from('prompts')
        .select('tags')
        .contains('tags', [valor])
        .limit(10);
        
      if (error) throw error;
      
      // Extrair tags únicas dos prompts
      const todasTags = new Set();
      data?.forEach(prompt => {
        if (Array.isArray(prompt.tags)) {
          prompt.tags.forEach(tag => {
            if (tag.toLowerCase().includes(valor.toLowerCase())) {
              todasTags.add(tag);
            }
          });
        }
      });
      
      // Converter para array e filtrar as que já estão em uso
      const tagsUnicas = Array.from(todasTags)
        .filter(tag => !tagsFiltro.includes(tag));
        
      setSugestoesTags(tagsUnicas);
    } catch (error) {
      console.error('Erro ao buscar sugestões de tags:', error);
      setSugestoesTags([]);
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
  }, [tagInput, tagsFiltro]);

  // Adicionar tag
  const adicionarTag = (tag) => {
    const tagFormatada = tag.trim().toLowerCase();
    
    if (!tagFormatada || tagsFiltro.includes(tagFormatada)) {
      return;
    }
    
    setTagsFiltro([...tagsFiltro, tagFormatada]);
    setTagInput('');
    setSugestoesTags([]);
    
    // Recarregar prompts ao adicionar tag
    carregarDados([...tagsFiltro, tagFormatada], categoriaFiltro, termoBusca);
  };

  // Remover tag
  const removerTag = (tagParaRemover) => {
    const novasTags = tagsFiltro.filter(tag => tag !== tagParaRemover);
    setTagsFiltro(novasTags);
    
    // Recarregar prompts ao remover tag
    carregarDados(novasTags, categoriaFiltro, termoBusca);
  };

  // Lidar com tecla Enter no input de tags
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(tagInput);
    }
  };

  const carregarDados = async (tags = tagsFiltro, categoria = categoriaFiltro, termo = termoBusca) => {
    try {
      setLoading(true);
      
      // Verificar sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setUserId(currentUserId);

      // Construir consulta com filtros
      let query = supabase
        .from('prompts')
        .select(`
          id,
          titulo,
          texto,
          categoria,
          created_at,
          views,
          tags,
          campos_personalizados,
          user_id,
          publico
        `)
        .eq('publico', true);

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      if (termo) {
        query = query.or(`titulo.ilike.%${termo}%,texto.ilike.%${termo}%`);
      }
      
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });

      const { data: promptsData, error: promptsError } = await query;

      if (promptsError) {
        throw promptsError;
      }
      
      setPrompts(promptsData || []);

      // Se usuário estiver logado, carregar seus favoritos
      if (currentUserId) {
        const { data: favoritosData, error: favoritosError } = await supabase
          .from('favoritos')
          .select('prompt_id')
          .eq('user_id', currentUserId);

        if (favoritosError) {
          throw favoritosError;
        }
        setFavoritos(favoritosData?.map(f => f.prompt_id) || []);
      }
      
      // Carregar contagem de favoritos para todos os prompts
      const contagemFavoritos = {};
      
      // Para cada prompt, fazemos uma consulta individual para contar favoritos
      if (promptsData && promptsData.length > 0) {
        for (const prompt of promptsData) {
          try {
            const { count, error } = await supabase
              .from('favoritos')
              .select('*', { count: 'exact', head: true })
              .eq('prompt_id', prompt.id);
              
            if (!error) {
              contagemFavoritos[prompt.id] = count || 0;
            }
          } catch (err) {
            console.error(`Erro ao contar favoritos para prompt ${prompt.id}:`, err);
            contagemFavoritos[prompt.id] = 0;
          }
        }
      }
      
      setFavoritosContagem(contagemFavoritos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSearch = () => {
    carregarDados(tagsFiltro, categoriaFiltro, termoBusca);
  };

  const handleToggleFavorito = async (promptId) => {
    if (!userId) {
      toast.info('Você precisa estar logado para adicionar favoritos');
      return;
    }

    try {
      if (favoritos.includes(promptId)) {
        // Remover dos favoritos
        await supabase
          .from('favoritos')
          .delete()
          .eq('prompt_id', promptId)
          .eq('user_id', userId);
          
        setFavoritos(favoritos.filter(id => id !== promptId));
        
        // Decrementar contagem
        setFavoritosContagem(prev => ({
          ...prev,
          [promptId]: Math.max(0, (prev[promptId] || 1) - 1)
        }));
        
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: promptId, user_id: userId });

        if (error) {
          if (error.code === '23505') { // Violação de restrição única
            toast.info('Este prompt já está nos seus favoritos');
          } else {
            throw error;
          }
        } else {
          setFavoritos([...favoritos, promptId]);
          
          // Incrementar contagem
          setFavoritosContagem(prev => ({
            ...prev,
            [promptId]: (prev[promptId] || 0) + 1
          }));
          
          toast.success('Adicionado aos favoritos');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const limparFiltros = () => {
    setTermoBusca('');
    setCategoriaFiltro('');
    setTagsFiltro([]);
    carregarDados([], '', '');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Explorar Prompts | CriaPrompt</title>
        <meta name="description" content="Explore prompts públicos da comunidade" />
      </Head>

      <Header />
      
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Modal de prévia de prompt */}
      {promptSelecionado && (
        <PromptPreview
          prompt={promptSelecionado}
          userId={userId}
          isFavorito={favoritos.includes(promptSelecionado.id)}
          onToggleFavorito={handleToggleFavorito}
          favoritosCount={favoritosContagem[promptSelecionado.id] || 0}
          onClose={fecharPrevia}
        />
      )}

      <main className="container-app py-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Explorar Prompts
        </h1>

        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="termoBusca" className="block text-gray-700 mb-2">
                Buscar
              </label>
              <input
                id="termoBusca"
                type="text"
                placeholder="Buscar prompts..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="categoria" className="block text-gray-700 mb-2">
                Categoria
              </label>
              <select
                id="categoria"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas as categorias</option>
                <option value="geral">Geral</option>
                <option value="criativo">Criativo</option>
                <option value="academico">Acadêmico</option>
                <option value="profissional">Profissional</option>
                <option value="imagem">Geração de Imagem</option>
                <option value="codigo">Programação</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
              >
                Buscar
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="tags" className="block text-gray-700 mb-2">
              Filtrar por Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tagsFiltro.map((tag, index) => (
                <span 
                  key={index} 
                  className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button 
                    type="button"
                    onClick={() => removerTag(tag)}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    &times;
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Digite tags para filtrar..."
              />
              {sugestoesTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {sugestoesTags.map((sugestao, index) => (
                    <div 
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        adicionarTag(sugestao);
                      }}
                    >
                      {sugestao}
                    </div>
                  ))}
                </div>
              )}
              {carregandoSugestoes && (
                <div className="absolute right-3 top-3">
                  <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Botão para limpar filtros */}
          {(termoBusca || categoriaFiltro || tagsFiltro.length > 0) && (
            <div className="mt-4 text-right">
              <button
                onClick={limparFiltros}
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                Limpar todos os filtros
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Carregando prompts...</p>
          </div>
        ) : prompts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              Nenhum prompt encontrado para os critérios selecionados.
            </p>
            {categoriaFiltro || termoBusca || tagsFiltro.length > 0 ? (
              <button
                onClick={limparFiltros}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={() => router.push('/criar')}
                className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer"
              >
                Criar o primeiro prompt
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <PromptCard 
                key={prompt.id}
                prompt={prompt}
                userId={userId}
                isFavorito={favoritos.includes(prompt.id)}
                onToggleFavorito={handleToggleFavorito}
                favoritosCount={favoritosContagem[prompt.id] || 0}
                showActions={true}
                showAuthor={true}
                isOwner={userId === prompt.user_id}
                onClickCard={() => exibirPrevia(prompt)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}