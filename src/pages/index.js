import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import AppHeader from '../components/AppHeader';
import { 
  ArrowRight, 
  Brain, 
  CheckCircle2, 
  Code, 
  Database, 
  LucideSparkles, 
  MessageSquare, 
  Rocket, 
  User, 
  Users, 
  Zap 
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { BarChart, LineChart, Award, TrendingUp, FileText, Eye, ThumbsUp, ChevronRight, Clock } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalModelos: 0,
    totalUsuarios: 0,
    promptsHoje: 0,
    modelosHoje: 0
  });
  const [trendingPrompts, setTrendingPrompts] = useState([]);
  const [trendingModelos, setTrendingModelos] = useState([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);
  
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Se estiver logado, redirecionar para a página descobrir
        router.push('/descobrir');
      } else {
        // Se não estiver logado, redirecionar para login
        router.push('/auth/login');
      }
    };
    
    checkSession();
  }, [router]);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirecionar para login se não estiver logado
        window.location.href = '/auth/login';
        return;
      }
      
      // Obter estatísticas
      // Total de prompts
      const { count: totalPrompts } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true });
      
      // Total de modelos
      const { count: totalModelos } = await supabase
        .from('modelos')
        .select('*', { count: 'exact', head: true });
      
      // Total de usuários
      const { count: totalUsuarios } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Obter data atual (início do dia)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // Prompts criados hoje
      const { count: promptsHoje } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje.toISOString());
      
      // Modelos criados hoje
      const { count: modelosHoje } = await supabase
        .from('modelos')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hoje.toISOString());
      
      setStats({
        totalPrompts: totalPrompts || 0,
        totalModelos: totalModelos || 0,
        totalUsuarios: totalUsuarios || 0,
        promptsHoje: promptsHoje || 0,
        modelosHoje: modelosHoje || 0
      });
      
      // Prompts em tendência (mais visualizações/curtidas)
      const { data: trendings } = await supabase
        .from('prompts')
        .select('id, titulo, views, likes, categorias(nome), profiles(username, avatar_url)')
        .order('views', { ascending: false })
        .limit(5);
      
      if (trendings) {
        setTrendingPrompts(trendings);
      }
      
      // Modelos em tendência
      const { data: trendingMods } = await supabase
        .from('modelos')
        .select('id, nome, views, likes, downloads, tipos_modelo(nome), profiles(username, avatar_url)')
        .order('views', { ascending: false })
        .limit(5);
      
      if (trendingMods) {
        setTrendingModelos(trendingMods);
      }
      
      // Atividades recentes (últimos prompts/modelos criados)
      const atividadesArray = [];
      
      // Últimos prompts
      const { data: ultimosPrompts } = await supabase
        .from('prompts')
        .select('id, titulo, created_at, profiles(username), tipo:texto')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ultimosPrompts) {
        ultimosPrompts.forEach(prompt => {
          atividadesArray.push({
            ...prompt,
            tipo: 'prompt'
          });
        });
      }
      
      // Últimos modelos
      const { data: ultimosModelos } = await supabase
        .from('modelos')
        .select('id, nome, created_at, profiles(username), tipo:texto')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ultimosModelos) {
        ultimosModelos.forEach(modelo => {
          atividadesArray.push({
            ...modelo,
            tipo: 'modelo'
          });
        });
      }
      
      // Ordenar por data
      atividadesArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAtividadesRecentes(atividadesArray.slice(0, 5));
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };
  
  // Função para calcular tempo relativo (ex: "há 2 horas")
  const tempoRelativo = (dataString) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diff = Math.floor((agora - data) / 1000); // diferença em segundos
    
    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} minutos`;
    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} horas`;
    if (diff < 2592000) return `Há ${Math.floor(diff / 86400)} dias`;
    if (diff < 31536000) return `Há ${Math.floor(diff / 2592000)} meses`;
    return `Há ${Math.floor(diff / 31536000)} anos`;
  };
  
  return (
    <DashboardLayout title="Dashboard">
      <Head>
        <title>Dashboard | CriaPrompt</title>
      </Head>
      
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao CriaPrompt, sua plataforma para criação e compartilhamento de prompts e modelos inteligentes
          </p>
        </div>
        
        {/* Cards de estatísticas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-sm">Total de Prompts</p>
                  <h3 className="text-3xl font-bold mt-1">{formatNumber(stats.totalPrompts)}</h3>
                  <p className="text-xs text-green-500 mt-1">+{stats.promptsHoje} hoje</p>
                </div>
                <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-sm">Total de Modelos</p>
                  <h3 className="text-3xl font-bold mt-1">{formatNumber(stats.totalModelos)}</h3>
                  <p className="text-xs text-green-500 mt-1">+{stats.modelosHoje} hoje</p>
                </div>
                <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-sm">Usuários</p>
                  <h3 className="text-3xl font-bold mt-1">{formatNumber(stats.totalUsuarios)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Comunidade crescendo</p>
                </div>
                <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-sm">Tendências</p>
                  <h3 className="text-3xl font-bold mt-1">{trendingPrompts.length + trendingModelos.length}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Em alta agora</p>
                </div>
                <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gráficos e tendências */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Gráfico de crescimento (mockup) */}
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart size={18} className="text-primary" />
                Crescimento da Plataforma
              </CardTitle>
              <CardDescription>
                Visualização dos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[2/1] rounded-md flex justify-center bg-white/5 border border-white/10">
                {loading ? (
                  <p className="text-muted-foreground text-center py-12">Carregando dados...</p>
                ) : (
                  <div className="w-full h-full p-4">
                    {/* Mockup de gráfico */}
                    <div className="absolute bottom-4 left-4 right-4 top-4 flex flex-col">
                      <div className="flex-1 flex items-end pb-6">
                        <div className="w-full flex items-end justify-between gap-1">
                          {/* Barras do gráfico (representação) */}
                          {Array(15).fill(0).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-full bg-gradient-to-t from-purple-500/70 to-blue-500/70 rounded-t-sm"
                              style={{ height: `${20 + Math.random() * 60}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="h-6 flex justify-between">
                        <span className="text-xs text-muted-foreground">01/07</span>
                        <span className="text-xs text-muted-foreground">15/07</span>
                        <span className="text-xs text-muted-foreground">Hoje</span>
                      </div>
                    </div>
                    
                    {/* Indicadores */}
                    <div className="absolute top-3 right-3 flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500/70"></div>
                        <span className="text-xs text-muted-foreground">Prompts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/70"></div>
                        <span className="text-xs text-muted-foreground">Modelos</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Atividades recentes */}
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20 md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart size={18} className="text-primary" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                    <p className="ml-3 text-muted-foreground">Carregando...</p>
                  </div>
                ) : atividadesRecentes.length > 0 ? (
                  atividadesRecentes.map((atividade, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-full ${atividade.tipo === 'prompt' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                        {atividade.tipo === 'prompt' ? (
                          <FileText size={14} className="text-purple-500" />
                        ) : (
                          <Zap size={14} className="text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {atividade.profiles?.username || 'Usuário'} criou {atividade.tipo === 'prompt' ? 'um prompt' : 'um modelo'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {atividade.tipo === 'prompt' ? atividade.titulo : atividade.nome}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock size={10} className="inline mr-1" />
                          {tempoRelativo(atividade.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade recente.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tendências */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Prompts em tendência */}
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={18} className="text-primary" />
                Prompts em Tendência
              </CardTitle>
              <CardDescription>
                Os prompts mais populares na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                  <p className="ml-3 text-muted-foreground">Carregando tendências...</p>
                </div>
              ) : trendingPrompts.length > 0 ? (
                <div className="space-y-4">
                  {trendingPrompts.map((prompt, index) => (
                    <div key={index} className="p-3 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[150px] md:max-w-[200px]">
                              {prompt.titulo || 'Sem título'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              por {prompt.profiles?.username || 'Anônimo'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye size={12} className="text-muted-foreground" />
                            <span className="text-xs">{prompt.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp size={12} className="text-muted-foreground" />
                            <span className="text-xs">{prompt.likes || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Link 
                    href="/prompts" 
                    className="text-primary text-sm flex items-center justify-center gap-1 mt-2 hover:underline"
                  >
                    Ver todos os prompts
                    <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  Nenhum prompt em tendência no momento.
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Modelos em tendência */}
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={18} className="text-primary" />
                Modelos em Tendência
              </CardTitle>
              <CardDescription>
                Os modelos mais populares na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                  <p className="ml-3 text-muted-foreground">Carregando tendências...</p>
                </div>
              ) : trendingModelos.length > 0 ? (
                <div className="space-y-4">
                  {trendingModelos.map((modelo, index) => (
                    <div key={index} className="p-3 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[150px] md:max-w-[200px]">
                              {modelo.nome || 'Sem nome'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              por {modelo.profiles?.username || 'Anônimo'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Eye size={12} className="text-muted-foreground" />
                            <span className="text-xs">{modelo.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp size={12} className="text-muted-foreground" />
                            <span className="text-xs">{modelo.likes || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Link 
                    href="/modelos" 
                    className="text-primary text-sm flex items-center justify-center gap-1 mt-2 hover:underline"
                  >
                    Ver todos os modelos
                    <ChevronRight size={14} />
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  Nenhum modelo em tendência no momento.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Ações rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/meus-prompts">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/5 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-medium">Meus Prompts</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie seus prompts e veja suas métricas
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/meus-modelos">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/5 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Meus Modelos</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie seus modelos inteligentes
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/prompts">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/5 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
                    <FileText className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-medium">Biblioteca de Prompts</h3>
                  <p className="text-sm text-muted-foreground">
                    Encontre e use prompts da comunidade
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/modelos">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/5 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-medium">Biblioteca de Modelos</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore modelos inteligentes
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}