import { useState, useEffect } from "react";
import { Clock, Edit, MoreHorizontal, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";

import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { PromptModal } from "./PromptModal";

// Mapeamento de categorias para cores
const categoriaCores = {
  geral: "from-blue-500 to-cyan-400",
  trabalho: "from-purple-500 to-pink-500",
  pessoal: "from-amber-500 to-orange-400",
  estudo: "from-emerald-500 to-teal-400",
  criativo: "from-pink-500 to-rose-400",
  academico: "from-green-500 to-emerald-400",
  profissional: "from-indigo-500 to-blue-400",
  codigo: "from-slate-500 to-gray-700",
  outro: "from-violet-500 to-purple-400"
};

export function PromptList({ filtro }) {
  const [prompts, setPrompts] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  
  // Estados para o modal
  const [promptIdAberto, setPromptIdAberto] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Carregar prompts e favoritos
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // Verificar sessão do usuário
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Usuário não autenticado");
        }
        
        setUserId(session.user.id);
        
        // Buscar prompts do usuário
        const { data: promptsData, error: promptsError } = await supabase
          .from('prompts')
          .select(`
            id,
            titulo,
            texto,
            descricao,
            categoria,
            publico,
            views,
            created_at,
            updated_at,
            tags,
            campos_personalizados
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (promptsError) throw promptsError;
        
        // Buscar favoritos do usuário
        const { data: favoritosData, error: favoritosError } = await supabase
          .from('favoritos')
          .select('prompt_id')
          .eq('user_id', session.user.id);
          
        if (favoritosError) throw favoritosError;
        
        setPrompts(promptsData || []);
        setFavoritos(favoritosData?.map(f => f.prompt_id) || []);
        
      } catch (error) {
        console.error('Erro ao carregar prompts:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    carregarDados();
  }, []);
  
  // Toggle favorito
  const toggleFavorito = async (promptId) => {
    if (!userId) return;
    
    const isFavorito = favoritos.includes(promptId);
    
    try {
      if (isFavorito) {
        // Remover dos favoritos
        await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', userId)
          .eq('prompt_id', promptId);
          
        setFavoritos(favoritos.filter(id => id !== promptId));
      } else {
        // Adicionar aos favoritos
        await supabase
          .from('favoritos')
          .insert({ user_id: userId, prompt_id: promptId });
          
        setFavoritos([...favoritos, promptId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };
  
  // Excluir prompt
  const excluirPrompt = async (promptId) => {
    if (!confirm('Tem certeza que deseja excluir este prompt?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      toast.success('Prompt excluído com sucesso');
      setPrompts(prompts.filter(p => p.id !== promptId));
      
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir prompt');
    }
  };
  
  // Abrir modal de prompt
  const abrirModal = (promptId) => {
    setPromptIdAberto(promptId);
    setModalAberto(true);
  };
  
  // Fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setPromptIdAberto(null);
  };
  
  // Formatar data relativa
  const formatarDataRelativa = (dataString) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diff = agora - data;
    
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    const semanas = Math.floor(dias / 7);
    const meses = Math.floor(dias / 30);
    
    if (segundos < 60) return "agora";
    if (minutos < 60) return `${minutos} min atrás`;
    if (horas < 24) return `${horas} h atrás`;
    if (dias < 7) return `${dias} dias atrás`;
    if (semanas < 4) return `${semanas} sem atrás`;
    if (meses < 12) return `${meses} meses atrás`;
    return `${Math.floor(meses / 12)} anos atrás`;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando prompts...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Erro ao carregar prompts: {error}</p>
        <p className="text-muted-foreground mt-2">Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }
  
  if (prompts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl mb-4">Você ainda não tem prompts salvos</p>
        <p className="text-muted-foreground mb-6">
          Comece criando seu primeiro prompt para organizar seus modelos de IA
        </p>
        <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <Link href="/criar">Criar Meu Primeiro Prompt</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {prompts.map((prompt) => {
          const corCategoria = categoriaCores[prompt.categoria?.toLowerCase()] || "from-blue-500 to-purple-500";
          const isFavorito = favoritos.includes(prompt.id);
          
          return (
            <Card
              key={prompt.id}
              className="flex flex-col bg-background/30 backdrop-blur-xl border border-white/20 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
            >
              <div className={`h-1.5 w-full bg-gradient-to-r ${corCategoria}`}></div>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">{prompt.titulo}</CardTitle>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/prompts/editar/${prompt.id}`}
                    className="flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit size={16} />
                    <span className="sr-only">Editar</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorito(prompt.id)}
                    className={`${isFavorito ? "text-yellow-500" : "text-muted-foreground"} hover:bg-white/10 transition-colors duration-200`}
                  >
                    <Star className={`h-4 w-4 ${isFavorito ? "fill-yellow-500" : ""}`} />
                    <span className="sr-only">Favorito</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-white/10">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Mais opções</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background/80 backdrop-blur-xl border border-white/20">
                      <DropdownMenuItem>
                        <Link href={`/prompts/editar/${prompt.id}`} className="flex w-full items-center">
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => abrirModal(prompt.id)} className="cursor-pointer">
                        Utilizar
                      </DropdownMenuItem>
                      <Separator className="my-1 opacity-20" />
                      <DropdownMenuItem className="text-destructive" onClick={() => excluirPrompt(prompt.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {prompt.descricao || prompt.texto || "Sem descrição"}
                </p>
              </CardContent>
              <CardFooter className="flex flex-col items-start pt-4 space-y-4">
                <div className="flex flex-wrap gap-2 w-full">
                  <div className="inline-flex items-center rounded-md border border-white/10 bg-white/5 backdrop-blur-md px-2.5 py-0.5 text-xs font-semibold">
                    {prompt.categoria || "Geral"}
                  </div>
                  {(prompt.tags || []).slice(0, 3).map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center rounded-md bg-white/5 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-xs font-semibold"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>Atualizado {formatarDataRelativa(prompt.updated_at || prompt.created_at)}</span>
                  </div>
                  <Button
                    onClick={() => abrirModal(prompt.id)}
                    className={`inline-flex items-center justify-center px-3 py-1 text-xs font-medium rounded-md bg-gradient-to-r ${corCategoria} text-white hover:shadow-md transition-all duration-200`}
                  >
                    Usar Prompt
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {/* Modal de utilização de prompt */}
      <PromptModal 
        promptId={promptIdAberto} 
        isOpen={modalAberto} 
        onClose={fecharModal} 
      />
    </>
  );
} 