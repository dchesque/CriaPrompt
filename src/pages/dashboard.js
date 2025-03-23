import { PlusCircle, Brain, TrendingUp, Share2, Sparkles, Layers, Star, Calendar, Users, Eye, Heart, MessageCircle, Bell, LineChart, Award, BarChart2, History, Clock } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabaseClient"
import { Button } from "../components/ui/button"
import DashboardLayout from "../components/layouts/DashboardLayout"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { toast } from "react-toastify"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs"
import { Progress } from "../components/ui/progress"
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar"

// Dados mockados para quando o banco de dados não retornar informações
const MOCK_DATA = {
  userData: {
    nome: "Usuário",
    username: "user123",
    prompts_count: 5
  },
  trendingPrompts: [
    {
      id: 1,
      titulo: "Assistente de Escrita para Artigos",
      descricao: "Auxilia na criação de artigos bem estruturados e persuasivos",
      categoria: "escrita",
      views: 245,
      created_at: new Date(Date.now() - 3600000).toISOString() // 1 hora atrás
    },
    {
      id: 2,
      titulo: "Gerador de Emails Profissionais",
      descricao: "Cria emails formais para comunicação empresarial",
      categoria: "negócios",
      views: 198,
      created_at: new Date(Date.now() - 7200000).toISOString() // 2 horas atrás
    },
    {
      id: 3,
      titulo: "Análise de Dados Simplificada",
      descricao: "Interpreta datasets complexos e gera insights",
      categoria: "dados",
      views: 176,
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
    },
    {
      id: 4,
      titulo: "Ideias para Conteúdo de Redes Sociais",
      descricao: "Sugestões de posts e estratégias para redes sociais",
      categoria: "marketing",
      views: 154,
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 dias atrás
    }
  ],
  sharedPrompts: [
    {
      id: 5,
      titulo: "Conversor de Linguagem Técnica para Leigos",
      descricao: "Traduz termos técnicos para linguagem acessível",
      categoria: "educação",
      compartilhamentos: 32
    },
    {
      id: 6,
      titulo: "Assistente de Brainstorming",
      descricao: "Gera ideias criativas para projetos e soluções",
      categoria: "criativo",
      compartilhamentos: 28
    },
    {
      id: 7,
      titulo: "Resumidor de Livros e Artigos",
      descricao: "Cria resumos concisos mantendo os pontos principais",
      categoria: "educação",
      compartilhamentos: 21
    }
  ],
  recommendedModels: [
    {
      id: 8,
      titulo: "GPT-4 Turbo para Análises Avançadas",
      descricao: "Ideal para processamento complexo e análises aprofundadas",
      tags: ["análise", "avançado", "empresarial"]
    },
    {
      id: 9,
      titulo: "Claude 3 para Conteúdo Criativo",
      descricao: "Especializado em geração de textos criativos e persuasivos",
      tags: ["criatividade", "redação", "marketing"]
    },
    {
      id: 10,
      titulo: "Midjourney para Descrições Visuais",
      descricao: "Otimizado para criar prompts que geram imagens detalhadas",
      tags: ["visual", "imagens", "design"]
    }
  ],
  topCategories: [
    { categoria: "Marketing", acessos: 583, salvos: 245 },
    { categoria: "Educação", acessos: 472, salvos: 198 },
    { categoria: "Criativo", acessos: 367, salvos: 154 },
    { categoria: "Programação", acessos: 312, salvos: 132 },
    { categoria: "Negócios", acessos: 289, salvos: 109 }
  ]
}

