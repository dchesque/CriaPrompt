import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Search, Menu, Home, BookOpen, PlusCircle, Heart as HeartIcon, User, Settings, LogOut, Moon, Sun, Info, Brain } from 'lucide-react';
import { useTheme } from 'next-themes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export default function AppHeader({ isLandingPage = false }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Se for a landing page, usamos um header simplificado
  if (isLandingPage) {
    return (
      <header className="border-b border-white/10 backdrop-blur-md bg-background/70 sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              CP
            </span>
            <span className="font-bold text-xl">CriaPrompt</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6">
              <Link href="/explorar" className="text-sm hover:text-primary transition-colors">
                Explorar
              </Link>
              <Link href="/sobre" className="text-sm hover:text-primary transition-colors">
                Sobre
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4 mr-2" /> Claro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4 mr-2" /> Escuro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Settings className="h-4 w-4 mr-2" /> Sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                size="sm"
                className="bg-background/30 backdrop-blur-xl border border-white/20"
              >
                Entrar
              </Button>
              <Button
                onClick={() => router.push('/auth/login')}
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
              >
                Criar Conta
              </Button>
            </div>
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-6 mt-6">
                  <Link href="/explorar" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <BookOpen size={18} />
                    <span>Explorar</span>
                  </Link>
                  <Link href="/sobre" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Info size={18} />
                    <span>Sobre</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span>Tema:</span>
                    <Button variant="ghost" size="sm" onClick={() => setTheme('light')}>
                      <Sun size={18} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setTheme('dark')}>
                      <Moon size={18} />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  // Header padrão para o app
  return (
    <header className="border-b border-white/10 backdrop-blur-md bg-background/70 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              CP
            </span>
            <span className="font-bold text-xl">CriaPrompt</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 ml-8">
            <Link 
              href="/dashboard" 
              className={`text-sm hover:text-primary transition-colors ${
                router.pathname === '/dashboard' ? 'text-primary font-semibold' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/explorar" 
              className={`text-sm hover:text-primary transition-colors ${
                router.pathname === '/explorar' ? 'text-primary font-semibold' : ''
              }`}
            >
              Explorar
            </Link>
            <Link 
              href="/favoritos" 
              className={`text-sm hover:text-primary transition-colors ${
                router.pathname === '/favoritos' ? 'text-primary font-semibold' : ''
              }`}
            >
              Favoritos
            </Link>
            <Link 
              href="/modelos" 
              className={`text-sm hover:text-primary transition-colors ${
                router.pathname.startsWith('/modelos') ? 'text-primary font-semibold' : ''
              }`}
            >
              Modelos Inteligentes
            </Link>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => router.push('/busca')}
            variant="ghost" 
            size="icon"
            className="rounded-full"
          >
            <Search size={18} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="h-4 w-4 mr-2" /> Claro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="h-4 w-4 mr-2" /> Escuro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Settings className="h-4 w-4 mr-2" /> Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            onClick={() => router.push('/criar')}
            size="sm"
            className="hidden md:flex bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
          >
            <PlusCircle size={16} className="mr-2" />
            Novo Prompt
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 bg-background/30 backdrop-blur-xl border border-white/20">
                <User size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/perfil')}>
                <User className="h-4 w-4 mr-2" /> Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
                <Settings className="h-4 w-4 mr-2" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-6 mt-6">
                <Link href="/dashboard" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <Home size={18} />
                  <span>Dashboard</span>
                </Link>
                <Link href="/explorar" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <BookOpen size={18} />
                  <span>Explorar</span>
                </Link>
                <Link href="/favoritos" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <HeartIcon size={18} />
                  <span>Favoritos</span>
                </Link>
                <Link href="/modelos" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <Brain size={18} />
                  <span>Modelos Inteligentes</span>
                </Link>
                <Link href="/criar" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <PlusCircle size={18} />
                  <span>Novo Prompt</span>
                </Link>
                <Link href="/perfil" className="flex items-center gap-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <User size={18} />
                  <span>Perfil</span>
                </Link>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  <LogOut size={18} className="mr-2" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 