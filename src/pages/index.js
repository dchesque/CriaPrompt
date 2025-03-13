import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PromptCard from '../components/PromptCard';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState([]);
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalUsuarios: 0,
    totalVisualizacoes: 0
  });
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        // Carregar prompts em destaque (mais visualizados)
        const { data: promptsData } = await supabase
          .from('prompts')
          .select(`
            id,
            titulo,
            texto,
            categoria,
            publico,
            views,
            created_at,
            user_id,
            users:user_id (
              email
            )
          `)
          .eq('publico', true)
          .order('views', { ascending: false })
          .limit(6);
          
        setPrompts(promptsData || []);

        // Carregar estatísticas básicas
        const { count: totalPrompts } = await supabase
          .from('prompts')
          .select('id', { count: 'exact', head: true })
          .eq('publico', true);
          
        const { count: totalUsuarios } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
          
        const totalVisualizacoes = await supabase
          .from('prompts')
          .select('views')
          .eq('publico', true)
          .then(({ data, error }) => {
            if (error) throw error;
            return data.reduce((sum, item) => sum + (item.views || 0), 0);
          });
          
        setStats({
          totalPrompts: totalPrompts || 0,
          totalUsuarios: totalUsuarios || 0,
          totalVisualizacoes: totalVisualizacoes || 0
        });

        // Se estiver logado, carregar favoritos
        if (session) {
          const { data: favoritosData } = await supabase
            .from('favoritos')
            .select('prompt_id')
            .eq('user_id', session.user.id);
            
          setFavoritos((favoritosData || []).map(f => f.prompt_id));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }
    
    carregarDados();
  }, []);

  const handleToggleFavorito = async (promptId) => {
    if (!session) {
      alert('Você precisa estar logado para adicionar favoritos');
      return;
    }

    try {
      if (favoritos.includes(promptId)) {
        // Remover dos favoritos
        await supabase
          .from('favoritos')
          .delete()
          .eq('prompt_id', promptId)
          .eq('user_id', session.user.id);
          
        setFavoritos(favoritos.filter(id => id !== promptId));
      } else {
        // Adicionar aos favoritos
        await supabase
          .from('favoritos')
          .insert({ prompt_id: promptId, user_id: session.user.id });
          
        setFavoritos([...favoritos, promptId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      alert('Erro ao atualizar favorito');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>CriaPrompt - Crie, salve e compartilhe prompts para IA</title>
        <meta name="description" content="Aplicativo para criação de prompts de IA" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-indigo-700 text-white py-20">
          <div className="container-app text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Maximize o potencial das IAs com prompts eficientes
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8">
              Crie, organize e compartilhe prompts personalizados que funcionam. 
              Transforme a forma como você interage com inteligências artificiais.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {!loading && session ? (
                <Link href="/dashboard">
                  <span className="bg-white text-indigo-700 font-medium py-3 px-6 rounded-md hover:bg-gray-100 transition duration-300 cursor-pointer">
                    Meu Dashboard
                  </span>
                </Link>
              ) : (
                <Link href="/auth/login">
                  <span className="bg-white text-indigo-700 font-medium py-3 px-6 rounded-md hover:bg-gray-100 transition duration-300 cursor-pointer">
                    Começar agora
                  </span>
                </Link>
              )}
              <Link href="/explorar">
                <span className="bg-transparent border-2 border-white text-white font-medium py-3 px-6 rounded-md hover:bg-white hover:text-indigo-700 transition duration-300 cursor-pointer">
                  Explorar prompts
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="container-app">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">{loading ? '-' : stats.totalPrompts.toLocaleString()}</div>
                <p className="text-gray-600">Prompts criados</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">{loading ? '-' : stats.totalUsuarios.toLocaleString()}</div>
                <p className="text-gray-600">Usuários ativos</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 mb-2">{loading ? '-' : stats.totalVisualizacoes.toLocaleString()}</div>
                <p className="text-gray-600">Visualizações</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-50">
          <div className="container-app">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
              Como funciona
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">Crie seus prompts</h3>
                <p className="text-gray-600">
                  Desenvolva e aperfeiçoe prompts para diversas finalidades. Organize-os por categorias para facilitar o acesso.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">Compartilhe ou mantenha privado</h3>
                <p className="text-gray-600">
                  Decida quais prompts compartilhar com a comunidade e quais manter apenas para seu uso pessoal.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">Acesse quando precisar</h3>
                <p className="text-gray-600">
                  Tenha sua biblioteca de prompts à mão para usar a qualquer momento, aumentando sua produtividade com IAs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Prompts Section */}
        {prompts.length > 0 && (
          <section className="py-16">
            <div className="container-app">
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
                Prompts em destaque
              </h2>
              <p className="text-center text-gray-600 mb-12">
                Confira alguns dos prompts mais populares da nossa comunidade
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {prompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    userId={session?.user?.id}
                    isFavorito={favoritos.includes(prompt.id)}
                    onToggleFavorito={handleToggleFavorito}
                  />
                ))}
              </div>
              <div className="text-center mt-10">
                <Link href="/explorar">
                  <span className="inline-block bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                    Ver mais prompts
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 bg-indigo-700 text-white">
          <div className="container-app text-center">
            <h2 className="text-3xl font-bold mb-6">
              Pronto para melhorar sua produtividade com IA?
            </h2>
            <p className="text-xl max-w-3xl mx-auto mb-8">
              Comece a criar e gerenciar seus prompts hoje mesmo, é grátis!
            </p>
            <Link href={session ? "/criar" : "/auth/login"}>
              <span className="inline-block bg-white text-indigo-700 font-medium py-3 px-8 rounded-md hover:bg-gray-100 transition duration-300 cursor-pointer">
                {session ? "Criar meu primeiro prompt" : "Criar uma conta"}
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}