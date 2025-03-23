import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../../lib/supabaseClient';
import {
  BarChart3,
  Users,
  FileText,
  Settings,
  CreditCard,
  Package,
  Tag,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Database,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState({
    conteudo: false,
    usuarios: false,
    financeiro: false,
    configuracoes: false
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        
        // Verificar se o usuário está autenticado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login');
          return;
        }
        
        setUserInfo({
          id: session.user.id,
          email: session.user.email
        });
        
        // Verificar se o usuário é administrador
        const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin', {
          user_uuid: session.user.id
        });
        
        if (isAdminError) {
          console.error('Erro ao verificar status de admin:', isAdminError);
          toast.error('Erro ao verificar permissões');
          router.push('/dashboard');
          return;
        }
        
        if (!isAdminData) {
          toast.error('Você não tem permissão para acessar esta área');
          router.push('/dashboard');
          return;
        }
        
        setIsAdmin(true);
        
        // Buscar mais informações do usuário
        const { data: perfil, error: perfilError } = await supabase
          .from('perfis_usuario')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (perfil && !perfilError) {
          setUserInfo({
            ...userInfo,
            nome: perfil.nome_completo,
            imagem: perfil.imagem_perfil
          });
        }
        
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
        toast.error('Erro ao verificar permissões');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [router]);
  
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      router.push('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
      toast.error('Erro ao sair');
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const toggleCollapsed = (section) => {
    setIsCollapsed({
      ...isCollapsed,
      [section]: !isCollapsed[section]
    });
  };
  
  // Verificar se o link está ativo
  const isLinkActive = (href) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Sidebar */}
      <div 
        className={`bg-slate-800 text-white transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } fixed h-full z-10`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {isSidebarOpen && (
            <Link href="/admin" className="text-xl font-bold">
              CriaPrompt Admin
            </Link>
          )}
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-slate-700"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          <nav className="mt-5 px-2">
            <Link href="/admin" className={`
              flex items-center px-4 py-2 my-1 rounded-md transition-colors
              ${isLinkActive('/admin') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
            `}>
              <LayoutDashboard size={20} />
              {isSidebarOpen && <span className="ml-3">Dashboard</span>}
            </Link>
            
            <Link href="/busca" className={`
              flex items-center px-4 py-2 my-1 rounded-md transition-colors
              ${isLinkActive('/busca') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
            `}>
              <Search size={20} />
              {isSidebarOpen && <span className="ml-3">Buscar</span>}
            </Link>
            
            {/* Seção de Conteúdo */}
            <div className="mt-4">
              {isSidebarOpen ? (
                <Collapsible
                  open={!isCollapsed.conteudo}
                  onOpenChange={() => toggleCollapsed('conteudo')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md">
                    <div className="flex items-center">
                      <FileText size={20} />
                      <span className="ml-3">Conteúdo</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${!isCollapsed.conteudo ? 'transform rotate-180' : ''}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-9 pr-2">
                    <Link href="/admin/prompts" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/prompts') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Prompts
                    </Link>
                    <Link href="/admin/modelos" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/modelos') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Modelos
                    </Link>
                    <Link href="/admin/categorias" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/categorias') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Categorias
                    </Link>
                    <Link href="/admin/tags" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/tags') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Tags
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex justify-center p-2">
                  <FileText size={20} className="text-slate-300" />
                </div>
              )}
            </div>
            
            {/* Seção de Usuários */}
            <div className="mt-4">
              {isSidebarOpen ? (
                <Collapsible
                  open={!isCollapsed.usuarios}
                  onOpenChange={() => toggleCollapsed('usuarios')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md">
                    <div className="flex items-center">
                      <Users size={20} />
                      <span className="ml-3">Usuários</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${!isCollapsed.usuarios ? 'transform rotate-180' : ''}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-9 pr-2">
                    <Link href="/admin/usuarios" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/usuarios') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Todos os usuários
                    </Link>
                    <Link href="/admin/papeis" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/papeis') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Papéis e permissões
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex justify-center p-2">
                  <Users size={20} className="text-slate-300" />
                </div>
              )}
            </div>
            
            {/* Seção Financeira */}
            <div className="mt-4">
              {isSidebarOpen ? (
                <Collapsible
                  open={!isCollapsed.financeiro}
                  onOpenChange={() => toggleCollapsed('financeiro')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md">
                    <div className="flex items-center">
                      <CreditCard size={20} />
                      <span className="ml-3">Financeiro</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${!isCollapsed.financeiro ? 'transform rotate-180' : ''}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-9 pr-2">
                    <Link href="/admin/planos" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/planos') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Planos
                    </Link>
                    <Link href="/admin/assinaturas" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/assinaturas') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Assinaturas
                    </Link>
                    <Link href="/admin/transacoes" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/transacoes') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Transações
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex justify-center p-2">
                  <CreditCard size={20} className="text-slate-300" />
                </div>
              )}
            </div>
            
            {/* Seção de Configurações */}
            <div className="mt-4">
              {isSidebarOpen ? (
                <Collapsible
                  open={!isCollapsed.configuracoes}
                  onOpenChange={() => toggleCollapsed('configuracoes')}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 rounded-md">
                    <div className="flex items-center">
                      <Settings size={20} />
                      <span className="ml-3">Configurações</span>
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${!isCollapsed.configuracoes ? 'transform rotate-180' : ''}`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-9 pr-2">
                    <Link href="/admin/configuracoes/geral" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/configuracoes/geral') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Configurações gerais
                    </Link>
                    <Link href="/admin/configuracoes/pagamentos" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/configuracoes/pagamentos') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Pagamentos
                    </Link>
                    <Link href="/admin/configuracoes/limites" className={`
                      block py-2 px-4 my-1 rounded-md transition-colors
                      ${isLinkActive('/admin/configuracoes/limites') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
                    `}>
                      Limites e restrições
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex justify-center p-2">
                  <Settings size={20} className="text-slate-300" />
                </div>
              )}
            </div>
            
            {/* Outros links */}
            <Link href="/admin/auditoria" className={`
              flex items-center px-4 py-2 my-1 mt-4 rounded-md transition-colors
              ${isLinkActive('/admin/auditoria') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
            `}>
              <Database size={20} />
              {isSidebarOpen && <span className="ml-3">Logs de auditoria</span>}
            </Link>
            
            <Link href="/admin/analytics" className={`
              flex items-center px-4 py-2 my-1 rounded-md transition-colors
              ${isLinkActive('/admin/analytics') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}
            `}>
              <BarChart3 size={20} />
              {isSidebarOpen && <span className="ml-3">Analytics</span>}
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Conteúdo */}
      <div className={`transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-16'
      } flex-1`}>
        {/* Conteúdo principal */}
        <main className="p-6">
          <div className="flex justify-end mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center mr-2">
                    {userInfo?.imagem ? (
                      <img 
                        src={userInfo.imagem}
                        alt="Perfil"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {userInfo?.email?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    )}
                  </div>
                  {userInfo?.nome || userInfo?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/perfil')}>
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  Voltar para o app
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
} 