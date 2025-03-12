import Head from 'next/head';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>CriaPrompt</title>
        <meta name="description" content="Aplicativo para criação de prompts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          Bem-vindo ao CriaPrompt
        </h1>
        <p className="mt-4 text-xl text-center text-gray-600">
          Sua ferramenta para criação de prompts inteligentes
        </p>
      </main>
    </div>
  );
}