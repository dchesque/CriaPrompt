// src/pages/criar.js

import Head from 'next/head';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Copy, 
  EyeOff, 
  Eye, 
  PlusCircle, 
  Trash2, 
  Save,
  Wand2,
  Loader2,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { SidebarNav } from '../components/SidebarNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import DashboardLayout from '../components/layouts/DashboardLayout';

export default function CriarPrompt() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  
  const tagInputRef = useRef(null);
  const sugestoesRef = useRef(null);
  
  // Estados para gerenciar categorias e subcategorias
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [subcategoriasDisponiveis, setSubcategoriasDisponiveis] = useState([]);
  
  useEffect(() => {
    // Inicialização
    carregarCategorias();
    
    // Atualizar preview
    atualizarPreview();
    
    // Esconder sugestões quando clicar fora
    const handleClickOutside = (e) => {
      if (
        sugestoesRef.current && 
        !sugestoesRef.current.contains(e.target) && 
        !tagInputRef.current.contains(e.target)
      ) {
        setShowSugestoes(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Carregar categorias e subcategorias
  const carregarCategorias = async () => {
    try {
      // Carregar categorias principais
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (categoriasError) throw categoriasError;
      setCategorias(categoriasData || []);
      
      // Carregar todas as subcategorias
      const { data: subcategoriasData, error: subcategoriasError } = await supabase
        .from('subcategorias')
        .select('*')
        .order('nome');
      
      if (subcategoriasError) throw subcategoriasError;
      setSubcategorias(subcategoriasData || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };
  
  // Atualizar subcategorias disponíveis quando categoria principal muda
  useEffect(() => {
    if (categoria) {
      const categoriaObj = categorias.find(c => c.nome === categoria || c.id === parseInt(categoria));
      if (categoriaObj) {
        const subcatsFiltradas = subcategorias.filter(sub => sub.categoria_id === categoriaObj.id);
        setSubcategoriasDisponiveis(subcatsFiltradas);
        // Limpar subcategoria selecionada se não estiver disponível
        if (subcatsFiltradas.length > 0 && !subcatsFiltradas.some(sub => sub.nome === subcategoria)) {
          setSubcategoria('');
        }
      }
    } else {
      setSubcategoriasDisponiveis([]);
      setSubcategoria('');
    }
  }, [categoria, categorias, subcategorias]);
  
  // Extrai campos personalizados do formato (campo)
  const detectarCampos = () => {
    if (!prompt) return;
    
    const regex = /\(([^)]+)\)/g;
    const matches = [...prompt.matchAll(regex)];
    
    const camposExtraidos = matches.map(match => match[1])
      .filter((value, index, self) => self.indexOf(value) === index) // Remover duplicados
      .map(nome => ({ 
        nome, 
        placeholder: `Digite o valor para ${nome}`,
        valor: ''
      }));
    
    if (JSON.stringify(camposExtraidos) !== JSON.stringify(camposPersonalizados)) {
      setCamposPersonalizados(camposExtraidos);
    }
  };
  
  // Atualizar campos quando o prompt mudar
  useEffect(() => {
    detectarCampos();
  }, [prompt]);
  
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
    setTimeout(() => {
      detectarCampos();
      atualizarPreview();
    }, 100);
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
  
  const gerarComIA = async () => {
    if (!prompt || prompt.length < 10) {
      toast.error('O prompt precisa ter pelo menos 10 caracteres para gerar uma descrição');
      return;
    }
    
    try {
      setIsGeneratingAi(true);
      
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
      setIsGeneratingAi(false);
    }
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
      
      // Encontrar IDs de categoria e subcategoria
      let categoriaId = null;
      let subcategoriaId = null;
      
      if (categoria) {
        const categoriaObj = categorias.find(c => c.nome === categoria || c.id === parseInt(categoria));
        if (categoriaObj) {
          categoriaId = categoriaObj.id;
          
          if (subcategoria) {
            const subcategoriaObj = subcategorias.find(
              s => s.nome === subcategoria && s.categoria_id === categoriaId
            );
            if (subcategoriaObj) {
              subcategoriaId = subcategoriaObj.id;
            }
          }
        }
      }
      
      const promptData = {
        titulo,
        texto: prompt,
        descricao,
        categoria: categoriaId,
        subcategoria: subcategoriaId,
        publico: isPublico,
        tags
      };
      
      // Criando novo prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          ...promptData,
          user_id: session.user.id
        })
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Salvar campos personalizados
        if (camposPersonalizados.length > 0) {
          const { error: camposError } = await supabase
            .from('campos_personalizados')
            .insert(camposPersonalizados.map(campo => ({
              prompt_id: data[0].id,
              nome: campo.nome,
              placeholder: campo.placeholder,
              valor_padrao: campo.valor
            })));
            
          if (camposError) console.error('Erro ao salvar campos personalizados:', camposError);
        }
        
        toast.success('Prompt salvo com sucesso!');
        
        // Redirecionar para a página do prompt
        setTimeout(() => {
          router.push(`/prompts/${data[0].id}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar o prompt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout title="Criar Novo Prompt">
        <Head>
          <title>Criar Novo Prompt | CriaPrompt</title>
          <meta name="description" content="Crie um novo prompt para IA" />
        </Head>
        
        <ToastContainer position="top-right" autoClose={3000} />
        
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Criar Novo Prompt</h1>
              <p className="text-muted-foreground">
                Crie um prompt personalizado para compartilhar com a comunidade.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.back()}
              className="sm:self-end"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <FileText className="h-4 w-4 mr-2" /> 
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="titulo">
                      Título <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="titulo"
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Nome do seu prompt"
                      className="w-full p-2 rounded-md border border-input bg-background"
                      required
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="categoria">
                        Categoria <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="categoria"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="subcategoria">
                        Subcategoria
                      </label>
                      <select
                        id="subcategoria"
                        value={subcategoria}
                        onChange={(e) => setSubcategoria(e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background"
                        disabled={!subcategoriasDisponiveis.length}
                      >
                        <option value="">Selecione uma subcategoria</option>
                        {subcategoriasDisponiveis.map((sub) => (
                          <option key={sub.id} value={sub.nome}>
                            {sub.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium" htmlFor="descricao">
                        Descrição
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={gerarDescricao}
                        disabled={isGeneratingDescription || !prompt || prompt.length < 10}
                        className="h-7 px-2 text-xs flex items-center"
                      >
                        {isGeneratingDescription ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-1 h-3 w-3" />
                            Gerar com IA
                          </>
                        )}
                      </Button>
                    </div>
                    <textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva seu prompt brevemente"
                      className="w-full p-2 rounded-md border border-input bg-background min-h-[80px]"
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Visibilidade:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="publico"
                        name="visibilidade"
                        checked={isPublico}
                        onChange={() => setIsPublico(true)}
                        className="rounded-full"
                      />
                      <label htmlFor="publico" className="text-sm cursor-pointer">
                        Público
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="privado"
                        name="visibilidade"
                        checked={!isPublico}
                        onChange={() => setIsPublico(false)}
                        className="rounded-full"
                      />
                      <label htmlFor="privado" className="text-sm cursor-pointer">
                        Privado
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Conteúdo do Prompt <span className="text-red-500">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Use o formato (campo) para adicionar campos personalizáveis
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={gerarComIA}
                        disabled={isGeneratingAi}
                        className="h-8 text-xs"
                      >
                        {isGeneratingAi ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                            Gerar Prompt com IA
                          </>
                        )}
                      </Button>
                    </div>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={handlePromptChange}
                      placeholder="Digite seu prompt aqui. Use (campo) para campos personalizáveis, como: Crie um resumo sobre (tema) com (quantidade) palavras."
                      className="w-full p-3 rounded-md border border-input bg-background font-mono text-sm min-h-[180px]"
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tags (até 10)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => {
                          setTagInput(e.target.value);
                          buscarSugestoesTags(e.target.value);
                        }}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Adicionar tag"
                        className="w-full p-2 pr-8 rounded-md border border-input bg-background"
                        ref={tagInputRef}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => adicionarTag(tagInput)}
                        className="absolute right-0 h-full px-2"
                        disabled={!tagInput.trim() || tags.includes(tagInput.trim().toLowerCase())}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {showSugestoes && sugestoesTags.length > 0 && (
                      <div
                        ref={sugestoesRef}
                        className="absolute z-10 mt-1 w-full rounded-md border border-input bg-popover shadow-md"
                      >
                        {sugestoesTags.map((tag, index) => (
                          <div
                            key={index}
                            className="p-2 hover:bg-accent cursor-pointer text-sm"
                            onClick={() => {
                              adicionarTag(tag);
                            }}
                          >
                            {tag}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removerTag(tag)}
                          className="text-primary hover:text-primary/70"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma tag adicionada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving || !titulo || !prompt}
                  className="min-w-[120px]"
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
              </div>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Preview do Prompt</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={copiarPrompt}
                      className="h-8 px-2"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-md bg-black/20 border border-border/50 min-h-[100px] font-mono text-sm whitespace-pre-wrap">
                    {previewText || (
                      <span className="text-muted-foreground italic">
                        O preview do seu prompt aparecerá aqui
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Campos Personalizados</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={adicionarCampoPersonalizado}
                      className="h-8 px-2"
                    >
                      <span className="text-xs">Adicionar</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {camposPersonalizados.length > 0 ? (
                    <div className="space-y-4">
                      {camposPersonalizados.map((campo, index) => (
                        <div key={index} className="space-y-2 p-3 rounded-md border border-border/50 bg-black/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => inserirCampoNoPrompt(campo)}
                                className="h-7 px-2 text-xs"
                              >
                                Inserir
                              </Button>
                              <span className="font-medium text-sm">{campo.nome}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removerCampoPersonalizado(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={campo.placeholder}
                              onChange={(e) =>
                                atualizarCampoPersonalizado(index, "placeholder", e.target.value)
                              }
                              placeholder="Placeholder"
                              className="w-full p-2 text-sm rounded-md border border-input bg-background"
                            />
                            <input
                              type="text"
                              value={campo.valor}
                              onChange={(e) => {
                                atualizarCampoPersonalizado(index, "valor", e.target.value);
                                atualizarPreview();
                              }}
                              placeholder="Valor padrão (opcional)"
                              className="w-full p-2 text-sm rounded-md border border-input bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">
                        Nenhum campo personalizado detectado
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use o formato (nome) no seu prompt para criar campos
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dicas para criar bons prompts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                      <span>Seja específico e detalhado sobre o que você deseja obter</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                      <span>Inclua informações sobre formato, estilo e extensão desejados</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                      <span>Use campos personalizáveis para tornar seu prompt mais flexível</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                      <span>Evite ambiguidades e forneça exemplos quando necessário</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}