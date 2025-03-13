import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import { supabase } from '../../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const { redirect } = router.query;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setMessage(null);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirect || '/dashboard'}`
        }
      });

      if (error) throw error;

      setMessage('Verifique seu email para o link de acesso!');
    } catch (error) {
      console.error('Erro no login:', error);
      setError(error.message || 'Ocorreu um erro durante o login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Login | CriaPrompt</title>
        <meta name="description" content="Faça login na plataforma CriaPrompt" />
      </Head>

      <Header />

      <main className="container-app py-10">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Entrar na CriaPrompt
          </h1>

          <p className="text-center text-gray-600 mb-6">
            Entre com seu email para receber um link de acesso mágico.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Acesso'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Ainda não tem uma conta? Não se preocupe, basta inserir seu email acima.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}