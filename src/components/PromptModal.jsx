import { useState, useEffect, useRef } from 'react';
import { Copy, RotateCcw, Save, EyeOff, Eye, PlusCircle, Trash2, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "./ui/dialog";
import { Button } from "./ui/button";
import { extractCustomFields, applyCustomFieldValues } from "../utils/promptUtils";
import { cn } from '../lib/utils';

export default function PromptModal({ isOpen, onClose, promptData = null }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [categorias, setCategorias] = useState([]);
  const [isPublico, setIsPublico] = useState(true);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sugestoesTags, setSugestoesTags] = useState([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [camposPersonalizados, setCamposPersonalizados] = useState([]);
  const [previewText, setPreviewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  
  const tagInputRef = useRef(null);
  const sugestoesRef = useRef(null);
  
  // Se estiver editando, carrega os dados do prompt
  useEffect(() => {
    if (promptData) {
      setTitulo(promptData.titulo || '');
      setPrompt(promptData.texto || '');
      setDescricao(promptData.descricao || '');
      setCategoria(promptData.categoria || 'geral');
      setIsPublico(promptData.publico !== undefined ? promptData.publico : true);
      setTags(promptData.tags || []);
      
      // Extrair campos personalizados do texto do prompt
      const camposExtract = extractCamposFromPrompt(promptData.texto || '');
      setCamposPersonalizados(camposExtract);
    } else {
      // Limpar formulário para criação
      resetForm();
    }
    
    // Carregar categorias disponíveis
    carregarCategorias();
    
    // Atualizar preview
    atualizarPreview();
  }, [promptData, isOpen]);
  
  const resetForm = () => {
    setTitulo('');
    setPrompt('');
    setDescricao('');
    setCategoria('geral');
    setIsPublico(true);
    setTags([]);
    setTagInput('');
    setCamposPersonalizados([]);
    setPreviewText('');
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
  
  // Extrai campos personalizados do formato (campo)
  const extractCamposFromPrompt = (text) => {
    const regex = /\(([^)]+)\)/g;
    const matches = [...text.matchAll(regex)];
    
    const camposExtraidos = matches.map(match => match[1])
      .filter((value, index, self) => self.indexOf(value) === index) // Remover duplicados
      .map(nome => ({ nome, valor: '', placeholder: nome }));
    
    return camposExtraidos;
  };
  
  const atualizarPreview = () => {
    let textoPreview = prompt;
    
    camposPersonalizados.forEach(campo => {
      const valorSubstituicao = campo.valor || `[${campo.placeholder}]`;
      textoPreview = textoPreview.replace(
        new RegExp(`\\(${campo.nome}\\)`, 'g'),
        valorSubstituicao
      );
    });
    
    setPreviewText(textoPreview);
  };
  
  const gerarDescricao = async () => {
    if (!prompt || prompt.length < 10) {
      toast.error('O prompt precisa ter pelo menos 10 caracteres para gerar uma descrição');
      return;
    }
    
    try {
      setIsGeneratingDescription(true);
      
      // Gerar descrição via API
      const response = await fetch('/api/gerarDescricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) throw new Error('Erro ao gerar descrição');
      
      const data = await response.json();
      setDescricao(data.descricao);
      
      toast.success('Descrição gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar descrição:', error);
      toast.error('Não foi possível gerar a descrição. Tente novamente mais tarde.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  
  const buscarSugestoesTags = async (valor) => {
    if (!valor || valor.length < 2) {
      setSugestoesTags([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('nome')
        .ilike('nome', `${valor}%`)
        .order('contagem', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      // Filtrar tags que já estão selecionadas
      const sugestoesFiltradas = data
        .map(tag => tag.nome)
        .filter(tag => !tags.includes(tag));
      
      setSugestoesTags(sugestoesFiltradas);
      setShowSugestoes(sugestoesFiltradas.length > 0);
    } catch (error) {
      console.error('Erro ao buscar sugestões de tags:', error);
      setSugestoesTags([]);
    }
  };
  
  const adicionarTag = (tag) => {
    tag = tag.trim().toLowerCase();
    
    if (!tag) return;
    if (tags.includes(tag)) return;
    if (tags.length >= 10) {
      toast.error('Limite máximo de 10 tags atingido');
      return;
    }
    
    setTags([...tags, tag]);
    setTagInput('');
    setSugestoesTags([]);
    setShowSugestoes(false);
    
    if (tagInputRef.current) {
      tagInputRef.current.focus();
    }
  };
  
  const removerTag = (tagParaRemover) => {
    setTags(tags.filter(tag => tag !== tagParaRemover));
  };
  
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTag(tagInput);
    } else if (e.key === 'Escape') {
      setShowSugestoes(false);
    }
  };
  
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
    
    // Atualizar preview com novo texto
    setTimeout(atualizarPreview, 100);
  };
  
  const adicionarCampoPersonalizado = () => {
    if (camposPersonalizados.length >= 10) {
      toast.error('Limite máximo de 10 campos personalizados atingido');
      return;
    }
    
    const novoNome = `campo${camposPersonalizados.length + 1}`;
    
    setCamposPersonalizados([
      ...camposPersonalizados,
      { nome: novoNome, valor: '', placeholder: novoNome }
    ]);
  };
  
  const removerCampoPersonalizado = (index) => {
    setCamposPersonalizados(camposPersonalizados.filter((_, i) => i !== index));
  };
  
  const inserirCampoNoPrompt = (campo) => {
    const textareaElement = document.getElementById('prompt-textarea');
    
    if (textareaElement) {
      const cursorPos = textareaElement.selectionStart;
      const textoAntes = prompt.substring(0, cursorPos);
      const textoDepois = prompt.substring(cursorPos);
      
      const novoTexto = `${textoAntes}(${campo.nome})${textoDepois}`;
      
      setPrompt(novoTexto);
      
      // Reposicionar cursor após o campo inserido
      setTimeout(() => {
        const novaPosicao = cursorPos + campo.nome.length + 2; // +2 pelos caracteres ( e )
        textareaElement.focus();
        textareaElement.setSelectionRange(novaPosicao, novaPosicao);
      }, 50);
    }
  };
  
  const atualizarCampoPersonalizado = (index, key, value) => {
    const novosCampos = [...camposPersonalizados];
    novosCampos[index][key] = value;
    setCamposPersonalizados(novosCampos);
    
    setTimeout(atualizarPreview, 100);
  };
  
  const copiarPrompt = () => {
    navigator.clipboard.writeText(previewText);
    toast.success('Prompt copiado para a área de transferência!');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!titulo) {
      toast.error('O título do prompt é obrigatório');
      return;
    }
    
    if (!prompt) {
      toast.error('O conteúdo do prompt é obrigatório');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para salvar prompts');
        return;
      }
      
      const promptData = {
        titulo,
        texto: prompt,
        descricao,
        categoria,
        publico: isPublico,
        tags
      };
      
      let response;
      
      if (promptData?.id) {
        // Atualizando prompt existente
        const { data, error } = await supabase
          .from('prompts')
          .update(promptData)
          .eq('id', promptData.id)
          .select();
          
        if (error) throw error;
        response = data;
        
        toast.success('Prompt atualizado com sucesso!');
      } else {
        // Criando novo prompt
        const { data, error } = await supabase
          .from('prompts')
          .insert({
            ...promptData,
            user_id: session.user.id
          })
          .select();
          
        if (error) throw error;
        response = data;
        
        toast.success('Prompt criado com sucesso!');
      }
      
      // Atualizar contagem de tags
      await Promise.all(tags.map(async (tag) => {
        const { data } = await supabase
          .from('tags')
          .select('*')
          .eq('nome', tag)
          .single();
          
        if (data) {
          await supabase
            .from('tags')
            .update({ contagem: data.contagem + 1 })
            .eq('id', data.id);
        } else {
          await supabase
            .from('tags')
            .insert({ nome: tag, contagem: 1 });
        }
      }));
      
      // Fechar modal e retornar dados
      onClose(response);
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar o prompt. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sugestoesRef.current && !sugestoesRef.current.contains(event.target)) {
        setShowSugestoes(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] w-full max-h-[85vh] overflow-auto bg-background/95 backdrop-blur-sm border border-white/10 shadow-[0_0_25px_rgba(59,130,246,0.5)]">
        <DialogHeader className="pb-2 border-b border-white/10">
          <DialogTitle className="text-2xl font-bold">
            {promptData?.id ? 'Editar Prompt' : 'Criar Novo Prompt'}
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <Button variant="ghost" size="icon">
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna de Edição Principal */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  placeholder="Digite um título descritivo"
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Prompt</label>
                  <span className="text-xs text-muted-foreground">{prompt.length} caracteres</span>
                </div>
                <textarea
                  id="prompt-textarea"
                  value={prompt}
                  onChange={handlePromptChange}
                  className="w-full h-48 rounded-md bg-background/50 border border-white/10 p-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-y"
                  placeholder="Digite seu prompt aqui. Use (campo) para criar campos personalizados dinâmicos."
                  required
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Descrição</label>
                  <Button
                    type="button"
                    onClick={gerarDescricao}
                    variant="outline"
                    size="sm"
                    disabled={isGeneratingDescription}
                  >
                    {isGeneratingDescription ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-1 h-3.5 w-3.5" />
                        Gerar com IA
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full h-20 rounded-md bg-background/50 border border-white/10 p-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-y"
                  placeholder="Descreva o propósito e uso do seu prompt"
                />
              </div>
            </div>
            
            {/* Coluna de Preview */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Pré-visualização</h3>
                <div className="p-4 border border-white/10 rounded-md bg-white/5 h-[350px] overflow-auto">
                  <div className="whitespace-pre-wrap break-words">{previewText}</div>
                </div>
                <Button
                  type="button"
                  onClick={copiarPrompt}
                  variant="outline"
                  className="mt-2"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Prompt
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="geral">Geral</option>
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
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
            
            {/* Coluna de Configurações Adicionais */}
            <div className="lg:col-span-3 space-y-4">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">Tags (máx. 10)</label>
                <div className="relative">
                  <input
                    type="text"
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      buscarSugestoesTags(e.target.value);
                    }}
                    onKeyDown={handleTagKeyDown}
                    className="w-full rounded-md bg-background/50 border border-white/10 p-3 focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    placeholder="Digite uma tag e pressione Enter"
                  />
                  
                  {showSugestoes && (
                    <div 
                      ref={sugestoesRef}
                      className="absolute z-10 mt-1 w-full rounded-md bg-background/95 border border-white/10 shadow-lg max-h-40 overflow-auto"
                    >
                      {sugestoesTags.map((tag, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 cursor-pointer hover:bg-white/10"
                          onClick={() => adicionarTag(tag)}
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center bg-primary/20 text-primary rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removerTag(tag)}
                        className="ml-1.5 text-primary hover:text-white"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Campos Personalizados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Campos Personalizados</label>
                  <Button 
                    type="button" 
                    onClick={adicionarCampoPersonalizado}
                    variant="outline"
                    size="sm"
                  >
                    <PlusCircle className="mr-1 h-3.5 w-3.5" />
                    Adicionar Campo
                  </Button>
                </div>
                
                {camposPersonalizados.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-1">
                    {camposPersonalizados.map((campo, index) => (
                      <div key={index} className="bg-background/20 rounded-md p-2 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={campo.nome}
                              onChange={(e) => atualizarCampoPersonalizado(index, 'nome', e.target.value)}
                              className="text-sm rounded bg-white/5 border border-white/10 p-1 w-32"
                              placeholder="Nome do campo"
                            />
                            <Button
                              type="button"
                              onClick={() => inserirCampoNoPrompt(campo)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 ml-1"
                              title="Inserir no prompt"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          <Button
                            type="button"
                            onClick={() => removerCampoPersonalizado(index)}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-400 hover:text-red-300"
                            title="Remover campo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={campo.placeholder}
                            onChange={(e) => atualizarCampoPersonalizado(index, 'placeholder', e.target.value)}
                            className="w-full text-xs rounded bg-white/5 border border-white/10 p-1"
                            placeholder="Texto de ajuda"
                          />
                          <input
                            type="text"
                            value={campo.valor}
                            onChange={(e) => atualizarCampoPersonalizado(index, 'valor', e.target.value)}
                            className="w-full text-xs rounded bg-white/5 border border-white/10 p-1"
                            placeholder="Valor padrão (opcional)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-muted-foreground border border-dashed border-white/10 rounded-md">
                    Adicione campos para tornar seu prompt dinâmico
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
              className="bg-primary"
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
                  Salvar Prompt
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 