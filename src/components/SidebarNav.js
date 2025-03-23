"use client"

import { ChevronRight, ChevronDown, Compass, FolderIcon, HomeIcon, LogOut, Settings, Star, TagIcon, User, Brain, FileText, Zap, Search, Menu, X, ChevronLeft, BadgeCheck, Map, LayoutDashboard, ListChecks, FilePlus, LayoutTemplate, Users, GraduationCap, Library } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

import { cn } from "../lib/utils"

// Configuração de cores dos ícones
const iconColors = {
  home: "text-blue-400",
  search: "text-purple-400",
  myPrompts: "text-green-400",
  myModels: "text-amber-400",
  favorites: "text-pink-400",
  discover: "text-cyan-400",
  models: "text-indigo-400",
  settings: "text-gray-400",
  folder: "text-orange-400",
  tag: "text-emerald-400"
}

export function SidebarNav({ className, ...props }) {
  const [expandedCategories, setExpandedCategories] = useState({})
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao carregar sessão:', error)
          return
        }
        
        setSession(session)
        
        if (session?.user) {
          // Buscar perfil do usuário
          const { data: profile } = await supabase
            .from('perfis')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
            
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUserProfile()
  }, [])

  // Restaurar o estado de colapso da sidebar do localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar_collapsed')
    if (savedState) {
      setCollapsed(savedState === 'true')
    }
  }, [])

  // Fechar o menu móvel quando mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [router.pathname])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const getInitials = () => {
    if (userProfile?.nome) {
      const parts = userProfile.nome.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return userProfile.nome.substring(0, 2).toUpperCase()
    }
    
    if (session?.user?.email) {
      return session.user.email.substring(0, 2).toUpperCase()
    }
    
    return 'CP'
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
  
  const toggleCollapsed = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('sidebar_collapsed', newState.toString())
  }
  
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      {/* Botão do menu móvel */}
      <button 
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-black/80 text-white shadow-lg"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Logo móvel centralizado */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex justify-center items-center h-16 bg-black/95 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            CP
          </div>
          <span className="text-lg font-semibold text-white">CriaPrompt</span>
        </div>
      </div>
      
      {/* Overlay para fechar menu em dispositivos móveis */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-20"
          onClick={toggleMobileMenu}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "md:flex md:w-64 bg-black/95 fixed top-0 left-0 h-screen flex-col text-white z-20 flex-shrink-0 shadow-lg shadow-black/30 transition-all duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed && "md:w-16"
      )}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              CP
            </div>
            {!collapsed && <span className="text-lg font-semibold">CriaPrompt</span>}
          </div>
          
          {/* Botão de colapso (apenas desktop) */}
          <button 
            onClick={toggleCollapsed} 
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        {/* Campo de busca fixo */}
        <div className="px-3 py-3 border-b border-white/5">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder={collapsed ? "" : "Buscar..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full bg-white/5 border border-white/10 rounded-md text-sm",
                collapsed ? "px-2 py-2" : "pl-8 pr-3 py-2"
              )}
            />
            <button 
              type="submit" 
              className={cn(
                "text-gray-400 hover:text-white",
                collapsed ? "block mx-auto mt-2" : "absolute left-2.5 top-2.5"
              )}
            >
              <Search size={16} className={iconColors.search} />
            </button>
          </form>
        </div>

        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent flex-1 py-3">
          <div className="px-3">
            {!collapsed && <h2 className="px-3 text-xs uppercase font-medium text-gray-500 mb-1.5">PRINCIPAL</h2>}
            <nav className="space-y-1">
              <NavItem 
                href="/descobrir" 
                icon={<Map size={18} className={iconColors.discover} />} 
                label="Descobrir" 
                collapsed={collapsed}
              />
              
              <NavItem 
                href="/dashboard" 
                icon={<LayoutDashboard size={18} className={iconColors.home} />} 
                label="Dashboard" 
                collapsed={collapsed}
              />
              
              {/* Alteração: Prompts com submenus */}
              <div className="relative">
                <button
                  onClick={() => toggleCategory('prompts')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/5 transition-colors",
                    router.pathname.startsWith('/meus-prompts') || router.pathname.startsWith('/criar') ? "bg-white/10 text-white font-medium" : "text-gray-300 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">
                      <FileText size={18} className={iconColors.myPrompts} />
                    </span>
                    {!collapsed && <span className="text-sm">Prompts</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight
                      size={16}
                      className={cn("text-gray-400 transition-transform", expandedCategories['prompts'] && "transform rotate-90")}
                    />
                  )}
                </button>
                {expandedCategories['prompts'] && !collapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    <NavItem 
                      href="/meus-prompts" 
                      label="Meus Prompts" 
                      collapsed={collapsed}
                      className="text-xs py-1.5"
                    />
                    <NavItem 
                      href="/criar" 
                      label="Criar Prompt" 
                      collapsed={collapsed}
                      className="text-xs py-1.5"
                    />
                  </div>
                )}
              </div>
              
              {/* Alteração: Modelos Inteligentes com submenus */}
              <div className="relative">
                <button 
                  onClick={() => toggleCategory('modelos')}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/5 transition-colors",
                    router.pathname.startsWith('/meus-modelos') || router.pathname.startsWith('/modelos/') ? "bg-white/10 text-white font-medium" : "text-gray-300 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">
                      <LayoutTemplate size={18} className={iconColors.myModels} />
                    </span>
                    {!collapsed && <span className="text-sm">Modelos Inteligentes</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight
                      size={16}
                      className={cn("text-gray-400 transition-transform", expandedCategories['modelos'] && "transform rotate-90")}
                    />
                  )}
                </button>
                {expandedCategories['modelos'] && !collapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    <NavItem 
                      href="/meus-modelos" 
                      label="Meus Modelos" 
                      collapsed={collapsed}
                      className="text-xs py-1.5"
                    />
                    <NavItem 
                      href="/modelos/explorar" 
                      label="Explorar Modelos" 
                      collapsed={collapsed}
                      className="text-xs py-1.5"
                    />
                    <NavItem 
                      href="/modelos/criar" 
                      label="Criar Modelo" 
                      collapsed={collapsed}
                      className="text-xs py-1.5"
                    />
                  </div>
                )}
              </div>
              
              <NavItem 
                href="/favoritos" 
                icon={<Star size={18} className={iconColors.favorites} />} 
                label="Meus Favoritos" 
                collapsed={collapsed}
              />
              
              <NavItem 
                href="/modelos" 
                icon={<Library size={18} className={iconColors.models} />} 
                label="Biblioteca" 
                collapsed={collapsed}
              />
              
              {/* Item Comunidade com badge "Em breve" */}
              <div className="relative group">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 opacity-70 cursor-default",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className="flex-shrink-0">
                    <Users size={18} className={iconColors.search} />
                  </span>
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">Comunidade</span>
                      <span className="flex items-center justify-center text-[10px] font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-0.5 shadow-sm">
                        Em breve
                      </span>
                    </div>
                  )}
                  
                  {/* Tooltip para modo collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Comunidade <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-1.5 py-0.5 rounded-full text-[9px] ml-1">Em breve</span>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Item Treinamento com badge "Em breve" */}
              <div className="relative group">
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 opacity-70 cursor-default",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <span className="flex-shrink-0">
                    <GraduationCap size={18} className={iconColors.folder} />
                  </span>
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">Treinamento</span>
                      <span className="flex items-center justify-center text-[10px] font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-0.5 shadow-sm">
                        Em breve
                      </span>
                    </div>
                  )}
                  
                  {/* Tooltip para modo collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Treinamento <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-1.5 py-0.5 rounded-full text-[9px] ml-1">Em breve</span>
                    </span>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>
        
        {/* Perfil do usuário */}
        <div className="mt-auto px-3 pt-3 pb-3 border-t border-white/5">
          <div className={cn(
            "transition-all duration-150 overflow-hidden",
            collapsed ? "bg-transparent" : "bg-white/5 rounded-lg p-2 border border-white/10"
          )}>
            <button
              onClick={toggleUserMenu}
              className={cn(
                "w-full flex items-center gap-2 rounded-md hover:bg-white/10 transition-colors",
                collapsed ? "justify-center p-2" : "px-2 py-2"
              )}
            >
              <div className="flex-shrink-0 relative">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Avatar" 
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-medium">
                    {getInitials()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              {!collapsed && (
                <>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-medium truncate w-full">
                      {userProfile?.nome || session?.user?.email || 'Usuário'}
                    </span>
                    {userProfile?.username && (
                      <span className="text-xs text-gray-400 truncate w-full">@{userProfile.username}</span>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className={cn("text-gray-400 transition-transform", userMenuOpen && "transform rotate-90")}
                  />
                </>
              )}
            </button>

            {userMenuOpen && (
              <div className={cn(
                "space-y-0.5 mt-1.5",
                collapsed && "absolute left-16 bottom-16 bg-black/95 border border-white/10 rounded-md p-1 min-w-44 shadow-xl"
              )}>
                <Link
                  href="/perfil"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <User size={16} className="text-blue-400" />
                  <span>Meu Perfil</span>
                </Link>
                <Link
                  href="/configuracoes"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  <Settings size={16} className="text-gray-400" />
                  <span>Configurações</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-500/10 transition-colors text-sm text-red-400"
                >
                  <LogOut size={16} className="text-red-400" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function NavItem({ href, icon, label, collapsed, className }) {
  const router = useRouter()
  const isActive = router.pathname === href || router.pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative group",
        isActive 
          ? "bg-white/10 text-white font-medium" 
          : "hover:bg-white/5 text-gray-300 hover:text-white",
        collapsed && "justify-center px-2",
        className
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
      )}
      <span className="flex-shrink-0">
        {icon}
      </span>
      {!collapsed && <span className="text-sm">{label}</span>}
      
      {/* Tooltip para modo collapsed */}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {label}
        </span>
      )}
    </Link>
  )
} 