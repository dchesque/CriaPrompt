import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { MailIcon, LogInIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';

export default function Login() {
  const router = useRouter();
  const { redirect } = router.query;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMessage(null);
      setError(null);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirect || '/dashboard'}`
        }
      });

      if (error) throw error;
      
      // O redirecionamento será manipulado pelo Supabase
    } catch (error) {
      console.error('Erro no login com Google:', error);
      setError(error.message || 'Ocorreu um erro durante o login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
      <Head>
        <title>Login | CriaPrompt</title>
        <meta name="description" content="Faça login na plataforma CriaPrompt" />
      </Head>

      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

      {/* Decorative elements */}
      <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full z-10 p-8 bg-background/30 backdrop-blur-xl border border-white/20 rounded-lg shadow-lg">
        <div className="mb-6 text-center">
          <div className="h-16 w-16 rounded-full bg-[#5D5FEF] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            CP
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Entrar na CriaPrompt
          </h1>
          <p className="text-muted-foreground">
            Escolha como deseja acessar a plataforma.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-500/10 text-green-500 rounded-md text-sm">
            {message}
          </div>
        )}

        {/* Botão de login com Google */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          variant="outline"
          className="w-full mb-6 py-2 px-4 border border-gray-300 flex items-center justify-center gap-2"
        >
          {googleLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Entrar com Google</span>
            </>
          )}
        </Button>

        <div className="relative my-6">
          <Separator />
          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/30 backdrop-blur-xl px-2 text-sm text-muted-foreground">
            ou
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-foreground text-sm font-medium mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MailIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 px-4 py-2 bg-background/30 backdrop-blur-xl border border-white/20 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Acesso'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não tem uma conta? Não se preocupe, basta escolher um método acima.
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="text-primary text-sm hover:underline"
          >
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}