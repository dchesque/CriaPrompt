// src/pages/explorar.js
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import PromptCard from '../components/PromptCard';
import PromptPreview from '../components/PromptPreview';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Filter, Clock, ArrowUpDown, Plus } from 'lucide-react';
import { SidebarNav } from '../components/SidebarNav';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import AuthGuard from '../components/AuthGuard';
import DashboardLayout from '../components/layouts/DashboardLayout';

export default function Explorar() {
  const router = useRouter();
  const { q: queryParam, categoria: categoriaParam, ordenacao: ordenacaoParam } = router.query;
  
  // Estados unificados
  const [session, setSession] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [favoritos, setFavoritos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [userId, setUserId] = useState(null);
  const [tagsFiltro, setTagsFiltro] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sugestoesTags, setSugestoesTags] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [promptSelecionado, setPromptSelecionado] = useState(null);
  const [favoritosContagem, setFavoritosContagem] = useState({});
  const promptsPorPagina = 12;

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
    carregarDados([...tagsFiltro, tagFormatada], categoriaFiltro, searchQuery);
  };

  // Remover tag
  const removerTag = (tagParaRemover) => {
    const novasTags = tagsFiltro.filter(tag => tag !== tagParaRemover);
    setTagsFiltro(novasTags);
    
    // Recarregar prompts ao remover tag
    carregarDados(novasTags, categoriaFiltro, searchQuery);
  };

  // Lidar com tecla Enter no input de tags
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(tagInput);
    }
  };

  const carregarDados = async (tags = tagsFiltro, categoria = categoriaFiltro, termo = searchQuery) => {
    try {
      setLoading(true);
      
      // Verificar sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setUserId(currentUserId);
      setSession(session);

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

      if (categoria && categoria !== 'todas') {
        query = query.eq('categoria', categoria);
      }

      if (termo) {
        query = query.or(`titulo.ilike.%${termo}%,texto.ilike.%${termo}%`);
      }
      
      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }
      
      // Ordenar conforme selecionado
      if (ordenacao === 'recentes') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('views', { ascending: false });
      }

      const { data: promptsData, error: promptsError, count } = await query;

      if (promptsError) {
        throw promptsError;
      }
      
      setPrompts(promptsData || []);
      setTotalPrompts(count || 0);

      // Carregar categorias com contagem
      const { data: categoriasData } = await supabase
        .from('prompts')
        .select('categoria')
        .eq('publico', true);

      if (categoriasData) {
        const categoriasCount = {};
        categoriasData.forEach(item => {
          if (item.categoria) {
            categoriasCount[item.categoria] = (categoriasCount[item.categoria] || 0) + 1;
          }
        });

        const categoriasArray = Object.keys(categoriasCount).map(nome => ({
          nome,
          count: categoriasCount[nome]
        }));

        setCategorias(categoriasArray);
      }

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
      toast.error('Erro ao carregar prompts. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    // Aplicar filtros dos query params
    if (categoriaParam) {
      setCategoriaFiltro(categoriaParam);
    }
    
    if (queryParam) {
      setSearchQuery(queryParam);
    }
    
    if (ordenacaoParam) {
      setOrdenacao(ordenacaoParam);
    }
    
    carregarDados(
      tagsFiltro, 
      categoriaParam || categoriaFiltro, 
      queryParam || searchQuery
    );
  }, [paginaAtual]);

  // Atualizar URL com os filtros
  useEffect(() => {
    const query = {};
    
    if (searchQuery) {
      query.q = searchQuery;
    }
    
    if (categoriaFiltro && categoriaFiltro !== 'todas') {
      query.categoria = categoriaFiltro;
    }
    
    if (ordenacao && ordenacao !== 'recentes') {
      query.ordenacao = ordenacao;
    }
    
    router.push({
      pathname: '/explorar',
      query
    }, undefined, { shallow: true });
    
  }, [searchQuery, categoriaFiltro, ordenacao]);

  // Função para lidar com buscas
  const handleSearch = () => {
    carregarDados(tagsFiltro, categoriaFiltro, searchQuery);
  };

  // Função para adicionar/remover favoritos
  const handleToggleFavorito = async (promptId) => {
    try {
      // Verificar se o usuário está logado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.info('Faça login para adicionar favoritos');
        router.push('/auth/login');
        return;
      }
      
      const userId = session.user.id;
      
      // Verificar se já é favorito
      const isFavorito = favoritos.includes(promptId);
      
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('prompt_id', promptId);
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos(favoritos.filter(id => id !== promptId));
        setFavoritosContagem(prev => ({
          ...prev,
          [promptId]: Math.max(0, (prev[promptId] || 1) - 1)
        }));
        
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({
            user_id: userId,
            prompt_id: promptId,
            created_at: new Date()
          });
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos([...favoritos, promptId]);
        setFavoritosContagem(prev => ({
          ...prev,
          [promptId]: (prev[promptId] || 0) + 1
        }));
        
        toast.success('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito. Tente novamente.');
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        <Head>
          <title>Explorar Prompts | CriaPrompt</title>
          <meta name="description" content="Explore prompts compartilhados pela comunidade" />
        </Head>
        
        <ToastContainer theme="dark" position="top-right" />
        
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

        {/* Decorative elements */}
        <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <SidebarNav />
        
        <main className="flex-1 p-6 md:p-8 relative z-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-medium tracking-tight">Explorar Prompts</h1>
            </div>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label htmlFor="searchQuery" className="block text-sm font-medium mb-1">
                      Buscar
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="searchQuery"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por título, descrição..."
                        className="w-full px-3 py-2.5 pl-10 bg-background/30 backdrop-blur-xl border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => setMostrarFiltros(!mostrarFiltros)}
                      variant="outline"
                      className="flex items-center gap-2 bg-background/30 backdrop-blur-xl border border-white/20"
                    >
                      <Filter size={16} />
                      <span>Filtros</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        const novaOrdenacao = ordenacao === 'recentes' ? 'populares' : 'recentes';
                        setOrdenacao(novaOrdenacao);
                      }}
                      variant="outline"
                      className="flex items-center gap-2 bg-background/30 backdrop-blur-xl border border-white/20"
                    >
                      {ordenacao === 'recentes' ? <Clock size={16} /> : <ArrowUpDown size={16} />}
                      <span>{ordenacao === 'recentes' ? 'Mais recentes' : 'Mais populares'}</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setSearchQuery('');
                        setCategoriaFiltro('todas');
                        setOrdenacao('recentes');
                        router.push('/explorar', undefined, { shallow: true });
                      }}
                      variant="outline"
                      className="bg-background/30 backdrop-blur-xl border border-white/20"
                      disabled={!searchQuery && categoriaFiltro === 'todas' && ordenacao === 'recentes'}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                
                {mostrarFiltros && (
                  <div className="mt-4 p-4 bg-background/50 backdrop-blur-xl border border-white/20 rounded-md animate-in fade-in-50 duration-150">
                    <div>
                      <label className="block text-sm font-medium mb-2">Categorias</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCategoriaFiltro('todas')}
                          className={`px-3 py-1.5 rounded-md text-sm ${
                            categoriaFiltro === 'todas'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background/50 hover:bg-white/10'
                          }`}
                        >
                          Todas
                        </button>
                        
                        {categorias.map((cat) => (
                          <button
                            key={cat.nome}
                            onClick={() => setCategoriaFiltro(cat.nome)}
                            className={`px-3 py-1.5 rounded-md text-sm ${
                              categoriaFiltro === cat.nome
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background/50 hover:bg-white/10'
                            }`}
                          >
                            {cat.nome} ({cat.count})
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {tagsFiltro.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-foreground"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removerTag(tag)}
                              className="ml-1 text-primary-foreground hover:text-white/80"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagKeyDown}
                          placeholder="Digite tags para filtrar..."
                          className="w-full px-3 py-2 bg-background/30 backdrop-blur-xl border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                        />
                        {sugestoesTags.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-background/90 backdrop-blur-xl border border-white/20 rounded-md shadow-lg">
                            {sugestoesTags.map((sugestao, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 cursor-pointer hover:bg-white/10"
                                onClick={() => adicionarTag(sugestao)}
                              >
                                {sugestao}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Carregando prompts...</p>
                </div>
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-xl font-medium mb-2">Nenhum prompt encontrado</h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || categoriaFiltro !== 'todas' || tagsFiltro.length > 0
                    ? 'Tente ajustar seus filtros de busca.' 
                    : 'Seja o primeiro a compartilhar um prompt com a comunidade!'}
                </p>
                {session && (
                  <Button
                    onClick={() => router.push('/criar')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
                  >
                    Criar Novo Prompt
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <PromptCard 
                  prompts={prompts} 
                  favoritos={favoritos} 
                  onToggleFavorito={handleToggleFavorito} 
                  favoritosContagem={favoritosContagem}
                  onClickPrompt={exibirPrevia}
                />
                
                {/* Paginação */}
                {totalPrompts > promptsPorPagina && (
                  <div className="flex justify-center mt-8">
                    <div className="flex space-x-2">
                      {Array.from({ length: Math.ceil(totalPrompts / promptsPorPagina) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPaginaAtual(i + 1)}
                          className={`w-10 h-10 rounded-md flex items-center justify-center ${
                            paginaAtual === i + 1
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        
        {/* Preview Modal */}
        {promptSelecionado && (
          <PromptPreview
            prompt={promptSelecionado}
            onClose={fecharPrevia}
            isFavorito={favoritos.includes(promptSelecionado.id)}
            onToggleFavorito={() => handleToggleFavorito(promptSelecionado.id)}
            favoritosContagem={favoritosContagem[promptSelecionado.id] || 0}
          />
        )}
      </div>
    </AuthGuard>
  );
}