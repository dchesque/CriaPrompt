import Head from 'next/head';
import Header from '../components/Header';
import AuthGuard from '../components/AuthGuard';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Dados do perfil
  const [nome, setNome] = useState('');
  const [emailNotificacoes, setEmailNotificacoes] = useState(true);
  const [bio, setBio] = useState('');
  const [perfilPublico, setPerfilPublico] = useState(false);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        // Obter dados da sessão
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return;
        }
        
        setUser(session.user);
        
        // Carregar perfil do usuário
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          // PGRST116 significa que não encontrou nenhum resultado (perfil não existe ainda)
          throw error;
        }
        
        if (data) {
          setNome(data.nome || '');
          setBio(data.bio || '');
          setEmailNotificacoes(data.email_notificacoes !== false);
          setPerfilPublico(data.perfil_publico === true);
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setMessage({ 
          type: 'error', 
          text: 'Erro ao carregar perfil. Por favor, tente novamente.'
        });
      } finally {
        setLoading(false);
      }
    };

    carregarPerfil();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase
        .from('perfis')
        .upsert({
          user_id: user.id,
          nome,
          bio,
          email_notificacoes: emailNotificacoes,
          perfil_publico: perfilPublico,
          email: user.email,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Perfil atualizado com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao atualizar perfil. Por favor, tente novamente.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const enviarNovoEmailLogin = async () => {
    try {
      setMessage({ type: '', text: '' });
      
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/perfil`
        }
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: 'Um novo link de acesso foi enviado para seu e-mail!' 
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      setMessage({ 
        type: 'error', 
        text: 'Erro ao enviar e-mail. Por favor, tente novamente.' 
      });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Meu Perfil | CriaPrompt</title>
          <meta name="description" content="Gerencie seu perfil na plataforma CriaPrompt" />
        </Head>

        <Header />

        <main className="container-app py-10">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Meu Perfil
          </h1>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Informações da Conta</h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="mb-2">
                  <span className="text-gray-600 font-medium">E-mail:</span>
                  <span className="ml-2">{user?.email}</span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Membro desde:</span>
                  <span className="ml-2">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString() 
                      : 'Data não disponível'}
                  </span>
                </div>
              </div>

              <button 
                onClick={enviarNovoEmailLogin}
                className="text-indigo-600 text-sm hover:text-indigo-800"
              >
                Enviar novo link de acesso para meu e-mail
              </button>
            </div>

            {message.text && (
              <div className={`mb-6 p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Editar Perfil</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="nome" className="block text-gray-700 mb-2">
                    Nome
                  </label>
                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="bio" className="block text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={emailNotificacoes}
                      onChange={(e) => setEmailNotificacoes(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Receber notificações por e-mail</span>
                  </label>
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={perfilPublico}
                      onChange={(e) => setPerfilPublico(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-gray-700">Tornar meu perfil público</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-6">
                    Outros usuários poderão ver seu nome e bio
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}