export default function Dashboard() {
  const [userData, setUserData] = useState(null)
  const [userPrompts, setUserPrompts] = useState([])
  const [userModels, setUserModels] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({
    total_views: 0,
    total_likes: 0,
    total_shares: 0,
    total_comments: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    carregarDados();
  }, []);

  const obterSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

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

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar sessão do usuário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Erro na sessão: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error("Usuário não autenticado");
      }
      
      // Buscar dados do perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.warn('Erro ao buscar perfil:', profileError);
        // Usar dados mockados como fallback
        setUserData({
          nome: "Usuário",
          username: "user123",
          prompts_count: 0,
          models_count: 0
        });
      } else {
        setUserData(profileData);
      }
      
      // Buscar prompts do usuário
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('id, titulo, descricao, categoria, views, likes, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (promptsError) {
        console.warn('Erro ao buscar prompts do usuário:', promptsError);
      } else {
        setUserPrompts(promptsData || []);
      }
      
      // Buscar modelos do usuário
      const { data: modelsData, error: modelsError } = await supabase
        .from('modelos')
        .select('id, nome, descricao, views, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (modelsError) {
        console.warn('Erro ao buscar modelos do usuário:', modelsError);
      } else {
        setUserModels(modelsData || []);
      }
      
      // Buscar atividade recente (likes, comentários, compartilhamentos)
      const { data: activityData, error: activityError } = await supabase
        .from('activity')
        .select('id, prompt_id, user_id, action_type, created_at, profiles(nome, username, avatar_url)')
        .eq('target_user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activityError) {
        console.warn('Erro ao buscar atividade recente:', activityError);
      } else {
        setRecentActivity(activityData || []);
      }
      
      // Buscar notificações do usuário
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (notificationsError) {
        console.warn('Erro ao buscar notificações:', notificationsError);
      } else {
        setNotifications(notificationsData || []);
      }
      
      // Buscar estatísticas do usuário
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_stats', { user_id: session.user.id });
      
      if (statsError) {
        console.warn('Erro ao buscar estatísticas:', statsError);
      } else {
        setStats(statsData || {
          total_views: 0,
          total_likes: 0,
          total_shares: 0,
          total_comments: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderActivityIcon = (actionType) => {
    switch (actionType) {
      case 'like':
        return <Heart className="h-5 w-5 text-rose-400" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'share':
        return <Share2 className="h-5 w-5 text-green-400" />;
      case 'view':
        return <Eye className="h-5 w-5 text-indigo-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  const renderActivityText = (activity) => {
    const userName = activity.profiles?.nome || activity.profiles?.username || 'Alguém';
    
    switch (activity.action_type) {
      case 'like':
        return <span><span className="font-medium">{userName}</span> curtiu seu prompt</span>;
      case 'comment':
        return <span><span className="font-medium">{userName}</span> comentou em seu prompt</span>;
      case 'share':
        return <span><span className="font-medium">{userName}</span> compartilhou seu prompt</span>;
      case 'view':
        return <span><span className="font-medium">{userName}</span> visualizou seu prompt</span>;
      default:
        return <span><span className="font-medium">{userName}</span> interagiu com seu conteúdo</span>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Carregando seu dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center space-y-4">
            <div className="bg-red-500/10 p-3 rounded-full mx-auto w-fit">
              <Bell className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold">Erro ao carregar dados</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={carregarDados}>Tentar novamente</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho com saudação */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            {obterSaudacao()}, {userData?.nome || 'Usuário'}!
          </h1>
          <p className="text-muted-foreground">
            Confira seu desempenho e interações recentes na plataforma
          </p>
        </div>
        
        {/* Estatísticas do Usuário */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border-indigo-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Visualizações</p>
                  <h3 className="text-2xl font-bold">{stats.total_views || 0}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <Progress value={65} className="h-1 mt-4 bg-indigo-500/20" indicatorClassName="bg-indigo-500" />
              <p className="text-xs text-muted-foreground mt-2">+12% em relação à semana passada</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Curtidas</p>
                  <h3 className="text-2xl font-bold">{stats.total_likes || 0}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-rose-400" />
                </div>
              </div>
              <Progress value={42} className="h-1 mt-4 bg-rose-500/20" indicatorClassName="bg-rose-500" />
              <p className="text-xs text-muted-foreground mt-2">+8% em relação à semana passada</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Compartilhamentos</p>
                  <h3 className="text-2xl font-bold">{stats.total_shares || 0}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Share2 className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <Progress value={28} className="h-1 mt-4 bg-green-500/20" indicatorClassName="bg-green-500" />
              <p className="text-xs text-muted-foreground mt-2">+5% em relação à semana passada</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Comentários</p>
                  <h3 className="text-2xl font-bold">{stats.total_comments || 0}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <Progress value={18} className="h-1 mt-4 bg-blue-500/20" indicatorClassName="bg-blue-500" />
              <p className="text-xs text-muted-foreground mt-2">+2% em relação à semana passada</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Atividade Recente + Estatísticas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Atividade Recente */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-5 w-5 text-primary" />
                    Atividade Recente
                  </CardTitle>
                  
                  <Link href="/atividades" className="text-sm text-primary hover:underline">
                    Ver todas
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {renderActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>{renderActivityText(activity)}</div>
                            <span className="text-xs text-muted-foreground">
                              {formatarDataRelativa(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Nenhuma atividade recente para mostrar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compartilhe seus prompts para começar a receber interações
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Seus Prompts */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-primary" />
                    Seus Prompts
                  </CardTitle>
                  
                  <Link href="/meus-prompts" className="text-sm text-primary hover:underline">
                    Ver todos
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {userPrompts.length > 0 ? (
                  <div className="space-y-3">
                    {userPrompts.map((prompt, index) => (
                      <Link 
                        key={index} 
                        href={`/prompts/${prompt.id}`}
                        className="flex justify-between items-center p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="overflow-hidden">
                          <h4 className="font-medium truncate">{prompt.titulo}</h4>
                          <p className="text-xs text-muted-foreground truncate">{prompt.descricao}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{prompt.views || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{prompt.likes || 0}</span>
                          </div>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                            {prompt.categoria || "Geral"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Você ainda não criou nenhum prompt</p>
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push('/criar')}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar meu primeiro prompt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Seus Modelos */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-primary" />
                    Seus Modelos
                  </CardTitle>
                  
                  <Link href="/meus-modelos" className="text-sm text-primary hover:underline">
                    Ver todos
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {userModels.length > 0 ? (
                  <div className="space-y-3">
                    {userModels.map((model, index) => (
                      <Link 
                        key={index} 
                        href={`/modelos/${model.id}`}
                        className="flex justify-between items-center p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="overflow-hidden">
                          <h4 className="font-medium truncate">{model.nome}</h4>
                          <p className="text-xs text-muted-foreground truncate">{model.descricao}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{model.views || 0}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Você ainda não criou nenhum modelo</p>
                    <Button 
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push('/modelos/criar')}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Criar meu primeiro modelo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Coluna 2: Notificações, Estatísticas, Dicas */}
          <div className="space-y-6">
            {/* Notificações */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5 text-primary" />
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            notification.type === 'success' ? 'bg-green-500/10 text-green-500' :
                            notification.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                            notification.type === 'error' ? 'bg-red-500/10 text-red-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {notification.type === 'success' ? <Award className="h-4 w-4" /> :
                             notification.type === 'warning' ? <Bell className="h-4 w-4" /> :
                             notification.type === 'error' ? <Bell className="h-4 w-4" /> :
                             <Bell className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm">{notification.message}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatarDataRelativa(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm">Nenhuma notificação no momento</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full">
                  Ver todas as notificações
                </Button>
              </CardFooter>
            </Card>
            
            {/* Desempenho */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <LineChart className="mr-2 h-5 w-5 text-primary" />
                  Seu Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Visualizações</span>
                      <span className="font-medium">{stats.total_views || 0}</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Curtidas</span>
                      <span className="font-medium">{stats.total_likes || 0}</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Comentários</span>
                      <span className="font-medium">{stats.total_comments || 0}</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Compartilhamentos</span>
                      <span className="font-medium">{stats.total_shares || 0}</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2 text-xs text-muted-foreground">
                Estatísticas baseadas nos últimos 30 dias
              </CardFooter>
            </Card>
            
            {/* Dica do Dia */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium">Dica do Dia</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione tags relevantes aos seus prompts para aumentar sua visibilidade nas buscas e alcançar mais pessoas.
                  </p>
                  <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                    Mais dicas
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Botões de Ação Rápida */}
            <div className="grid grid-cols-2 gap-4">
              <Button className="flex flex-col h-auto py-4">
                <PlusCircle className="h-5 w-5 mb-1" />
                <span>Novo Prompt</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4">
                <Brain className="h-5 w-5 mb-1" />
                <span>Novo Modelo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}