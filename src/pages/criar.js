import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function CriarPrompt() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [isPublico, setIsPublico] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo,
          texto: prompt,
          categoria,
          publico: isPublico,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar prompt');
      }

      alert('Prompt criado com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro:', error);
      setError(error.message || 'Falha ao criar o prompt. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Criar Prompt | CriaPrompt</title>
          <meta name="description" content="Crie seus prompts personalizados" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Criar Novo Prompt
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Prompt'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}