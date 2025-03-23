// src/components/PromptCard.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabaseClient';
import { 
  Heart, 
  Eye, 
  Edit, 
  Trash2, 
  Tag, 
  Lock, 
  Globe,
  Play,
  X,
  MessageSquare,
  Share2,
  User,
  Star,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

// Mapeamento de cores para categorias
const categoriaCores = {
  'escrita': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  'marketing': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  'negócios': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'educação': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'criativo': { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  'tecnologia': { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'pessoal': { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  'saúde': { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
  'default': { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-500/30' },
};

export default function PromptCard({ 
  prompt, 
  userId, 
  isFavorito, 
  onToggleFavorito,
  favoritosCount = 0,
  showActions = true,
  showAuthor = true,
  isOwner = false,
  onClickCard,
  onClosePreview,
  size = "default" // novo: "default", "small", "large"
}) {
  // Bloco de estados
  const [hovering, setHovering] = useState(false);
  const router = useRouter();

  // Verificar se o usuário é o proprietário do prompt
  const promptOwner = isOwner || (userId && prompt.user_id === userId);
  
  // Obter estilo da categoria
  const getCategoryStyle = (category) => {
    return categoriaCores[category?.toLowerCase()] || categoriaCores.default;
  };

  // Navegar para o prompt
  const navigateToPrompt = (e) => {
    if (onClickCard) {
      onClickCard(prompt);
    } else {
      router.push(`/prompt/${prompt.id}`);
    }
  };

  // Navegar para edição
  const navigateToEdit = (e) => {
    e.stopPropagation();
    router.push(`/prompt/${prompt.id}/editar`);
  };

  // Utilizar o prompt
  const utilizarPrompt = (e) => {
    e.stopPropagation();
    // Abrir em nova aba
    window.open(`/usar/${prompt.id}`, '_blank');
  };

  // Copiar texto do prompt
  const copiarTexto = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.texto);
    toast.success('Texto copiado para a área de transferência');
  };

  // Adicionar/remover favorito
  const toggleFavorito = async (e) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.info('Você precisa estar logado para adicionar aos favoritos');
      return;
    }
    
    if (onToggleFavorito) {
      onToggleFavorito(prompt.id);
    } else {
      try {
        if (isFavorito) {
          // Remover dos favoritos
          await supabase
            .from('favoritos')
            .delete()
            .eq('prompt_id', prompt.id)
            .eq('user_id', userId);
            
          toast.success('Removido dos favoritos');
        } else {
          // Adicionar aos favoritos
          await supabase
            .from('favoritos')
            .insert([
              { prompt_id: prompt.id, user_id: userId }
            ]);
            
          toast.success('Adicionado aos favoritos');
        }
      } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        toast.error('Ocorreu um erro ao atualizar favorito');
      }
    }
  };

  // Excluir prompt
  const excluirPrompt = async (e) => {
    e.stopPropagation();
    
    if (!promptOwner) {
      toast.error('Você não tem permissão para excluir este prompt');
      return;
    }
    
    if (confirm('Tem certeza que deseja excluir este prompt? Esta ação não pode ser desfeita.')) {
      try {
        // Excluir prompt
        const { error } = await supabase
          .from('prompts')
          .delete()
          .eq('id', prompt.id);
          
        if (error) throw error;
        
        toast.success('Prompt excluído com sucesso');
        
        // Redirecionar se estiver na página do prompt
        if (router.pathname.includes(`/prompt/${prompt.id}`)) {
          router.push('/explorar');
        } else {
          // Recarregar a página atual
          router.reload();
        }
      } catch (error) {
        console.error('Erro ao excluir prompt:', error);
        toast.error('Ocorreu um erro ao excluir o prompt');
      }
    }
  };

  // Limitar texto para preview
  const limitarTexto = (texto, limite = 120) => {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };

  // Obter email/nome do autor
  const getAuthor = () => {
    if (prompt.profiles?.nome) return prompt.profiles.nome;
    if (prompt.users?.nome) return prompt.users.nome;
    if (prompt.users?.email) return prompt.users.email.split('@')[0];
    if (prompt.profiles?.email) return prompt.profiles.email.split('@')[0];
    return 'Usuário';
  };

  // Formatação de data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Card 
      className={cn(
        "border border-white/10 bg-background/30 backdrop-blur-md hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer relative overflow-hidden group",
        size === "large" && "md:col-span-2 md:row-span-2",
        size === "small" && "h-full"
      )}
      onClick={navigateToPrompt}
    >
      {/* Indicador de categoria no topo */}
      {prompt.categoria && (
        <div 
          className={cn(
            "h-1 w-full absolute top-0 left-0",
            getCategoryStyle(prompt.categoria).bg
          )}
        />
      )}
      
      {/* Indicador de privacidade */}
      {!prompt.publico && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
            <Lock className="h-3 w-3 mr-1" />
            Privado
          </Badge>
        </div>
      )}
      
      <CardHeader className="p-5">
        <div className="flex justify-between items-start gap-2 mb-2">
          <CardTitle className="text-lg font-medium line-clamp-1 group-hover:text-indigo-300 transition-colors">
            {prompt.titulo}
          </CardTitle>
          {prompt.categoria && (
            <Badge 
              variant="outline" 
              className={cn(
                "ml-auto",
                getCategoryStyle(prompt.categoria).bg,
                getCategoryStyle(prompt.categoria).text,
                getCategoryStyle(prompt.categoria).border
              )}
            >
              {prompt.categoria}
            </Badge>
          )}
        </div>
        
        {showAuthor && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="h-3 w-3 mr-1.5" />
            {getAuthor()}
          </div>
        )}
        
        <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
          {prompt.descricao || limitarTexto(prompt.texto, 120)}
        </p>
      </CardHeader>
      
      <CardContent className="px-5 pb-2">
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {prompt.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="bg-indigo-500/5 border-indigo-500/20 text-indigo-300 text-xs">
                #{tag}
              </Badge>
            ))}
            {prompt.tags.length > 3 && (
              <Badge variant="outline" className="bg-white/5 border-white/10 text-white/70 text-xs">
                +{prompt.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-5 py-4 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {prompt.views || 0}
          </div>
          <div className="flex items-center gap-1">
            <Heart className={cn("h-4 w-4", isFavorito && "fill-rose-500 text-rose-500")} />
            {favoritosCount}
          </div>
          <div className="text-xs">
            {formatDate(prompt.created_at)}
          </div>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={toggleFavorito}
            >
              <Heart className={cn("h-4 w-4", isFavorito && "fill-rose-500 text-rose-500")} />
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={copiarTexto}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={utilizarPrompt}
            >
              <Play className="h-4 w-4" />
            </Button>
            
            {promptOwner && (
              <>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0" 
                  onClick={navigateToEdit}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                  onClick={excluirPrompt}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}