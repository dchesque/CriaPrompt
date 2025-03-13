import Head from 'next/head';
import Header from '../../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

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
      alert('Você precisa estar logado para adicionar favoritos');
      return;
    }

    try {
      const { error } = await supabase
        .from('favoritos')
        .insert({ prompt_id: promptId, user_id: user.id });

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

  const copiarParaClipboard = async (texto, event) => {
    // Impedir que o clique no botão de copiar leve à página de detalhes
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

  if (error || !usuario) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container-app py-10">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">{error || 'Perfil não encontrado'}</p>
            <Link href="/explorar">
              <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                Explorar Prompts
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
        <title>{usuario.nome || 'Usuário'} | CriaPrompt</title>
        <meta name="description" content={`Perfil de ${usuario.nome || 'usuário'} na plataforma CriaPrompt`} />
      </Head>

      <Header />

      <main className="container-app py-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              {usuario.nome || 'Usuário'}
            </h1>
            
            {usuario.bio && (
              <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                {usuario.bio}
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              <span>Membro desde {new Date(usuario.created_at || usuario.updated_at).toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span>{prompts.length} prompts públicos</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Prompts de {usuario.nome || 'Usuário'}
          </h2>

          {prompts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">
                Este usuário ainda não compartilhou nenhum prompt público.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {prompts.map((prompt) => (
                <Link href={`/prompts/${prompt.id}`} key={prompt.id}>
                  <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {prompt.categoria}
                      </span>
                      {user && (
                        <button
                          onClick={(e) => adicionarFavorito(prompt.id, e)}
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
                    <p className="text-gray-700 mb-4 line-clamp-3">{prompt.texto}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        👁️ {prompt.views || 0} visualizações
                      </span>
                      <button
                        onClick={(e) => copiarParaClipboard(prompt.texto, e)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}