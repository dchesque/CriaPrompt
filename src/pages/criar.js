import Head from 'next/head';
import Header from '../components/Header';
import { useState } from 'react';

export default function CriarPrompt() {
  const [prompt, setPrompt] = useState('');
  const [categoria, setCategoria] = useState('geral');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar lógica para salvar o prompt
    console.log({ prompt, categoria });
    alert('Prompt criado com sucesso!');
    setPrompt('');
  };

  return (
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
          <form onSubmit={handleSubmit}>
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
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300"
            >
              Salvar Prompt
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}