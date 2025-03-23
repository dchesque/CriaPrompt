import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { toast } from 'react-toastify';
import Head from 'next/head';

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('basic');
  
  // Dados do perfil - Informações Básicas
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [emailNotificacoes, setEmailNotificacoes] = useState(true);
  const [perfilPublico, setPerfilPublico] = useState(false);
  
  // Informações Profissionais
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [cargo, setCargo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [website, setWebsite] = useState('');
  
  // Redes Sociais
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [tiktok, setTiktok] = useState('');
  
  // Social/Comunidade
  const [bio, setBio] = useState('');
  const [interesses, setInteresses] = useState('');
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        // Obter dados da sessão
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          return;
        }
        
        setUser(session.user);
        
        // Verificar se tem avatar do provedor de autenticação (Google, etc)
        if (session.user.user_metadata?.avatar_url) {
          setAvatarUrl(session.user.user_metadata.avatar_url);
        }
        
        // Carregar perfil do usuário
        const { data, error } = await supabase
          .from('perfis')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (error) {
          // Se o erro for que não encontrou resultados (PGRST116), isso é normal para novos usuários
          if (error.code !== 'PGRST116') {
            console.error('Erro ao buscar perfil:', error);
            toast.error('Erro ao carregar perfil');
          }
        } else if (data) {
          // Dados básicos
          setNome(data.nome || '');
          setUsername(data.username || '');
          // Só atualiza a URL do avatar se já tiver uma salva no banco, senão mantém a do provedor
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
          setEmailNotificacoes(data.email_notificacoes !== false);
          setPerfilPublico(data.perfil_publico === true);
          
          // Informações profissionais
          setAreaAtuacao(data.area_atuacao || '');
          setCargo(data.cargo || '');
          setEmpresa(data.empresa || '');
          setWebsite(data.website || '');
          
          // Redes sociais
          setInstagram(data.instagram || '');
          setTwitter(data.twitter || '');
          setGithub(data.github || '');
          setTiktok(data.tiktok || '');
          
          // Social/Comunidade
          setBio(data.bio || '');
          setInteresses(data.interesses || '');
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        toast.error('Erro ao carregar perfil. Por favor, tente novamente.');
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
      if (!user?.id) {
        throw new Error('Usuário não identificado');
      }
      
      // Verificar se o perfil já existe
      const { data: perfilExistente } = await supabase
        .from('perfis')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Verificar se o username já existe (exceto para o usuário atual)
      if (username) {
        const { data: usernameExistente, error: usernameError } = await supabase
          .from('perfis')
          .select('user_id')
          .eq('username', username)
          .neq('user_id', user.id);
          
        if (usernameError) throw usernameError;
        
        if (usernameExistente && usernameExistente.length > 0) {
          throw new Error('Este nome de usuário já está em uso');
        }
      }
      
      const dadosPerfil = {
        // Informações básicas
        nome,
        username,
        avatar_url: avatarUrl,
        email_notificacoes: emailNotificacoes,
        perfil_publico: perfilPublico,
        email: user.email,
        
        // Informações profissionais
        area_atuacao: areaAtuacao,
        cargo,
        empresa,
        website,
        
        // Redes sociais
        instagram,
        twitter,
        github,
        tiktok,
        
        // Social/Comunidade
        bio,
        interesses,
        
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (perfilExistente) {
        // Atualizar perfil existente
        result = await supabase
          .from('perfis')
          .update(dadosPerfil)
          .eq('user_id', user.id);
      } else {
        // Inserir novo perfil
        result = await supabase
          .from('perfis')
          .insert({
            user_id: user.id,
            ...dadosPerfil
          });
      }
      
      if (result.error) throw result.error;

      toast.success('Perfil atualizado com sucesso!');
      setMessage({ 
        type: 'success', 
        text: 'Perfil atualizado com sucesso!' 
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao atualizar perfil. Por favor, tente novamente.' 
      });
    } finally {
      setSaving(false);
    }
  };

  const enviarNovoEmailLogin = async () => {
    try {
      setMessage({ type: '', text: '' });
      
      if (!user?.email) {
        throw new Error('Email não disponível');
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/perfil`
        }
      });

      if (error) throw error;

      toast.success('Email enviado com sucesso!');
      setMessage({ 
        type: 'success', 
        text: 'Um novo link de acesso foi enviado para seu e-mail!' 
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      toast.error('Erro ao enviar email');
      setMessage({ 
        type: 'error', 
        text: 'Erro ao enviar e-mail. Por favor, tente novamente.' 
      });
    }
  };
  
  const handleFileUpload = async (e) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Você precisa selecionar uma imagem para upload.');
      }
      
      // Solução temporária enquanto o armazenamento do Supabase não está configurado
      // Em vez de fazer upload para o Supabase, vamos usar um serviço temporário ou avatar do usuário
      if (user && user.user_metadata && user.user_metadata.avatar_url) {
        // Se o usuário já tem um avatar (do Google, por exemplo), usar este
        setAvatarUrl(user.user_metadata.avatar_url);
        toast.info('Usando seu avatar do provedor de login. O upload de imagens estará disponível em breve.');
      } else {
        // Alternativa: Usar um avatar gerado com as iniciais do usuário
        const randomColor = Math.floor(Math.random()*16777215).toString(16);
        const initials = nome ? nome.charAt(0).toUpperCase() : 'U';
        const avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=${randomColor}&color=fff`;
        
        setAvatarUrl(avatarUrl);
        toast.info('Geramos um avatar temporário. O upload de imagens estará disponível em breve.');
      }
      
      /* 
      // Código original para upload no Supabase - desabilitado temporariamente
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Nome fixo do bucket - deve ser criado previamente no console do Supabase
      const bucketName = 'avatars';
      const filePath = `${fileName}`;
      
      // Usar diretamente o bucket existente, sem tentar criar um novo
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);
        
      if (uploadError) {
        if (uploadError.message.includes('bucket') || uploadError.statusCode === 404) {
          throw new Error(`O bucket "${bucketName}" não existe. Por favor, crie-o no painel do Supabase.`);
        } else if (uploadError.message.includes('security policy')) {
          throw new Error(`Erro de permissão. Verifique as políticas de segurança (RLS) para o bucket "${bucketName}".`);
        } else {
          throw uploadError;
        }
      }
      
      // Obter URL pública
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      setAvatarUrl(data.publicUrl);
      */
      
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(`Erro ao processar imagem: ${error.message || 'Falha desconhecida'}`);
    } finally {
      setUploading(false);
    }
  };

  // Conteúdo da página a ser renderizado dentro do layout
  const content = (
    <div className="max-w-4xl mx-auto">
      <Head>
        <title>Meu Perfil | CriaPrompt</title>
      </Head>
      
      <div className="bg-background/30 backdrop-blur-xl border border-white/20 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Informações da Conta</h2>
        
        <div className="mb-4 p-4 bg-background/20 rounded-md">
          <div className="mb-2">
            <span className="text-muted-foreground font-medium">E-mail:</span>
            <span className="ml-2">{user?.email || 'Não disponível'}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Membro desde:</span>
            <span className="ml-2">
              {user?.created_at 
                ? new Date(user.created_at).toLocaleDateString() 
                : 'Data não disponível'}
            </span>
          </div>
        </div>

        <button 
          onClick={enviarNovoEmailLogin}
          className="text-primary text-sm hover:text-primary/80"
          disabled={!user?.email || saving}
        >
          Enviar novo link de acesso para meu e-mail
        </button>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-background/30 backdrop-blur-xl border border-white/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Editar Perfil</h2>
        
        {/* Tabs de navegação */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'basic' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Informações Básicas
          </button>
          <button
            onClick={() => setActiveTab('professional')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'professional' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Profissional
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'social' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Redes Sociais
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'community' 
                ? 'border-b-2 border-primary text-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Social/Comunidade
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Informações Básicas */}
          {activeTab === 'basic' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  {avatarUrl ? (
                    <div className="relative w-24 h-24 mr-4">
                      <img 
                        src={avatarUrl} 
                        alt="Avatar" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mr-4 border-2 border-white/20">
                      <span className="text-3xl text-gray-400">
                        {nome ? nome.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  )}
                  
                  <div>
                    <label className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/80 transition cursor-pointer">
                      {uploading ? 'Enviando...' : 'Alterar foto'}
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*"
                        disabled={uploading || saving}
                      />
                    </label>
                    <p className="text-sm text-gray-400 mt-2">
                      Temporariamente usando avatares de serviços externos.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="nome" className="block text-sm mb-2">
                  Nome completo
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Seu nome completo"
                  disabled={saving}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm mb-2">
                  Nome de usuário (handle)
                </label>
                <div className="flex items-center">
                  <span className="bg-background/80 border border-white/20 border-r-0 rounded-l-md px-3 py-2 text-gray-400">
                    @
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="flex-1 px-3 py-2 bg-background/50 border border-white/20 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="seu_username"
                    disabled={saving}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Apenas letras minúsculas, números e underline (_)
                </p>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailNotificacoes}
                    onChange={(e) => setEmailNotificacoes(e.target.checked)}
                    className="mr-2"
                    disabled={saving}
                  />
                  <span>Receber notificações por e-mail</span>
                </label>
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={perfilPublico}
                    onChange={(e) => setPerfilPublico(e.target.checked)}
                    className="mr-2"
                    disabled={saving}
                  />
                  <span>Tornar meu perfil público</span>
                </label>
                <p className="text-sm text-muted-foreground mt-1 ml-6">
                  Outros usuários poderão ver seu perfil e suas contribuições
                </p>
              </div>
            </div>
          )}
          
          {/* Informações Profissionais */}
          {activeTab === 'professional' && (
            <div>
              <div className="mb-4">
                <label htmlFor="areaAtuacao" className="block text-sm mb-2">
                  Área de atuação
                </label>
                <input
                  id="areaAtuacao"
                  type="text"
                  value={areaAtuacao}
                  onChange={(e) => setAreaAtuacao(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Marketing, Programação, Educação"
                  disabled={saving}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="cargo" className="block text-sm mb-2">
                  Cargo ou função atual
                </label>
                <input
                  id="cargo"
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Designer, Desenvolvedor, Professor"
                  disabled={saving}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="empresa" className="block text-sm mb-2">
                  Empresa ou projeto pessoal
                </label>
                <input
                  id="empresa"
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Google, Projeto Pessoal"
                  disabled={saving}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="website" className="block text-sm mb-2">
                  LinkedIn ou website pessoal
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://www.seusite.com"
                  disabled={saving}
                />
              </div>
            </div>
          )}
          
          {/* Redes Sociais */}
          {activeTab === 'social' && (
            <div>
              <div className="mb-4">
                <label htmlFor="instagram" className="block text-sm mb-2">
                  Instagram
                </label>
                <div className="flex items-center">
                  <span className="bg-background/80 border border-white/20 border-r-0 rounded-l-md px-3 py-2 text-gray-400">
                    instagram.com/
                  </span>
                  <input
                    id="instagram"
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                    className="flex-1 px-3 py-2 bg-background/50 border border-white/20 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="seu_perfil"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="twitter" className="block text-sm mb-2">
                  Twitter/X
                </label>
                <div className="flex items-center">
                  <span className="bg-background/80 border border-white/20 border-r-0 rounded-l-md px-3 py-2 text-gray-400">
                    twitter.com/
                  </span>
                  <input
                    id="twitter"
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value.replace(/^@/, ''))}
                    className="flex-1 px-3 py-2 bg-background/50 border border-white/20 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="seu_perfil"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="github" className="block text-sm mb-2">
                  GitHub
                </label>
                <div className="flex items-center">
                  <span className="bg-background/80 border border-white/20 border-r-0 rounded-l-md px-3 py-2 text-gray-400">
                    github.com/
                  </span>
                  <input
                    id="github"
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value.replace(/^@/, ''))}
                    className="flex-1 px-3 py-2 bg-background/50 border border-white/20 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="seu_perfil"
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="tiktok" className="block text-sm mb-2">
                  TikTok
                </label>
                <div className="flex items-center">
                  <span className="bg-background/80 border border-white/20 border-r-0 rounded-l-md px-3 py-2 text-gray-400">
                    tiktok.com/@
                  </span>
                  <input
                    id="tiktok"
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value.replace(/^@/, ''))}
                    className="flex-1 px-3 py-2 bg-background/50 border border-white/20 rounded-r-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="seu_perfil"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Social/Comunidade */}
          {activeTab === 'community' && (
            <div>
              <div className="mb-4">
                <label htmlFor="bio" className="block text-sm mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Criador de conteúdo focado em IA e produtividade"
                  disabled={saving}
                  maxLength={160}
                />
                <p className="text-sm text-gray-400 text-right mt-1">
                  {bio.length}/160 caracteres
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="interesses" className="block text-sm mb-2">
                  Tags ou interesses (separados por vírgula)
                </label>
                <input
                  id="interesses"
                  type="text"
                  value={interesses}
                  onChange={(e) => setInteresses(e.target.value)}
                  className="w-full px-3 py-2 bg-background/50 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: ia, copywriting, educação, startups"
                  disabled={saving}
                />
                <p className="text-sm text-gray-400 mt-1">
                  Adicione tags relacionadas aos seus interesses
                </p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={saving || !user?.id}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/80 transition duration-300 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Meu Perfil">
      {content}
    </DashboardLayout>
  );
}