import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
    setMenuOpen(false);
    setProfileMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (profileMenuOpen) setProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
    if (menuOpen) setMenuOpen(false);
  };

  // Função para obter iniciais do e-mail
  const getInitials = (email) => {
    if (!email) return '?';
    
    // Pegar a primeira parte do e-mail (antes do @)
    const username = email.split('@')[0];
    
    // Se o username tiver pelo menos 2 caracteres, pegar as duas primeiras letras
    if (username.length >= 2) {
      return username.substring(0, 2).toUpperCase();
    }
    
    // Caso contrário, retorna o que tiver
    return username.toUpperCase();
  };

  return (
    <header className="bg-white shadow">
      <div className="container-app py-4">
        <div className="flex justify-between items-center">
        <Link href="/">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="CriaPrompt Logo" 
                className="h-10 w-auto cursor-pointer" 
              />
            </div>
          </Link>

          {/* Menu para dispositivos móveis */}
          <div className="md:hidden flex items-center">
            {!loading && user && (
              <div className="relative mr-4">
                <button 
                  onClick={toggleProfileMenu}
                  className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-800 focus:outline-none"
                >
                  {getInitials(user.email)}
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <Link href="/perfil">
                        <span 
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Meu Perfil
                        </span>
                      </Link>
                      <Link href="/dashboard">
                        <span 
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Dashboard
                        </span>
                      </Link>
                      <Link href="/configuracoes">
                        <span 
                          onClick={() => setProfileMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        >
                          Configurações
                        </span>
                      </Link>
                      <button 
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={toggleMenu}
              className="p-2 text-gray-700 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Menu para desktop */}
          <div className="hidden md:flex items-center">
            <nav className="mr-6">
              <ul className="flex space-x-6">
                <li>
                  <Link href="/">
                    <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Início</span>
                  </Link>
                </li>
                <li>
                  <Link href="/explorar">
                    <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Explorar</span>
                  </Link>
                </li>
                <li>
                  <Link href="/busca">
                    <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Busca</span>
                  </Link>
                </li>
                <li>
                  <Link href="/estatisticas">
                    <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Estatísticas</span>
                  </Link>
                </li>
                {!loading && user && (
                  <>
                    <li>
                      <Link href="/criar">
                        <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Criar Prompt</span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/favoritos">
                        <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Favoritos</span>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            {!loading && (
              <>
                {user ? (
                  <div className="relative">
                    <button 
                      onClick={toggleProfileMenu}
                      className="flex items-center space-x-2 focus:outline-none"
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-medium text-indigo-800">
                        {getInitials(user.email)}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                        <div className="py-1">
                          <div className="px-4 py-2 text-xs text-gray-400 border-b">
                            {user.email}
                          </div>
                          <Link href="/perfil">
                            <span 
                              onClick={() => setProfileMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              Meu Perfil
                            </span>
                          </Link>
                          <Link href="/dashboard">
                            <span 
                              onClick={() => setProfileMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              Dashboard
                            </span>
                          </Link>
                          <Link href="/configuracoes">
                            <span 
                              onClick={() => setProfileMenuOpen(false)}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              Configurações
                            </span>
                          </Link>
                          <button 
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Sair
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href="/auth/login">
                    <span className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 cursor-pointer">
                      Entrar
                    </span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Menu móvel expansível */}
        {menuOpen && (
          <nav className="mt-4 md:hidden">
            <ul className="flex flex-col space-y-3 border-t pt-3">
              <li>
                <Link href="/">
                  <span 
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                  >
                    Início
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/explorar">
                  <span 
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                  >
                    Explorar
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/busca">
                  <span 
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                  >
                    Busca
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/estatisticas">
                  <span 
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                  >
                    Estatísticas
                  </span>
                </Link>
              </li>
              {!loading && (
                <>
                  {user ? (
                    <>
                      <li>
                        <Link href="/criar">
                          <span 
                            onClick={() => setMenuOpen(false)}
                            className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                          >
                            Criar Prompt
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link href="/favoritos">
                          <span 
                            onClick={() => setMenuOpen(false)}
                            className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                          >
                            Favoritos
                          </span>
                        </Link>
                      </li>
                    </>
                  ) : (
                    <li>
                      <Link href="/auth/login">
                        <span 
                          onClick={() => setMenuOpen(false)}
                          className="text-gray-700 hover:text-indigo-600 cursor-pointer block py-1"
                        >
                          Entrar
                        </span>
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}