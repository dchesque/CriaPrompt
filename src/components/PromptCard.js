import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

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

  const toggleFavorito = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      alert('Você precisa estar logado para adicionar favoritos');
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
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('favoritos')
          .insert({ prompt_id: prompt.id, user_id: userId });

        if (error) {
          if (error.code === '23505') { // Violação de restrição única
            alert('Este prompt já está nos seus favoritos');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      alert('Erro ao atualizar favorito');
    }
  };

  const copiarParaClipboard = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(prompt.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      alert('Não foi possível copiar o texto');
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

      alert('Prompt excluído com sucesso!');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      alert('Erro ao excluir prompt. Tente novamente.');
    }
  };

  return (
    <Link href={`/prompts/${prompt.id}`}>
      <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-4">
          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
            {prompt.categoria}
          </span>
          {showActions && userId && (
            <button
              onClick={toggleFavorito}
              className={`${
                isFavorito
                  ? 'text-red-500'
                  : 'text-gray-400 hover:text-red-500'
              }`}
            >
              ❤️
            </button>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2">{prompt.titulo}</h3>
        <p className="text-gray-700 mb-4 line-clamp-3">{prompt.texto}</p>
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500">
            {showAuthor && prompt.users && (
              <span className="sm:mr-3">
                Por: {prompt.users.email}
              </span>
            )}
            <div className="flex items-center space-x-3 mt-1 sm:mt-0">
              {prompt.publico !== undefined && (
                <span>
                  {prompt.publico ? '📢 Público' : '🔒 Privado'}
                </span>
              )}
              <span>
                👁️ {prompt.views || 0}
              </span>
              {prompt.created_at && (
                <span>
                  {new Date(prompt.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            {showActions && (
              <>
                <button
                  onClick={copiarParaClipboard}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
                
                {isOwner && (
                  <>
                    <Link href={`/prompts/editar/${prompt.id}`} onClick={(e) => e.stopPropagation()}>
                      <span className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm">
                        Editar
                      </span>
                    </Link>
                    <button 
                      onClick={excluirPrompt}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Excluir
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}