import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Favoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarFavoritos() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        const { data, error } = await supabase
          .from('favoritos')
          .select(`
            id,
            prompt_id,
            prompts:prompt_id (
              id,
              titulo,
              texto,
              categoria,
              views,
              created_at,
              users:user_id (
                email
              )
            )
          `)
          .eq('user_id', session.user.id);

        if (error) throw error;

        setFavoritos(data);
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
      } finally {
        setLoading(false);
      }
    }

    carregarFavoritos();
  }, []);

  const removerFavorito = async (favoritoId, event) => {
    // Prevenir navegação para a página de detalhes
    event.stopPropagation();
    event.preventDefault();
    
    try {
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('id', favoritoId);

      if (error) throw error;

      // Atualizar a lista de favoritos removendo o item
      setFavoritos(favoritos.filter(fav => fav.id !== favoritoId));
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
    }
  };

  const copiarParaClipboard = async (texto, event) => {
    // Prevenir navegação para a página de detalhes
    event.stopPropagation();
    event.preventDefault();
    
    try {
      await navigator.clipboard.writeText(texto);
      alert('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Não foi possível copiar o texto');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Favoritos | CriaPrompt</title>
          <meta name="description" content="Seus prompts favoritos" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Seus Prompts Favoritos
          </h1>

          {loading ? (
            <p className="text-center">Carregando...</p>
          ) : favoritos.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-center text-gray-600 mb-4">Você ainda não tem prompts favoritos.</p>
              <Link href="/explorar">
                <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                  Explorar Prompts
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {favoritos.map((fav) => (
                <Link href={`/prompts/${fav.prompt_id}`} key={fav.id}>
                  <div key={fav.id} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {fav.prompts.categoria}
                      </span>
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => removerFavorito(fav.id, e)}
                      >
                        <span className="sr-only">Remover dos favoritos</span>
                        ❤️
                      </button>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{fav.prompts.titulo}</h3>
                    <p className="text-gray-700 line-clamp-3">{fav.prompts.texto}</p>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                        <span className="text-xs text-gray-500">
                          Por: {fav.prompts.users.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          👁️ {fav.prompts.views || 0}
                        </span>
                      </div>
                      <button 
                        className="text-indigo-600 hover:text-indigo-800"
                        onClick={(e) => copiarParaClipboard(fav.prompts.texto, e)}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}