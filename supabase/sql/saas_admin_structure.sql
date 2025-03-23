-- ========================
-- Estrutura SaaS e Admin
-- ========================

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS planos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  intervalo TEXT NOT NULL CHECK (intervalo IN ('mensal', 'anual')),
  stripe_price_id TEXT UNIQUE,
  limite_prompts INTEGER DEFAULT 10,
  limite_modelos INTEGER DEFAULT 5,
  recursos JSONB,
  is_ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS assinaturas (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id INTEGER REFERENCES planos(id),
  status TEXT NOT NULL CHECK (status IN ('ativa', 'cancelada', 'pendente', 'teste', 'expirada')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_termino TIMESTAMP WITH TIME ZONE,
  cancelamento_agendado BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  card_last_four VARCHAR(4),
  card_brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transacoes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assinatura_id INTEGER REFERENCES assinaturas(id),
  valor DECIMAL(10, 2) NOT NULL,
  moeda TEXT DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'falha', 'pendente', 'reembolso')),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagamento', 'reembolso', 'estorno')),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  metodo_pagamento TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perfis de usuário estendida
CREATE TABLE IF NOT EXISTS perfis_usuario (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome_completo TEXT,
  telefone TEXT,
  endereco JSONB,
  tipo_conta TEXT DEFAULT 'pessoal' CHECK (tipo_conta IN ('pessoal', 'empresarial')),
  documento_fiscal TEXT,
  data_nascimento DATE,
  imagem_perfil TEXT,
  plano_atual INTEGER REFERENCES planos(id),
  status_conta TEXT DEFAULT 'ativo' CHECK (status_conta IN ('ativo', 'suspenso', 'banido')),
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de papéis de usuário
CREATE TABLE IF NOT EXISTS papeis_usuario (
  id SERIAL PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  permissoes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relacionamento entre usuários e papéis
CREATE TABLE IF NOT EXISTS usuario_papeis (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  papel_id INTEGER REFERENCES papeis_usuario(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, papel_id)
);

-- Tabela de configurações do aplicativo
CREATE TABLE IF NOT EXISTS configuracoes_app (
  id SERIAL PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  tipo TEXT DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
  grupo TEXT DEFAULT 'geral',
  descricao TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de estatísticas para o painel de administração
CREATE TABLE IF NOT EXISTS estatisticas (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  usuarios_novos INTEGER DEFAULT 0,
  assinaturas_novas INTEGER DEFAULT 0,
  assinaturas_canceladas INTEGER DEFAULT 0,
  receita_total DECIMAL(10, 2) DEFAULT 0,
  prompts_criados INTEGER DEFAULT 0,
  modelos_criados INTEGER DEFAULT 0,
  visitas_site INTEGER DEFAULT 0,
  dados_adicionais JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs para auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela_afetada TEXT,
  registro_id TEXT,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Funções e gatilhos
-- ========================

-- Gatilho para atualizar o campo updated_at em planos
DROP TRIGGER IF EXISTS set_planos_updated_at ON planos;
CREATE TRIGGER set_planos_updated_at
BEFORE UPDATE ON planos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Gatilho para atualizar o campo updated_at em assinaturas
DROP TRIGGER IF EXISTS set_assinaturas_updated_at ON assinaturas;
CREATE TRIGGER set_assinaturas_updated_at
BEFORE UPDATE ON assinaturas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Gatilho para atualizar o campo updated_at em perfis_usuario
DROP TRIGGER IF EXISTS set_perfis_usuario_updated_at ON perfis_usuario;
CREATE TRIGGER set_perfis_usuario_updated_at
BEFORE UPDATE ON perfis_usuario
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Gatilho para atualizar o campo updated_at em configuracoes_app
DROP TRIGGER IF EXISTS set_configuracoes_app_updated_at ON configuracoes_app;
CREATE TRIGGER set_configuracoes_app_updated_at
BEFORE UPDATE ON configuracoes_app
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Função para verificar se o usuário é administrador
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM usuario_papeis up
    JOIN papeis_usuario pu ON up.papel_id = pu.id
    WHERE up.user_id = user_uuid AND pu.nome = 'admin'
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar ações na tabela de auditoria
CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  acao_tipo TEXT;
  dados_velhos JSONB := NULL;
  dados_novos JSONB := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    acao_tipo := 'inserção';
    dados_novos := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    acao_tipo := 'atualização';
    dados_velhos := to_jsonb(OLD);
    dados_novos := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    acao_tipo := 'exclusão';
    dados_velhos := to_jsonb(OLD);
  END IF;

  INSERT INTO logs_auditoria (
    user_id,
    acao,
    tabela_afetada,
    registro_id,
    dados_antigos,
    dados_novos,
    ip_address
  ) VALUES (
    auth.uid(),
    acao_tipo,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    dados_velhos,
    dados_novos,
    current_setting('request.headers', true)::json->>'x-real-ip'
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- Dados iniciais
-- ========================

-- Criar papéis iniciais
INSERT INTO papeis_usuario (nome, descricao, permissoes)
VALUES 
  ('admin', 'Administrador com acesso total ao sistema', '{"todas": true}'::jsonb),
  ('moderador', 'Moderador com permissões para revisar conteúdo', 
   '{"prompts": {"visualizar": true, "editar": true, "excluir": true}, 
     "usuarios": {"visualizar": true, "editar": false, "excluir": false}}'::jsonb),
  ('usuario', 'Usuário padrão do sistema', '{"prompts_proprios": true}'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- Criar planos iniciais
INSERT INTO planos (nome, descricao, preco, intervalo, limite_prompts, limite_modelos, recursos)
VALUES 
  ('Gratuito', 'Acesso básico às funcionalidades', 0.00, 'mensal', 5, 2, 
   '{"acesso_publico": true, "campos_personalizados": false, "modelos_inteligentes": false}'::jsonb),
  ('Essencial', 'Perfeito para usuários regulares', 19.90, 'mensal', 30, 10, 
   '{"acesso_publico": true, "campos_personalizados": true, "modelos_inteligentes": true}'::jsonb),
  ('Profissional', 'Para criadores de conteúdo intensivo', 39.90, 'mensal', 100, 30, 
   '{"acesso_publico": true, "campos_personalizados": true, "modelos_inteligentes": true, "prioridade_suporte": true, "api_acesso": true}'::jsonb),
  ('Empresarial', 'Solução completa para empresas', 99.90, 'mensal', -1, -1, 
   '{"acesso_publico": true, "campos_personalizados": true, "modelos_inteligentes": true, "prioridade_suporte": true, "api_acesso": true, "equipes": true, "analytics": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- Configurações iniciais do app
INSERT INTO configuracoes_app (chave, valor, tipo, grupo, descricao, is_public)
VALUES
  ('app_nome', 'CriaPrompt', 'string', 'geral', 'Nome do aplicativo', true),
  ('app_descricao', 'Plataforma para criar e compartilhar prompts para IA', 'string', 'geral', 'Descrição curta do aplicativo', true),
  ('moeda_padrao', 'BRL', 'string', 'pagamentos', 'Código da moeda padrão', true),
  ('modo_stripe', 'teste', 'string', 'pagamentos', 'Modo do Stripe (teste ou produção)', false),
  ('trial_dias', '7', 'number', 'assinaturas', 'Dias de período de teste para novos usuários', true),
  ('max_prompts_gratuitos', '5', 'number', 'limites', 'Número máximo de prompts para contas gratuitas', true),
  ('max_modelos_gratuitos', '2', 'number', 'limites', 'Número máximo de modelos para contas gratuitas', true),
  ('saas_ativo', 'false', 'boolean', 'geral', 'Se o modo SaaS está ativo', true)
ON CONFLICT (chave) DO NOTHING;

-- ========================
-- Políticas RLS
-- ========================

-- Habilitar RLS para todas as tabelas
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE papeis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatisticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para planos
DROP POLICY IF EXISTS "Todos podem ver planos ativos" ON planos;
CREATE POLICY "Todos podem ver planos ativos" 
ON planos FOR SELECT 
USING (is_ativo = true OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar planos" ON planos;
CREATE POLICY "Somente admins podem gerenciar planos" 
ON planos FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para assinaturas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias assinaturas" ON assinaturas;
CREATE POLICY "Usuários podem ver suas próprias assinaturas" 
ON assinaturas FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar assinaturas" ON assinaturas;
CREATE POLICY "Somente admins podem gerenciar assinaturas" 
ON assinaturas FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para transações
DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON transacoes;
CREATE POLICY "Usuários podem ver suas próprias transações" 
ON transacoes FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar transações" ON transacoes;
CREATE POLICY "Somente admins podem gerenciar transações" 
ON transacoes FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para perfil de usuário
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON perfis_usuario;
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON perfis_usuario FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON perfis_usuario;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON perfis_usuario FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Somente admins podem gerenciar perfis" ON perfis_usuario;
CREATE POLICY "Somente admins podem gerenciar perfis" 
ON perfis_usuario FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para papéis
DROP POLICY IF EXISTS "Todos podem ver papéis" ON papeis_usuario;
CREATE POLICY "Todos podem ver papéis" 
ON papeis_usuario FOR SELECT 
TO authenticated;

DROP POLICY IF EXISTS "Somente admins podem gerenciar papéis" ON papeis_usuario;
CREATE POLICY "Somente admins podem gerenciar papéis" 
ON papeis_usuario FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para relação usuário-papéis
DROP POLICY IF EXISTS "Usuários podem ver seus próprios papéis" ON usuario_papeis;
CREATE POLICY "Usuários podem ver seus próprios papéis" 
ON usuario_papeis FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar papéis de usuários" ON usuario_papeis;
CREATE POLICY "Somente admins podem gerenciar papéis de usuários" 
ON usuario_papeis FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para configurações do app
DROP POLICY IF EXISTS "Todos podem ver configurações públicas" ON configuracoes_app;
CREATE POLICY "Todos podem ver configurações públicas" 
ON configuracoes_app FOR SELECT 
USING (is_public = true OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar configurações" ON configuracoes_app;
CREATE POLICY "Somente admins podem gerenciar configurações" 
ON configuracoes_app FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para estatísticas
DROP POLICY IF EXISTS "Somente admins podem ver estatísticas" ON estatisticas;
CREATE POLICY "Somente admins podem ver estatísticas" 
ON estatisticas FOR SELECT 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Somente admins podem gerenciar estatísticas" ON estatisticas;
CREATE POLICY "Somente admins podem gerenciar estatísticas" 
ON estatisticas FOR ALL 
USING (is_admin(auth.uid()));

-- Políticas para logs de auditoria
DROP POLICY IF EXISTS "Somente admins podem ver logs de auditoria" ON logs_auditoria;
CREATE POLICY "Somente admins podem ver logs de auditoria" 
ON logs_auditoria FOR SELECT 
USING (is_admin(auth.uid()));

-- ========================
-- Funções para SaaS/Admin
-- ========================

-- Função para verificar limites de usuário
CREATE OR REPLACE FUNCTION verificar_limite_usuario(usuario_id UUID, tipo TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  limite_atual INTEGER;
  contagem_atual INTEGER;
  plano_id INTEGER;
BEGIN
  -- Obter o plano atual do usuário
  SELECT plano_atual INTO plano_id FROM perfis_usuario WHERE user_id = usuario_id;
  
  -- Se não tiver plano, assume o gratuito (id 1)
  IF plano_id IS NULL THEN
    plano_id := 1;
  END IF;
  
  -- Obter o limite conforme o tipo
  IF tipo = 'prompts' THEN
    SELECT limite_prompts INTO limite_atual FROM planos WHERE id = plano_id;
    SELECT COUNT(*) INTO contagem_atual FROM prompts WHERE user_id = usuario_id;
  ELSIF tipo = 'modelos' THEN
    SELECT limite_modelos INTO limite_atual FROM planos WHERE id = plano_id;
    SELECT COUNT(*) INTO contagem_atual FROM modelos_inteligentes WHERE user_id = usuario_id;
  ELSE
    RETURN true; -- Tipo desconhecido, não bloquear por segurança
  END IF;
  
  -- -1 significa sem limite
  IF limite_atual = -1 THEN
    RETURN true;
  END IF;
  
  -- Verificar se está dentro do limite
  RETURN contagem_atual < limite_atual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 