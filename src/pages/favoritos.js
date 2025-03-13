import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  const removerFavorito = async (favoritoId) => {
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

  const copiarParaClipboard = async (texto) => {
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
            <p className="text-center text-gray-600">Você ainda não tem prompts favoritos.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {favoritos.map((fav) => (
                <div key={fav.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      {fav.prompts.categoria}
                    </span>
                    <button 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removerFavorito(fav.id)}
                    >
                      <span className="sr-only">Remover dos favoritos</span>
                      ❤️
                    </button>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{fav.prompts.titulo}</h3>
                  <p className="text-gray-700">{fav.prompts.texto}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Por: {fav.prompts.users.email}
                    </span>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => copiarParaClipboard(fav.prompts.texto)}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}