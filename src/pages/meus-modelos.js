import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import DashboardLayout from '../components/layouts/DashboardLayout';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'react-toastify';
import { PieChart, BarChart2, Eye, Share2, ThumbsUp, Clock, Zap, Plus, Pencil, Trash, Copy, Download, Brain, AlertCircle, PlusCircle, Settings, Clock as ClockIcon, RefreshCw, EyeOff, MoreVertical, Edit } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Badge } from '../components/ui/badge';
import AuthGuard from '../components/AuthGuard';
import { ToastContainer } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

export default function MeusModelos() {
  const router = useRouter();
  const [modelos, setModelos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    publicos: 0,
    privados: 0
  });
  
  useEffect(() => {
    carregarModelos();
  }, []);
  
  const carregarModelos = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para visualizar seus modelos');
        setIsLoading(false);
        return;
      }

      // Buscar modelos com informações de categoria e subcategoria
      const { data, error } = await supabase
        .from('modelos')
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
      const modelosProcessados = data.map(modelo => {
        return {
          ...modelo,
          categoria_nome: modelo.categorias ? modelo.categorias.nome : 'Sem categoria',
          subcategoria_nome: modelo.subcategorias ? modelo.subcategorias.nome : null
        };
      });

      setModelos(modelosProcessados);
      
      // Atualizar estatísticas
      const total = modelosProcessados.length;
      const publicos = modelosProcessados.filter(m => m.publico).length;
      const privados = total - publicos;
      
      setEstatisticas({
        total,
        publicos, 
        privados
      });
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar os modelos');
    } finally {
      setIsLoading(false);
    }
  };
  
  const excluirModelo = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    
    try {
      const { error } = await supabase
        .from('modelos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setModelos(modelos.filter(m => m.id !== id));
      toast.success('Modelo excluído com sucesso');
      
      // Atualizar estatísticas
      const novoTotal = estatisticas.total - 1;
      const excluido = modelos.find(m => m.id === id);
      const novoPublicos = excluido.publico ? estatisticas.publicos - 1 : estatisticas.publicos;
      const novoPrivados = excluido.publico ? estatisticas.privados : estatisticas.privados - 1;
      
      setEstatisticas({
        total: novoTotal,
        publicos: novoPublicos,
        privados: novoPrivados
      });
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Erro ao excluir o modelo');
    }
  };
  
  return (
    <AuthGuard>
      <DashboardLayout>
        <Head>
          <title>Meus Modelos Inteligentes | CriaPrompt</title>
          <meta name="description" content="Gerencie seus modelos inteligentes" />
        </Head>
        
        <ToastContainer theme="dark" position="top-right" />
        
        <div className="max-w-7xl mx-auto pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Meus Modelos Inteligentes</h1>
              <p className="text-muted-foreground">
                Gerencie todos os seus modelos inteligentes para prompts
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => carregarModelos()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Modelos
                </CardTitle>
                <div className="rounded-full bg-purple-500/10 p-1">
                  <Brain className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.total}</div>
                <p className="text-xs text-muted-foreground">
                  {estatisticas.total === 0 
                    ? "Você ainda não criou nenhum modelo"
                    : "Modelos inteligentes criados por você"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Modelos Públicos
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
                  Modelos Privados
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
          ) : modelos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelos.map((modelo) => (
                <Card key={modelo.id} className="overflow-hidden border border-border/40">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-semibold text-lg line-clamp-1" title={modelo.nome}>
                        {modelo.nome}
                      </CardTitle>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Opções</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => router.push(`/modelos/${modelo.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/modelos/${modelo.id}/editar`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => excluirModelo(modelo.id)}>
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      {modelo.publico ? (
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
                      
                      {modelo.categoria_nome && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          {modelo.categoria_nome}
                          {modelo.subcategoria_nome && `: ${modelo.subcategoria_nome}`}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10" title={modelo.descricao || "Sem descrição"}>
                      {modelo.descricao || "Sem descrição"}
                    </p>
                  </CardContent>
                  
                  <CardFooter className="p-4 pt-0 flex justify-between items-center">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {new Date(modelo.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/modelos/${modelo.id}`)}>
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
                <div className="rounded-full bg-purple-500/10 p-3 mb-4">
                  <Brain className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">Nenhum modelo encontrado</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Você ainda não criou nenhum modelo inteligente. Crie seu primeiro modelo e comece a criar prompts padronizados.
                </p>
                <Button 
                  onClick={() => router.push('/modelos/criar')}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Criar Meu Primeiro Modelo</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
} 