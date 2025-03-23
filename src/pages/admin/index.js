import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layouts/AdminLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Users,
  FileText,
  CreditCard,
  Package,
  TrendingUp,
  ArrowRight,
  Calendar,
  UserPlus,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalUsuarios: 0,
    usuariosNovos: 0,
    totalPrompts: 0,
    totalModelos: 0,
    assinaturasAtivas: 0,
    receitaTotal: 0,
    receitaMes: 0,
    transacoesRecentes: [],
    usuariosRecentes: [],
    estatisticasDiarias: [],
    saasAtivo: false
  });
  
  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      
      try {
        // Verificar se o SaaS está ativo
        const { data: configData } = await supabase
          .from('configuracoes_app')
          .select('valor')
          .eq('chave', 'saas_ativo')
          .single();
          
        const saasAtivo = configData?.valor === 'true';
        
        // Total de usuários
        const { count: totalUsuarios } = await supabase
          .from('auth.users')
          .select('id', { count: 'exact', head: true });
          
        // Usuários cadastrados nos últimos 30 dias
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        const { count: usuariosNovos } = await supabase
          .from('auth.users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dataLimite.toISOString());
          
        // Total de prompts
        const { count: totalPrompts } = await supabase
          .from('prompts')
          .select('id', { count: 'exact', head: true });
          
        // Total de modelos
        const { count: totalModelos } = await supabase
          .from('modelos_inteligentes')
          .select('id', { count: 'exact', head: true });
          
        // Assinaturas ativas
        const { count: assinaturasAtivas } = await supabase
          .from('assinaturas')
          .select('id', { count: 'exact', head: true })
          .in('status', ['ativa', 'teste']);
          
        // Receita total
        const { data: receitaData } = await supabase
          .from('transacoes')
          .select('valor')
          .eq('status', 'sucesso');
          
        const receitaTotal = receitaData?.reduce((total, item) => total + item.valor, 0) || 0;
        
        // Receita do mês atual
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        
        const { data: receitaMesData } = await supabase
          .from('transacoes')
          .select('valor')
          .eq('status', 'sucesso')
          .gte('created_at', inicioMes.toISOString());
          
        const receitaMes = receitaMesData?.reduce((total, item) => total + item.valor, 0) || 0;
        
        // Transações recentes
        const { data: transacoesRecentes } = await supabase
          .from('transacoes')
          .select(`
            *,
            assinaturas (
              plano_id,
              planos (nome)
            ),
            user_id,
            auth.users!transacoes_user_id_fkey (email)
          `)
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Usuários recentes
        const { data: usuariosRecentes } = await supabase
          .from('auth.users')
          .select(`
            id,
            email,
            created_at,
            perfis_usuario!inner (
              nome_completo,
              plano_atual,
              imagem_perfil
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);
          
        // Estatísticas diárias dos últimos 30 dias
        const { data: estatisticasDiarias } = await supabase
          .from('estatisticas')
          .select('*')
          .order('data', { ascending: true })
          .limit(30);
          
        setDashboardData({
          totalUsuarios: totalUsuarios || 0,
          usuariosNovos: usuariosNovos || 0,
          totalPrompts: totalPrompts || 0,
          totalModelos: totalModelos || 0,
          assinaturasAtivas: assinaturasAtivas || 0,
          receitaTotal,
          receitaMes,
          transacoesRecentes: transacoesRecentes || [],
          usuariosRecentes: usuariosRecentes || [],
          estatisticasDiarias: estatisticasDiarias || [],
          saasAtivo
        });
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    carregarDados();
  }, []);
  
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
  
  // Preparar dados para o gráfico de usuários e receita
  const dadosGraficoUsuariosReceita = {
    labels: dashboardData.estatisticasDiarias.map(item => formatarData(item.data)),
    datasets: [
      {
        label: 'Novos Usuários',
        data: dashboardData.estatisticasDiarias.map(item => item.usuarios_novos),
        borderColor: 'rgba(53, 162, 235, 1)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y',
      },
      {
        label: 'Receita (R$)',
        data: dashboardData.estatisticasDiarias.map(item => item.receita_total),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y1',
      },
    ],
  };
  
  const opcoesGraficoUsuariosReceita = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Usuários'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Receita (R$)'
        }
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Usuários x Receita (Últimos 30 dias)'
      },
    },
  };
  
  // Preparar dados para o gráfico de prompts e modelos
  const dadosGraficoPrompts = {
    labels: dashboardData.estatisticasDiarias.map(item => formatarData(item.data)),
    datasets: [
      {
        label: 'Prompts Criados',
        data: dashboardData.estatisticasDiarias.map(item => item.prompts_criados),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Modelos Criados',
        data: dashboardData.estatisticasDiarias.map(item => item.modelos_criados),
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      },
    ],
  };
  
  const opcoesGraficoPrompts = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Prompts e Modelos Criados (Últimos 30 dias)'
      },
    },
  };
  
  // Calcular a taxa de crescimento
  const calcularCrescimento = (atual, anterior) => {
    if (anterior === 0) return 100;
    return ((atual - anterior) / anterior) * 100;
  };
  
  if (isLoading) {
    return (
      <AdminLayout>
        <Head>
          <title>Dashboard Admin | CriaPrompt</title>
        </Head>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Dashboard Admin | CriaPrompt</title>
      </Head>
      
      {/* Mensagem se o SaaS não estiver ativo */}
      {!dashboardData.saasAtivo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <h3 className="font-medium">Configure o sistema SaaS</h3>
          </div>
          <p className="mt-1 text-sm">
            O sistema de assinaturas não está ativo. Vá para as configurações para ativar o modo SaaS.
          </p>
          <div className="mt-2">
            <Link href="/admin/configuracoes/geral">
              <Button size="sm" variant="outline">
                Ir para configurações
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Usuários</p>
                <h3 className="text-2xl font-bold mt-1">{dashboardData.totalUsuarios}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-500">+{dashboardData.usuariosNovos}</span> nos últimos 30 dias
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Prompts</p>
                <h3 className="text-2xl font-bold mt-1">{dashboardData.totalPrompts}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Total na plataforma
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <FileText size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Assinaturas Ativas</p>
                <h3 className="text-2xl font-bold mt-1">{dashboardData.assinaturasAtivas}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.saasAtivo ? 'SaaS ativo' : 'SaaS inativo'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <CreditCard size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Receita Mensal</p>
                <h3 className="text-2xl font-bold mt-1">{formatarValor(dashboardData.receitaMes)}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Total: {formatarValor(dashboardData.receitaTotal)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <TrendingUp size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <Line 
              data={dadosGraficoUsuariosReceita} 
              options={opcoesGraficoUsuariosReceita} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <Bar 
              data={dadosGraficoPrompts} 
              options={opcoesGraficoPrompts} 
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Listas de transações e usuários recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transações recentes</CardTitle>
            <CardDescription>
              Últimos pagamentos e reembolsos processados
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {dashboardData.transacoesRecentes.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.transacoesRecentes.map((transacao) => (
                  <div key={transacao.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {transacao.auth?.users?.email || 'Usuário removido'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {transacao.assinaturas?.planos?.nome || 'Plano removido'} - {formatarData(transacao.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-semibold ${transacao.tipo === 'reembolso' ? 'text-red-600' : 'text-green-600'}`}>
                        {transacao.tipo === 'reembolso' ? '-' : ''}{formatarValor(transacao.valor)}
                      </span>
                      <Badge className={`
                        ${transacao.status === 'sucesso' ? 'bg-green-500' : ''}
                        ${transacao.status === 'falha' ? 'bg-red-500' : ''}
                        ${transacao.status === 'pendente' ? 'bg-yellow-500' : ''}
                        ${transacao.status === 'reembolso' ? 'bg-blue-500' : ''}
                      `}>
                        {transacao.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nenhuma transação encontrada</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="justify-end">
            <Link href="/admin/transacoes">
              <Button variant="outline" size="sm">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Usuários recentes</CardTitle>
            <CardDescription>
              Últimos usuários cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {dashboardData.usuariosRecentes.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.usuariosRecentes.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                        {usuario.perfis_usuario?.imagem_perfil ? (
                          <img 
                            src={usuario.perfis_usuario.imagem_perfil}
                            alt="Perfil"
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {usuario.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {usuario.perfis_usuario?.nome_completo || usuario.email}
                        </span>
                        <span className="text-sm text-gray-500">
                          Cadastro: {formatarData(usuario.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge>
                      {usuario.perfis_usuario?.plano_atual === 1 ? 'Gratuito' : 'Premium'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Nenhum usuário recente encontrado</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="justify-end">
            <Link href="/admin/usuarios">
              <Button variant="outline" size="sm">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
} 