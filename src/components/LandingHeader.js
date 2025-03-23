import Link from 'next/link';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function LandingHeader() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="w-full py-4 px-6 md:px-12 z-50 relative">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                CP
              </div>
              <span className="text-xl font-bold">CriaPrompt</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/explorar" className="text-muted-foreground hover:text-foreground transition-colors">
              Explorar
            </Link>
            <Link href="/estatisticas" className="text-muted-foreground hover:text-foreground transition-colors">
              Estatísticas
            </Link>
            <Link href="/sobre" className="text-muted-foreground hover:text-foreground transition-colors">
              Sobre
            </Link>
            
            {loading ? (
              <div className="h-10 w-24 bg-background/30 animate-pulse rounded-md"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                >
                  Sair
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                >
                  Registrar
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={toggleMobileMenu}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 bg-background/90 backdrop-blur-lg rounded-lg p-4 border border-white/10 animate-fade-in">
            <nav className="flex flex-col space-y-3">
              <Link href="/explorar" className="text-foreground hover:text-primary py-2 transition-colors">
                Explorar
              </Link>
              <Link href="/estatisticas" className="text-foreground hover:text-primary py-2 transition-colors">
                Estatísticas
              </Link>
              <Link href="/sobre" className="text-foreground hover:text-primary py-2 transition-colors">
                Sobre
              </Link>
              
              <div className="border-t border-white/10 pt-3 mt-2">
                {loading ? (
                  <div className="h-10 w-full bg-background/30 animate-pulse rounded-md"></div>
                ) : user ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="w-full bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                    >
                      Dashboard
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                    >
                      Sair
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => router.push('/auth/login')}
                      className="w-full bg-background/30 backdrop-blur-xl border border-white/20 hover:bg-white/10"
                    >
                      Entrar
                    </Button>
                    <Button
                      onClick={() => router.push('/auth/login')}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                    >
                      Registrar
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 