import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabaseClient';
import { 
  FiCopy, 
  FiHeart, 
  FiEye, 
  FiEdit2, 
  FiTrash2, 
  FiTag, 
  FiLock, 
  FiGlobe
} from 'react-icons/fi';

export default function PromptCard({ 
  prompt, 
  userId, 
  isFavorito, 
  onToggleFavorito,
  showActions = true,
  showAuthor = true,
  isOwner = false
}) {
  const [copiado, setCopiado] = useState(false);
  const [hovering, setHovering] = useState(false);
  const router = useRouter();
  
  // Verificar se o prompt tem campos personalizáveis
  const temCamposPersonalizados = prompt.campos_personalizados && 
    Array.isArray(prompt.campos_personalizados) && 
    prompt.campos_personalizados.length > 0;

  // Ou verificar se tem padrão de #campo no texto
  const temCamposNoTexto = !temCamposPersonalizados && 
    /\#[a-zA-Z0-9]+/.test(prompt.texto);
    
  const navigateToPrompt = (e) => {
    e.preventDefault();
    router.push(`/prompts/${prompt.id}`);
  };

  const navigateToEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/prompts/editar/${prompt.id}`);
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

  const copiarParaClipboard = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(prompt.texto);
      setCopiado(true);
      toast.success('Copiado para a área de transferência!');
      
      // Reset do estado após 2 segundos
      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Não foi possível copiar o texto');
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

  return (
    <div 
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group h-full flex flex-col"
      onMouseEnter={() => setHovering(true)} 
      onMouseLeave={() => setHovering(false)}
      onClick={navigateToPrompt}
    >
      {/* Cabeçalho do card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 text-white flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{prompt.categoria}</span>
          {prompt.publico !== undefined && (
            <span className="ml-2 text-xs flex items-center">
              {prompt.publico ? <FiGlobe size={12} className="mr-1" /> : <FiLock size={12} className="mr-1" />}
              {prompt.publico ? 'Público' : 'Privado'}
            </span>
          )}
        </div>
        
        {showActions && userId && (
          <button
            onClick={toggleFavorito}
            className={`p-1.5 rounded-full ${
              isFavorito 
                ? 'bg-pink-500 text-white' 
                : 'bg-white/20 hover:bg-white/30 text-white'
            } transition-colors`}
            aria-label={isFavorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <FiHeart size={16} className={isFavorito ? "fill-current" : ""} />
          </button>
        )}
      </div>
      
      {/* Conteúdo do card */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg mb-2 text-gray-800 line-clamp-2">{prompt.titulo}</h3>
        
        <p className="text-gray-700 mb-3 line-clamp-3">{limitarTexto(prompt.texto)}</p>
        
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
              {showAuthor && prompt.users && (
                <span className="flex items-center">
                  Por: {prompt.users.email?.split('@')[0] || 'Anônimo'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center">
                <FiEye size={12} className="mr-1" /> {prompt.views || 0}
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
      {showActions && (
        <div className={`p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center transition-all duration-300 ${hovering ? 'opacity-100' : 'opacity-80'}`}>
          <button
            onClick={copiarParaClipboard}
            className="text-indigo-600 hover:text-indigo-800 text-sm px-2 py-1 rounded hover:bg-indigo-50 transition-colors flex items-center"
          >
            <FiCopy size={14} className="mr-1" />
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
          
          <div className="flex space-x-2">
            {isOwner && (
              <>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}