import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ChevronLeft,
  Copy,
  Sparkles,
  Check,
  ExternalLink,
  Brain,
  RefreshCw
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import AppHeader from '../../../components/AppHeader';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';

export default function UtilizarModelo() {
  const router = useRouter();
  const { id } = router.query;
  
  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [camposPreenchidos, setCamposPreenchidos] = useState({});
  const [promptGerado, setPromptGerado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState(null);

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
        
        // Inicializar campos preenchidos com os valores padrão
        if (data.campos_variaveis && data.campos_variaveis.length > 0) {
          const camposIniciais = {};
          data.campos_variaveis.forEach(campo => {
            camposIniciais[campo.nome] = campo.valorPadrao || '';
          });
          setCamposPreenchidos(camposIniciais);
        }
        
        // Gerar preview inicial
        gerarPrompt(data, camposIniciais);
        
      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        setError('Não foi possível carregar o modelo solicitado.');
      } finally {
        setLoading(false);
      }
    };
    
    carregarModelo();
  }, [id]);

  // Função para atualizar um campo
  const atualizarCampo = (nomeCampo, valor) => {
    setCamposPreenchidos(prev => ({
      ...prev,
      [nomeCampo]: valor
    }));
  };

  // Função para gerar o prompt com os campos preenchidos
  const gerarPrompt = (modeloAtual = modelo, campos = camposPreenchidos) => {
    if (!modeloAtual) return;
    
    let promptFinal = modeloAtual.estrutura_prompt;
    
    // Substituir cada campo variável pelo seu valor
    Object.entries(campos).forEach(([nome, valor]) => {
      const regex = new RegExp(`\\(${nome}\\)`, 'g');
      promptFinal = promptFinal.replace(regex, valor || `[${nome}]`);
    });
    
    setPromptGerado(promptFinal);
  };

  // Atualizar preview quando campos são alterados
  useEffect(() => {
    if (modelo) {
      gerarPrompt();
    }
  }, [camposPreenchidos]);

  // Copiar prompt para a área de transferência
  const copiarPrompt = () => {
    navigator.clipboard.writeText(promptGerado);
    setCopiado(true);
    toast.success('Prompt copiado para a área de transferência');
    
    // Resetar estado de copiado após 2 segundos
    setTimeout(() => {
      setCopiado(false);
    }, 2000);
  };

  // Função para usar o prompt diretamente (implementar redirecionamento para criar um novo prompt)
  const usarPrompt = () => {
    // Redirecionar para a página de criação de prompt com o texto preenchido
    router.push({
      pathname: '/criar',
      query: { prompt: promptGerado }
    });
  };

  // Reiniciar campos para os valores padrão
  const reiniciarCampos = () => {
    if (!modelo || !modelo.campos_variaveis) return;
    
    const camposIniciais = {};
    modelo.campos_variaveis.forEach(campo => {
      camposIniciais[campo.nome] = campo.valorPadrao || '';
    });
    
    setCamposPreenchidos(camposIniciais);
    toast.info('Campos reiniciados para os valores padrão');
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
          <title>Utilizar Modelo: {modelo.nome} | CriaPrompt</title>
          <meta name="description" content={`Utilize o modelo "${modelo.nome}" para gerar prompts personalizados`} />
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
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Coluna esquerda - Informações do modelo e campos */}
            <div className="w-full md:w-5/12 space-y-6">
              {/* Cabeçalho do modelo */}
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-5 h-5 text-primary" />
                    <CardTitle>{modelo.nome}</CardTitle>
                  </div>
                  <CardDescription>{modelo.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {modelo.categoria}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Campos para preencher */}
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Preencha as variáveis</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reiniciarCampos}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reiniciar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modelo.campos_variaveis && modelo.campos_variaveis.length > 0 ? (
                      modelo.campos_variaveis.map((campo, index) => (
                        <div key={index} className="space-y-2">
                          <label className="block text-sm font-medium">
                            {campo.nome}
                            {campo.descricao && (
                              <span className="text-xs font-normal text-muted-foreground ml-2">
                                ({campo.descricao})
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={camposPreenchidos[campo.nome] || ''}
                            onChange={(e) => atualizarCampo(campo.nome, e.target.value)}
                            placeholder={campo.valorPadrao || `Valor para ${campo.nome}`}
                            className="w-full px-3 py-2 bg-background/30 backdrop-blur-xl border border-white/20 text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-muted-foreground">
                          Este modelo não possui campos variáveis para preencher.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Coluna direita - Preview e ações */}
            <div className="w-full md:w-7/12 space-y-6">
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">Resultado</CardTitle>
                    </div>
                    <Button
                      variant={copiado ? "default" : "outline"}
                      size="sm"
                      onClick={copiarPrompt}
                      className={`text-xs ${copiado ? 'bg-green-600' : 'bg-background/50'}`}
                    >
                      {copiado ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background/40 rounded-md p-4 min-h-[300px] whitespace-pre-wrap">
                    {promptGerado || <span className="text-muted-foreground">Preencha os campos para gerar o prompt.</span>}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/modelos/${id}`)}
                    className="bg-background/50"
                  >
                    Ver detalhes do modelo
                  </Button>
                  <Button
                    onClick={usarPrompt}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Usar no CriaPrompt
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 