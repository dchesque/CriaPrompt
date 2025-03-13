import Head from 'next/head';
import Header from '../components/Header';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    }
    
    checkSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>CriaPrompt</title>
        <meta name="description" content="Aplicativo para criação de prompts de IA" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Bem-vindo ao CriaPrompt
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Crie, salve e compartilhe prompts eficientes para Inteligência Artificial.
            Maximize sua produtividade com prompts personalizados!
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow p-8 flex-1">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Organize seus prompts
            </h2>
            <p className="text-gray-600 mb-6">
              Crie uma biblioteca pessoal de prompts organizados por categorias.
              Acesse facilmente quando precisar e nunca mais perca tempo reescrevendo.
            </p>
            {!loading && session ? (
              <Link href="/dashboard">
                <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                  Ver meus prompts
                </span>
              </Link>
            ) : (
              <Link href="/auth/login">
                <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                  Começar agora
                </span>
              </Link>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-8 flex-1">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Descubra novos prompts
            </h2>
            <p className="text-gray-600 mb-6">
              Explore prompts criados pela comunidade, adicione aos favoritos
              e aprenda com exemplos de alta qualidade de outros usuários.
            </p>
            <Link href="/explorar">
              <span className="inline-block bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                Explorar prompts
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Crie seus prompts</h3>
              <p className="text-gray-600">
                Escreva prompts para diversas finalidades e organize-os por categorias
              </p>
            </div>
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Salve e compartilhe</h3>
              <p className="text-gray-600">
                Mantenha seus prompts seguros em sua conta e compartilhe os melhores
              </p>
            </div>
            <div className="text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Use quando precisar</h3>
              <p className="text-gray-600">
                Acesse e copie seus prompts favoritos com facilidade a qualquer momento
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}