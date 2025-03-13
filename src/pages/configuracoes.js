import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Configuracoes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados para configurações
  const [darkMode, setDarkMode] = useState(false);
  const [notificacoesApp, setNotificacoesApp] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [templatePadrao, setTemplatePadrao] = useState('');
  
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        // Obter dados da sessão
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return;
        }
        
        setUser(session.user);
        
        // Carregar configurações do usuário
        const { data, error } = await supabase
          .from('configuracoes')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          // PGRST116 significa que não encontrou nenhum resultado (config não existe ainda)
          throw error;
        }
        
        if (data) {
          setDarkMode(data.dark_mode || false);
          setNotificacoesApp(data.notificacoes_app !== false);
          setAutoSave(data.auto_save !== false);
          setTemplatePadrao(data.template_padrao || '');
        }
        
        // Verificar preferência de tema no localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          setDarkMode(true);
          document.documentElement.classList.add('dark');
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setMessage({ 
          type: 'error', 
          text: 'Erro ao carregar configurações. Por favor, tente novamente.'
        });
      } finally {
        setLoading(false);
      }
    };

    carregarConfiguracoes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({
          user_id: user.id,
          dark_mode: darkMode,
          notificacoes_app: notificacoesApp,
          auto_save: autoSave,
          template_padrao: templatePadrao,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Atualizar tema
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

      setMessage({ 
        type: 'success', 
        text: 'Configurações atualizadas com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao atualizar configurações. Por favor, tente novamente.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const apagarConta = async () => {
    if (!confirm('ATENÇÃO: Esta ação excluirá permanentemente sua conta e todos os seus dados. Esta ação não pode ser desfeita. Deseja continuar?')) {
      return;
    }
    
    const confirmEmail = prompt('Para confirmar, digite seu email:');
    
    if (confirmEmail !== user.email) {
      alert('Email incorreto. Exclusão de conta cancelada.');
      return;
    }
    
    try {
      setMessage({ type: '', text: '' });
      setSaving(true);
      
      // Excluir conta no Supabase Auth
      const { error } = await supabase.rpc('delete_user');
      
      if (error) throw error;
      
      alert('Sua conta foi excluída. Você será redirecionado para a página inicial.');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao excluir conta. Por favor, entre em contato com o suporte.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Configurações | CriaPrompt</title>
          <meta name="description" content="Configurações da sua conta no CriaPrompt" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Configurações
          </h1>

          <div className="max-w-2xl mx-auto">
            {message.text && (
              <div className={`mb-6 p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Preferências de Aplicativo</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Modo escuro</span>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={notificacoesApp}
                      onChange={(e) => setNotificacoesApp(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Receber notificações no aplicativo</span>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Salvar rascunhos automaticamente</span>
                  </label>
                </div>

                <div className="mb-6">
                  <label htmlFor="templatePadrao" className="block text-gray-700 mb-2">
                    Template padrão para novos prompts
                  </label>
                  <textarea
                    id="templatePadrao"
                    value={templatePadrao}
                    onChange={(e) => setTemplatePadrao(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Digite um template base para seus novos prompts..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Este texto será inserido automaticamente ao criar um novo prompt
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-600">Zona de Perigo</h2>
              
              <p className="mb-4 text-gray-700">
                A exclusão da conta é permanente e removerá todos os seus prompts, favoritos e dados pessoais.
              </p>
              
              <button
                onClick={apagarConta}
                disabled={saving}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-300 disabled:opacity-50"
              >
                Excluir minha conta
              </button>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}