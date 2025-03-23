import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { BookOpen, Bookmark, Search, Filter, Grid, List, Plus, ChevronDown, 
  Package, ArrowUpDown, MoreHorizontal, Star, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { cn } from '../lib/utils';

export default function Biblioteca() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recentes');
  
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login?redirect=/biblioteca');
        return;
      }
      
      carregarModelos();
    };
    
    checkSession();
  }, [router]);
  
  const carregarModelos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada');
      }
      
      const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Buscar tipos de modelo separadamente
      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_modelo')
        .select('*');
        
      if (tiposError) {
        console.error('Erro ao carregar tipos de modelo:', tiposError);
      } else {
        // Mapear os tipos aos modelos manualmente
        const modelosComTipos = data.map(modelo => {
          const tipo = tiposData.find(t => t.id === modelo.tipo_id);
          return { ...modelo, tipo };
        });
        
        setModelos(modelosComTipos || []);
      }
      
      // Extrair categorias únicas
      const categoriasUnicas = [...new Set(data.map(m => m.categoria).filter(Boolean))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar sua biblioteca');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar modelos de acordo com termo de busca e categoria
  const modelosFiltrados = modelos.filter(modelo => {
    const matchesSearch = searchTerm === '' || 
      modelo.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = categoriaSelecionada === 'todas' || 
      modelo.categoria === categoriaSelecionada;
      
    return matchesSearch && matchesCategory;
  });
  
  // Ordenar modelos
  const modelosOrdenados = [...modelosFiltrados].sort((a, b) => {
    if (sortBy === 'recentes') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'populares') {
      return (b.uses || 0) - (a.uses || 0);
    } else if (sortBy === 'alfabetica') {
      return a.nome.localeCompare(b.nome);
    }
    return 0;
  });

  if (loading) {
    return (
      <DashboardLayout title="Biblioteca">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando sua biblioteca...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Biblioteca">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Cabeçalho com efeitos visuais */}
        <div className="relative">
          {/* Gradientes de fundo */}
          <div className="absolute -top-10 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <Badge className="mb-2 py-1 px-3 bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                Coleção Pessoal
              </Badge>
              
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">
                Minha Biblioteca
              </h1>
              
              <p className="text-muted-foreground mt-1">
                Gerencie sua coleção pessoal de modelos de IA
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push('/biblioteca/novo')}
                className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Modelo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Barra de ferramentas */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-auto flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar modelos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/20 border-white/10"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-background/20 border-white/10">
                  <Filter className="mr-2 h-4 w-4" />
                  {categoriaSelecionada === 'todas' ? 'Todas as categorias' : categoriaSelecionada}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem onClick={() => setCategoriaSelecionada('todas')}>
                  Todas as categorias
                </DropdownMenuItem>
                {categorias.map((categoria) => (
                  <DropdownMenuItem 
                    key={categoria} 
                    onClick={() => setCategoriaSelecionada(categoria)}
                  >
                    {categoria}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-background/20 border-white/10">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sortBy === 'recentes' && 'Mais recentes'}
                  {sortBy === 'populares' && 'Mais populares'}
                  {sortBy === 'alfabetica' && 'Ordem alfabética'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                <DropdownMenuItem onClick={() => setSortBy('recentes')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Mais recentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('populares')}>
                  <Star className="mr-2 h-4 w-4" />
                  Mais populares
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alfabetica')}>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Ordem alfabética
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center border border-white/10 rounded-md overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none border-r border-white/10 h-10 w-10",
                  viewMode === 'grid' ? "bg-white/10" : "bg-transparent"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-none h-10 w-10",
                  viewMode === 'list' ? "bg-white/10" : "bg-transparent"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        {modelosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-background/30 backdrop-blur-xl border border-white/10 rounded-lg">
            <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            
            {searchTerm || categoriaSelecionada !== 'todas' ? (
              <>
                <h2 className="text-xl font-medium mb-2">Nenhum modelo corresponde aos filtros</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Tente alterar os filtros de busca ou categorias para encontrar seus modelos.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoriaSelecionada('todas');
                  }}
                  className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Limpar filtros
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-medium mb-2">Sua biblioteca está vazia</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Você ainda não tem modelos em sua biblioteca. Crie seu primeiro modelo de IA personalizado.
                </p>
                <Button
                  onClick={() => router.push('/biblioteca/novo')}
                  className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Modelo
                </Button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modelosOrdenados.map((modelo) => (
              <Card key={modelo.id} className="backdrop-blur-xl border border-white/10 bg-background/30 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
                <CardHeader className="p-5">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-medium group cursor-pointer" onClick={() => router.push(`/biblioteca/${modelo.id}`)}>
                      <span className="group-hover:text-emerald-300 transition-colors">{modelo.nome}</span>
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                        <DropdownMenuItem onClick={() => router.push(`/biblioteca/${modelo.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/biblioteca/editar/${modelo.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="px-5 pb-0">
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {modelo.descricao || "Sem descrição"}
                  </p>
                  
                  {modelo.categoria && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                      {modelo.categoria}
                    </Badge>
                  )}
                </CardContent>
                
                <CardFooter className="px-5 py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(modelo.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => router.push(`/chat/${modelo.id}`)}
                    className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                  >
                    Usar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {modelosOrdenados.map((modelo) => (
              <div 
                key={modelo.id}
                className="backdrop-blur-xl border border-white/10 bg-background/30 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300 rounded-md p-4 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      className="text-lg font-medium hover:text-emerald-300 transition-colors cursor-pointer" 
                      onClick={() => router.push(`/biblioteca/${modelo.id}`)}
                    >
                      {modelo.nome}
                    </h3>
                    {modelo.categoria && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                        {modelo.categoria}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-1">
                    {modelo.descricao || "Sem descrição"}
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(modelo.created_at).toLocaleDateString('pt-BR')}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/chat/${modelo.id}`)}
                    className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                  >
                    Usar
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                      <DropdownMenuItem onClick={() => router.push(`/biblioteca/${modelo.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/biblioteca/editar/${modelo.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 