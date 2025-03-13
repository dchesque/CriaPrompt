import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
  };

  return (
    <header className="bg-white shadow">
      <div className="container-app py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold text-indigo-600 cursor-pointer">CriaPrompt</span>
          </Link>
          <nav>
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
              {!loading && (
                <>
                  {user ? (
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
                      <li>
                        <Link href="/dashboard">
                          <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Dashboard</span>
                        </Link>
                      </li>
                      <li>
                        <button 
                          onClick={handleSignOut}
                          className="text-gray-700 hover:text-indigo-600 cursor-pointer"
                        >
                          Sair
                        </button>
                      </li>
                    </>
                  ) : (
                    <li>
                      <Link href="/auth/login">
                        <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Entrar</span>
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}