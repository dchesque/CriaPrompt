import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ChevronLeft,
  Sparkles,
  Loader2,
  Brain,
  Send
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import AppHeader from '../../components/AppHeader';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';

export default function GerarModeloPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedModel, setGeneratedModel] = useState(null);
  const [error, setError] = useState(null);
  
  // Gerar modelo com IA
  const gerarModelo = async () => {
    if (!prompt.trim()) {
      toast.error('Por favor, descreva o tipo de modelo que você deseja criar');
      return;
    }
    
    if (prompt.length < 10) {
      toast.error('Por favor, forneça uma descrição mais detalhada');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para gerar um modelo');
        router.push('/login');
        return;
      }
      
      // Chamar a API para gerar o modelo
      const response = await fetch('/api/modelos/gerar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ input: prompt })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar modelo');
      }
      
      setGeneratedModel(data);
      toast.success('Modelo gerado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar modelo:', error);
      setError('Não foi possível gerar o modelo. Por favor, tente novamente.');
      toast.error('Falha ao gerar o modelo');
    } finally {
      setGenerating(false);
    }
  };
  
  // Salvar modelo gerado
  const salvarModelo = async () => {
    if (!generatedModel) return;
    
    try {
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para salvar um modelo');
        router.push('/login');
        return;
      }
      
      // Preparar modelo para salvar
      const novoModelo = {
        nome: generatedModel.nome,
        descricao: generatedModel.descricao,
        categoria: generatedModel.categoria,
        estrutura_prompt: generatedModel.estruturaPrompt,
        campos_variaveis: generatedModel.camposVariaveis,
        user_id: session.user.id,
        created_at: new Date().toISOString()
      };
      
      // Inserir o modelo no banco de dados
      const { data, error } = await supabase
        .from('modelos_inteligentes')
        .insert(novoModelo)
        .select('id')
        .single();
        
      if (error) throw error;
      
      toast.success('Modelo salvo com sucesso!');
      
      // Redirecionar para a página do modelo
      setTimeout(() => {
        router.push(`/modelos/${data.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Não foi possível salvar o modelo');
    }
  };
  
  // Editar modelo antes de salvar
  const editarModelo = () => {
    // Armazenar temporariamente o modelo na sessão do navegador
    if (generatedModel) {
      sessionStorage.setItem('modeloTemporario', JSON.stringify(generatedModel));
      router.push('/modelos/criar?from=ai');
    }
  };
  
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
          <title>Gerar Modelo com IA | CriaPrompt</title>
          <meta name="description" content="Crie modelos inteligentes usando IA" />
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
          
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Gerar Modelo com IA</h1>
          </div>
          
          <div className="space-y-8">
            {/* Instruções */}
            <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Assistente de Criação de Modelos</span>
                </CardTitle>
                <CardDescription>
                  Descreva o tipo de modelo que você deseja criar e nossa IA irá gerar um modelo estruturado com campos variáveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Textarea
                      placeholder="Ex: Preciso de um modelo para fazer descrições de produtos para e-commerce, com campos para nome do produto, características, preço e público-alvo"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="min-h-32 bg-background/50 backdrop-blur-sm border border-white/20"
                      disabled={generating || !!generatedModel}
                    />
                  </div>
                  
                  {!generatedModel && (
                    <Button
                      onClick={gerarModelo}
                      disabled={generating || !prompt.trim() || prompt.length < 10}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando Modelo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Modelo com IA
                        </>
                      )}
                    </Button>
                  )}
                  
                  {error && (
                    <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Modelo Gerado */}
            {generatedModel && (
              <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
                <CardHeader>
                  <CardTitle>Modelo Gerado</CardTitle>
                  <CardDescription>
                    O assistente de IA criou o seguinte modelo baseado na sua descrição
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Nome</h3>
                    <p className="text-lg font-semibold">{generatedModel.nome}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Categoria</h3>
                    <div className="inline-block bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
                      {generatedModel.categoria}
                    </div>
                  </div>
                  
                  {generatedModel.descricao && (
                    <div>
                      <h3 className="text-sm text-muted-foreground mb-1">Descrição</h3>
                      <p>{generatedModel.descricao}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Estrutura do Prompt</h3>
                    <div className="bg-background/50 rounded-md p-4 whitespace-pre-wrap font-mono text-sm">
                      {generatedModel.estruturaPrompt}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-1">Campos Variáveis</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {generatedModel.camposVariaveis.map((campo, index) => (
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
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-4 pt-6 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedModel(null);
                      setPrompt('');
                    }}
                    className="border-white/20"
                  >
                    Gerar Outro Modelo
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={editarModelo}
                      className="bg-background/30 backdrop-blur-xl border border-white/20"
                    >
                      Personalizar
                    </Button>
                    <Button
                      onClick={salvarModelo}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Salvar Modelo
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 