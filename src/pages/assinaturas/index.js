import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../../lib/supabaseClient';
import AppLayout from '../../components/layouts/AppLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Loader2, Check, X, AlertTriangle, CreditCard, Lock } from 'lucide-react';

export default function Assinaturas() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [assinaturaAtual, setAssinaturaAtual] = useState(null);
  const [planoAtivo, setPlanoAtivo] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [loadingPlano, setLoadingPlano] = useState(null);
  const [saasAtivo, setSaasAtivo] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }
      
      await carregarDados();
      await verificarSaasAtivo();
    };
    
    checkSession();
  }, [router]);
  
  const verificarSaasAtivo = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes_app')
        .select('valor')
        .eq('chave', 'saas_ativo')
        .single();
        
      setSaasAtivo(data?.valor === 'true');
    } catch (error) {
      console.error('Erro ao verificar se SaaS está ativo:', error);
      setSaasAtivo(false);
    }
  };
  
  const carregarDados = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/assinaturas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssinaturaAtual(data.assinaturaAtual);
        setPlanoAtivo(data.planoAtivo);
        setHistorico(data.historicoAssinaturas);
        setTransacoes(data.transacoes);
        setPlanosDisponiveis(data.planosDisponiveis);
      } else {
        const error = await response.json();
        toast.error(`Erro ao carregar dados: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de assinatura');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMudarPlano = async (planoId) => {
    if (!saasAtivo) {
      toast.info('O sistema de assinaturas ainda não está ativo');
      return;
    }
    
    setLoadingPlano(planoId);
    
    try {
      const response = await fetch('/api/assinaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planoId,
          successUrl: `${window.location.origin}/assinaturas?success=true`,
          cancelUrl: `${window.location.origin}/assinaturas?canceled=true`,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Se for um plano gratuito, recarregar a página
        if (!data.url) {
          toast.success('Plano atualizado com sucesso!');
          await carregarDados();
          return;
        }
        
        // Redirecionar para o checkout do Stripe
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(`Erro ao mudar plano: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao mudar plano:', error);
      toast.error('Erro ao mudar de plano');
    } finally {
      setLoadingPlano(null);
    }
  };
  
  const handleCancelarAssinatura = async () => {
    if (!saasAtivo) {
      toast.info('O sistema de assinaturas ainda não está ativo');
      return;
    }
    
    if (!assinaturaAtual) {
      toast.info('Você não possui uma assinatura ativa para cancelar');
      return;
    }
    
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium ao final do período atual.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/assinaturas/${assinaturaAtual.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast.success('Assinatura cancelada com sucesso!');
        await carregarDados();
      } else {
        const error = await response.json();
        toast.error(`Erro ao cancelar assinatura: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast.error('Erro ao cancelar assinatura');
    }
  };
  
  const handleGerenciarPagamento = async () => {
    if (!saasAtivo) {
      toast.info('O sistema de assinaturas ainda não está ativo');
      return;
    }
    
    if (!assinaturaAtual?.stripe_customer_id) {
      toast.info('Você não possui uma assinatura ativa para gerenciar');
      return;
    }
    
    try {
      const response = await fetch('/api/assinaturas/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const error = await response.json();
        toast.error(`Erro ao abrir portal de pagamento: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao abrir portal de pagamento:', error);
      toast.error('Erro ao abrir portal de pagamento');
    }
  };
  
  // Formatar data no formato dd/mm/aaaa
  const formatarData = (dataString) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };
  
  // Formatar valor monetário
  const formatarValor = (valor, moeda = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: moeda,
    }).format(valor);
  };
  
  // Obter badge de status da assinatura
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ativa':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'teste':
        return <Badge className="bg-blue-500">Período de teste</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-500">Cancelada</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'expirada':
        return <Badge className="bg-gray-500">Expirada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Verificar se o usuário está com uma assinatura ativa ou em teste
  const temAssinaturaAtiva = assinaturaAtual && ['ativa', 'teste'].includes(assinaturaAtual.status);
  
  // Verificar se o usuário está no período de teste
  const emPeriodoTeste = assinaturaAtual?.status === 'teste';
  
  // Calcular dias restantes do período de teste
  const getDiasRestantesTrial = () => {
    if (!assinaturaAtual?.trial_ends_at) return 0;
    
    const hoje = new Date();
    const trial = new Date(assinaturaAtual.trial_ends_at);
    const diffTime = trial - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Verificar se o usuário está no plano gratuito
  const temPlanoGratuito = assinaturaAtual?.planos?.preco === 0 || !planoAtivo;
  
  // Mensagem de aviso para o período de teste
  const mensagemTrial = () => {
    const dias = getDiasRestantesTrial();
    
    if (dias === 0) {
      return (
        <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-2 rounded-md">
          <AlertTriangle size={16} />
          <span>Seu período de teste termina hoje.</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded-md">
        <AlertTriangle size={16} />
        <span>Seu período de teste termina em {dias} {dias === 1 ? 'dia' : 'dias'}.</span>
      </div>
    );
  };
  
  // Verificar se o usuário tem uma assinatura agendada para cancelamento
  const temCancelamentoAgendado = assinaturaAtual?.cancelamento_agendado;

  return (
    <AppLayout>
      <Head>
        <title>Assinaturas | CriaPrompt</title>
      </Head>
      
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Mensagem se o SaaS não estiver ativo */}
      {!isLoading && !saasAtivo && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-md mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <h3 className="font-medium">Sistema de assinaturas em desenvolvimento</h3>
          </div>
          <p className="mt-1 text-sm">
            O sistema de assinaturas está sendo implementado e ainda não está ativo.
            Por enquanto, você tem acesso a todas as funcionalidades gratuitamente.
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Assinaturas e Planos</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Seção do plano atual */}
            <Card>
              <CardHeader>
                <CardTitle>Seu plano atual</CardTitle>
                <CardDescription>
                  Detalhes da sua assinatura atual
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {assinaturaAtual ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold">{assinaturaAtual.planos?.nome || 'Plano'}</h3>
                        <p className="text-gray-500">{assinaturaAtual.planos?.descricao}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-lg font-semibold">
                          {formatarValor(assinaturaAtual.planos?.preco || 0)}
                          <span className="text-sm text-gray-500 ml-1">
                            /{assinaturaAtual.planos?.intervalo === 'anual' ? 'ano' : 'mês'}
                          </span>
                        </div>
                        {getStatusBadge(assinaturaAtual.status)}
                      </div>
                    </div>
                    
                    {/* Informações adicionais do plano */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Data de início</h4>
                        <p>{formatarData(assinaturaAtual.data_inicio)}</p>
                      </div>
                      
                      {assinaturaAtual.data_termino && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Data de término</h4>
                          <p>{formatarData(assinaturaAtual.data_termino)}</p>
                        </div>
                      )}
                      
                      {assinaturaAtual.planos?.recursos && (
                        <div className="col-span-1 md:col-span-2">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Recursos incluídos</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {Object.entries(assinaturaAtual.planos.recursos).map(([key, value]) => (
                              <li key={key} className="flex items-center gap-2">
                                {value ? (
                                  <Check size={16} className="text-green-500" />
                                ) : (
                                  <X size={16} className="text-red-500" />
                                )}
                                <span className="capitalize">
                                  {key.replace(/_/g, ' ')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="col-span-1 md:col-span-2">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Limites</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">Prompts: </span>
                            <span className="font-medium">
                              {assinaturaAtual.planos?.limite_prompts === -1 ? 'Ilimitado' : assinaturaAtual.planos?.limite_prompts}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Modelos: </span>
                            <span className="font-medium">
                              {assinaturaAtual.planos?.limite_modelos === -1 ? 'Ilimitado' : assinaturaAtual.planos?.limite_modelos}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Avisos especiais */}
                    {emPeriodoTeste && mensagemTrial()}
                    
                    {temCancelamentoAgendado && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md">
                        <AlertTriangle size={16} />
                        <span>Sua assinatura será cancelada ao final do período atual.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Você está no plano gratuito</p>
                    <p className="text-sm mt-2">Faça upgrade para ter acesso a mais recursos!</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end">
                {temAssinaturaAtiva && !temPlanoGratuito && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleGerenciarPagamento}
                      disabled={!saasAtivo}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Gerenciar pagamento
                    </Button>
                    
                    <Button
                      variant="destructive"
                      onClick={handleCancelarAssinatura}
                      disabled={!saasAtivo || temCancelamentoAgendado}
                    >
                      {temCancelamentoAgendado ? 'Cancelamento agendado' : 'Cancelar assinatura'}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
            
            {/* Planos disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle>Planos disponíveis</CardTitle>
                <CardDescription>
                  Escolha o plano que melhor atende às suas necessidades
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {planosDisponiveis.map((plano) => (
                    <Card key={plano.id} className={`overflow-hidden ${assinaturaAtual?.planos?.id === plano.id ? 'border-primary border-2' : ''}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{plano.nome}</CardTitle>
                        <CardDescription className="h-8 overflow-hidden text-ellipsis">
                          {plano.descricao}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="mb-4">
                          <span className="text-2xl font-bold">
                            {formatarValor(plano.preco)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            /{plano.intervalo === 'anual' ? 'ano' : 'mês'}
                          </span>
                        </div>
                        
                        <ul className="space-y-1 mb-4">
                          <li className="flex items-center gap-2 text-sm">
                            <Check size={16} className="text-green-500" />
                            <span>
                              {plano.limite_prompts === -1 ? 'Prompts ilimitados' : `${plano.limite_prompts} prompts`}
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check size={16} className="text-green-500" />
                            <span>
                              {plano.limite_modelos === -1 ? 'Modelos ilimitados' : `${plano.limite_modelos} modelos`}
                            </span>
                          </li>
                          
                          {plano.recursos && Object.entries(plano.recursos)
                            .filter(([_, value]) => value === true)
                            .slice(0, 3)
                            .map(([key]) => (
                              <li key={key} className="flex items-center gap-2 text-sm">
                                <Check size={16} className="text-green-500" />
                                <span className="capitalize">
                                  {key.replace(/_/g, ' ')}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </CardContent>
                      
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant={assinaturaAtual?.planos?.id === plano.id ? 'outline' : 'default'}
                          disabled={
                            !saasAtivo || 
                            loadingPlano !== null || 
                            assinaturaAtual?.planos?.id === plano.id
                          }
                          onClick={() => handleMudarPlano(plano.id)}
                        >
                          {loadingPlano === plano.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : assinaturaAtual?.planos?.id === plano.id ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : null}
                          
                          {assinaturaAtual?.planos?.id === plano.id
                            ? 'Plano atual'
                            : 'Selecionar plano'}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Histórico e transações */}
            <Tabs defaultValue="historico">
              <TabsList>
                <TabsTrigger value="historico">Histórico de assinaturas</TabsTrigger>
                <TabsTrigger value="transacoes">Transações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="historico">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de assinaturas</CardTitle>
                    <CardDescription>
                      Histórico completo das suas assinaturas
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {historico.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plano</TableHead>
                            <TableHead>Data de início</TableHead>
                            <TableHead>Data de término</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                          {historico.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.planos?.nome || 'Plano removido'}
                              </TableCell>
                              <TableCell>{formatarData(item.data_inicio)}</TableCell>
                              <TableCell>
                                {item.data_termino ? formatarData(item.data_termino) : '-'}
                              </TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Nenhuma assinatura encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transacoes">
                <Card>
                  <CardHeader>
                    <CardTitle>Transações</CardTitle>
                    <CardDescription>
                      Histórico de pagamentos e reembolsos
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {transacoes.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                          {transacoes.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {formatarData(transaction.created_at)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {transaction.descricao || `${transaction.tipo} de assinatura`}
                              </TableCell>
                              <TableCell>
                                {formatarValor(transaction.valor, transaction.moeda)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`
                                    ${transaction.status === 'sucesso' ? 'bg-green-500' : ''}
                                    ${transaction.status === 'falha' ? 'bg-red-500' : ''}
                                    ${transaction.status === 'pendente' ? 'bg-yellow-500' : ''}
                                    ${transaction.status === 'reembolso' ? 'bg-blue-500' : ''}
                                  `}
                                >
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Nenhuma transação encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
} 