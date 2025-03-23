import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Save,
  PlusCircle,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Brain,
  Loader2,
  ArrowLeft,
  LayoutTemplate
} from 'lucide-react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AuthGuard from '../../components/AuthGuard';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import DashboardLayout from '../../components/layouts/DashboardLayout';

export default function CriarModelo() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estrutura, setEstrutura] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [isPublico, setIsPublico] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [variaveis, setVariaveis] = useState([]);
  
  // Estados para gerenciar categorias e subcategorias
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [subcategoriasDisponiveis, setSubcategoriasDisponiveis] = useState([]);

  useEffect(() => {
    // Inicialização
    carregarCategorias();
    
    // Atualizar preview
    atualizarPreview();
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
  
  // Atualizar preview sempre que estrutura ou campos mudarem
  useEffect(() => {
    atualizarPreview();
  }, [estrutura, variaveis]);
  
  // Detectar variáveis na estrutura do formato {variavel}
  const detectarVariaveis = () => {
    if (!estrutura) return;
    
    const regex = /\{([^}]+)\}/g;
    const matches = [...estrutura.matchAll(regex)];
    
    const variaveisExtraidas = matches.map(match => match[1])
      .filter((value, index, self) => self.indexOf(value) === index) // Remover duplicados
      .map(nome => ({ 
        nome, 
        descricao: `Descrição para ${nome}`,
        opcional: false
      }));
    
    if (JSON.stringify(variaveisExtraidas) !== JSON.stringify(variaveis)) {
      setVariaveis(variaveisExtraidas);
    }
  };
  
  // Atualizar variáveis quando a estrutura mudar
  useEffect(() => {
    detectarVariaveis();
  }, [estrutura]);
  
  const atualizarPreview = () => {
    let textoPreview = estrutura;
    
    variaveis.forEach(variavel => {
      textoPreview = textoPreview.replace(
        new RegExp(`\\{${variavel.nome}\\}`, 'g'),
        `[${variavel.nome}]`
      );
    });
    
    setPreviewText(textoPreview);
  };
  
  const handleEstruturaChange = (e) => {
    setEstrutura(e.target.value);
    
    // Atualizar preview com novo texto
    setTimeout(() => {
      detectarVariaveis();
      atualizarPreview();
    }, 100);
  };
  
  const adicionarCampoVariavel = () => {
    if (variaveis.length >= 10) {
      toast.error('Limite máximo de 10 campos variáveis atingido');
      return;
    }
    
    const novoNome = `campo${variaveis.length + 1}`;
    
    setVariaveis([
      ...variaveis,
      { nome: novoNome, descricao: '', tipo: 'texto' }
    ]);
  };
  
  const removerCampoVariavel = (index) => {
    setVariaveis(variaveis.filter((_, i) => i !== index));
  };
  
  const inserirCampoNoPrompt = (campo) => {
    const textareaElement = document.getElementById('estrutura-textarea');
    
    if (textareaElement) {
      const cursorPos = textareaElement.selectionStart;
      const textoAntes = estrutura.substring(0, cursorPos);
      const textoDepois = estrutura.substring(cursorPos);
      
      const novoTexto = `${textoAntes}{${campo.nome}}${textoDepois}`;
      
      setEstrutura(novoTexto);
      
      // Reposicionar cursor após o campo inserido
      setTimeout(() => {
        const novaPosicao = cursorPos + campo.nome.length + 2; // +2 pelos caracteres { e }
        textareaElement.focus();
        textareaElement.setSelectionRange(novaPosicao, novaPosicao);
      }, 50);
    }
  };
  
  const atualizarCampoVariavel = (index, key, value) => {
    const novosCampos = [...variaveis];
    novosCampos[index][key] = value;
    setVariaveis(novosCampos);
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
    
    if (!estrutura) {
      toast.error('A estrutura do modelo é obrigatória');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para salvar modelos');
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
      
      const modeloData = {
        nome,
        descricao,
        estrutura,
        categoria: categoriaId,
        subcategoria: subcategoriaId,
        publico: isPublico,
        user_id: session.user.id
      };
      
      const { data, error } = await supabase
        .from('modelos')
        .insert(modeloData)
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        // Salvar variáveis
        if (variaveis.length > 0) {
          const { error: varsError } = await supabase
            .from('variaveis_modelo')
            .insert(variaveis.map(v => ({
              modelo_id: data[0].id,
              nome: v.nome,
              descricao: v.descricao,
              opcional: v.opcional
            })));
            
          if (varsError) console.error('Erro ao salvar variáveis:', varsError);
        }
        
        toast.success('Modelo salvo com sucesso!');
        
        // Redirecionar para a página do modelo
        setTimeout(() => {
          router.push(`/modelos/${data[0].id}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast.error('Erro ao salvar o modelo');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthGuard>
      <DashboardLayout title="Criar Modelo Inteligente">
        <Head>
          <title>Criar Novo Modelo | CriaPrompt</title>
          <meta name="description" content="Crie um novo modelo para prompts de IA" />
        </Head>
        
        <ToastContainer position="top-right" autoClose={3000} />
        
        <div className="container max-w-6xl mx-auto">
          {/* Cabeçalho */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Criar Modelo Inteligente</h1>
              <p className="text-muted-foreground">
                Crie um modelo reutilizável para gerar prompts personalizados.
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
            {/* Coluna 1 - Formulário Principal */}
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <LayoutTemplate className="h-4 w-4 mr-2" /> 
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="nome">
                      Nome do Modelo <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome do seu modelo"
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
                    <label className="text-sm font-medium" htmlFor="descricao">
                      Descrição
                    </label>
                    <textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva a finalidade e uso do seu modelo"
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
              
              {/* Estrutura do Modelo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Estrutura do Modelo <span className="text-red-500">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Use {'{variavel}'} para adicionar campos variáveis. Exemplo: Crie um resumo sobre {'{tema}'} com {'{quantidade}'} palavras.
                    </p>
                    <textarea
                      id="estrutura-textarea"
                      value={estrutura}
                      onChange={handleEstruturaChange}
                      placeholder="Digite a estrutura do seu modelo aqui..."
                      className="w-full p-3 rounded-md border border-input bg-background font-mono text-sm min-h-[200px]"
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Botões de ação */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/modelos')}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !nome || !estrutura}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
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
              </div>
            </div>
            
            {/* Coluna 2 - Preview e Variáveis */}
            <div className="space-y-6">
              {/* Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Preview do Modelo</CardTitle>
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
                        O preview do seu modelo aparecerá aqui
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Variáveis do Modelo */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Variáveis Detectadas</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={adicionarCampoVariavel}
                      className="h-8 px-2"
                    >
                      <span className="text-xs">Adicionar Variável</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {variaveis.length > 0 ? (
                    <div className="space-y-4">
                      {variaveis.map((variavel, index) => (
                        <div key={index} className="space-y-3 p-3 rounded-md border border-border/50 bg-black/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => inserirCampoNoPrompt(variavel)}
                                className="h-7 px-2 text-xs"
                              >
                                Inserir
                              </Button>
                              <span className="font-medium text-sm">{variavel.nome}</span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removerCampoVariavel(index)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-xs font-medium">
                              Descrição para o usuário
                            </label>
                            <input
                              type="text"
                              value={variavel.descricao}
                              onChange={(e) =>
                                atualizarCampoVariavel(index, "descricao", e.target.value)
                              }
                              placeholder="Descreva o que o usuário deve inserir neste campo"
                              className="w-full p-2 text-sm rounded-md border border-input bg-background"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`opcional-${index}`}
                              checked={variavel.opcional}
                              onChange={(e) =>
                                atualizarCampoVariavel(index, "opcional", e.target.checked)
                              }
                              className="rounded"
                            />
                            <label htmlFor={`opcional-${index}`} className="text-xs cursor-pointer">
                              Campo opcional
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma variável detectada
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use o formato {'{nome}'} na estrutura do modelo para criar variáveis
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Dicas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Dicas para criar bons modelos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                      <span>Identifique quais partes do prompt variam e transforme-as em variáveis</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                      <span>Use nomes descritivos para as variáveis, como {'{tema}'} ou {'{tom_de_voz}'}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                      <span>Adicione instruções claras para cada variável para orientar os usuários</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                      <span>Teste seu modelo com diferentes valores para garantir resultados consistentes</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Exemplo de Uso */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Brain className="h-4 w-4 mr-2" />
                    Exemplo de Modelo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Estrutura:</div>
                    <div className="p-3 rounded-md bg-black/20 border border-border/50 font-mono text-xs">
                      {`Crie um e-mail {tipo_email} para {destinatario}. 
O assunto deve ser relacionado a {assunto}.
Use um tom {tom} e inclua {elementos_adicionais}.
Limite a {tamanho} parágrafos.
Assinatura: {assinatura}`}
                    </div>
                    
                    <div className="text-sm font-medium mt-2">Variáveis:</div>
                    <ul className="space-y-1 text-xs pl-4 list-disc">
                      <li><strong>tipo_email</strong>: formal, informal, marketing</li>
                      <li><strong>destinatario</strong>: cliente, chefe, colega</li>
                      <li><strong>assunto</strong>: reunião, proposta, feedback</li>
                      <li><strong>tom</strong>: amigável, profissional, assertivo</li>
                      <li><strong>elementos_adicionais</strong>: call-to-action, agradecimentos</li>
                      <li><strong>tamanho</strong>: 2-3, 4-5</li>
                      <li><strong>assinatura</strong>: personalizada do remetente</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
} 