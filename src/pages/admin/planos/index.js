import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../../lib/supabaseClient';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { Switch } from "../../../components/ui/switch";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash, 
  Loader2, 
  Save,
  Package
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Schema de validação para o formulário de plano
const planoSchema = z.object({
  nome: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres' }),
  descricao: z.string().min(5, { message: 'A descrição deve ter pelo menos 5 caracteres' }),
  preco: z.coerce.number().min(0, { message: 'O preço não pode ser negativo' }),
  intervalo: z.enum(['mensal', 'anual', 'vitalicio'], { 
    message: 'O intervalo deve ser mensal, anual ou vitalicio' 
  }),
  limite_prompts: z.coerce.number().min(0, { message: 'O limite não pode ser negativo' }),
  limite_modelos: z.coerce.number().min(0, { message: 'O limite não pode ser negativo' }),
  is_popular: z.boolean().default(false),
  is_ativo: z.boolean().default(true),
  stripe_price_id: z.string().optional(),
  ordem_exibicao: z.coerce.number().min(0, { message: 'A ordem não pode ser negativa' }).default(0),
  recursos: z.string().optional(),
});

export default function PlanosAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [planos, setPlanos] = useState([]);
  const [dialogoPlanoAberto, setDialogoPlanoAberto] = useState(false);
  const [dialogoExcluirAberto, setDialogoExcluirAberto] = useState(false);
  const [planoParaExcluir, setPlanoParaExcluir] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Configuração do formulário
  const form = useForm({
    resolver: zodResolver(planoSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      preco: 0,
      intervalo: 'mensal',
      limite_prompts: 5,
      limite_modelos: 2,
      is_popular: false,
      is_ativo: true,
      stripe_price_id: '',
      ordem_exibicao: 0,
      recursos: ''
    }
  });

  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('ordem_exibicao');

      if (error) throw error;
      
      setPlanos(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirDialogoNovoPlano = () => {
    form.reset({
      nome: '',
      descricao: '',
      preco: 0,
      intervalo: 'mensal',
      limite_prompts: 5,
      limite_modelos: 2,
      is_popular: false,
      is_ativo: true,
      stripe_price_id: '',
      ordem_exibicao: planos.length,
      recursos: ''
    });
    setModoEdicao(false);
    setDialogoPlanoAberto(true);
  };

  const abrirDialogoEditarPlano = (plano) => {
    // Converter os recursos de JSON para string se necessário
    let recursos = plano.recursos;
    if (recursos && typeof recursos === 'object') {
      recursos = JSON.stringify(recursos);
    }
    
    form.reset({
      ...plano,
      recursos: recursos || '',
    });
    setModoEdicao(true);
    setDialogoPlanoAberto(true);
  };

  const confirmarExclusao = (plano) => {
    setPlanoParaExcluir(plano);
    setDialogoExcluirAberto(true);
  };

  const excluirPlano = async () => {
    if (!planoParaExcluir) return;
    
    try {
      const { error } = await supabase
        .from('planos')
        .delete()
        .eq('id', planoParaExcluir.id);
        
      if (error) throw error;
      
      toast.success('Plano excluído com sucesso');
      
      // Atualizar a lista
      setPlanos(planos.filter(p => p.id !== planoParaExcluir.id));
      setDialogoExcluirAberto(false);
      setPlanoParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano: ' + error.message);
    }
  };

  const onSubmit = async (data) => {
    // Converter recursos de string para JSON se possível
    try {
      if (data.recursos) {
        data.recursos = JSON.parse(data.recursos);
      }
    } catch (e) {
      // Se não for um JSON válido, mantém como string
      console.log('Recursos não estão em formato JSON válido, mantendo como string');
    }
    
    try {
      let result;
      
      if (modoEdicao) {
        // Atualizar plano existente
        const { data: planoAtualizado, error } = await supabase
          .from('planos')
          .update(data)
          .eq('id', form.getValues('id'))
          .select()
          .single();
          
        if (error) throw error;
        
        result = planoAtualizado;
        toast.success('Plano atualizado com sucesso');
      } else {
        // Criar novo plano
        const { data: novoPlano, error } = await supabase
          .from('planos')
          .insert([data])
          .select()
          .single();
          
        if (error) throw error;
        
        result = novoPlano;
        toast.success('Plano criado com sucesso');
      }
      
      // Atualizar a lista de planos
      if (modoEdicao) {
        setPlanos(planos.map(p => p.id === result.id ? result : p));
      } else {
        setPlanos([...planos, result]);
      }
      
      // Fechar o diálogo
      setDialogoPlanoAberto(false);
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast.error('Erro ao salvar plano: ' + error.message);
    }
  };

  const formatarPreco = (valor, intervalo) => {
    // Formatar valor como moeda brasileira
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
    
    if (intervalo === 'vitalicio') {
      return `${valorFormatado} (único)`;
    } else {
      return `${valorFormatado}/${intervalo === 'mensal' ? 'mês' : 'ano'}`;
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Gerenciar Planos | CriaPrompt</title>
      </Head>
      
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Planos</h1>
          
          <Button onClick={abrirDialogoNovoPlano}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="text-center">Limite de Prompts</TableHead>
                  <TableHead className="text-center">Limite de Modelos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planos.length > 0 ? (
                  planos.map((plano) => (
                    <TableRow key={plano.id}>
                      <TableCell>{plano.ordem_exibicao}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          {plano.nome}
                          {plano.is_popular && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-sm w-fit mt-1">
                              Popular
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatarPreco(plano.preco, plano.intervalo)}</TableCell>
                      <TableCell className="text-center">
                        {plano.limite_prompts === 0 ? 'Ilimitado' : plano.limite_prompts}
                      </TableCell>
                      <TableCell className="text-center">
                        {plano.limite_modelos === 0 ? 'Ilimitado' : plano.limite_modelos}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          plano.is_ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {plano.is_ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirDialogoEditarPlano(plano)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => confirmarExclusao(plano)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhum plano cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      
      {/* Diálogo de criação/edição de plano */}
      <Dialog open={dialogoPlanoAberto} onOpenChange={setDialogoPlanoAberto}>
        <DialogContent className="max-w-md sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modoEdicao ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              {modoEdicao 
                ? 'Edite as informações do plano abaixo.' 
                : 'Preencha as informações para criar um novo plano.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Plano Básico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Valor em reais (0 para gratuito)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva brevemente o plano" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="intervalo"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Intervalo</FormLabel>
                      <FormControl>
                        <select
                          className="w-full rounded-md border border-gray-300 bg-background p-2"
                          {...field}
                        >
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual</option>
                          <option value="vitalicio">Vitalício</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="limite_prompts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Prompts</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        0 = Ilimitado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="limite_modelos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Modelos</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        0 = Ilimitado
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ordem_exibicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Exibição</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stripe_price_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID do Preço no Stripe</FormLabel>
                      <FormControl>
                        <Input placeholder="price_..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Opcional para integração Stripe
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="is_popular"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                        <div className="space-y-0.5">
                          <FormLabel>Popular</FormLabel>
                          <FormDescription>
                            Destacar como plano popular
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_ativo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-2">
                        <div className="space-y-0.5">
                          <FormLabel>Ativo</FormLabel>
                          <FormDescription>
                            Disponível para contratação
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="recursos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recursos (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='["Recurso 1", "Recurso 2", "Recurso 3"]'
                        className="font-mono text-sm"
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Lista de recursos em formato JSON
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogoPlanoAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  {modoEdicao ? 'Salvar alterações' : 'Criar plano'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={dialogoExcluirAberto} onOpenChange={setDialogoExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o plano <strong>{planoParaExcluir?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogoExcluirAberto(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={excluirPlano}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 