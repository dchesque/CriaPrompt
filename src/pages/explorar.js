import Head from 'next/head';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Explorar() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [userId, setUserId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        setUserId(currentUserId);

        // Carregar prompts públicos
        let query = supabase
          .from('prompts')
          .select(`
            id,
            titulo,
            texto,
            categoria,
            created_at,
            user_id,
            users:user_id (
              email
            )
          `)
          .eq('publico', true)
          .order('created_at', { ascending: false });

        if (categoriaFiltro) {
          query = query.eq('categoria', categoriaFiltro);
        }

        if (termoBusca) {
          query = query.or(`titulo.ilike.%${termoBusca}%,texto.ilike.%${termoBusca}%`);
        }

        const { data: promptsData, error: promptsError } = await query;

        if (promptsError) throw promptsError;
        setPrompts(promptsData || []);

        // Se usuário estiver logado, carregar seus favoritos
        if (currentUserId) {
          const { data: favoritosData, error: favoritosError } = await supabase
            .from('favoritos')
            .select('prompt_id')
            .eq('user_id', currentUserId);

          if (favoritosError) throw favoritosError;
          setFavoritos(favoritosData?.map(f => f.prompt_id) || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [categoriaFiltro, termoBusca]);

  const adicionarFavorito = async (promptId) => {
    if (!userId) {
      alert('Você precisa estar logado para adicionar favoritos');
      return;
    }

    try {
      const { error } = await supabase
        .from('favoritos')
        .insert({ prompt_id: promptId, user_id: userId });

      if (error) {
        if (error.code === '23505') { // Violação de restrição única
          alert('Este prompt já está nos seus favoritos');
        } else {
          throw error;
        }
      } else {
        setFavoritos([...favoritos, promptId]);
        alert('Adicionado aos favoritos com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      alert('Erro ao adicionar aos favoritos');
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
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Explorar Prompts | CriaPrompt</title>
        <meta name="description" content="Explore prompts públicos da comunidade" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Explorar Prompts
        </h1>

        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Buscar prompts..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas as categorias</option>
                <option value="geral">Geral</option>
                <option value="criativo">Criativo</option>
                <option value="academico">Acadêmico</option>
                <option value="profissional">Profissional</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center">Carregando prompts...</p>
        ) : prompts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">
              Nenhum prompt encontrado para os critérios selecionados.
            </p>
            {categoriaFiltro || termoBusca ? (
              <button
                onClick={() => {
                  setCategoriaFiltro('');
                  setTermoBusca('');
                }}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Limpar filtros
              </button>
            ) : (
              <Link href="/criar">
                <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                  Criar o primeiro prompt
                </span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {prompt.categoria}
                  </span>
                  {userId && (
                    <button
                      onClick={() => adicionarFavorito(prompt.id)}
                      className={`${
                        favoritos.includes(prompt.id)
                          ? 'text-red-500'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      ❤️
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{prompt.titulo}</h3>
                <p className="text-gray-700 mb-4">{prompt.texto}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Por: {prompt.users?.email || 'Usuário anônimo'}
                  </span>
                  <button
                    onClick={() => copiarParaClipboard(prompt.texto)}
                    className="text-indigo-600 hover:text-indigo-800"
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
  );
}