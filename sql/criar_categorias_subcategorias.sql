-- Criar estrutura de categorias e subcategorias

-- Criar as tabelas necessárias se não existirem
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela prompts se não existir
CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  texto TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT, -- Inicialmente definido como TEXT para compatibilidade
  tags TEXT[],
  publico BOOLEAN DEFAULT TRUE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela modelos se não existir
CREATE TABLE IF NOT EXISTS modelos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  estrutura TEXT NOT NULL,
  categoria TEXT, -- Inicialmente definido como TEXT para compatibilidade
  publico BOOLEAN DEFAULT TRUE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Limpar dados existentes nas tabelas de categorias (se necessário)
TRUNCATE TABLE subcategorias CASCADE;
TRUNCATE TABLE categorias CASCADE;

-- Reiniciar sequências de IDs
ALTER SEQUENCE categorias_id_seq RESTART WITH 1;
ALTER SEQUENCE subcategorias_id_seq RESTART WITH 1;

-- Inserir novas categorias
WITH new_categories AS (
  INSERT INTO categorias (nome, created_at, updated_at) VALUES
    ('Marketing', NOW(), NOW()),
    ('Criação de Conteúdo', NOW(), NOW()),
    ('Negócios', NOW(), NOW()),
    ('Tecnologia', NOW(), NOW()),
    ('Escrita', NOW(), NOW()),
    ('Educação', NOW(), NOW()),
    ('Produtividade', NOW(), NOW()),
    ('Carreira', NOW(), NOW()),
    ('Desenvolvimento Pessoal', NOW(), NOW()),
    ('Prompts Técnicos', NOW(), NOW())
  RETURNING id, nome
)
-- Inserir subcategorias baseadas nas categorias criadas
INSERT INTO subcategorias (nome, categoria_id, created_at, updated_at)
SELECT subcategoria, categoria_id, NOW(), NOW()
FROM (
  -- Marketing (1)
  SELECT 'Anúncios' AS subcategoria, c.id AS categoria_id FROM new_categories c WHERE c.nome = 'Marketing' UNION ALL
  SELECT 'Redes Sociais', c.id FROM new_categories c WHERE c.nome = 'Marketing' UNION ALL
  SELECT 'Email Marketing', c.id FROM new_categories c WHERE c.nome = 'Marketing' UNION ALL
  SELECT 'SEO', c.id FROM new_categories c WHERE c.nome = 'Marketing' UNION ALL
  SELECT 'Posicionamento', c.id FROM new_categories c WHERE c.nome = 'Marketing' UNION ALL

  -- Criação de Conteúdo (2)
  SELECT 'Blog', c.id FROM new_categories c WHERE c.nome = 'Criação de Conteúdo' UNION ALL
  SELECT 'Vídeo', c.id FROM new_categories c WHERE c.nome = 'Criação de Conteúdo' UNION ALL
  SELECT 'Podcast', c.id FROM new_categories c WHERE c.nome = 'Criação de Conteúdo' UNION ALL
  SELECT 'Infográficos', c.id FROM new_categories c WHERE c.nome = 'Criação de Conteúdo' UNION ALL
  SELECT 'Imagens', c.id FROM new_categories c WHERE c.nome = 'Criação de Conteúdo' UNION ALL

  -- Negócios (3)
  SELECT 'Vendas', c.id FROM new_categories c WHERE c.nome = 'Negócios' UNION ALL
  SELECT 'Estratégia', c.id FROM new_categories c WHERE c.nome = 'Negócios' UNION ALL
  SELECT 'Atendimento ao Cliente', c.id FROM new_categories c WHERE c.nome = 'Negócios' UNION ALL
  SELECT 'Gestão de Projetos', c.id FROM new_categories c WHERE c.nome = 'Negócios' UNION ALL
  SELECT 'Finanças', c.id FROM new_categories c WHERE c.nome = 'Negócios' UNION ALL

  -- Tecnologia (4)
  SELECT 'Programação', c.id FROM new_categories c WHERE c.nome = 'Tecnologia' UNION ALL
  SELECT 'Design', c.id FROM new_categories c WHERE c.nome = 'Tecnologia' UNION ALL
  SELECT 'Análise de Dados', c.id FROM new_categories c WHERE c.nome = 'Tecnologia' UNION ALL
  SELECT 'IA & Machine Learning', c.id FROM new_categories c WHERE c.nome = 'Tecnologia' UNION ALL
  SELECT 'DevOps', c.id FROM new_categories c WHERE c.nome = 'Tecnologia' UNION ALL

  -- Escrita (5)
  SELECT 'Criativo', c.id FROM new_categories c WHERE c.nome = 'Escrita' UNION ALL
  SELECT 'Técnico', c.id FROM new_categories c WHERE c.nome = 'Escrita' UNION ALL
  SELECT 'Acadêmico', c.id FROM new_categories c WHERE c.nome = 'Escrita' UNION ALL
  SELECT 'Copywriting', c.id FROM new_categories c WHERE c.nome = 'Escrita' UNION ALL
  SELECT 'Roteiros', c.id FROM new_categories c WHERE c.nome = 'Escrita' UNION ALL

  -- Educação (6)
  SELECT 'Planos de Aula', c.id FROM new_categories c WHERE c.nome = 'Educação' UNION ALL
  SELECT 'Material Didático', c.id FROM new_categories c WHERE c.nome = 'Educação' UNION ALL
  SELECT 'Exercícios', c.id FROM new_categories c WHERE c.nome = 'Educação' UNION ALL
  SELECT 'Avaliações', c.id FROM new_categories c WHERE c.nome = 'Educação' UNION ALL
  SELECT 'Resumos', c.id FROM new_categories c WHERE c.nome = 'Educação' UNION ALL

  -- Produtividade (7)
  SELECT 'Organização', c.id FROM new_categories c WHERE c.nome = 'Produtividade' UNION ALL
  SELECT 'Gestão do Tempo', c.id FROM new_categories c WHERE c.nome = 'Produtividade' UNION ALL
  SELECT 'Automação', c.id FROM new_categories c WHERE c.nome = 'Produtividade' UNION ALL
  SELECT 'Resumos', c.id FROM new_categories c WHERE c.nome = 'Produtividade' UNION ALL
  SELECT 'Análise', c.id FROM new_categories c WHERE c.nome = 'Produtividade' UNION ALL

  -- Carreira (8)
  SELECT 'Currículos', c.id FROM new_categories c WHERE c.nome = 'Carreira' UNION ALL
  SELECT 'Entrevistas', c.id FROM new_categories c WHERE c.nome = 'Carreira' UNION ALL
  SELECT 'Networking', c.id FROM new_categories c WHERE c.nome = 'Carreira' UNION ALL
  SELECT 'Desenvolvimento Profissional', c.id FROM new_categories c WHERE c.nome = 'Carreira' UNION ALL
  SELECT 'LinkedIn', c.id FROM new_categories c WHERE c.nome = 'Carreira' UNION ALL

  -- Desenvolvimento Pessoal (9)
  SELECT 'Motivação', c.id FROM new_categories c WHERE c.nome = 'Desenvolvimento Pessoal' UNION ALL
  SELECT 'Autoconhecimento', c.id FROM new_categories c WHERE c.nome = 'Desenvolvimento Pessoal' UNION ALL
  SELECT 'Meditação', c.id FROM new_categories c WHERE c.nome = 'Desenvolvimento Pessoal' UNION ALL
  SELECT 'Hábitos', c.id FROM new_categories c WHERE c.nome = 'Desenvolvimento Pessoal' UNION ALL
  SELECT 'Saúde Mental', c.id FROM new_categories c WHERE c.nome = 'Desenvolvimento Pessoal' UNION ALL

  -- Prompts Técnicos (10)
  SELECT 'Análise de Código', c.id FROM new_categories c WHERE c.nome = 'Prompts Técnicos' UNION ALL
  SELECT 'Debugging', c.id FROM new_categories c WHERE c.nome = 'Prompts Técnicos' UNION ALL
  SELECT 'Geração de Código', c.id FROM new_categories c WHERE c.nome = 'Prompts Técnicos' UNION ALL
  SELECT 'Documentação', c.id FROM new_categories c WHERE c.nome = 'Prompts Técnicos' UNION ALL
  SELECT 'Revisão de Código', c.id FROM new_categories c WHERE c.nome = 'Prompts Técnicos'
) AS subcategorias;

