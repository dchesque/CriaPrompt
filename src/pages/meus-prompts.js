import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import DashboardLayout from '../components/layouts/DashboardLayout';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'react-toastify';
import { BarChart3, BarChart2, Eye, Share2, ThumbsUp, Clock, FileText, Plus, Pencil, Trash, Copy, AlertCircle, PlusCircle, Settings, EyeOff, Loader2, RefreshCw, MoreVertical, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PromptModal from '../components/PromptModal';
import AuthGuard from '../components/AuthGuard';
import { ToastContainer } from 'react-toastify';
import { Badge } from '../components/ui/badge';
import { Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

export default function MeusPrompts() {
  const router = useRouter();
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    publicos: 0,
    privados: 0
  });

  useEffect(() => {
    carregarPrompts();
  }, []);

  const carregarPrompts = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para visualizar seus prompts');
        setIsLoading(false);
        return;
      }

      // Buscar prompts com informações de categoria e subcategoria
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          *,
          categorias (
            id,
            nome
          ),
          subcategorias (
            id, 
            nome,
            categoria_id
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar dados para exibição
      const promptsProcessados = data.map(prompt => {
        return {
          ...prompt,
          categoria_nome: prompt.categorias ? prompt.categorias.nome : 'Sem categoria',
          subcategoria_nome: prompt.subcategorias ? prompt.subcategorias.nome : null
        };
      });

      setPrompts(promptsProcessados);
      
      // Atualizar estatísticas
      const total = promptsProcessados.length;
      const publicos = promptsProcessados.filter(p => p.publico).length;
      const privados = total - publicos;
      
      setEstatisticas({
        total,
        publicos,
        privados
      });
    } catch (error) {
      console.error('Erro ao carregar prompts:', error);
      toast.error('Erro ao carregar os prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const excluirPrompt = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este prompt?')) return;
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setPrompts(prompts.filter(p => p.id !== id));
      toast.success('Prompt excluído com sucesso');
      
      // Atualizar estatísticas
      const novoTotal = estatisticas.total - 1;
      const excluido = prompts.find(p => p.id === id);
      const novoPublicos = excluido.publico ? estatisticas.publicos - 1 : estatisticas.publicos;
      const novoPrivados = excluido.publico ? estatisticas.privados : estatisticas.privados - 1;
      
      setEstatisticas({
        total: novoTotal,
        publicos: novoPublicos,
        privados: novoPrivados
      });
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir o prompt');
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <Head>
          <title>Meus Prompts | CriaPrompt</title>
          <meta name="description" content="Gerencie seus prompts personalizados" />
        </Head>
        
        <ToastContainer theme="dark" position="top-right" />
        
        <div className="max-w-7xl mx-auto pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Meus Prompts</h1>
              <p className="text-muted-foreground">
                Gerencie todos os seus prompts personalizados
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => carregarPrompts()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </Button>
              
              <Button 
                onClick={() => router.push('/criar')}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Criar Novo Prompt</span>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Prompts
                </CardTitle>
                <div className="rounded-full bg-primary/10 p-1">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.total}</div>
                <p className="text-xs text-muted-foreground">
                  {estatisticas.total === 0 
                    ? "Você ainda não criou nenhum prompt"
                    : "Prompts criados por você"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Prompts Públicos
                </CardTitle>
                <div className="rounded-full bg-green-500/10 p-1">
                  <Eye className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.publicos}</div>
                <p className="text-xs text-muted-foreground">
                  {`${Math.round((estatisticas.publicos / (estatisticas.total || 1)) * 100)}% do total`}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Prompts Privados
                </CardTitle>
                <div className="rounded-full bg-yellow-500/10 p-1">
                  <EyeOff className="h-4 w-4 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.privados}</div>
                <p className="text-xs text-muted-foreground">
                  {`${Math.round((estatisticas.privados / (estatisticas.total || 1)) * 100)}% do total`}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : prompts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden border border-border/40">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-semibold text-lg line-clamp-1" title={prompt.titulo}>
                        {prompt.titulo}
                      </CardTitle>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Opções</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/prompts/${prompt.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/prompts/${prompt.id}/editar`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => excluirPrompt(prompt.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      {prompt.publico ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <Eye className="h-3 w-3 mr-1" />
                          Público
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Privado
                        </Badge>
                      )}
                      
                      {prompt.categoria_nome && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {prompt.categoria_nome}
                          {prompt.subcategoria_nome && `: ${prompt.subcategoria_nome}`}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10" title={prompt.descricao || "Sem descrição"}>
                      {prompt.descricao || "Sem descrição"}
                    </p>
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex justify-between items-center">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {new Date(prompt.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/prompts/${prompt.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-600/30">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <PlusCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Nenhum prompt encontrado</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Você ainda não criou nenhum prompt. Crie seu primeiro prompt e comece a aproveitar o poder da IA.
                </p>
                <Button 
                  onClick={() => router.push('/criar')}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Criar Meu Primeiro Prompt</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
} 