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

  useEffect(() => {
    async function carregarPrompt() {
      if (!id) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', id)
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          // Se não encontrou o prompt ou ele não pertence ao usuário
          router.push('/dashboard');
          return;
        }

        // Preencher o formulário com os dados do prompt
        setTitulo(data.titulo);
        setPrompt(data.texto);
        setCategoria(data.categoria);
        setIsPublico(data.publico);
      } catch (error) {
        console.error('Erro ao carregar prompt:', error);
        setError('Não foi possível carregar o prompt');
      } finally {
        setLoading(false);
      }
    }

    carregarPrompt();
  }, [id, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Atualizar o prompt
      const { error } = await supabase
        .from('prompts')
        .update({
          titulo,
          texto: prompt,
          categoria,
          publico: isPublico
        })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      alert('Prompt atualizado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      setError('Falha ao atualizar o prompt. Por favor, tente novamente.');
    } finally {
      setSaving(false);
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Editar Prompt | CriaPrompt</title>
          <meta name="description" content="Editar seu prompt personalizado" />
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

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}