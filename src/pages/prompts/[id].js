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

            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-3">Prompt:</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{prompt.texto}</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Criado por: <span className="font-medium">{prompt.users?.email || 'Usuário anônimo'}</span>
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
          </div>
        </div>
      </main>
    </div>
  );
}