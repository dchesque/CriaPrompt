import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import DashboardLayout from '../components/layouts/DashboardLayout';
import PromptCard from '../components/PromptCard';
import { 
  Star, Heart, Trash2, Bookmark, Eye, 
  Clock, Filter, Plus, Search, X, 
  ArrowRight, MoreHorizontal, ArrowUpDown,
  Sparkles, Folder, Copy, Download, SortAsc
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { cn } from '../lib/utils';

// Constantes para categorias de cores
const CATEGORY_COLORS = {
  'escrita': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  'marketing': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  'negócios': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'educação': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'criativo': { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  'tecnologia': { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'pessoal': { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  'saúde': { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
  'default': { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-500/30' },
};

const getCategoryStyle = (category) => {
  return CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS.default;
};

export default function MeusFavoritos() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favoritos, setFavoritos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recentes');
  const [error, setError] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('todos');
  const [collections, setCollections] = useState([
    { id: 'todos', name: 'Todos os Favoritos', count: 0 },
    { id: 'frequentes', name: 'Frequentemente Usados', count: 0 },
    { id: 'recentes', name: 'Adicionados Recentemente', count: 0 },
  ]);
  
  // Estados para gerenciar animação de remoção
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        router.push('/auth/login?redirect=/favoritos');
        return;
      }
      
      fetchFavoritos();
    };
    
    checkSession();
  }, [router]);

  const fetchFavoritos = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada');
      }

      const { data, error } = await supabase
        .from('favoritos')
        .select(`
          id,
          created_at,
          prompt_id,
          prompts:prompt_id (
            id,
            titulo,
            descricao,
            texto,
            categoria,
            tags,
            views,
            created_at,
            publico,
            user_id
          )
        `)
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      // Agora vamos buscar os dados do usuário para cada prompt
      const promptsValidos = data
        .filter(item => item.prompts)
        .map(item => ({
          ...item.prompts,
          favorito_id: item.id,
          favorito_created_at: item.created_at,
          isFavorite: true
        }));
      
      // Buscar informações dos usuários que criaram os prompts
      if (promptsValidos.length > 0) {
        const userIds = [...new Set(promptsValidos.map(p => p.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, nome')
            .in('id', userIds);
            
          if (!usersError && usersData) {
            // Adicionar informações de usuário a cada prompt
            for (let prompt of promptsValidos) {
              const userInfo = usersData.find(u => u.id === prompt.user_id);
              prompt.author = userInfo || null;
            }
          }
        }
      }
        
      setFavoritos(promptsValidos);
      
      // Extrair categorias únicas
      const categoriasUnicas = [...new Set(promptsValidos.map(p => p.categoria).filter(Boolean))];
      
      // Contar prompts por categoria
      const categoriasComContagem = categoriasUnicas.map(cat => {
        const count = promptsValidos.filter(p => p.categoria === cat).length;
        return { name: cat, count };
      });
      
      setCategorias(categoriasComContagem);
      
      // Atualizar contagem das coleções
      const todos = promptsValidos.length;
      const recentes = promptsValidos.filter(p => {
        const dataFavorito = new Date(p.favorito_created_at);
        const hoje = new Date();
        const diffDias = Math.floor((hoje - dataFavorito) / (1000 * 60 * 60 * 24));
        return diffDias < 7; // Adicionados nos últimos 7 dias
      }).length;
      
      // Atualizar coleções
      setCollections([
        { id: 'todos', name: 'Todos os Favoritos', count: todos },
        { id: 'frequentes', name: 'Frequentemente Usados', count: Math.min(5, todos) },
        { id: 'recentes', name: 'Adicionados Recentemente', count: recentes },
      ]);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      setError(error.message);
      toast.error('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverFavorito = async (promptId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada');
      }
      
      const item = favoritos.find(f => f.id === promptId);
      if (!item) return;
      
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('id', item.favorito_id);
        
      if (error) throw error;
      
      // Atualizar a lista localmente
      setFavoritos(favoritos.filter(prompt => prompt.id !== promptId));
      toast.success('Removido dos favoritos!');
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      toast.error('Erro ao remover dos favoritos');
    }
  };

  // Filtrar favoritos
  const filtrarFavoritos = () => {
    return favoritos.filter(favorito => {
      // Filtro de coleção
      if (selectedCollection === 'recentes') {
        const dataFavorito = new Date(favorito.favorito_created_at);
        const hoje = new Date();
        const diffDias = Math.floor((hoje - dataFavorito) / (1000 * 60 * 60 * 24));
        if (diffDias >= 7) return false;
      }
      
      // Filtro de categoria
      if (categoriaSelecionada !== 'todas' && favorito.categoria !== categoriaSelecionada) {
        return false;
      }
      
      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          favorito.titulo?.toLowerCase().includes(searchLower) ||
          favorito.descricao?.toLowerCase().includes(searchLower) ||
          favorito.texto?.toLowerCase().includes(searchLower) ||
          favorito.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  };

  // Ordenar favoritos
  const ordenarFavoritos = (favoritosFiltrados) => {
    return [...favoritosFiltrados].sort((a, b) => {
      if (sortBy === 'recentes') {
        return new Date(b.favorito_created_at) - new Date(a.favorito_created_at);
      } else if (sortBy === 'populares') {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === 'alfabetica') {
        return a.titulo.localeCompare(b.titulo);
      }
      return 0;
    });
  };

  // Favoritos filtrados e ordenados
  const favoritosFiltrados = ordenarFavoritos(filtrarFavoritos());

  if (loading) {
    return (
      <DashboardLayout title="Meus Favoritos">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Carregando favoritos...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meus Favoritos">
      <Head>
        <title>Meus Favoritos | CriaPrompt</title>
        <meta name="description" content="Seus prompts favoritos" />
      </Head>
      
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        {/* Cabeçalho */}
        <div className="relative">
          {/* Fundo decorativo */}
          <div className="absolute -top-10 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <Badge className="mb-2 py-1 px-3 bg-amber-500/10 text-amber-300 border-amber-500/30">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300 mr-1.5" />
                Coleção Pessoal
              </Badge>
              
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Meus Favoritos
              </h1>
              
              <p className="text-muted-foreground mt-1">
                Sua coleção pessoal de prompts favoritos para uso rápido
              </p>
            </div>
          </div>
        </div>
        
        {/* Filtros e busca */}
        <div className="flex flex-col sm:flex-row gap-4 md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar nos favoritos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {categorias.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    {categoriaSelecionada === 'todas' ? 'Todas as categorias' : categoriaSelecionada}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCategoriaSelecionada('todas')}>
                    Todas as categorias
                  </DropdownMenuItem>
                  {categorias.map(categoria => (
                    <DropdownMenuItem 
                      key={categoria.name} 
                      onClick={() => setCategoriaSelecionada(categoria.name)}
                    >
                      {categoria.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sortBy === 'recentes' && 'Mais recentes'}
                  {sortBy === 'populares' && 'Mais populares'}
                  {sortBy === 'alfabetica' && 'Ordem alfabética'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy('recentes')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Mais recentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('populares')}>
                  <Star className="mr-2 h-4 w-4" />
                  Mais populares
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alfabetica')}>
                  <SortAsc className="mr-2 h-4 w-4" />
                  Ordem alfabética
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Grade de favoritos */}
        {error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        ) : favoritosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-background/30 backdrop-blur-xl border border-white/10 rounded-lg">
            <Heart className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
            
            {searchTerm || categoriaSelecionada !== 'todas' ? (
              <>
                <h2 className="text-xl font-medium mb-2">Nenhum favorito corresponde aos filtros</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Tente alterar os filtros de busca ou categorias para encontrar seus favoritos.
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
                <h2 className="text-xl font-medium mb-2">Nenhum favorito encontrado</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Você ainda não adicionou nenhum prompt aos seus favoritos. Explore prompts e marque os que mais gostar.
                </p>
                <Button
                  onClick={() => router.push('/descobrir')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Descobrir Prompts
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritosFiltrados.map(favorito => (
              <PromptCard
                key={favorito.id}
                prompt={favorito}
                userId={session?.user?.id}
                isFavorito={true}
                onToggleFavorito={handleRemoverFavorito}
                favoritosCount={favorito.likes || 0}
                showActions={true}
                showAuthor={true}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}