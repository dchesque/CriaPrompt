import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import {
  Save,
  PlusCircle,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Brain,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export default function ModeloModal({ isOpen, onClose, modeloData = null }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [categorias, setCategorias] = useState([]);
  const [estruturaPrompt, setEstruturaPrompt] = useState('');
  const [isPublico, setIsPublico] = useState(true);
  const [camposVariaveis, setCamposVariaveis] = useState([]);
  const [previewText, setPreviewText] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [tipo, setTipo] = useState('personalizado');
  const [tipos, setTipos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Carregar dados se estiver editando
  useEffect(() => {
    if (modeloData) {
      setNome(modeloData.nome || '');
      setDescricao(modeloData.descricao || '');
      setCategoria(modeloData.categoria || 'geral');
      setEstruturaPrompt(modeloData.estrutura_prompt || '');
      setIsPublico(modeloData.publico !== undefined ? modeloData.publico : true);
      setInstrucoes(modeloData.instrucoes || '');
      setTipo(modeloData.tipo_id || 'personalizado');
      
      // Extrair campos variáveis do texto do prompt
      const camposExtract = extractCamposFromPrompt(modeloData.estrutura_prompt || '');
      setCamposVariaveis(camposExtract);
    } else {
      // Limpar formulário para criação
      resetForm();
    }
    
    // Carregar categorias disponíveis
    carregarCategorias();
    
    // Carregar tipos de modelo
    carregarTipos();
    
    // Atualizar preview
    atualizarPreview();
  }, [modeloData, isOpen]);
  
  // Atualizar preview sempre que estrutura ou campos mudarem
  useEffect(() => {
    atualizarPreview();
  }, [estruturaPrompt, camposVariaveis]);
  
  const resetForm = () => {
    setNome('');
    setDescricao('');
    setCategoria('geral');
    setEstruturaPrompt('');
    setIsPublico(true);
    setCamposVariaveis([]);
    setPreviewText('');
    setInstrucoes('');
    setTipo('personalizado');
  };
  
  const carregarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      
      setCategorias(data.map(cat => cat.nome));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };
  
  const carregarTipos = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_modelo')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      
      setTipos(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de modelo:', error);
    }
  };
  
  // Extrai campos variáveis do formato (campo)
  const extractCamposFromPrompt = (text) => {
    const regex = /\(([^)]+)\)/g;
    const matches = [...text.matchAll(regex)];
    
    const camposExtraidos = matches.map(match => match[1])
      .filter((value, index, self) => self.indexOf(value) === index) // Remover duplicados
      .map(nome => ({ nome, descricao: '', tipo: 'texto' }));
    
    return camposExtraidos;
  };
  
  const atualizarPreview = () => {
    let textoPreview = estruturaPrompt;
    
    camposVariaveis.forEach(campo => {
      textoPreview = textoPreview.replace(
        new RegExp(`\\(${campo.nome}\\)`, 'g'),
        `[${campo.nome}]`
      );
    });
    
    setPreviewText(textoPreview);
  };
  
  const handlePromptChange = (e) => {
    setEstruturaPrompt(e.target.value);
    
    // Atualizar preview com novo texto
    setTimeout(() => {
      // Extrair novos campos
      const novosExtraidos = extractCamposFromPrompt(e.target.value);
      
      // Manter configurações de campos existentes
      const camposAtualizados = novosExtraidos.map(novoItem => {
        const existente = camposVariaveis.find(c => c.nome === novoItem.nome);
        return existente || novoItem;
      });
      
      setCamposVariaveis(camposAtualizados);
      atualizarPreview();
    }, 100);
  };
  
  const adicionarCampoVariavel = () => {
    if (camposVariaveis.length >= 10) {
      toast.error('Limite máximo de 10 campos variáveis atingido');
      return;
    }
    
    const novoNome = `campo${camposVariaveis.length + 1}`;
    
    setCamposVariaveis([
      ...camposVariaveis,
      { nome: novoNome, descricao: '', tipo: 'texto' }
    ]);
  };
  
  const removerCampoVariavel = (index) => {
    setCamposVariaveis(camposVariaveis.filter((_, i) => i !== index));
  };
  
  const inserirCampoNoPrompt = (campo) => {
    const textareaElement = document.getElementById('modelo-textarea');
    
    if (textareaElement) {
      const cursorPos = textareaElement.selectionStart;
      const textoAntes = estruturaPrompt.substring(0, cursorPos);
      const textoDepois = estruturaPrompt.substring(cursorPos);
      
      const novoTexto = `${textoAntes}(${campo.nome})${textoDepois}`;
      
      setEstruturaPrompt(novoTexto);
      
      // Reposicionar cursor após o campo inserido
      setTimeout(() => {
        const novaPosicao = cursorPos + campo.nome.length + 2; // +2 pelos caracteres ( e )
        textareaElement.focus();
        textareaElement.setSelectionRange(novaPosicao, novaPosicao);
      }, 50);
    }
  };
  
  const atualizarCampoVariavel = (index, key, value) => {
    const novosCampos = [...camposVariaveis];
    novosCampos[index][key] = value;
    setCamposVariaveis(novosCampos);
  };
  
  const copiarPrompt = () => {
    navigator.clipboard.writeText(previewText);
    toast.success('Estrutura do modelo copiada para a área de transferência!');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nome) {
      toast.error('O nome do modelo é obrigatório');
      return;
    }
    
    if (!estruturaPrompt) {
      toast.error('A estrutura do prompt é obrigatória');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para salvar modelos');
        return;
      }
      
      const modeloPayload = {
        nome,
        descricao,
        categoria,
        estrutura_prompt: estruturaPrompt,
        instrucoes,
        publico: isPublico,
        tipo_id: tipo,
        campos_variaveis: camposVariaveis
      };
      
      let response;
      
      if (modeloData?.id) {
        // Atualizando modelo existente
        const { data, error } = await supabase
          .from('modelos')
          .update(modeloPayload)
          .eq('id', modeloData.id)
          .select();
          
        if (error) throw error;
        response = data;
        
        toast.success('Modelo atualizado com sucesso!');
      } else {
        // Criando novo modelo
        const { data, error } = await supabase
          .from('modelos')
          .insert({
            ...modeloPayload,
            user_id: session.user.id
          })
          .select();
          
        if (error) throw error;
        response = data;
        
        toast.success('Modelo criado com sucesso!');
      }
      
      // Fechar modal e retornar dados
      onClose(response);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar o modelo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] w-full max-h-[85vh] overflow-auto bg-background/95 backdrop-blur-sm border border-white/10 shadow-[0_0_25px_rgba(147,51,234,0.5)]">
        <DialogHeader className="pb-2 border-b border-white/10 flex flex-row items-center">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600/20 p-1.5 rounded-full">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                {modeloData?.id ? 'Editar Modelo Inteligente' : 'Criar Novo Modelo Inteligente'}
              </DialogTitle>
              <DialogDescription className="text-purple-300/80">
                Crie uma estrutura reutilizável para gerar prompts personalizados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna de Informações Básicas */}
            <div className="lg:col-span-3 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Modelo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                  placeholder="Nome descritivo para o modelo"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full h-20 rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-y"
                  placeholder="Descreva para que serve este modelo inteligente"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                  >
                    <option value="geral">Geral</option>
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Modelo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                  >
                    <option value="personalizado">Personalizado</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Visibilidade</label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={isPublico}
                        onChange={() => setIsPublico(true)}
                      />
                      <div className="flex items-center">
                        <Eye className="mr-1 h-4 w-4" />
                        <span>Público</span>
                      </div>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={!isPublico}
                        onChange={() => setIsPublico(false)}
                      />
                      <div className="flex items-center">
                        <EyeOff className="mr-1 h-4 w-4" />
                        <span>Privado</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coluna de Estrutura do Prompt */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Estrutura do Prompt</label>
                  <span className="text-xs text-muted-foreground">{estruturaPrompt.length} caracteres</span>
                </div>
                <textarea
                  id="modelo-textarea"
                  value={estruturaPrompt}
                  onChange={handlePromptChange}
                  className="w-full h-56 rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-y"
                  placeholder="Digite a estrutura do prompt, usando (campo) para criar variáveis"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Instruções de Uso</label>
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  className="w-full h-20 rounded-md bg-background/50 border border-white/10 p-3 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-y"
                  placeholder="Adicione instruções para quem vai utilizar este modelo (opcional)"
                />
              </div>
              
              <div className="flex items-start gap-2 bg-purple-500/10 p-3 rounded-md border border-purple-500/20">
                <Sparkles className="h-4 w-4 text-purple-400 mt-0.5" />
                <p className="text-xs text-purple-200/90">
                  Use <code>(nome)</code> para criar campos que os usuários poderão personalizar ao utilizar seu modelo. 
                  Os campos detectados aparecem automaticamente na seção "Campos Variáveis".
                </p>
              </div>
            </div>
            
            {/* Coluna de Preview e Campos Variáveis */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Pré-visualização
                </h3>
                <div className="p-4 border border-purple-500/20 rounded-md bg-purple-500/5 h-[230px] overflow-auto">
                  <div className="whitespace-pre-wrap break-words">{previewText || 'A pré-visualização do seu modelo será exibida aqui...'}</div>
                </div>
                <Button
                  type="button"
                  onClick={copiarPrompt}
                  variant="outline"
                  className="mt-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Estrutura
                </Button>
              </div>
              
              {/* Campos Variáveis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium flex items-center gap-1">
                    <Brain className="h-4 w-4 text-purple-400" />
                    Campos Variáveis
                  </label>
                  <Button 
                    type="button" 
                    onClick={adicionarCampoVariavel}
                    variant="outline"
                    size="sm"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  >
                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                    Adicionar Campo
                  </Button>
                </div>
                
                {camposVariaveis.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {camposVariaveis.map((campo, index) => (
                      <div key={index} className="bg-purple-500/10 rounded-md p-2 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <div className="rounded-full bg-purple-500/20 h-5 w-5 flex items-center justify-center mr-2">
                              <span className="text-xs text-purple-300 font-medium">{index + 1}</span>
                            </div>
                            <input
                              type="text"
                              value={campo.nome}
                              onChange={(e) => atualizarCampoVariavel(index, 'nome', e.target.value)}
                              className="text-sm rounded bg-background/50 border border-white/10 p-1 w-32 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                              placeholder="Nome do campo"
                            />
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button
                              type="button"
                              onClick={() => inserirCampoNoPrompt(campo)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:bg-purple-500/20 hover:text-purple-300"
                              title="Inserir campo no prompt"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </Button>
                            
                            <Button
                              type="button"
                              onClick={() => removerCampoVariavel(index)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-400 hover:text-red-300"
                              title="Remover campo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={campo.descricao}
                            onChange={(e) => atualizarCampoVariavel(index, 'descricao', e.target.value)}
                            className="text-xs rounded bg-background/50 border border-white/10 p-1 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                            placeholder="Descrição para o usuário"
                          />
                          <select
                            value={campo.tipo}
                            onChange={(e) => atualizarCampoVariavel(index, 'tipo', e.target.value)}
                            className="text-xs rounded bg-background/50 border border-white/10 p-1 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                          >
                            <option value="texto">Texto</option>
                            <option value="numero">Número</option>
                            <option value="opcoes">Opções</option>
                            <option value="data">Data</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-purple-300/70 border border-dashed border-purple-500/20 rounded-md bg-purple-500/5">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500/30" />
                    Adicione campos para tornar seu modelo dinâmico
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Modelo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 