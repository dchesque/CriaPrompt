import Head from 'next/head';
import Header from '../components/Header';
import { useState, useEffect } from 'react';

export default function Favoritos() {
  // Simular dados de favoritos (em um app real, você usaria localStorage ou um banco de dados)
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    // Simular carregamento de dados
    setFavoritos([
      { id: 1, categoria: 'criativo', texto: 'Crie uma história sobre um viajante do tempo que visita o ano 3000.' },
      { id: 2, categoria: 'profissional', texto: 'Escreva um e-mail profissional solicitando um orçamento para um projeto de redesign de website.' }
    ]);
  }, []);

  return (
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

        {favoritos.length === 0 ? (
          <p className="text-center text-gray-600">Você ainda não tem prompts favoritos.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {favoritos.map((fav) => (
              <div key={fav.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {fav.categoria}
                  </span>
                  <button className="text-red-500 hover:text-red-700">
                    <span className="sr-only">Remover dos favoritos</span>
                    ❤️
                  </button>
                </div>
                <p className="text-gray-700">{fav.texto}</p>
                <div className="mt-4 flex justify-end">
                  <button className="text-indigo-600 hover:text-indigo-800">
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