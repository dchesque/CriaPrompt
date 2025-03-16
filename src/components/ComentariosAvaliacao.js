// Bloco de Importações
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import { 
  FiMessageCircle, 
  FiStar, 
  FiEdit2, 
  FiTrash2, 
  FiSend 
} from 'react-icons/fi';

// Componente Principal de Comentários e Avaliação
export default function ComentariosAvaliacao({ promptId, userId }) {
  // Bloco de Estados
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [avaliacaoUsuario, setAvaliacaoUsuario] = useState(0);
  const [mediaAvaliacoes, setMediaAvaliacoes] = useState(0);
  const [editandoComentario, setEditandoComentario] = useState(null);

  // Bloco de Efeitos
  // Carregar comentários e avaliação do usuário
  useEffect(() => {
    const carregarDados = async () => {
      if (!promptId) return;
    
      try {
        // Buscar comentários com join na tabela de usuários
        const { data: comentariosData, error: comentariosError } = await supabase
          .from('comentarios')
          .select(`
            id, 
            texto, 
            created_at, 
            user_id,
            users(email)
          `)
          .eq('prompt_id', promptId)
          .order('created_at', { ascending: false });
    
        if (comentariosError) throw comentariosError;
        
        // Mapear os dados para o formato esperado
        const comentariosFormatados = comentariosData.map(comentario => ({
          ...comentario,
          users: {
            email: comentario.users?.email || 'Usuário anônimo'
          }
        }));
    
        setComentarios(comentariosFormatados || []);
    

        // Buscar avaliação do usuário
        if (userId) {
          const { data: avaliacaoData } = await supabase
            .from('avaliacoes')
            .select('nota')
            .eq('prompt_id', promptId)
            .eq('user_id', userId)
            .single();

          if (avaliacaoData) {
            setAvaliacaoUsuario(avaliacaoData.nota);
          }
        }

        // Buscar média de avaliações
        const { data: promptData } = await supabase
          .from('prompts')
          .select('media_avaliacoes')
          .eq('id', promptId)
          .single();

        if (promptData) {
          setMediaAvaliacoes(promptData.media_avaliacoes || 0);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar comentários e avaliações');
      }
    };

    carregarDados();
  }, [promptId, userId]);

  // Função para enviar comentário
  const enviarComentario = async (e) => {
    e.preventDefault();

    if (!userId) {
      toast.info('Você precisa estar logado para comentar');
      return;
    }

    if (!novoComentario.trim()) {
      toast.warning('O comentário não pode estar vazio');
      return;
    }

    try {
      const endpoint = editandoComentario 
        ? `/api/comentarios?id=${editandoComentario}` 
        : '/api/comentarios';

      const method = editandoComentario ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'comentario',
          promptId,
          texto: novoComentario,
          id: editandoComentario
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar comentário');
      }

      if (editandoComentario) {
        // Atualizar comentário na lista
        setComentarios(comentarios.map(c => 
          c.id === editandoComentario 
            ? { ...c, texto: novoComentario } 
            : c
        ));
        setEditandoComentario(null);
      } else {
        // Adicionar novo comentário
        setComentarios([
          { 
            ...data, 
            users: { email: userId }  // Adicionar email do usuário atual
          }, 
          ...comentarios
        ]);
      }

      setNovoComentario('');
      toast.success('Comentário salvo com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error(error.message);
    }
  };

  // Função para excluir comentário
  const excluirComentario = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      const response = await fetch(`/api/comentarios?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir comentário');
      }

      setComentarios(comentarios.filter(c => c.id !== id));
      toast.success('Comentário excluído com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error(error.message);
    }
  };

  // Função para avaliar prompt
  const avaliarPrompt = async (nota) => {
    if (!userId) {
      toast.info('Você precisa estar logado para avaliar');
      return;
    }

    try {
      const response = await fetch('/api/comentarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'avaliacao',
          promptId,
          nota
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao avaliar prompt');
      }

      setAvaliacaoUsuario(nota);
      toast.success('Avaliação salva com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error(error.message);
    }
  };

  // Renderização de Estrelas de Avaliação
  const renderEstrelas = (nota, onClick = null, ehMedia = false) => {
    return [1, 2, 3, 4, 5].map(n => (
      <FiStar 
        key={n} 
        className={`
          cursor-pointer 
          ${nota >= n 
            ? (ehMedia ? 'text-yellow-400' : 'text-indigo-600 fill-current') 
            : 'text-gray-300'}
          transition-colors duration-200
        `}
        size={24}
        onClick={() => onClick && onClick(n)}
      />
    ));
  };

  // Renderização Principal
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      {/* Seção de Avaliação */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3 flex items-center">
          <FiStar className="mr-2 text-indigo-600" />
          Avaliação
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex">
            {renderEstrelas(mediaAvaliacoes, null, true)}
          </div>
          <span className="text-gray-600">
            {mediaAvaliacoes.toFixed(1)} / 5 
            ({comentarios.length} avaliações)
          </span>
        </div>
        
        {userId && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-gray-600 mr-2">Sua avaliação:</span>
            <div className="flex">
              {renderEstrelas(avaliacaoUsuario, avaliarPrompt)}
            </div>
          </div>
        )}
      </div>

      {/* Seção de Comentários */}
      <div>
        <h3 className="text-xl font-semibold mb-3 flex items-center">
          <FiMessageCircle className="mr-2 text-indigo-600" />
          Comentários
        </h3>

        {/* Formulário de Comentário */}
        {userId && (
          <form onSubmit={enviarComentario} className="mb-6">
            <textarea
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder={
                editandoComentario 
                  ? "Edite seu comentário..." 
                  : "Deixe seu comentário..."
              }
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              {editandoComentario && (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoComentario(null);
                    setNovoComentario('');
                  }}
                  className="mr-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <FiSend className="mr-2" />
                {editandoComentario ? 'Atualizar' : 'Enviar'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Comentários */}
        {comentarios.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhum comentário ainda</p>
        ) : (
          <div className="space-y-4">
            {comentarios.map((comentario) => (
              <div 
                key={comentario.id} 
                className="border-b pb-3 last:border-b-0"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    {comentario.users?.email || 'Usuário anônimo'}
                  </span>
                  {userId === comentario.user_id && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditandoComentario(comentario.id);
                          setNovoComentario(comentario.texto);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => excluirComentario(comentario.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-800">{comentario.texto}</p>
                <span className="text-xs text-gray-500">
                  {new Date(comentario.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}