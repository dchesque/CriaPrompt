import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  PlusCircle, 
  Search, 
  FileText, 
  Folder,
  Brain,
  Sparkles,
  Plus
} from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Separator } from '../components/ui/separator';

export default function ModelosInteligentes() {
  const router = useRouter();
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todas');
  const [categorias, setCategorias] = useState([]);

  // Carregar modelos do usuário
  useEffect(() => {
    const carregarModelos = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('modelos_inteligentes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setModelos(data || []);

        // Extrair categorias únicas
        if (data && data.length > 0) {
          const uniqueCategorias = [...new Set(data.map(modelo => modelo.categoria))];
          setCategorias(uniqueCategorias);
        }
      } catch (error) {
        console.error('Erro ao carregar modelos:', error);
        toast.error('Não foi possível carregar seus modelos');
      } finally {
        setLoading(false);
      }
    };

    carregarModelos();
  }, [router]);

  // Filtrar modelos por categoria e termo de busca
  const modelosFiltrados = modelos.filter(modelo => {
    const matchesSearch = 
      modelo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      modelo.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = categoriaSelecionada === 'todas' || modelo.categoria === categoriaSelecionada;
    
    return matchesSearch && matchesCategoria;
  });

  return (
    <AuthGuard>
      <DashboardLayout>
        <Head>
          <title>Modelos Inteligentes | CriaPrompt</title>
          <meta name="description" content="Gerenciador de Modelos Inteligentes para geração de conteúdo com IA" />
        </Head>

        <ToastContainer position="top-right" autoClose={3000} />

        <main className="max-w-7xl mx-auto px-4 py-6 w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <span>Modelos Inteligentes</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Crie e gerencie modelos para gerar prompts estruturados
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push("/modelos/gerar-prompt")}
                variant="outline"
                className="bg-background border border-input"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
              <Button
                onClick={() => router.push("/modelos/criar")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Modelo
              </Button>
            </div>
          </div>

          <div className="flex flex-col space-y-8">
            {/* Barra de pesquisa e filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Pesquisar modelos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-4 py-2 bg-background/30 backdrop-blur-xl border border-white/20 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  />
                </div>
              </div>
              <div className="col-span-1">
                <select
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                  className="w-full px-4 py-2 bg-background/30 backdrop-blur-xl border border-white/20 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                >
                  <option value="todas">Todas as categorias</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exibição de modelos */}
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Carregando modelos...</p>
                </div>
              </div>
            ) : modelosFiltrados.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modelosFiltrados.map((modelo) => (
                  <Card key={modelo.id} className="bg-background/30 backdrop-blur-xl border border-white/20 hover:border-primary/50 transition-all duration-300 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <CardTitle className="line-clamp-1">{modelo.nome}</CardTitle>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {modelo.categoria}
                        </span>
                      </div>
                      <CardDescription className="line-clamp-2 mt-1">
                        {modelo.descricao}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="bg-background/50 rounded p-2 max-h-20 overflow-y-auto">
                        <code className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {modelo.estrutura_prompt}
                        </code>
                      </div>
                      {modelo.campos_variaveis && modelo.campos_variaveis.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Variáveis: {modelo.campos_variaveis.length}</p>
                          <div className="flex flex-wrap gap-1">
                            {modelo.campos_variaveis.slice(0, 3).map((campo, idx) => (
                              <span key={idx} className="text-xs bg-blue-500/10 text-blue-400 rounded px-1">
                                {campo.nome}
                              </span>
                            ))}
                            {modelo.campos_variaveis.length > 3 && (
                              <span className="text-xs bg-gray-500/10 text-gray-400 rounded px-1">
                                +{modelo.campos_variaveis.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-1">
                      <div className="flex justify-between items-center w-full">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => router.push(`/modelos/${modelo.id}`)}
                        >
                          Visualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/modelos/utilizar/${modelo.id}`)}
                          className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                        >
                          Utilizar
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-medium mb-2">Nenhum modelo encontrado</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {searchTerm || categoriaSelecionada !== 'todas' 
                    ? 'Não encontramos modelos correspondentes aos filtros aplicados.'
                    : 'Você ainda não criou nenhum modelo inteligente. Comece criando um novo modelo agora!'}
                </p>
                <Button
                  onClick={() => router.push('/modelos/criar')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Criar meu primeiro modelo
                </Button>
              </div>
            )}
          </div>
        </main>
      </DashboardLayout>
    </AuthGuard>
  );
} 