import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Moon, Sun, Save, Trash2, Monitor, Bell, Shield, Cog, X, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

export default function Configuracoes() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aparencia');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmEmailError, setConfirmEmailError] = useState('');
  const [config, setConfig] = useState({
    temaEscuro: true,
    notificacoes: false,
    emailDigest: false,
    compartilharStatus: false,
    dadosAnalytics: true
  });

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email);
      await carregarConfiguracoes(session.user.id);
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Carregar configurações
  const carregarConfiguracoes = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          temaEscuro: data.tema_escuro ?? true,
          notificacoes: data.notificacoes ?? false,
          emailDigest: data.email_digest ?? false,
          compartilharStatus: data.compartilhar_status ?? false,
          dadosAnalytics: data.dados_analytics ?? true
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Não foi possível carregar suas configurações');
    }
  };

  // Salvar configurações
  const salvarConfiguracoes = async () => {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          tema_escuro: config.temaEscuro,
          notificacoes: config.notificacoes,
          email_digest: config.emailDigest,
          compartilhar_status: config.compartilharStatus,
          dados_analytics: config.dadosAnalytics,
          updated_at: new Date()
        });

      if (error) throw error;
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações. Tente novamente.');
    }
  };

  // Abrir modal de confirmação
  const iniciarExclusaoConta = () => {
    setConfirmEmail('');
    setConfirmEmailError('');
    setShowDeleteModal(true);
  };

  // Verificar email e confirmar exclusão
  const confirmarExclusao = () => {
    if (confirmEmail !== userEmail) {
      setConfirmEmailError('O email digitado não corresponde ao seu email.');
      return;
    }
    
    setConfirmEmailError('');
    setShowDeleteModal(false);
    excluirConta();
  };

  // Excluir conta
  const excluirConta = async () => {
    try {
      setLoading(true);

      // 1. Excluir dados do usuário (favoritos, prompts, configurações)
      await supabase.from('favoritos').delete().eq('user_id', userId);
      await supabase.from('prompts').delete().eq('user_id', userId);
      await supabase.from('user_settings').delete().eq('user_id', userId);
      await supabase.from('perfis').delete().eq('user_id', userId);
      
      // 2. Excluir a conta no Auth
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        // Fallback: Se não puder excluir diretamente (limitações de permissão)
        // Deslogar o usuário
        await supabase.auth.signOut();
        toast.success('Sua sessão foi encerrada. Entre em contato com o suporte para excluir sua conta permanentemente.');
        router.push('/');
        return;
      }
      
      // 3. Deslogar o usuário
      await supabase.auth.signOut();
      
      toast.success('Sua conta foi excluída com sucesso');
      router.push('/');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta. Entre em contato com o suporte.');
      setLoading(false);
    }
  };

  // Conteúdo da página
  const content = (
    <div className="mx-auto max-w-4xl space-y-8">
      <Head>
        <title>Configurações | CriaPrompt</title>
      </Head>
      
      <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
        <CardHeader>
          <CardTitle>Configurações da Conta</CardTitle>
          <CardDescription>Personalize sua experiência no CriaPrompt</CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Tabs de navegação */}
          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('aparencia')}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'aparencia' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor size={16} />
              Aparência
            </button>
            <button
              onClick={() => setActiveTab('notificacoes')}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'notificacoes' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Bell size={16} />
              Notificações
            </button>
            <button
              onClick={() => setActiveTab('privacidade')}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'privacidade' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield size={16} />
              Privacidade
            </button>
            <button
              onClick={() => setActiveTab('conta')}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === 'conta' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cog size={16} />
              Conta
            </button>
          </div>
          
          {/* Conteúdo de cada aba */}
          <div className="py-4">
            {/* Aba Aparência */}
            {activeTab === 'aparencia' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Tema Escuro</h3>
                    <p className="text-sm text-muted-foreground">Ativar ou desativar o tema escuro</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-5 w-5 text-muted-foreground" />
                    <Switch 
                      checked={config.temaEscuro}
                      onCheckedChange={(checked) => setConfig({...config, temaEscuro: checked})}
                    />
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button variant="default" onClick={salvarConfiguracoes} className="bg-primary">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
            
            {/* Aba Notificações */}
            {activeTab === 'notificacoes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Notificações no navegador</h3>
                    <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                  </div>
                  <Switch 
                    checked={config.notificacoes}
                    onCheckedChange={(checked) => setConfig({...config, notificacoes: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Resumo por e-mail</h3>
                    <p className="text-sm text-muted-foreground">Receba resumos semanais por e-mail</p>
                  </div>
                  <Switch 
                    checked={config.emailDigest}
                    onCheckedChange={(checked) => setConfig({...config, emailDigest: checked})}
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button variant="default" onClick={salvarConfiguracoes} className="bg-primary">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
            
            {/* Aba Privacidade */}
            {activeTab === 'privacidade' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Compartilhar status de atividade</h3>
                    <p className="text-sm text-muted-foreground">Permite que outros usuários vejam quando você está online</p>
                  </div>
                  <Switch 
                    checked={config.compartilharStatus}
                    onCheckedChange={(checked) => setConfig({...config, compartilharStatus: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Coleta de dados de uso</h3>
                    <p className="text-sm text-muted-foreground">Ajude-nos a melhorar compartilhando dados de uso anônimos</p>
                  </div>
                  <Switch 
                    checked={config.dadosAnalytics}
                    onCheckedChange={(checked) => setConfig({...config, dadosAnalytics: checked})}
                  />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button variant="default" onClick={salvarConfiguracoes} className="bg-primary">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            )}
            
            {/* Aba Conta */}
            {activeTab === 'conta' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium text-red-500">Zona de perigo</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ações irreversíveis para sua conta
                  </p>
                  
                  <div className="bg-red-900/20 p-4 rounded-md border border-red-900/30">
                    <h4 className="font-medium mb-2">Excluir conta</h4>
                    <p className="text-sm text-gray-300 mb-4">
                      Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
                    </p>
                    <Button variant="destructive" onClick={iniciarExclusaoConta}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir minha conta
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modal de confirmação de exclusão de conta */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmação de exclusão de conta
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível e todos os seus dados serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-white mb-4">
              Para confirmar a exclusão, digite seu email abaixo:
              <span className="font-medium block mt-1">{userEmail}</span>
            </p>
            
            <div className="mb-4">
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Seu email"
                className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {confirmEmailError && (
                <p className="text-xs text-red-400 mt-1">{confirmEmailError}</p>
              )}
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md mb-4">
              <p className="text-sm text-red-200">
                Ao excluir sua conta, você perderá acesso a:
              </p>
              <ul className="text-xs text-red-200 mt-2 list-disc list-inside space-y-1">
                <li>Todos os seus prompts salvos</li>
                <li>Histórico de uso e personalização</li>
                <li>Configurações e preferências</li>
                <li>Informações de perfil</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmarExclusao}
              disabled={!confirmEmail}
            >
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <DashboardLayout title="Configurações">
      {content}
    </DashboardLayout>
  );
}