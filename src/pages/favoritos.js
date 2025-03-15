import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiHeart, FiCopy, FiEye, FiCalendar, FiUser } from 'react-icons/fi';

export default function Favoritos() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function carregarFavoritos() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login?redirect=/favoritos');
          return;
        }

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

        setFavoritos(data || []);
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        setError('Não foi possível carregar seus favoritos. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    carregarFavoritos();
  }, [router]);

  const removerFavorito = async (favoritoId, e) => {
    // Prevenir navegação para a página de detalhes
    e.stopPropagation();
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('id', favoritoId);

      if (error) throw error;

      // Atualizar a lista de favoritos removendo o item
      setFavoritos(favoritos.filter(fav => fav.id !== favoritoId));
      toast.success('Removido dos favoritos');
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      toast.error('Erro ao remover dos favoritos');
    }
  };

  const copiarParaClipboard = async (texto, e) => {
    // Prevenir navegação para a página de detalhes
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar o texto');
    }
  };

  const navigateToPrompt = (id) => {
    router.push(`/prompts/${id}`);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Head>
          <title>Favoritos | CriaPrompt</title>
          <meta name="description" content="Seus prompts favoritos" />
        </Head>

        <Header />
        
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Seus Prompts Favoritos
            </span>
          </h1>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-gray-600">Carregando seus favoritos...</p>
            </div>
          ) : favoritos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-center text-gray-600 mb-4">Você ainda não tem prompts favoritos.</p>
              <button
                onClick={() => router.push('/explorar')}
                className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Explorar Prompts
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {favoritos.map((fav) => (
                <div
                  key={fav.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg p-6 cursor-pointer transition-all duration-300 group"
                  onClick={() => navigateToPrompt(fav.prompt_id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      {fav.prompts.categoria}
                    </span>
                    <button 
                      className="p-2 rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
                      onClick={(e) => removerFavorito(fav.id, e)}
                      title="Remover dos favoritos"
                    >
                      <FiHeart className="fill-current" size={16} />
                    </button>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{fav.prompts.titulo}</h3>
                  <p className="text-gray-700 line-clamp-3 mb-4">{fav.prompts.texto}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                      <span className="text-xs text-gray-500 flex items-center">
                        <FiUser className="mr-1" size={12} />
                        {fav.prompts.users.email}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <FiEye className="mr-1" size={12} />
                        {fav.prompts.views || 0}
                      </span>
                      {fav.prompts.created_at && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <FiCalendar className="mr-1" size={12} />
                          {new Date(fav.prompts.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <button 
                      className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"
                      onClick={(e) => copiarParaClipboard(fav.prompts.texto, e)}
                    >
                      <FiCopy className="mr-1" size={14} />
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