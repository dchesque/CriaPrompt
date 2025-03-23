import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../../lib/supabaseClient';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../../components/ui/card';
import { Switch } from "../../../components/ui/switch";
import { Separator } from "../../../components/ui/separator";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Save,
  Loader2,
  Info,
  ShieldCheck,
  CreditCard,
  Globe,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react';

export default function ConfiguracoesGerais() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configuracoes, setConfiguracoes] = useState({
    // Configurações gerais
    nome_site: '',
    descricao_site: '',
    url_site: '',
    email_contato: '',
    // SaaS
    saas_ativo: false,
    // Stripe
    stripe_public_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    // API OpenAI
    openai_api_key: '',
    modelo_padrao: '',
    // Limites
    limite_prompts_gratuito: 5,
    limite_modelos_gratuito: 2,
    mostrar_anuncios: true,
    permitir_registro_publico: true,
  });

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    setIsLoading(true);
    try {
      // Buscar todas as configurações do banco
      const { data, error } = await supabase
        .from('configuracoes_app')
        .select('*');

      if (error) throw error;
      
      // Converter o array para um objeto com chave/valor
      const configObject = {};
      data.forEach(item => {
        // Converter strings para outros tipos conforme necessário
        if (item.valor === 'true' || item.valor === 'false') {
          configObject[item.chave] = item.valor === 'true';
        } else if (!isNaN(item.valor) && item.valor !== '') {
          configObject[item.chave] = Number(item.valor);
        } else {
          configObject[item.chave] = item.valor;
        }
      });
      
      // Mesclar com os valores padrão
      setConfiguracoes(prev => ({
        ...prev,
        ...configObject
      }));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    setIsSaving(true);
    try {
      // Preparar os dados para inserção/atualização
      const updates = Object.entries(configuracoes).map(([chave, valor]) => ({
        chave,
        valor: valor.toString(),
        atualizado_em: new Date().toISOString()
      }));
      
      // Usar o método upsert para inserir ou atualizar
      const { error } = await supabase
        .from('configuracoes_app')
        .upsert(updates, { onConflict: 'chave' });
        
      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setConfiguracoes(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSwitchChange = (name, checked) => {
    setConfiguracoes(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Head>
          <title>Configurações Gerais | CriaPrompt</title>
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
        <title>Configurações Gerais | CriaPrompt</title>
      </Head>
      
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Configurações Gerais</h1>
          
          <Button onClick={salvarConfiguracoes} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configurações do Site */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <CardTitle>Informações do Site</CardTitle>
              </div>
              <CardDescription>
                Configure as informações básicas do seu site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Site</label>
                <Input
                  name="nome_site"
                  value={configuracoes.nome_site || ''}
                  onChange={handleInputChange}
                  placeholder="CriaPrompt"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição do Site</label>
                <Textarea
                  name="descricao_site"
                  value={configuracoes.descricao_site || ''}
                  onChange={handleInputChange}
                  placeholder="Uma plataforma para criar e compartilhar prompts de IA"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Site</label>
                <Input
                  name="url_site"
                  value={configuracoes.url_site || ''}
                  onChange={handleInputChange}
                  placeholder="https://criaprompt.com"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email de Contato</label>
                <Input
                  name="email_contato"
                  value={configuracoes.email_contato || ''}
                  onChange={handleInputChange}
                  placeholder="contato@criaprompt.com"
                  type="email"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Configurações de Segurança e Acesso */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <CardTitle>Segurança e Acesso</CardTitle>
              </div>
              <CardDescription>
                Configure as opções de segurança e registro de usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Permitir Registro Público</label>
                  <p className="text-xs text-gray-500">
                    Se desativado, apenas administradores poderão criar novos usuários
                  </p>
                </div>
                <Switch
                  checked={configuracoes.permitir_registro_publico}
                  onCheckedChange={(checked) => handleSwitchChange('permitir_registro_publico', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Mostrar Anúncios</label>
                  <p className="text-xs text-gray-500">
                    Exibir anúncios para usuários do plano gratuito
                  </p>
                </div>
                <Switch
                  checked={configuracoes.mostrar_anuncios}
                  onCheckedChange={(checked) => handleSwitchChange('mostrar_anuncios', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Limite de Prompts (Plano Gratuito)</label>
                <Input
                  name="limite_prompts_gratuito"
                  value={configuracoes.limite_prompts_gratuito || 5}
                  onChange={handleInputChange}
                  type="number"
                  min={0}
                />
                <p className="text-xs text-gray-500">Defina 0 para ilimitado</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Limite de Modelos (Plano Gratuito)</label>
                <Input
                  name="limite_modelos_gratuito"
                  value={configuracoes.limite_modelos_gratuito || 2}
                  onChange={handleInputChange}
                  type="number"
                  min={0}
                />
                <p className="text-xs text-gray-500">Defina 0 para ilimitado</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Configurações SaaS */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                <CardTitle>Configurações SaaS</CardTitle>
              </div>
              <CardDescription>
                Configure o sistema de assinaturas e pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Ativar Sistema SaaS</label>
                  <p className="text-xs text-gray-500">
                    Habilitar sistema de assinaturas e pagamentos
                  </p>
                </div>
                <Switch
                  checked={configuracoes.saas_ativo}
                  onCheckedChange={(checked) => handleSwitchChange('saas_ativo', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Stripe Public Key</label>
                <Input
                  name="stripe_public_key"
                  value={configuracoes.stripe_public_key || ''}
                  onChange={handleInputChange}
                  placeholder="pk_test_..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Stripe Secret Key</label>
                <Input
                  name="stripe_secret_key"
                  value={configuracoes.stripe_secret_key || ''}
                  onChange={handleInputChange}
                  placeholder="sk_test_..."
                  type="password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Stripe Webhook Secret</label>
                <Input
                  name="stripe_webhook_secret"
                  value={configuracoes.stripe_webhook_secret || ''}
                  onChange={handleInputChange}
                  placeholder="whsec_..."
                  type="password"
                />
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800 text-sm">
                <div className="flex gap-2">
                  <Info className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Configuração do Webhook</p>
                    <p className="mt-1">
                      Configure seu webhook no painel do Stripe apontando para:<br />
                      <code className="bg-blue-100 px-1 py-0.5 rounded">{configuracoes.url_site}/api/webhook/stripe</code>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Configurações de API */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <CardTitle>Configurações de API</CardTitle>
              </div>
              <CardDescription>
                Configure as integrações com APIs de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">OpenAI API Key</label>
                <Input
                  name="openai_api_key"
                  value={configuracoes.openai_api_key || ''}
                  onChange={handleInputChange}
                  placeholder="sk-..."
                  type="password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Modelo Padrão</label>
                <Input
                  name="modelo_padrao"
                  value={configuracoes.modelo_padrao || ''}
                  onChange={handleInputChange}
                  placeholder="gpt-4"
                />
                <p className="text-xs text-gray-500">
                  Ex: gpt-4, gpt-3.5-turbo, claude-3-opus
                </p>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    fetch('/api/admin/testar-api', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        apiKey: configuracoes.openai_api_key,
                        modelo: configuracoes.modelo_padrao
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        toast.success('Conexão com API estabelecida com sucesso!');
                      } else {
                        toast.error('Erro ao conectar: ' + data.error);
                      }
                    })
                    .catch(err => {
                      toast.error('Erro ao testar conexão: ' + err.message);
                    });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Testar Conexão com API
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button onClick={salvarConfiguracoes} disabled={isSaving} size="lg">
            {isSaving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            Salvar Todas as Configurações
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
} 