import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Filter, Clock, ArrowUpDown, Zap, Brain, Eye, FileText, PlusCircle, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';

export default function ExplorarModelos() {
  const router = useRouter();
  const { q: queryParam, categoria: categoriaParam, ordenacao: ordenacaoParam } = router.query;
  
  // Estados
  const [session, setSession] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [favoritos, setFavoritos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalModelos, setTotalModelos] = useState(0);
  const [userId, setUserId] = useState(null);
  const [modeloSelecionado, setModeloSelecionado] = useState(null);
  const [favoritosContagem, setFavoritosContagem] = useState({});
  const modelosPorPagina = 12;

  // Efeito para carregar dados iniciais
  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
    }
    
    if (categoriaParam) {
      setCategoriaFiltro(categoriaParam);
    }
    
    if (ordenacaoParam) {
      setOrdenacao(ordenacaoParam);
    }
    
    carregarDados();
  }, [router.query]);

  // Função para exibir detalhes do modelo
  const exibirDetalhes = (modelo) => {
    router.push(`/modelos/${modelo.id}`);
  };

  const carregarDados = async (categoria = categoriaFiltro, termo = searchQuery) => {
    try {
      setLoading(true);
      
      // Verificar sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setUserId(currentUserId);
      setSession(session);

      // Construir consulta com filtros
      let query = supabase
        .from('modelos')
        .select(`
          id,
          nome,
          descricao,
          categoria,
          created_at,
          estrutura_prompt,
          campos_variaveis,
          user_id,
          publico,
          perfis(nome, username, avatar_url)
        `)
        .eq('publico', true);

      if (categoria && categoria !== 'todas') {
        query = query.eq('categoria', categoria);
      }

      if (termo) {
        query = query.or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%`);
      }
      
      // Ordenar conforme selecionado
      if (ordenacao === 'recentes') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('views', { ascending: false });
      }

      const { data: modelosData, error: modelosError, count } = await query;

      if (modelosError) {
        throw modelosError;
      }
      
      setModelos(modelosData || []);
      setTotalModelos(count || 0);

      // Carregar categorias com contagem
      const { data: categoriasData } = await supabase
        .from('modelos')
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
          .from('favoritos_modelos')
          .select('modelo_id')
          .eq('user_id', currentUserId);

        if (!favoritosError) {
          setFavoritos(favoritosData?.map(f => f.modelo_id) || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Ocorreu um erro ao carregar os modelos');
    } finally {
      setLoading(false);
    }
  };

  // Funcionalidades de busca e filtros
  const handleSearch = () => {
    carregarDados(categoriaFiltro, searchQuery);
    
    // Atualizar URL com parâmetros de busca
    router.push({
      pathname: router.pathname,
      query: {
        ...(searchQuery ? { q: searchQuery } : {}),
        ...(categoriaFiltro !== 'todas' ? { categoria: categoriaFiltro } : {}),
        ...(ordenacao !== 'recentes' ? { ordenacao } : {})
      }
    }, undefined, { shallow: true });
  };

  const handleToggleFavorito = async (modeloId) => {
    if (!session) {
      toast.info('Faça login para adicionar aos favoritos');
      return;
    }

    try {
      const isFavorito = favoritos.includes(modeloId);
      
      if (isFavorito) {
        // Remover dos favoritos
        await supabase
          .from('favoritos_modelos')
          .delete()
          .eq('user_id', userId)
          .eq('modelo_id', modeloId);
          
        setFavoritos(favoritos.filter(id => id !== modeloId));
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        await supabase
          .from('favoritos_modelos')
          .insert({ user_id: userId, modelo_id: modeloId });
          
        setFavoritos([...favoritos, modeloId]);
        toast.success('Adicionado aos favoritos');
      }
      
      // Atualizar contagem de favoritos
      const novaContagem = { ...favoritosContagem };
      novaContagem[modeloId] = (novaContagem[modeloId] || 0) + (isFavorito ? -1 : 1);
      setFavoritosContagem(novaContagem);
      
    } catch (error) {
      console.error('Erro ao gerenciar favorito:', error);
      toast.error('Ocorreu um erro ao gerenciar favorito');
    }
  };

  const handleCategoriaChange = (categoria) => {
    setCategoriaFiltro(categoria);
    carregarDados(categoria, searchQuery);
  };

  const handleOrdenacaoChange = (novaOrdenacao) => {
    setOrdenacao(novaOrdenacao);
    carregarDados(categoriaFiltro, searchQuery);
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <Head>
          <title>Explorar Modelos Inteligentes | CriaPrompt</title>
          <meta name="description" content="Explore modelos inteligentes criados pela comunidade" />
        </Head>
        
        <ToastContainer theme="dark" position="top-right" />
        
        <div className="container max-w-7xl mx-auto pb-12 px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Brain className="h-7 w-7 text-purple-500" />
                <span>Explorar Modelos Inteligentes</span>
              </h1>
              <p className="text-muted-foreground">
                Descubra modelos inteligentes criados pela comunidade
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/meus-modelos')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>Meus Modelos</span>
              </Button>
              
              <Button 
                onClick={() => router.push('/modelos/criar')}
                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Criar Novo Modelo</span>
              </Button>
            </div>
          </div>
          
          {/* Barra de Pesquisa e Filtros */}
          <div className="w-full flex flex-col lg:flex-row gap-4 mb-8">
            <div className="flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar modelos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 px-4 py-2 bg-background border border-input rounded-md"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={categoriaFiltro}
                onChange={e => handleCategoriaChange(e.target.value)}
                className="px-4 py-2 bg-background border border-input rounded-md"
              >
                <option value="todas">Todas categorias</option>
                {categorias.map(cat => (
                  <option key={cat.nome} value={cat.nome}>
                    {cat.nome} ({cat.count})
                  </option>
                ))}
              </select>
              
              <select
                value={ordenacao}
                onChange={e => handleOrdenacaoChange(e.target.value)}
                className="px-4 py-2 bg-background border border-input rounded-md"
              >
                <option value="recentes">Mais recentes</option>
                <option value="populares">Mais populares</option>
              </select>
              
              <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
          
          {/* Exibição dos Modelos */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              <span className="ml-2 text-lg">Carregando modelos...</span>
            </div>
          ) : modelos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modelos.map(modelo => (
                <Card key={modelo.id} className="overflow-hidden border border-purple-500/20 hover:border-purple-500/50 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-500/10 p-1 rounded-full">
                          <Brain className="h-4 w-4 text-purple-500" />
                        </div>
                        <CardTitle className="text-xl truncate">{modelo.nome}</CardTitle>
                      </div>
                      <Badge 
                        className="bg-purple-600"
                      >
                        {modelo.categoria || "Geral"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>
                        {new Date(modelo.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                      
                      {modelo.perfis && (
                        <>
                          <span className="mx-1">•</span>
                          <span>por {modelo.perfis.nome || modelo.perfis.username || "Usuário"}</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {modelo.descricao || "Sem descrição"}
                    </p>
                    
                    {modelo.campos_variaveis && modelo.campos_variaveis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-purple-300">
                          {modelo.campos_variaveis.length} {modelo.campos_variaveis.length === 1 ? 'campo variável' : 'campos variáveis'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-between items-center pt-2 pb-3">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => exibirDetalhes(modelo)}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/modelos/utilizar/${modelo.id}`)}
                      className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Utilizar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-16 w-16 text-purple-500/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum modelo encontrado</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {searchQuery || categoriaFiltro !== 'todas' ? 
                  'Não encontramos modelos correspondentes aos filtros aplicados.' :
                  'Não há modelos publicados disponíveis para explorar no momento.'
                }
              </p>
              <Button 
                onClick={() => router.push('/modelos/criar')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Novo Modelo
              </Button>
            </div>
          )}
          
          {/* Paginação (quando necessário) */}
          {modelos.length > 0 && totalModelos > modelosPorPagina && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                {Array.from({ length: Math.ceil(totalModelos / modelosPorPagina) }).map((_, index) => (
                  <Button
                    key={index}
                    variant={paginaAtual === index + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaginaAtual(index + 1)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
} 