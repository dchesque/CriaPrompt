import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirecionar para a página de login com retorno
          router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
          return;
        }
        
        setAuthenticated(true);
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Também monitorar alterações na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (event === 'SIGNED_IN' && !authenticated) {
        setAuthenticated(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [router, authenticated]);

  // Exibir tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Só renderiza os filhos se estiver autenticado
  return authenticated ? children : null;
}