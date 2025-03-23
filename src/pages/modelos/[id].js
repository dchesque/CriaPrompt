import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ChevronLeft,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
  Brain,
  Code,
  Tag
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import AppHeader from '../../components/AppHeader';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';

export default function DetalhesModelo() {
  const router = useRouter();
  const { id } = router.query;
  
  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletando, setDeletando] = useState(false);

  // Carregar modelo
  useEffect(() => {
    const carregarModelo = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('modelos_inteligentes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        setModelo(data);
        
      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        setError('Não foi possível carregar o modelo solicitado.');
      } finally {
        setLoading(false);
      }
    };
    
    carregarModelo();
  }, [id]);

  // Copiar estrutura do prompt
  const copiarPrompt = () => {
    if (!modelo) return;
    
    navigator.clipboard.writeText(modelo.estrutura_prompt);
    toast.success('Estrutura do modelo copiada para a área de transferência');
  };

  // Editar modelo
  const editarModelo = () => {
    router.push(`/modelos/editar/${id}`);
  };

  // Utilizar modelo
  const utilizarModelo = () => {
    router.push(`/modelos/utilizar/${id}`);
  };

  // Confirmar exclusão
  const confirmarExclusao = () => {
    setConfirmDelete(true);
  };

  // Cancelar exclusão
  const cancelarExclusao = () => {
    setConfirmDelete(false);
  };

  // Excluir modelo
  const excluirModelo = async () => {
    if (!modelo) return;
    
    try {
      setDeletando(true);
      
      const { error } = await supabase
        .from('modelos_inteligentes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Modelo excluído com sucesso');
      
      // Redirecionar após breve pausa
      setTimeout(() => {
        router.push('/modelos');
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast.error('Não foi possível excluir o modelo');
      setConfirmDelete(false);
    } finally {
      setDeletando(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
          <AppHeader />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando modelo...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !modelo) {
    return (
      <AuthGuard>
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
          <AppHeader />
          <div className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
            <Button 
              variant="ghost" 
              className="mb-4" 
              onClick={() => router.push('/modelos')}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar para Modelos
            </Button>
            
            <div className="flex flex-col items-center justify-center mt-12 text-center">
              <div className="text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Modelo não encontrado</h2>
              <p className="text-muted-foreground mb-6">
                {error || 'Não foi possível encontrar o modelo solicitado. Ele pode ter sido removido ou você não tem acesso a ele.'}
              </p>
              <Button 
                onClick={() => router.push('/modelos')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                Ver todos os modelos
              </Button>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

        {/* Decorative elements */}
        <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <Head>
          <title>{modelo.nome} | CriaPrompt</title>
          <meta name="description" content={modelo.descricao || `Detalhes do modelo "${modelo.nome}"`} />
        </Head>

        <AppHeader />
        <ToastContainer position="top-right" autoClose={3000} />

        <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full relative z-10">
          <Button 
            variant="ghost" 
            className="mb-4" 
            onClick={() => router.push('/modelos')}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar para Modelos
          </Button>
          
          <div className="space-y-8">
            {/* Cabeçalho do modelo */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Brain className="w-8 h-8 text-primary" />
                  <span>{modelo.nome}</span>
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {modelo.categoria}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Criado em {new Date(modelo.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={editarModelo}
                  className="bg-background/30 backdrop-blur-xl border border-white/20"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={utilizarModelo}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Utilizar
                </Button>
              </div>
            </div>
            
            {/* Descrição */}
            {modelo.descricao && (
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardContent className="pt-6">
                  <p>{modelo.descricao}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Estrutura do prompt */}
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-primary" />
                    <CardTitle>Estrutura do Prompt</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copiarPrompt}
                    className="text-xs bg-background/50"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-background/50 rounded-md p-4 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96">
                  {modelo.estrutura_prompt}
                </div>
              </CardContent>
            </Card>
            
            {/* Campos variáveis */}
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <CardTitle>Campos Variáveis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {modelo.campos_variaveis && modelo.campos_variaveis.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modelo.campos_variaveis.map((campo, index) => (
                      <div key={index} className="border border-white/10 rounded-md p-3 bg-background/40">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                            {campo.nome}
                          </span>
                        </div>
                        {campo.descricao && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {campo.descricao}
                          </p>
                        )}
                        {campo.valorPadrao && (
                          <p className="text-sm mt-2">
                            <span className="text-muted-foreground">Valor padrão: </span>
                            <span className="text-primary/80">{campo.valorPadrao}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center p-4">
                    Este modelo não possui campos variáveis.
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Botão de exclusão */}
            <div className="border-t border-white/10 pt-6">
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  onClick={confirmarExclusao}
                  className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Modelo
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-red-500">Tem certeza que deseja excluir este modelo?</p>
                  <Button
                    variant="outline"
                    onClick={cancelarExclusao}
                    className="text-xs border-white/20 bg-background/50"
                    disabled={deletando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={excluirModelo}
                    className="text-xs bg-red-500 hover:bg-red-600"
                    disabled={deletando}
                  >
                    {deletando ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white mr-2"></div>
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Confirmar Exclusão
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 