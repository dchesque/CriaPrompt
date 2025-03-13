import Head from 'next/head';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Estatisticas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalUsuarios: 0,
    totalVisualizacoes: 0,
    categorias: [],
    promptsMaisVistos: []
  });

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        // Total de prompts públicos
        const { count: totalPrompts, error: promptsError } = await supabase
          .from('prompts')
          .select('id', { count: 'exact', head: true })
          .eq('publico', true);
          
        if (promptsError) throw promptsError;

        // Total de usuários
        const { count: totalUsuarios, error: usersError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
          
        if (usersError) throw usersError;

        // Contagem por categorias
        const { data: categoriasData, error: catError } = await supabase
          .from('prompts')
          .select('categoria')
          .eq('publico', true);
          
        if (catError) throw catError;
        
        const categoriasCounts = {};
        categoriasData.forEach(item => {
          categoriasCounts[item.categoria] = (categoriasCounts[item.categoria] || 0) + 1;
        });
        
        const categorias = Object.entries(categoriasCounts).map(([nome, count]) => ({
          nome,
          count
        })).sort((a, b) => b.count - a.count);

        // Prompts mais visualizados
        const { data: promptsMaisVistos, error: topError } = await supabase
          .from('prompts')
          .select(`
            id,
            titulo,
            views,
            users:user_id (
              email
            )
          `)
          .eq('publico', true)
          .order('views', { ascending: false })
          .limit(5);
          
        if (topError) throw topError;

        // Total de visualizações
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
          totalVisualizacoes,
          categorias,
          promptsMaisVistos: promptsMaisVistos || []
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarEstatisticas();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Estatísticas | CriaPrompt</title>
        <meta name="description" content="Estatísticas da plataforma CriaPrompt" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Estatísticas da Plataforma
        </h1>

        {loading ? (
          <p className="text-center">Carregando estatísticas...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalPrompts}</h2>
                <p className="text-gray-600">Prompts públicos</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalUsuarios}</h2>
                <p className="text-gray-600">Usuários registrados</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalVisualizacoes.toLocaleString()}</h2>
                <p className="text-gray-600">Total de visualizações</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Categorias mais populares</h2>
                {stats.categorias.length > 0 ? (
                  <div className="space-y-3">
                    {stats.categorias.map((cat) => (
                      <div key={cat.nome} className="flex items-center">
                        <div className="w-1/3 font-medium">{cat.nome}</div>
                        <div className="w-2/3">
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500"
                              style={{ width: `${(cat.count / stats.totalPrompts) * 100}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-right mt-1">{cat.count} prompts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Nenhuma categoria encontrada</p>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Prompts mais visualizados</h2>
                {stats.promptsMaisVistos.length > 0 ? (
                  <div className="space-y-4">
                    {stats.promptsMaisVistos.map((prompt, index) => (
                      <div key={prompt.id} className="flex items-start">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-800 mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <a 
                            href={`/prompts/${prompt.id}`}
                            className="font-medium hover:text-indigo-600"
                          >
                            {prompt.titulo}
                          </a>
                          <div className="text-sm text-gray-500 mt-1">
                            👁️ {prompt.views || 0} visualizações • Por: {prompt.users?.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Nenhum prompt encontrado</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}