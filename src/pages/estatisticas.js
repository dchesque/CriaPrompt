import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SidebarNav } from '../components/SidebarNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Sparkles, Eye, Heart, Calendar, Hash, Clock, ListTodo } from 'lucide-react';

export default function Estatisticas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalPrompts: 0,
    totalViews: 0,
    totalFavoritos: 0,
    promptsPorCategoria: [],
    promptsPorMes: [],
    topTags: [],
    promptsRecentes: []
  });

  useEffect(() => {
    const fetchEstatisticas = async () => {
      try {
        setLoading(true);
        
        // Buscar estatísticas gerais
        const { data: { count: totalUsuarios } } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
          
        const { data: { count: totalPrompts } } = await supabase
          .from('prompts')
          .select('*', { count: 'exact', head: true });
          
        const { data: prompts } = await supabase
          .from('prompts')
          .select('views');
          
        const totalViews = prompts?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
        
        const { data: { count: totalFavoritos } } = await supabase
          .from('favoritos')
          .select('*', { count: 'exact', head: true });
          
        // Buscar prompts por categoria
        const { data: promptsPorCategoriaData } = await supabase
          .from('prompts')
          .select('categoria, count')
          .group('categoria');
          
        const promptsPorCategoria = promptsPorCategoriaData?.map(item => ({
          name: item.categoria || 'Sem categoria',
          value: item.count
        })) || [];
        
        // Buscar prompts por mês (últimos 6 meses)
        const dataAtual = new Date();
        const ultimosMeses = [];
        
        for (let i = 5; i >= 0; i--) {
          const data = new Date(dataAtual);
          data.setMonth(dataAtual.getMonth() - i);
          const mes = data.toLocaleString('pt-BR', { month: 'short' });
          const ano = data.getFullYear();
          ultimosMeses.push({
            nome: `${mes}/${ano}`,
            inicio: new Date(data.getFullYear(), data.getMonth(), 1).toISOString(),
            fim: new Date(data.getFullYear(), data.getMonth() + 1, 0).toISOString()
          });
        }
        
        const promptsPorMes = await Promise.all(
          ultimosMeses.map(async (mes) => {
            const { data: { count } } = await supabase
              .from('prompts')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', mes.inicio)
              .lte('created_at', mes.fim);
              
            return {
              name: mes.nome,
              prompts: count || 0
            };
          })
        );
        
        // Buscar top tags
        const { data: prompsWithTags } = await supabase
          .from('prompts')
          .select('tags');
          
        const tagsCount = {};
        
        prompsWithTags?.forEach(prompt => {
          if (Array.isArray(prompt.tags)) {
            prompt.tags.forEach(tag => {
              tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
          }
        });
        
        const topTags = Object.entries(tagsCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
          
        // Buscar prompts recentes
        const { data: promptsRecentes } = await supabase
          .from('prompts')
          .select('id, titulo, views, created_at')
          .eq('publico', true)
          .order('created_at', { ascending: false })
          .limit(5);
          
        setStats({
          totalUsuarios,
          totalPrompts,
          totalViews,
          totalFavoritos,
          promptsPorCategoria,
          promptsPorMes,
          topTags,
          promptsRecentes: promptsRecentes || []
        });
        
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        toast.error('Erro ao carregar estatísticas. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEstatisticas();
  }, []);

  // Cores para o gráfico de pizza
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        <SidebarNav />
        <main className="flex-1 p-6 md:p-8 relative z-10">
          <div className="flex items-center justify-center h-[80vh]">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando estatísticas...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
      <Head>
        <title>Estatísticas | CriaPrompt</title>
        <meta name="description" content="Estatísticas da plataforma CriaPrompt" />
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
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium tracking-tight">Estatísticas da Plataforma</h1>
          </div>
          
          {/* Cards de estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="mb-2 p-3 rounded-full bg-indigo-500/20">
                  <Users className="w-6 h-6 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold">{stats.totalUsuarios}</h2>
                <p className="text-muted-foreground">Usuários</p>
              </CardContent>
            </Card>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="mb-2 p-3 rounded-full bg-purple-500/20">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold">{stats.totalPrompts}</h2>
                <p className="text-muted-foreground">Prompts</p>
              </CardContent>
            </Card>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="mb-2 p-3 rounded-full bg-blue-500/20">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">{stats.totalViews}</h2>
                <p className="text-muted-foreground">Visualizações</p>
              </CardContent>
            </Card>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="mb-2 p-3 rounded-full bg-pink-500/20">
                  <Heart className="w-6 h-6 text-pink-500" />
                </div>
                <h2 className="text-2xl font-bold">{stats.totalFavoritos}</h2>
                <p className="text-muted-foreground">Favoritos</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle>Prompts por Mês</CardTitle>
                <CardDescription>Total de prompts criados nos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.promptsPorMes}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" style={{ fontSize: '0.8rem' }} />
                      <YAxis style={{ fontSize: '0.8rem' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="prompts" name="Prompts Criados" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Porcentagem de prompts por categoria</CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.promptsPorCategoria}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {stats.promptsPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(24, 24, 27, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Top tags e prompts recentes */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" /> Tags Mais Populares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {stats.topTags.map((tag, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span className="font-medium">#{tag.name}</span>
                      <span className="text-sm bg-primary/20 rounded-full px-2.5 py-0.5">
                        {tag.value} prompts
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Prompts Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {stats.promptsRecentes.map((prompt, index) => (
                    <li key={index} className="flex justify-between items-start border-b border-white/10 pb-2 last:border-0">
                      <div>
                        <p className="font-medium hover:text-primary cursor-pointer" onClick={() => router.push(`/prompts/${prompt.id}`)}>
                          {prompt.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(prompt.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-xs">{prompt.views}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}