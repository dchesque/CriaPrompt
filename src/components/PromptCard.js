// src/components/PromptCard.js
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabaseClient';
import { 
  FiHeart, 
  FiEye, 
  FiEdit2, 
  FiTrash2, 
  FiTag, 
  FiLock, 
  FiGlobe,
  FiPlay,
  FiX
} from 'react-icons/fi';
import { isPromptOwner } from '../utils/promptUtils';

// Mapeamento de cores para categorias
const categoriaCores = {
  geral: 'from-blue-500 to-blue-600',
  criativo: 'from-purple-500 to-purple-600',
  academico: 'from-green-500 to-green-600',
  profissional: 'from-orange-500 to-orange-600',
  imagem: 'from-pink-500 to-pink-600',
  codigo: 'from-gray-600 to-gray-700',
  outro: 'from-indigo-500 to-indigo-600'
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
  onClosePreview
}) {
  // Bloco de estados
  const [hovering, setHovering] = useState(false);
  const router = useRouter();

  // Verificar se o usuário é o proprietário do prompt
  const promptOwner = isOwner || (userId && prompt.user_id === userId);
  
  // Verificar se o prompt tem campos personalizáveis
  const temCamposPersonalizados = prompt.campos_personalizados && 
    Array.isArray(prompt.campos_personalizados) && 
    prompt.campos_personalizados.length > 0;

  // Ou verificar se tem padrão de #campo no texto
  const temCamposNoTexto = !temCamposPersonalizados && 
    /\#[a-zA-Z0-9]+/.test(prompt.texto);
  
  // Cor da categoria
  const corCategoria = categoriaCores[prompt.categoria] || 'from-indigo-500 to-purple-500';
  
  // Categoria em maiúsculas
  const categoriaUpper = prompt.categoria ? prompt.categoria.toUpperCase() : '';
    
  const navigateToPrompt = (e) => {
    e.preventDefault();
    // Se temos uma função de clique no card, chamamos ela em vez de navegar
    if (onClickCard) {
      onClickCard(prompt);
    } else {
      router.push(`/prompts/${prompt.id}`);
    }
  };

  const navigateToEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prompts/editar/${prompt.id}`);
  };
  
  // Função para ir para a página de utilização do prompt
  const utilizarPrompt = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prompts/utilizar/${prompt.id}`);
  };

  const toggleFavorito = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast.info('Você precisa estar logado para adicionar favoritos', {
        position: "bottom-center",
        autoClose: 3000
      });
      return;
    }

    if (onToggleFavorito) {
      onToggleFavorito(prompt.id);
      return;
    }

    try {
      if (isFavorito) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('prompt_id', prompt.id)
          .eq('user_id', userId);

        if (error) throw error;
        toast.success('Removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: prompt.id, user_id: userId });

        if (error) {
          if (error.code === '23505') { // Violação de restrição única
            toast.info('Este prompt já está nos seus favoritos');
          } else {
            throw error;
          }
        } else {
          toast.success('Adicionado aos favoritos');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const excluirPrompt = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Tem certeza que deseja excluir este prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir prompt');
      }

      toast.success('Prompt excluído com sucesso!');
      
      // Recarregar a página após um breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir prompt. Tente novamente.');
    }
  };

  // Limite de caracteres para exibição do texto
  const limitarTexto = (texto, limite = 120) => {
    if (texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };

  // Obter email do autor formatado
  const getAuthorEmail = () => {
    if (!prompt.users) return 'Usuário anônimo';
    
    const email = prompt.users.email;
    if (!email) return 'Usuário anônimo';
    
    // Formatar email para exibição
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    if (parts[0].length > 12) {
      return parts[0].substring(0, 12) + '...';
    }
    
    return parts[0];
  };

  // Verificar se estamos no modo de previsualização (lightbox)
  const isPreview = !!onClosePreview;

  return (
    <div 
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group h-full flex flex-col
      ${isPreview ? 'max-w-3xl mx-auto' : ''}`}
      onMouseEnter={() => setHovering(true)} 
      onMouseLeave={() => setHovering(false)}
      onClick={navigateToPrompt}
    >
      {/* Cabeçalho do card */}
      <div className={`bg-gradient-to-r ${corCategoria} p-3 text-white flex justify-between items-center`}>
        <div className="flex items-center">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-semibold">{categoriaUpper}</span>
          {prompt.publico !== undefined && (
            <span className="ml-2 text-xs flex items-center">
              {prompt.publico ? <FiGlobe size={12} className="mr-1" /> : <FiLock size={12} className="mr-1" />}
              {prompt.publico ? 'Público' : 'Privado'}
            </span>
          )}
        </div>
        
        {isPreview ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClosePreview();
            }}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Fechar prévia"
          >
            <FiX size={16} />
          </button>
        ) : (
          showActions && userId && (
            <button
              onClick={toggleFavorito}
              className={`p-1.5 rounded-full ${
                isFavorito 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              } transition-colors`}
              aria-label={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <FiHeart size={16} className={isFavorito ? "fill-current" : ""} />
            </button>
          )
        )}
      </div>
      
      {/* Conteúdo do card */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg mb-2 text-gray-800 line-clamp-2">{prompt.titulo}</h3>
        
        <p className={`text-gray-700 mb-3 ${isPreview ? '' : 'line-clamp-3'}`}>
          {isPreview ? prompt.texto : limitarTexto(prompt.texto)}
        </p>
        
        {/* Indicador de campos personalizáveis */}
        {(temCamposPersonalizados || temCamposNoTexto) && (
          <div className="bg-indigo-50 text-indigo-800 text-xs px-2 py-1 rounded-md inline-flex items-center mb-3 w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Personalizável
          </div>
        )}
        
        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {prompt.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/busca?tags=${tag}`;
                }}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-200 cursor-pointer flex items-center"
              >
                <FiTag size={10} className="mr-1" />
                {tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="mt-auto pt-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div>
              {showAuthor && (
                <span className="flex items-center">
                  Por: {getAuthorEmail()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center">
                <FiEye size={12} className="mr-1" /> {prompt.views || 0}
              </span>
              <span className="flex items-center">
                <FiHeart size={12} className="mr-1" /> {favoritosCount || 0}
              </span>
              {prompt.created_at && (
                <span>
                  {new Date(prompt.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Botões de ação */}
      {(showActions || isPreview) && (
        <div className={`p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center transition-all duration-300 ${hovering ? 'opacity-100' : 'opacity-80'}`}>
          {/* Favoritar (botão principal no modo preview) */}
          {isPreview && (
            <button
              onClick={toggleFavorito}
              className={`text-sm px-4 py-1.5 rounded-md flex items-center transition-colors
                ${isFavorito 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <FiHeart size={16} className={`mr-1.5 ${isFavorito ? "fill-red-500" : ""}`} />
              {isFavorito ? 'Favoritado' : 'Favoritar'}
            </button>
          )}
          
          <div className="flex space-x-2">
            {promptOwner ? (
              // Botões para o proprietário
              <>
                <button
                  onClick={utilizarPrompt}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-md transition-colors flex items-center shadow-sm"
                >
                  <FiPlay size={14} className="mr-1.5" />
                  Usar Prompt
                </button>
                <button
                  onClick={navigateToEdit}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors flex items-center"
                >
                  <FiEdit2 size={14} className="mr-1" /> Editar
                </button>
                <button 
                  onClick={excluirPrompt}
                  className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center"
                >
                  <FiTrash2 size={14} className="mr-1" /> Excluir
                </button>
              </>
            ) : (
              // Botão "Usar prompt" para usuários não proprietários
              <button
                onClick={utilizarPrompt}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-md transition-colors flex items-center shadow-sm"
              >
                <FiPlay size={14} className="mr-1.5" />
                Usar Prompt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}