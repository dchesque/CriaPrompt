import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Search, Filter, Clock, Eye, ArrowUpDown, 
  Compass, Tag, Globe, TrendingUp, Award,
  Star, Heart, ChevronDown, X, Sparkles, 
  RefreshCw, ArrowRight, Users, PlusCircle
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { cn } from '../lib/utils';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { Brain } from 'lucide-react';
import { Layers } from 'lucide-react';

// Cores para categorias (para manter consistência visual)
const CATEGORY_COLORS = {
  'escrita': 'from-purple-500 to-indigo-500',
  'marketing': 'from-blue-500 to-cyan-500',
  'negócios': 'from-emerald-500 to-green-500',
  'educação': 'from-amber-500 to-yellow-500',
  'criativo': 'from-rose-500 to-pink-500',
  'tecnologia': 'from-indigo-500 to-blue-500',
  'pessoal': 'from-violet-500 to-purple-500',
  'saúde': 'from-cyan-500 to-teal-500',
  'padrão': 'from-slate-500 to-gray-500',
};

const getCategoryColor = (category) => {
  return CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS.padrão;
};

export default function Descobrir() {
  const router = useRouter();
  const { q: queryParam, categoria: categoriaParam } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('tendencias');
  const [promptsDestaque, setPromptsDestaque] = useState([]);
  const [promptsCategoria, setPromptsCategoria] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagsFiltradas, setTagsFiltradas] = useState([]);
  const [paginaCarregando, setPaginaCarregando] = useState(false);
  const [trendingPrompts, setTrendingPrompts] = useState([]);
  const [topModelos, setTopModelos] = useState([]);
  const [topUsuarios, setTopUsuarios] = useState([]);
  const [dailySuggestion, setDailySuggestion] = useState(null);
  const [estatisticas, setEstatisticas] = useState({ total_prompts: 0, total_modelos: 0, total_usuarios: 0 });
  
  const scrollRef = useRef(null);
  const headerRef = useRef(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
    carregarTendencias();
    gerarSugestaoDoDia();
    
    // Configurar parâmetros da URL
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [queryParam, categoriaParam]);

  // Animação de rolagem suave
  const scrollToPrompts = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Gerar sugestão do dia
  const gerarSugestaoDoDia = () => {
    const sugestoes = [
      { 
        titulo: "Resumo de Artigos Científicos", 
        descricao: "Crie resumos concisos de artigos científicos destacando principais descobertas e metodologias.",
        prompt: "Faça um resumo conciso do seguinte artigo científico, destacando: 1) Objetivo principal, 2) Metodologia utilizada, 3) Resultados principais, 4) Conclusões importantes. Limite o resumo a 250 palavras e mantenha uma linguagem clara e objetiva."
      },
      {
        titulo: "Criação de Posts para Redes Sociais",
        descricao: "Gere posts engajantes para suas redes sociais com CTA eficazes.",
        prompt: "Crie 3 versões de post para [rede social] sobre [tema]. Cada post deve ter: 1) Título chamativo, 2) Corpo do texto de até 150 caracteres, 3) Hashtags relevantes, 4) Call-to-action eficaz. Adapte o tom para ser [profissional/casual/motivacional]."
      },
      {
        titulo: "Plano de Estudos Personalizado",
        descricao: "Organize seu plano de estudos com sessões otimizadas e metas definidas.",
        prompt: "Crie um plano de estudos para [assunto] considerando que tenho [X horas] disponíveis por semana. Inclua: 1) Divisão de tópicos por prioridade, 2) Duração recomendada para cada sessão, 3) Recursos sugeridos, 4) Pequenos objetivos semanais e 5) Como avaliar meu progresso."
      }
    ];
    
    // Seleciona uma sugestão baseada no dia do mês
    const diaDoMes = new Date().getDate();
    const indexSugestao = diaDoMes % sugestoes.length;
    setDailySuggestion(sugestoes[indexSugestao]);
  };
  
  // Formatar data relativa
  const formatarDataRelativa = (dataString) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora - data;
    const diffSeg = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSeg / 60);
    const diffHora = Math.floor(diffMin / 60);
    const diffDia = Math.floor(diffHora / 24);
    
    if (diffSeg < 60) return 'agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffHora < 24) return `${diffHora}h atrás`;
    if (diffDia < 7) return `${diffDia} dias atrás`;
    
    return data.toLocaleDateString('pt-BR');
  };

  // Carregar dados de tendências
  const carregarTendencias = async () => {
    try {
      // Carregar prompts em alta
      const { data: trendingData, error: trendingError } = await supabase
        .from('prompts')
        .select('id, titulo, descricao, categoria, views, created_at')
        .eq('publico', true)
        .order('views', { ascending: false })
        .limit(5);
      
      if (trendingError) throw trendingError;
      setTrendingPrompts(trendingData || []);

      // Carregar modelos top
      const { data: modelosData, error: modelosError } = await supabase
        .from('modelos')
        .select('id, nome, descricao, categoria, created_at')
        .eq('publico', true)
        .order('views', { ascending: false })
        .limit(3);
      
      if (modelosError) throw modelosError;
      setTopModelos(modelosData || []);

      // Carregar usuários mais ativos
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('profiles')
        .select('id, nome, username, avatar_url, bio')
        .order('prompts_count', { ascending: false })
        .limit(5);
      
      if (usuariosError) throw usuariosError;
      setTopUsuarios(usuariosData || []);

      // Carregar estatísticas gerais
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_platform_stats');
      
      if (statsError) throw statsError;
      setEstatisticas(statsData || { total_prompts: 0, total_modelos: 0, total_usuarios: 0 });
    } catch (error) {
      console.error('Erro ao carregar tendências:', error);
    }
  };

  // Função principal para carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar prompts em destaque (top 6 mais vistos)
      const { data: promptsDestaque, error: errorDestaque } = await supabase
        .from('prompts')
        .select('*')
        .eq('publico', true)
        .order('views', { ascending: false })
        .limit(6);
      
      if (errorDestaque) throw errorDestaque;
      setPromptsDestaque(promptsDestaque || []);

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

        const categoriasArray = Object.keys(categoriasCount)
          .filter(nome => nome && nome.trim() !== '')
          .map(nome => ({
            nome,
            count: categoriasCount[nome]
          }))
          .sort((a, b) => b.count - a.count);

        setCategorias(categoriasArray);

        // Carregar prompts por categoria para a primeira categoria
        if (categoriasArray.length > 0) {
          carregarPromptsPorCategoria(categoriasArray[0].nome);
        }
      }

      // Carregar as tags mais populares
      const { data: promptsWithTags } = await supabase
        .from('prompts')
        .select('tags')
        .eq('publico', true);

      if (promptsWithTags) {
        const tagsCount = {};
        promptsWithTags.forEach(prompt => {
          if (Array.isArray(prompt.tags)) {
            prompt.tags.forEach(tag => {
              if (tag) tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
          }
        });

        const tagsArray = Object.keys(tagsCount)
          .map(nome => ({
            nome,
            count: tagsCount[nome]
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 12);  // Top 12 tags

        setTags(tagsArray);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar prompts');
    } finally {
      setLoading(false);
    }
  };

  // Carregar prompts por categoria
  const carregarPromptsPorCategoria = async (categoria) => {
    try {
      setPaginaCarregando(true);
      
      const { data: promptsData, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('publico', true)
        .eq('categoria', categoria)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      setPromptsCategoria(promptsData || []);
    } catch (error) {
      console.error('Erro ao carregar prompts por categoria:', error);
    } finally {
      setPaginaCarregando(false);
    }
  };

  // Preparar prompts por categoria para exibição
  const promptsPorCategoria = categorias.slice(0, 4).map(categoria => {
    const promptsDaCategoria = promptsCategoria.filter(p => p.categoria === categoria.nome);
    return {
      categoria: categoria.nome,
      prompts: promptsDaCategoria
    };
  });

  // Buscar prompts
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    router.push({
      pathname: '/descobrir',
      query: { q: searchQuery }
    });
  };

  // Toggle tag
  const toggleTag = (tag) => {
    if (tagsFiltradas.includes(tag)) {
      setTagsFiltradas(tagsFiltradas.filter(t => t !== tag));
    } else {
      setTagsFiltradas([...tagsFiltradas, tag]);
    }
  };

  return (
    <DashboardLayout title="Descobrir">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <section className="relative">
          {/* Background gradients */}
          <div className="absolute -top-20 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -z-10"></div>
          
          <div className="py-10 text-center px-4 relative" ref={headerRef}>
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
                <Compass size={24} />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Descubra o Universo dos Prompts
            </h1>
            
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              Explore prompts criados pela comunidade, encontre inspiração e melhore seus resultados com IA
            </p>
            
            {/* Barra de busca grande */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative flex items-center">
                <Input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/20 backdrop-blur-md border-white/10 py-6 pl-14 pr-36 rounded-full text-lg shadow-lg focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:ring-opacity-50 placeholder-white/50"
                  placeholder="O que você procura? Ex: resumo de artigo científico..."
                />
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white/50 h-6 w-6" />
                <Button 
                  type="submit" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full py-2 px-6"
                >
                  Buscar
                </Button>
              </div>
            </form>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-10">
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm">Total de Prompts</p>
                    <p className="text-2xl font-bold">{estatisticas.total_prompts || '5,000+'}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm">Modelos Inteligentes</p>
                    <p className="text-2xl font-bold">{estatisticas.total_modelos || '1,200+'}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-1">
                    <p className="text-white/70 text-sm">Comunidade</p>
                    <p className="text-2xl font-bold">{estatisticas.total_usuarios || '8,000+'}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-pink-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Sugestão do Dia */}
        {dailySuggestion && (
          <section className="px-4">
            <Card className="overflow-hidden border border-indigo-500/30 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2 pt-6">
                <div className="flex items-center">
                  <div className="mr-2 rounded-full bg-yellow-500/20 p-1">
                    <Sparkles className="h-5 w-5 text-yellow-400" />
                  </div>
                  <CardTitle className="text-xl font-bold text-white/90">Sugestão do Dia</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-indigo-300">{dailySuggestion.titulo}</h3>
                  <p className="mb-4 text-sm text-white/70">{dailySuggestion.descricao}</p>
                  <div className="rounded-md bg-black/40 p-3 font-mono text-xs text-white/80">
                    {dailySuggestion.prompt}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20">
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copiar Prompt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
        
        {/* Conteúdo principal */}
        <div ref={scrollRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {/* Coluna 1: Prompts em Alta */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-indigo-500/20 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-indigo-400" />
                    <CardTitle>Prompts em Alta</CardTitle>
                  </div>
                  <Button variant="link" className="text-indigo-400 p-0" onClick={() => router.push('/explorar')}>
                    Ver todos
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                {trendingPrompts.map((prompt, index) => (
                  <div key={index} className="grid grid-cols-1 items-start gap-4 rounded-lg border border-indigo-500/20 bg-black/20 p-3 hover:bg-black/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`bg-gradient-to-r ${getCategoryColor(prompt.categoria)} bg-clip-text text-transparent border-transparent px-2 py-0 text-xs`}>
                          {prompt.categoria}
                        </Badge>
                        <div className="flex items-center text-xs text-white/50">
                          <Eye className="mr-1 h-3 w-3" />
                          {prompt.views || 0}
                        </div>
                      </div>
                      <Link href={`/prompts/${prompt.id}`} className="font-medium hover:underline hover:text-indigo-300 transition-colors">
                        {prompt.titulo}
                      </Link>
                      <p className="line-clamp-2 text-xs text-white/70">{prompt.descricao}</p>
                      <div className="flex justify-between items-center text-xs text-white/50">
                        <div>{formatarDataRelativa(prompt.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Prompts por Categoria */}
            <Card className="border-purple-500/20 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Layers className="mr-2 h-5 w-5 text-purple-400" />
                    <CardTitle>Explorar por Categoria</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categorias.slice(0, 8).map((categoria, index) => (
                    <Link 
                      key={index} 
                      href={`/explorar?categoria=${encodeURIComponent(categoria.nome)}`}
                      className="flex items-center justify-between p-3 rounded-md border border-purple-500/20 bg-black/20 hover:bg-black/30 transition-colors"
                    >
                      <span>{categoria.nome}</span>
                      <Badge variant="outline" className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {categoria.count || 0}
                      </Badge>
                    </Link>
                  ))}
                </div>
                <Button 
                  onClick={() => router.push('/explorar')} 
                  variant="outline" 
                  className="w-full mt-4 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                >
                  Ver Todas as Categorias
                </Button>
              </CardContent>
            </Card>
            
            {/* Prompts em Destaque */}
            <section className="space-y-4">
              <div className="flex items-center">
                <Star className="mr-2 h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-semibold">Prompts em Destaque</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {promptsDestaque.slice(0, 4).map((prompt, index) => (
                  <Card key={index} className="overflow-hidden border-white/10 bg-black/30 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className={`bg-gradient-to-r ${getCategoryColor(prompt.categoria)} bg-clip-text text-transparent border-transparent`}>
                          {prompt.categoria}
                        </Badge>
                        <div className="flex items-center text-xs text-white/50">
                          <Eye className="mr-1 h-3 w-3" />
                          {prompt.views || 0}
                        </div>
                      </div>
                      <CardTitle className="line-clamp-1 text-base">{prompt.titulo}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-sm text-white/70">{prompt.descricao}</p>
                    </CardContent>
                    <CardFooter className="pt-0 pb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full border-white/10 hover:bg-white/5"
                        onClick={() => router.push(`/prompts/${prompt.id}`)}
                      >
                        Ver Detalhes
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => scrollToPrompts()} className="text-white/70 hover:text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Carregar Mais
                </Button>
              </div>
            </section>
          </div>
          
          {/* Coluna 2: Sidebar com Modelos e Comunidade */}
          <div className="space-y-6">
            {/* Modelos em Destaque */}
            <Card className="border-emerald-500/20 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-emerald-400" />
                  <CardTitle>Modelos em Destaque</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {topModelos.map((modelo, index) => (
                  <div key={index} className="rounded-lg border border-emerald-500/20 bg-black/20 p-3 space-y-2 hover:bg-black/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                        {modelo.categoria || 'IA'}
                      </Badge>
                      <span className="text-xs text-white/50">{formatarDataRelativa(modelo.created_at)}</span>
                    </div>
                    <Link 
                      href={`/modelos/${modelo.id}`} 
                      className="font-medium hover:underline hover:text-emerald-300 transition-colors"
                    >
                      {modelo.nome}
                    </Link>
                    <p className="line-clamp-2 text-xs text-white/70">{modelo.descricao}</p>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => router.push('/modelos/explorar')}
                >
                  Explorar Todos os Modelos
                </Button>
              </CardContent>
            </Card>
            
            {/* Usuários em Destaque */}
            <Card className="border-blue-500/20 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-blue-400" />
                  <CardTitle>Criadores em Destaque</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topUsuarios.map((usuario, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/20 transition-colors">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-black/20 flex items-center justify-center">
                      {usuario.avatar_url ? (
                        <img src={usuario.avatar_url} alt={usuario.nome} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-blue-400">
                          {usuario.nome?.charAt(0) || usuario.username?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{usuario.nome || usuario.username}</p>
                      <p className="text-xs text-white/50 truncate">{usuario.bio || `@${usuario.username}`}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Tags Populares */}
            <Card className="border-pink-500/20 bg-black/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <Tag className="mr-2 h-5 w-5 text-pink-400" />
                  <CardTitle>Tags Populares</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className={cn(
                        "cursor-pointer border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20",
                        tagsFiltradas.includes(tag.nome) && "bg-pink-500/30"
                      )}
                      onClick={() => toggleTag(tag.nome)}
                    >
                      {tag.nome}
                      {tag.count && <span className="ml-1 text-xs">({tag.count})</span>}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Criar Novo */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    <PlusCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">Compartilhe sua criatividade</h3>
                  <p className="text-sm text-white/70">Crie e compartilhe seus próprios prompts com a comunidade</p>
                  <div className="pt-2 space-y-2">
                    <Button 
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      onClick={() => router.push('/criar')}
                    >
                      Criar Novo Prompt
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-white/10 hover:bg-white/10"
                      onClick={() => router.push('/modelos/criar')}
                    >
                      Criar Novo Modelo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 