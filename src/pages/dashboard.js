import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrompts: 0,
    publicPrompts: 0,
    privatePrompts: 0,
    totalViews: 0,
    favoritos: 0,
    categoriasUsadas: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Obter dados da sessão
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        setUser(session.user);
        
        // Carregar prompts do usuário via API
        const response = await fetch('/api/prompts?meusPosts=true');
        
        if (!response.ok) {
          throw new Error('Erro ao carregar prompts');
        }
        
        const data = await response.json();
        setPrompts(data || []);
        
        // Calcular estatísticas
        const totalPrompts = data.length;
        const publicPrompts = data.filter(p => p.publico).length;
        const privatePrompts = totalPrompts - publicPrompts;
        const totalViews = data.reduce((sum, prompt) => sum + (prompt.views || 0), 0);
        
        // Contar categorias usadas
        const categorias = {};
        data.forEach(prompt => {
          categorias[prompt.categoria] = (categorias[prompt.categoria] || 0) + 1;
        });
        
        const categoriasUsadas = Object.entries(categorias).map(([nome, count]) => ({
          nome,
          count
        })).sort((a, b) => b.count - a.count);
        
        // Buscar contagem de favoritos
        const { count: favoritosCount, error: favError } = await supabase
          .from('favoritos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
          
        if (favError) throw favError;
        
        setStats({
          totalPrompts,
          publicPrompts,
          privatePrompts,
          totalViews,
          favoritos: favoritosCount || 0,
          categoriasUsadas
        });
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleDelete = async (promptId, e) => {
    // Prevenir navegação para a página de detalhes
    e.stopPropagation();
    e.preventDefault();
    
    if (!confirm('Tem certeza que deseja excluir este prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir prompt');
      }

      // Atualizar a lista de prompts removendo o excluído
      setPrompts(prompts.filter(p => p.id !== promptId));
      
      // Atualizar estatísticas
      const promptExcluido = prompts.find(p => p.id === promptId);
      
      setStats(prev => ({
        ...prev,
        totalPrompts: prev.totalPrompts - 1,
        publicPrompts: promptExcluido?.publico ? prev.publicPrompts - 1 : prev.publicPrompts,
        privatePrompts: !promptExcluido?.publico ? prev.privatePrompts - 1 : prev.privatePrompts,
        totalViews: prev.totalViews - (promptExcluido?.views || 0)
      }));
      
      alert('Prompt excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      alert('Erro ao excluir prompt. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <main className="container-app py-10">
            <p className="text-center">Carregando...</p>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Dashboard | CriaPrompt</title>
          <meta name="description" content="Seu dashboard na plataforma CriaPrompt" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            Seu Dashboard
          </h1>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Bem-vindo, {user?.email}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-indigo-600">{stats.totalPrompts}</div>
                <div className="text-sm text-gray-600">Prompts criados</div>
                <div className="mt-2 text-xs text-gray-500">
                  <span className="mr-2">📢 {stats.publicPrompts} públicos</span>
                  <span>🔒 {stats.privatePrompts} privados</span>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{stats.totalViews}</div>
                <div className="text-sm text-gray-600">Visualizações</div>
                {stats.totalPrompts > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Média: {Math.round(stats.totalViews / stats.totalPrompts)} por prompt
                  </div>
                )}
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{stats.favoritos}</div>
                <div className="text-sm text-gray-600">Favoritos</div>
              </div>
            </div>
            
            {stats.categoriasUsadas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-semibold mb-2">Suas categorias mais usadas:</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.categoriasUsadas.map((cat) => (
                    <span key={cat.nome} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                      {cat.nome} ({cat.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <Link href="/criar">
              <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                Criar Novo Prompt
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Seus Prompts</h2>
              
              {prompts.length > 0 && (
                <div className="flex gap-2">
                  <Link href="/dashboard?filtro=recentes">
                    <span className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      Mais recentes
                    </span>
                  </Link>
                  <Link href="/dashboard?filtro=populares">
                    <span className="text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      Mais visualizados
                    </span>
                  </Link>
                </div>
              )}
            </div>
            
            {prompts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600 mb-4">
                  Você ainda não criou nenhum prompt.
                </p>
                <Link href="/criar">
                  <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                    Criar Seu Primeiro Prompt
                  </span>
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {prompts.map((prompt) => (
                  <Link href={`/prompts/${prompt.id}`} key={prompt.id}>
                    <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-lg">{prompt.titulo}</h3>
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {prompt.categoria}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-4 line-clamp-3">{prompt.texto}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-500">
                            {prompt.publico ? '📢 Público' : '🔒 Privado'}
                          </span>
                          <span className="text-sm text-gray-500">
                            👁️ {prompt.views || 0}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(prompt.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-3">
                          <Link href={`/prompts/editar/${prompt.id}`} onClick={(e) => e.stopPropagation()}>
                            <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                              Editar
                            </span>
                          </Link>
                          <button 
                            onClick={(e) => handleDelete(prompt.id, e)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}