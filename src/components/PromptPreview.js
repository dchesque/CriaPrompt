// src/components/PromptPreview.js
import { useEffect } from 'react';
import PromptCard from './PromptCard';

export default function PromptPreview({ prompt, userId, isFavorito, onToggleFavorito, favoritosCount, onClose }) {
  // Efeito para desabilitar o scroll do body quando o modal está aberto
  useEffect(() => {
    // Desabilita o scroll
    document.body.style.overflow = 'hidden';
    
    // Reabilita o scroll ao desmontar
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Se clicar fora do card, fecha o modal
  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={handleClickOutside}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <PromptCard 
          prompt={prompt}
          userId={userId}
          isFavorito={isFavorito}
          onToggleFavorito={onToggleFavorito}
          favoritosCount={favoritosCount}
          showActions={true}
          showAuthor={true}
          isOwner={userId === prompt.user_id}
          onClosePreview={onClose}
        />
      </div>
    </div>
  );
}