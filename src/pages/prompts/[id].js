import Head from 'next/head';
import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function DetalhesPrompt() {
  const router = useRouter();
  const { id } = router.query;
  
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isFavorito, setIsFavorito] = useState(false);
  const [promptsRelacionados, setPromptsRelacionados] = useState([]);

  useEffect(() => {
    const carregarPrompt = async () => {
      if (!id) return;

      try {
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Incrementar visualizações usando o RPC
        try {
          await supabase.rpc('increment_views', { prompt_id: id });
        } catch (viewError) {
          console.error('Erro ao incrementar visualizações:', viewError);
        }

        // Buscar detalhes do prompt via API
        const response = await fetch(`/api/prompts/${id}`);
        
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            router.push('/explorar');
            return;
          }
          throw new Error('Erro ao carregar prompt');
        }
        
        const data = await response.json();
        setPrompt(data);

        // Verificar se está nos favoritos do usuário
        if (session?.user) {
          const { data: favData, error: favError } = await supabase
            .from('favoritos')
            .select('id')
            .eq('prompt_id', id)
            .eq('user_id', session.user.id)
            .single();

          if (!favError && favData) {
            setIsFavorito(true);
          }
        }
        
        // Buscar prompts relacionados (se houver tags)
        if (data.tags && data.tags.length > 0) {
          // Buscar prompts com tags em comum
          const { data: relacionados, error: relError } = await supabase
            .from('prompts')
            .select(`
              id,
              titulo,
              categoria,
              tags,
              views
            `)
            .eq('publico', true)
            .neq('id', id) // Excluir o prompt atual
            .contains('tags', data.tags)
            .order('views', { ascending: false })
            .limit(3);
            
          if (!relError && relacionados?.length > 0) {
            setPromptsRelacionados(relacionados);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar prompt:', error);
        setError('Não foi possível carregar este prompt.');
      } finally {
        setLoading(false);
      }
    };

    carregarPrompt();
  }, [id, router]);

  const toggleFavorito = async () => {
    if (!user) {
      alert('Você precisa estar logado para adicionar favoritos');
      router.push('/auth/login?redirect=/prompts/' + id);
      return;
    }

    try {
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('prompt_id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFavorito(false);
        alert('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: id, user_id: user.id });

        if (error) throw error;
        setIsFavorito(true);
        alert('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      alert('Erro ao atualizar favorito');
    }
  };

  const copiarParaClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt.texto);
      alert('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Não foi possível copiar o texto');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container-app py-10">
          <p className="text-center">Carregando...</p>
        </main>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container-app py-10">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">{error || 'Prompt não encontrado'}</p>
            <Link href="/explorar">
              <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                Voltar para Explorar
              </span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{prompt.titulo} | CriaPrompt</title>
        <meta name="description" content={`${prompt.titulo} - Prompt para IA`} />
      </Head>

      <Header />

      <main className="container-app py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-3xl font-bold text-gray-800">{prompt.titulo}</h1>
              <button 
                onClick={toggleFavorito}
                className={`text-2xl ${isFavorito ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              >
                ❤️
              </button>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                  {prompt.categoria}
                </span>
                <span className="text-gray-600">
                  {prompt.publico ? 'Público' : 'Privado'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <span className="mr-3">👁️ {prompt.views || 0} visualizações</span>
                <span>{new Date(prompt.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Exibição de tags */}
            {prompt.tags && prompt.tags.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag, index) => (
                    <Link href={`/busca?tags=${tag}`} key={index}>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200">
                        #{tag}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-3">Prompt:</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{prompt.texto}</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Criado por: {prompt.users?.email ? (
                  <Link href={`/usuarios/${prompt.user_id}`}>
                    <span className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      {prompt.users.email}
                    </span>
                  </Link>
                ) : (
                  <span className="font-medium">Usuário anônimo</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={copiarParaClipboard}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
                >
                  Copiar Prompt
                </button>
                {user && prompt.user_id === user.id && (
                  <Link href={`/prompts/editar/${prompt.id}`}>
                    <span className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition duration-300 cursor-pointer">
                      Editar
                    </span>
                  </Link>
                )}
              </div>
            </div>
            
            {/* Prompts relacionados */}
            {promptsRelacionados.length > 0 && (
              <div className="mt-10 border-t pt-6">
                <h2 className="text-xl font-semibold mb-4">Prompts Relacionados</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {promptsRelacionados.map(p => (
                    <Link href={`/prompts/${p.id}`} key={p.id}>
                      <div className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
                        <h3 className="font-medium text-indigo-600 mb-2 line-clamp-2">{p.titulo}</h3>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{p.categoria}</span>
                          <span>👁️ {p.views || 0}</span>
                        </div>
                        {p.tags && p.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.tags.filter(tag => prompt.tags.includes(tag)).slice(0, 3).map((tag, i) => (
                              <span key={i} className="bg-gray-200 px-1.5 py-0.5 rounded-full text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}