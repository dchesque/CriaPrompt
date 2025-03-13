import Head from 'next/head';
import Header from '../components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import PromptCard from '../components/PromptCard';

export default function BuscaAvancada() {
  const router = useRouter();
  const { q, categoria, ordem } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState([]);
  const [user, setUser] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  
  // Estados para o formulário de busca
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');

  useEffect(() => {
    // Sincronizar estados do formulário com a query da URL
    setTermoBusca(q || '');
    setCategoriaFiltro(categoria || '');
    setOrdenacao(ordem || 'recentes');
  
    const buscarPrompts = async () => {
      try {
        setLoading(true);
        
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        // Construir a query básica
        let query = supabase
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
          .eq('publico', true);
        
        // Adicionar filtro de termo de busca
        if (q) {
          query = query.or(`titulo.ilike.%${q}%,texto.ilike.%${q}%`);
        }
        
        // Adicionar filtro de categoria
        if (categoria && categoria !== 'todas') {
          query = query.eq('categoria', categoria);
        }
        
        // Adicionar ordenação
        if (ordem === 'populares') {
          query = query.order('views', { ascending: false });
        } else if (ordem === 'antigos') {
          query = query.order('created_at', { ascending: true });
        } else {
          // Padrão: recentes primeiro
          query = query.order('created_at', { ascending: false });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setPrompts(data || []);
        
        // Se usuário estiver logado, carregar favoritos
        if (session?.user) {
          const { data: favoritosData, error: favoritosError } = await supabase
            .from('favoritos')
            .select('prompt_id')
            .eq('user_id', session.user.id);

          if (favoritosError) throw favoritosError;
          setFavoritos(favoritosData?.map(f => f.prompt_id) || []);
        }
      } catch (error) {
        console.error('Erro ao buscar prompts:', error);
      } finally {
        setLoading(false);
      }
    };

    buscarPrompts();
  }, [q, categoria, ordem, router.isReady]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Atualizar a URL com os parâmetros de busca
    const params = new URLSearchParams();
    
    if (termoBusca) params.append('q', termoBusca);
    if (categoriaFiltro) params.append('categoria', categoriaFiltro);
    if (ordenacao) params.append('ordem', ordenacao);
    
    router.push(`/busca?${params.toString()}`);
  };

  const handleToggleFavorito = async (promptId) => {
    if (!user) {
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
          .eq('user_id', user.id);
          
        setFavoritos(favoritos.filter(id => id !== promptId));
      } else {
        // Adicionar aos favoritos
        await supabase
          .from('favoritos')
          .insert({ prompt_id: promptId, user_id: user.id });
          
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
        <title>Busca Avançada | CriaPrompt</title>
        <meta name="description" content="Busca avançada de prompts" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Busca Avançada
        </h1>

        {/* Formulário de busca */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="termoBusca" className="block text-gray-700 mb-2">
                  Termo de Busca
                </label>
                <input
                  id="termoBusca"
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  placeholder="Buscar por palavras-chave..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="categoria" className="block text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  id="categoria"
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todas as categorias</option>
                  <option value="geral">Geral</option>
                  <option value="criativo">Criativo</option>
                  <option value="academico">Acadêmico</option>
                  <option value="profissional">Profissional</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="ordenacao" className="block text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  id="ordenacao"
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="populares">Mais populares</option>
                  <option value="antigos">Mais antigos</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 transition duration-300"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Resultados */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {loading 
              ? 'Buscando prompts...' 
              : `${prompts.length} ${prompts.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`}
          </h2>
          
          {!loading && prompts.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">
                Nenhum prompt encontrado para os critérios selecionados.
              </p>
              <button
                onClick={() => {
                  setTermoBusca('');
                  setCategoriaFiltro('');
                  setOrdenacao('recentes');
                  router.push('/busca');
                }}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Limpar filtros
              </button>
            </div>
          )}
          
          {!loading && prompts.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  userId={user?.id}
                  isFavorito={favoritos.includes(prompt.id)}
                  onToggleFavorito={handleToggleFavorito}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}