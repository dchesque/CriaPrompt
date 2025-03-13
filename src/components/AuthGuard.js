import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Função para verificar sessão
    const checkSession = async () => {
      try {
        setCheckingSession(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('AuthGuard: Sem sessão ativa, redirecionando para login');
          router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
          return;
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        router.push('/auth/login');
      } finally {
        setCheckingSession(false);
        setLoading(false);
      }
    };

    // Verificar sessão ao montar o componente
    checkSession();

    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/auth/login');
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session.user);
        } else if (event === 'USER_UPDATED') {
          setUser(session.user);
        }
      }
    );

    // Limpar subscrição ao desmontar
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading || checkingSession) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <div className="text-lg">Verificando autenticação...</div>
        </div>
      </div>
    );
  }

  // Se tiver um usuário, renderizar os componentes filhos
  if (user) {
    return children;
  }

  // Caso de fallback (não deveria chegar aqui por causa do redirecionamento)
  return null;
}