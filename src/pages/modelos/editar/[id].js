import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Brain,
  Copy,
  RefreshCw
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import AppHeader from '../../../components/AppHeader';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import { Card, CardContent } from '../../../components/ui/card';

// Categorias predefinidas para modelos
const CATEGORIAS = [
  "Redação de Conteúdo",
  "Marketing",
  "Assistência Virtual",
  "E-commerce",
  "Desenvolvimento",
  "Educação",
  "Criatividade",
  "Produtividade",
  "Outros"
];

export default function EditarModelo() {
  const router = useRouter();
  const { id } = router.query;
  const promptInputRef = useRef(null);
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estruturaPrompt, setEstruturaPrompt] = useState('');
  const [camposVariaveis, setCamposVariaveis] = useState([]);
  const [campoSelecionado, setCampoSelecionado] = useState({ nome: '', descricao: '', valorPadrao: '' });
  const [erros, setErros] = useState({});
  
  // Estados de controle
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [modeloOriginal, setModeloOriginal] = useState(null);
  
  // Carregar dados do modelo
  useEffect(() => {
    const carregarModelo = async () => {
      if (!id) return;
      
      try {
        setCarregando(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('modelos_inteligentes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        // Guardar modelo original para comparação
        setModeloOriginal(data);
        
        // Preencher formulário
        setNome(data.nome || '');
        setDescricao(data.descricao || '');
        setCategoria(data.categoria || '');
        setEstruturaPrompt(data.estrutura_prompt || '');
        setCamposVariaveis(data.campos_variaveis || []);
        
      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        setError('Não foi possível carregar o modelo para edição.');
      } finally {
        setCarregando(false);
      }
    };
    
    carregarModelo();
  }, [id]);
  
  // Função para adicionar um campo variável
  const adicionarCampo = () => {
    // Validar se tem nome
    if (!campoSelecionado.nome.trim()) {
      setErros({ ...erros, campoNome: 'O nome do campo é obrigatório' });
      return;
    }
    
    // Validar se já existe
    if (camposVariaveis.some(campo => campo.nome === campoSelecionado.nome)) {
      setErros({ ...erros, campoNome: 'Já existe um campo com este nome' });
      return;
    }
    
    setErros({});
    setCamposVariaveis([...camposVariaveis, { ...campoSelecionado }]);
    setCampoSelecionado({ nome: '', descricao: '', valorPadrao: '' });
  };
  
  // Função para remover um campo variável
  const removerCampo = (index) => {
    const novosCampos = [...camposVariaveis];
    novosCampos.splice(index, 1);
    setCamposVariaveis(novosCampos);
  };
  
  // Função para inserir campo no prompt
  const inserirCampoNoPrompt = (nomeCampo) => {
    if (!promptInputRef.current) return;
    
    const input = promptInputRef.current;
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    
    const textoAntes = estruturaPrompt.substring(0, startPos);
    const textoDepois = estruturaPrompt.substring(endPos);
    const marcador = `{${nomeCampo}}`;
    
    setEstruturaPrompt(textoAntes + marcador + textoDepois);
    
    // Foco no textarea
    setTimeout(() => {
      input.focus();
      const novoPos = startPos + marcador.length;
      input.setSelectionRange(novoPos, novoPos);
    }, 50);
  };
  
  // Função para copiar o prompt para a área de transferência
  const copiarPrompt = () => {
    navigator.clipboard.writeText(estruturaPrompt);
    toast.success('Prompt copiado para a área de transferência');
  };
  
  // Validar formulário
  const validarFormulario = () => {
    const novosErros = {};
    
    if (!nome.trim()) novosErros.nome = 'O nome do modelo é obrigatório';
    if (!estruturaPrompt.trim()) novosErros.estruturaPrompt = 'A estrutura do prompt é obrigatória';
    if (!categoria) novosErros.categoria = 'A categoria é obrigatória';
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };
  
  // Função para submeter o formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;
    
    try {
      setEnviando(true);
      
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado para editar um modelo');
        router.push('/login');
        return;
      }
      
      // Preparar dados para atualização
      const modeloAtualizado = {
        nome,
        descricao,
        categoria,
        estrutura_prompt: estruturaPrompt,
        campos_variaveis: camposVariaveis,
        updated_at: new Date().toISOString()
      };
      
      // Atualizar modelo no banco de dados
      const { error } = await supabase
        .from('modelos_inteligentes')
        .update(modeloAtualizado)
        .eq('id', id)
        .eq('user_id', session.user.id); // Garantir que apenas o proprietário pode editar
        
      if (error) throw error;
      
      toast.success('Modelo atualizado com sucesso');
      
      // Redirecionar para a página do modelo
      setTimeout(() => {
        router.push(`/modelos/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao atualizar modelo:', error);
      toast.error('Não foi possível atualizar o modelo');
    } finally {
      setEnviando(false);
    }
  };
  
  // Resetar mudanças
  const resetarMudancas = () => {
    if (!modeloOriginal) return;
    
    setNome(modeloOriginal.nome || '');
    setDescricao(modeloOriginal.descricao || '');
    setCategoria(modeloOriginal.categoria || '');
    setEstruturaPrompt(modeloOriginal.estrutura_prompt || '');
    setCamposVariaveis(modeloOriginal.campos_variaveis || []);
    
    toast.info('Alterações descartadas');
  };
  
  if (carregando) {
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
  
  if (error) {
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
              <h2 className="text-2xl font-semibold mb-2">Erro ao carregar o modelo</h2>
              <p className="text-muted-foreground mb-6">
                {error}
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
        
        <Head>
          <title>Editar Modelo | CriaPrompt</title>
          <meta name="description" content="Editar modelo inteligente no CriaPrompt" />
        </Head>
        
        <AppHeader />
        <ToastContainer position="top-right" autoClose={3000} />
        
        <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full relative z-10">
          <Button 
            variant="ghost" 
            className="mb-4" 
            onClick={() => router.push(`/modelos/${id}`)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar para o Modelo
          </Button>
          
          <div className="flex items-center gap-2 mb-6">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Editar Modelo</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Modelo *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Gerador de posts para Instagram"
                    className={`bg-background/50 backdrop-blur-sm border ${erros.nome ? 'border-red-500' : 'border-white/20'}`}
                  />
                  {erros.nome && <p className="text-red-500 text-sm mt-1">{erros.nome}</p>}
                </div>
                
                <div>
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select 
                    value={categoria} 
                    onValueChange={setCategoria}
                  >
                    <SelectTrigger className={`bg-background/50 backdrop-blur-sm border ${erros.categoria ? 'border-red-500' : 'border-white/20'}`}>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erros.categoria && <p className="text-red-500 text-sm mt-1">{erros.categoria}</p>}
                </div>
                
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o propósito deste modelo"
                    className="bg-background/50 backdrop-blur-sm border border-white/20 min-h-24"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="estruturaPrompt">Estrutura do Prompt *</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={copiarPrompt}
                      className="text-xs bg-background/50"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <Textarea
                    id="estruturaPrompt"
                    ref={promptInputRef}
                    value={estruturaPrompt}
                    onChange={(e) => setEstruturaPrompt(e.target.value)}
                    placeholder="Escreva aqui a estrutura do prompt. Use {nomeDoCampo} para campos variáveis."
                    className={`bg-background/50 backdrop-blur-sm border ${erros.estruturaPrompt ? 'border-red-500' : 'border-white/20'} min-h-48 font-mono text-sm`}
                  />
                  {erros.estruturaPrompt && <p className="text-red-500 text-sm mt-1">{erros.estruturaPrompt}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    Use {'{campo}'} para inserir variáveis, que serão substituídas pelo usuário.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Campos variáveis */}
            <div className="bg-background/30 backdrop-blur-xl border border-white/20 rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-semibold">Campos Variáveis</h2>
              <p className="text-sm text-muted-foreground">
                Adicione campos que os usuários poderão preencher ao utilizar este modelo.
              </p>
              
              {/* Lista de campos */}
              <div className="space-y-2">
                {camposVariaveis.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {camposVariaveis.map((campo, index) => (
                      <Card key={index} className="bg-background/40 border border-white/10">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium font-mono text-sm bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded inline-block">
                                {campo.nome}
                              </p>
                              {campo.descricao && (
                                <p className="text-sm text-muted-foreground">{campo.descricao}</p>
                              )}
                              {campo.valorPadrao && (
                                <p className="text-xs">
                                  <span className="text-muted-foreground">Valor padrão: </span>
                                  <span className="text-primary/80">{campo.valorPadrao}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => inserirCampoNoPrompt(campo.nome)}
                                title="Inserir no prompt"
                                className="h-6 w-6 bg-background/50 border border-white/10"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removerCampo(index)}
                                title="Remover campo"
                                className="h-6 w-6 text-red-500 hover:text-red-600 bg-background/50 border border-white/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum campo variável adicionado.
                  </p>
                )}
              </div>
              
              {/* Formulário para adicionar campo */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium mb-3">Adicionar novo campo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="campoNome" className="text-xs mb-1">Nome do campo *</Label>
                    <Input
                      id="campoNome"
                      value={campoSelecionado.nome}
                      onChange={(e) => setCampoSelecionado({ ...campoSelecionado, nome: e.target.value })}
                      placeholder="Ex: produto"
                      className={`bg-background/50 backdrop-blur-sm border text-sm ${erros.campoNome ? 'border-red-500' : 'border-white/20'}`}
                    />
                    {erros.campoNome && <p className="text-red-500 text-xs mt-1">{erros.campoNome}</p>}
                  </div>
                  <div>
                    <Label htmlFor="campoDescricao" className="text-xs mb-1">Descrição (opcional)</Label>
                    <Input
                      id="campoDescricao"
                      value={campoSelecionado.descricao}
                      onChange={(e) => setCampoSelecionado({ ...campoSelecionado, descricao: e.target.value })}
                      placeholder="Ex: Nome do produto a ser descrito"
                      className="bg-background/50 backdrop-blur-sm border border-white/20 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campoValorPadrao" className="text-xs mb-1">Valor padrão (opcional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="campoValorPadrao"
                        value={campoSelecionado.valorPadrao}
                        onChange={(e) => setCampoSelecionado({ ...campoSelecionado, valorPadrao: e.target.value })}
                        placeholder="Ex: Smartphone"
                        className="bg-background/50 backdrop-blur-sm border border-white/20 text-sm"
                      />
                      <Button 
                        type="button" 
                        onClick={adicionarCampo} 
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={resetarMudancas}
                disabled={enviando}
                className="bg-background/30 backdrop-blur-xl border border-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restaurar Original
              </Button>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/modelos/${id}`)}
                  disabled={enviando}
                  className="bg-background/30 backdrop-blur-xl border border-white/20"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={enviando}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  {enviando ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}