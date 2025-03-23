import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SidebarNav } from '../components/SidebarNav';
import { PromptList } from '../components/PromptList';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Search, X } from 'lucide-react';

export default function Busca() {
  const router = useRouter();
  const { q } = router.query;
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritos, setFavoritos] = useState([]);
  const [favoritosContagem, setFavoritosContagem] = useState({});
  
  // Buscar resultados quando o termo de busca muda na URL
  useEffect(() => {
    if (q) {
      setSearchTerm(q);
      buscarPrompts(q);
    } else {
      setLoading(false);
    }
  }, [q]);
  
  // Verificar sessão
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Carregar favoritos do usuário
        const { data: favoritosData } = await supabase
          .from('favoritos')
          .select('prompt_id')
          .eq('user_id', session.user.id);
          
        if (favoritosData) {
          setFavoritos(favoritosData.map(f => f.prompt_id));
        }
      }
    };
    
    checkSession();
  }, []);
  
  const buscarPrompts = async (termo) => {
    try {
      setLoading(true);
      
      if (!termo.trim()) {
        setResults([]);
        return;
      }
      
      // Buscar prompts que correspondem ao termo
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .or(`titulo.ilike.%${termo}%,texto.ilike.%${termo}%,tags.cs.{${termo}}`)
        .eq('publico', true)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setResults(data || []);
      
      // Buscar contagem de favoritos para cada prompt
      if (data && data.length > 0) {
        const contagem = {};
        
        for (const prompt of data) {
          const { count } = await supabase
            .from('favoritos')
            .select('*', { count: 'exact', head: true })
            .eq('prompt_id', prompt.id);
            
          contagem[prompt.id] = count || 0;
        }
        
        setFavoritosContagem(contagem);
      }
    } catch (error) {
      console.error('Erro ao buscar prompts:', error);
      toast.error('Erro ao buscar prompts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm)}`);
    }
  };
  
  const handleToggleFavorito = async (promptId) => {
    try {
      // Verificar se o usuário está logado
      if (!session) {
        toast.info('Faça login para adicionar favoritos');
        router.push('/auth/login');
        return;
      }
      
      const userId = session.user.id;
      
      // Verificar se já é favorito
      const isFavorito = favoritos.includes(promptId);
      
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('prompt_id', promptId);
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos(favoritos.filter(id => id !== promptId));
        setFavoritosContagem(prev => ({
          ...prev,
          [promptId]: Math.max(0, (prev[promptId] || 1) - 1)
        }));
        
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({
            user_id: userId,
            prompt_id: promptId,
            created_at: new Date()
          });
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos([...favoritos, promptId]);
        setFavoritosContagem(prev => ({
          ...prev,
          [promptId]: (prev[promptId] || 0) + 1
        }));
        
        toast.success('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
      <Head>
        <title>{q ? `Busca: ${q}` : 'Busca'} | CriaPrompt</title>
        <meta name="description" content="Busque prompts e modelos em nossa plataforma" />
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
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium tracking-tight">Busca</h1>
          </div>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por título, conteúdo ou tags..."
                    className="w-full px-3 py-2.5 pl-10 bg-background/30 backdrop-blur-xl border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
                >
                  Buscar
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Buscando prompts...</p>
              </div>
            </div>
          ) : q ? (
            <>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">
                  {results.length === 0 
                    ? 'Nenhum resultado encontrado' 
                    : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${q}"`}
                </h2>
              </div>
              
              {results.length > 0 && (
                <div className="space-y-6">
                  <PromptList 
                    prompts={results}
                    favoritos={favoritos}
                    onToggleFavorito={handleToggleFavorito}
                    favoritosContagem={favoritosContagem}
                  />
                </div>
              )}
              
              {results.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-6">
                    Não encontramos prompts que correspondam à sua busca. Tente termos diferentes ou explore nossos prompts.
                  </p>
                  <Button
                    onClick={() => router.push('/explorar')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg transition-all duration-300"
                  >
                    Explorar Prompts
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-medium mb-2">Digite um termo para buscar</h2>
              <p className="text-muted-foreground">
                Busque por título, conteúdo ou tags para encontrar prompts relevantes.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}