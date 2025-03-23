import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import { SidebarNav } from '../../components/SidebarNav';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthGuard from '../../components/AuthGuard';

export default function PerfilUsuario() {
  const router = useRouter();
  const { id } = router.query;
  
  const [usuario, setUsuario] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    const carregarPerfil = async () => {
      if (!id) return;

      try {
        // Verificar sessão do usuário atual
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Verificar se o perfil é do usuário atual
        if (session?.user?.id === id) {
          router.push('/perfil');
          return;
        }

        // Carregar perfil do usuário
        const { data: perfilData, error: perfilError } = await supabase
          .from('perfis')
          .select('*')
          .eq('user_id', id)
          .eq('perfil_publico', true)  // Apenas perfis públicos
          .single();
          
        if (perfilError) throw perfilError;
        
        if (!perfilData) {
          setError('Perfil não encontrado ou não é público');
          setLoading(false);
          return;
        }
        
        setUsuario(perfilData);

        // Carregar prompts públicos do usuário
        const { data: promptsData, error: promptsError } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', id)
          .eq('publico', true)
          .order('created_at', { ascending: false });
          
        if (promptsError) throw promptsError;
        
        setPrompts(promptsData || []);

        // Se usuário estiver logado, carregar seus favoritos
        if (session?.user) {
          const { data: favoritosData, error: favoritosError } = await supabase
            .from('favoritos')
            .select('prompt_id')
            .eq('user_id', session.user.id);

          if (favoritosError) throw favoritosError;
          setFavoritos(favoritosData?.map(f => f.prompt_id) || []);
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setError('Erro ao carregar perfil de usuário');
      } finally {
        setLoading(false);
      }
    };

    carregarPerfil();
  }, [id, router]);

  const adicionarFavorito = async (promptId, event) => {
    // Impedir que o clique no botão de favorito leve à página de detalhes
    event.stopPropagation();
    event.preventDefault();
    
    if (!user) {
      toast.info('Você precisa estar logado para adicionar favoritos');
      router.push('/auth/login');
      return;
    }

    try {
      // Verificar se já é favorito
      const isFavorito = favoritos.includes(promptId);
      
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos(favoritos.filter(id => id !== promptId));
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: promptId, user_id: user.id });
          
        if (error) throw error;
        
        // Atualizar estado local
        setFavoritos([...favoritos, promptId]);
        toast.success('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito. Tente novamente.');
    }
  };

  const copiarParaClipboard = async (texto, event) => {
    // Impedir que o clique no botão de copiar leve à página de detalhes
    event.stopPropagation();
    event.preventDefault();
    
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar o texto');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
          <SidebarNav />
          <main className="flex-1 p-6 md:p-8 relative z-10">
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                <span className="mt-4 text-muted-foreground">Carregando perfil...</span>
              </div>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  if (error || !usuario) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
          <SidebarNav />
          <main className="flex-1 p-6 md:p-8 relative z-10">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 text-5xl mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-xl mb-4">{error || 'Perfil não encontrado'}</p>
                  <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <Link href="/explorar">
                      Explorar Prompts
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        <Head>
          <title>{usuario.nome || 'Usuário'} | CriaPrompt</title>
          <meta name="description" content={`Perfil de ${usuario.nome || 'usuário'} na plataforma CriaPrompt`} />
        </Head>

        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

        {/* Decorative elements */}
        <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <SidebarNav />

        <main className="flex-1 p-6 md:p-8 relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              <div className="px-6 py-4 relative">
                <div className="absolute -top-12 left-6 w-24 h-24 rounded-full bg-background/30 backdrop-blur-xl border-4 border-background flex items-center justify-center text-4xl">
                  {usuario.nome?.charAt(0) || '?'}
                </div>
                <div className="ml-28">
                  <h1 className="text-3xl font-bold">{usuario.nome || 'Usuário'}</h1>
                  
                  <div className="text-sm text-muted-foreground mt-1">
                    <span>Membro desde {new Date(usuario.created_at || usuario.updated_at).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>{prompts.length} prompts públicos</span>
                  </div>
                </div>
              </div>
              
              {usuario.bio && (
                <CardContent className="pt-0">
                  <Separator className="my-4" />
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {usuario.bio}
                  </p>
                </CardContent>
              )}
            </Card>

            <div>
              <h2 className="text-2xl font-semibold mb-6">
                Prompts de {usuario.nome || 'Usuário'}
              </h2>

              {prompts.length === 0 ? (
                <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      Este usuário ainda não compartilhou nenhum prompt público.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {prompts.map((prompt) => (
                    <Link href={`/prompts/${prompt.id}`} key={prompt.id} passHref>
                      <Card className="bg-background/30 backdrop-blur-xl border border-white/20 hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <span className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-medium">
                              {prompt.categoria}
                            </span>
                            <button
                              onClick={(e) => adicionarFavorito(prompt.id, e)}
                              className={`p-1 rounded-full transition-colors duration-300 ${
                                favoritos.includes(prompt.id)
                                  ? 'text-red-500 bg-red-500/20'
                                  : 'text-muted-foreground hover:bg-background/50'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${favoritos.includes(prompt.id) ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                          </div>
                          <CardTitle className="mt-4 text-lg">{prompt.titulo}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground line-clamp-3">{prompt.texto}</p>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {prompt.views || 0}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => copiarParaClipboard(prompt.texto, e)}
                              className="text-primary hover:text-primary/80 p-1 h-8"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              Copiar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}