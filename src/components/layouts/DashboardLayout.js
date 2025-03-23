import { SidebarNav } from "../SidebarNav";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/router";
import Head from "next/head";
import { cn } from "../../lib/utils";

export default function DashboardLayout({ children, title = "Dashboard" }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
        }
        
        setSession(session);
        setLoading(false);
        
        if (!session) {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setLoading(false);
      }
    }
    
    checkSession();
  }, [router]);
  
  // Verificar o estado da sidebar no localStorage
  useEffect(() => {
    const checkSidebarState = () => {
      const state = localStorage.getItem('sidebar_collapsed');
      setSidebarCollapsed(state === 'true');
    };
    
    // Verificar inicialmente
    checkSidebarState();
    
    // Adicionar event listener para mudanças no localStorage
    window.addEventListener('storage', checkSidebarState);
    
    // Verificar a cada 500ms para mudanças que não disparam o evento storage
    const interval = setInterval(checkSidebarState, 500);
    
    return () => {
      window.removeEventListener('storage', checkSidebarState);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title} - CriaPrompt</title>
        <meta name="description" content={`${title} - CriaPrompt`} />
      </Head>
      
      {/* Sidebar fixa */}
      <SidebarNav />
      
      {/* Container principal com margem para acomodar a sidebar */}
      <div 
        className={cn(
          "min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

        {/* Decorative elements */}
        <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        
        {/* Espaço para o cabeçalho fixo em dispositivos móveis */}
        <div className="md:hidden h-16"></div>
        
        <main className="p-6 md:p-8 pt-8 md:pt-8 relative z-10">
          {children}
        </main>
      </div>
    </>
  );
} 