-- Adicionar campos para subcategoria nas tabelas de prompts e modelos, se ainda não existirem
DO $$
BEGIN
  -- Modificar o tipo da coluna categoria nas tabelas prompts e modelos
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'categoria'
  ) THEN
    -- Primeiro, remover qualquer chave estrangeira existente
    ALTER TABLE prompts DROP CONSTRAINT IF EXISTS fk_prompts_categoria;
    
    -- Em seguida, criar uma coluna temporária e fazer a migração
    ALTER TABLE prompts ADD COLUMN categoria_nova INTEGER;
    
    -- Registrar os valores de categoria existentes temporariamente
    CREATE TEMPORARY TABLE categoria_mapeamento (
      nome_categoria TEXT,
      id_categoria INTEGER
    );
    
    -- Preencher a tabela de mapeamento
    INSERT INTO categoria_mapeamento (nome_categoria, id_categoria)
    SELECT c.nome, c.id FROM categorias c;
    
    -- Atualizar a nova coluna baseado no nome da categoria
    UPDATE prompts p
    SET categoria_nova = cm.id_categoria
    FROM categoria_mapeamento cm
    WHERE p.categoria = cm.nome_categoria;
    
    -- Remover coluna antiga e renomear nova
    ALTER TABLE prompts DROP COLUMN categoria;
    ALTER TABLE prompts RENAME COLUMN categoria_nova TO categoria;
    
    -- Adicionar a chave estrangeira
    ALTER TABLE prompts ADD CONSTRAINT fk_prompts_categoria 
      FOREIGN KEY (categoria) REFERENCES categorias(id);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'modelos' AND column_name = 'categoria'
  ) THEN
    -- Primeiro, remover qualquer chave estrangeira existente
    ALTER TABLE modelos DROP CONSTRAINT IF EXISTS fk_modelos_categoria;
    
    -- Em seguida, criar uma coluna temporária e fazer a migração
    ALTER TABLE modelos ADD COLUMN categoria_nova INTEGER;
    
    -- Atualizar a nova coluna baseado no nome da categoria usando o mapeamento
    UPDATE modelos m
    SET categoria_nova = cm.id_categoria
    FROM categoria_mapeamento cm
    WHERE m.categoria = cm.nome_categoria;
    
    -- Remover coluna antiga e renomear nova
    ALTER TABLE modelos DROP COLUMN categoria;
    ALTER TABLE modelos RENAME COLUMN categoria_nova TO categoria;
    
    -- Adicionar a chave estrangeira
    ALTER TABLE modelos ADD CONSTRAINT fk_modelos_categoria 
      FOREIGN KEY (categoria) REFERENCES categorias(id);
  END IF;
  
  -- Adicionar coluna subcategoria se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompts' AND column_name = 'subcategoria'
  ) THEN
    ALTER TABLE prompts ADD COLUMN subcategoria INTEGER;
    
    -- Adicionar chave estrangeira para subcategoria
    ALTER TABLE prompts ADD CONSTRAINT fk_prompts_subcategoria 
      FOREIGN KEY (subcategoria) REFERENCES subcategorias(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'modelos' AND column_name = 'subcategoria'
  ) THEN
    ALTER TABLE modelos ADD COLUMN subcategoria INTEGER;
    
    -- Adicionar chave estrangeira para subcategoria
    ALTER TABLE modelos ADD CONSTRAINT fk_modelos_subcategoria 
      FOREIGN KEY (subcategoria) REFERENCES subcategorias(id);
  END IF;
  
  -- Limpar tabela temporária
  DROP TABLE IF EXISTS categoria_mapeamento;
END
$$; 