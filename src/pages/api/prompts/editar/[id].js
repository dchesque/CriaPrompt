import Head from 'next/head';
import Header from '../../../components/Header';
import AuthGuard from '../../../components/AuthGuard';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

export default function EditarPrompt() {
  const router = useRouter();
  const { id } = router.query;

  const [titulo, setTitulo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [isPublico, setIsPublico] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Novos estados para as tags
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sugestoesTags, setSugestoesTags] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);

  useEffect(() => {
    const carregarPrompt = async () => {
      if (!id) return;

      try {
        const response = await fetch(`/api/prompts/${id}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login');
            return;
          }
          
          if (response.status === 403) {
            router.push('/dashboard');
            return;
          }
          
          throw new Error('Erro ao carregar prompt');
        }
        
        const data = await response.json();

        // Preencher os campos do formulário com os dados existentes
        setTitulo(data.titulo);
        setPrompt(data.texto);
        setCategoria(data.categoria);
        setIsPublico(data.publico);
        setTags(data.tags || []);
      } catch (error) {
        console.error('Erro ao carregar prompt:', error);
        setError('Não foi possível carregar este prompt.');
      } finally {
        setLoading(false);
      }
    };

    carregarPrompt();
  }, [id, router]);

  // Função para buscar sugestões de tags ao digitar
  const buscarSugestoesTags = async (valor) => {
    if (!valor.trim()) {
      setSugestoesTags([]);
      return;
    }
    
    setCarregandoSugestoes(true);
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('nome')
        .ilike('nome', `${valor}%`)
        .order('count', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      // Filtrar tags que já estão adicionadas
      const sugestoesFiltradas = data
        ?.map(tag => tag.nome)
        .filter(nome => !tags.includes(nome)) || [];
        
      setSugestoesTags(sugestoesFiltradas);
    } catch (error) {
      console.error('Erro ao buscar sugestões de tags:', error);
    } finally {
      setCarregandoSugestoes(false);
    }
  };

  // Atualizar sugestões ao digitar
  useEffect(() => {
    const handler = setTimeout(() => {
      buscarSugestoesTags(tagInput);
    }, 300);
    
    return () => clearTimeout(handler);
  }, [tagInput, tags]);

  // Adicionar tag
  const adicionarTag = (tag) => {
    const tagFormatada = tag.trim().toLowerCase();
    
    if (!tagFormatada || tags.includes(tagFormatada)) {
      return;
    }
    
    if (tags.length >= 5) {
      alert('Você pode adicionar no máximo 5 tags');
      return;
    }
    
    setTags([...tags, tagFormatada]);
    setTagInput('');
    setSugestoesTags([]);
  };

  // Remover tag
  const removerTag = (tagParaRemover) => {
    setTags(tags.filter(tag => tag !== tagParaRemover));
  };

  // Lidar com tecla Enter no input de tags
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(tagInput);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo,
          texto: prompt,
          categoria,
          publico: isPublico,
          tags: tags, // Incluindo as tags no payload
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar prompt');
      }

      alert('Prompt atualizado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      setError('Falha ao atualizar o prompt. Por favor, tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Editar Prompt | CriaPrompt</title>
          <meta name="description" content="Edite seu prompt" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Editar Prompt
          </h1>

          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <p className="text-center py-4">Carregando...</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="titulo" className="block text-gray-700 mb-2">
                    Título
                  </label>
                  <input
                    id="titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Dê um título para seu prompt"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="categoria" className="block text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    id="categoria"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="geral">Geral</option>
                    <option value="criativo">Criativo</option>
                    <option value="academico">Acadêmico</option>
                    <option value="profissional">Profissional</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="tags" className="block text-gray-700 mb-2">
                    Tags (até 5)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm flex items-center"
                      >
                        {tag}
                        <button 
                          type="button"
                          onClick={() => removerTag(tag)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      id="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Digite tags separadas por Enter"
                    />
                    {sugestoesTags.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        {sugestoesTags.map((sugestao, index) => (
                          <div 
                            key={index}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              adicionarTag(sugestao);
                            }}
                          >
                            {sugestao}
                          </div>
                        ))}
                      </div>
                    )}
                    {carregandoSugestoes && (
                      <div className="absolute right-3 top-3">
                        <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Pressione Enter para adicionar cada tag. Tags ajudam na descoberta do seu prompt.
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="prompt" className="block text-gray-700 mb-2">
                    Seu Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Digite seu prompt aqui..."
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isPublico}
                      onChange={(e) => setIsPublico(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Tornar público</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Prompts públicos podem ser visualizados por outros usuários
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}