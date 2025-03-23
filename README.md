# CriaPrompt

Plataforma para criar e compartilhar prompts para modelos de IA.

## Configurando Login com Google (OAuth)

Para habilitar o login com Google no CriaPrompt, siga os passos abaixo:

### 1. Configurar o Projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um novo projeto ou use um existente.
2. No menu lateral, navegue até "APIs e Serviços" > "Tela de consentimento OAuth".
3. Configure a tela de consentimento:
   - Selecione o tipo de usuário (externo ou interno)
   - Preencha as informações do app (nome, email de contato, etc.)
   - Em "Domínios autorizados", adicione seu domínio Supabase: `<seu-projeto>.supabase.co`
   - Adicione os escopos necessários:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`

4. Vá para "APIs e Serviços" > "Credenciais".
5. Clique em "Criar credenciais" e selecione "ID do cliente OAuth".
6. Escolha "Aplicativo da Web" como tipo de aplicativo.
7. Em "Origens JavaScript autorizadas" adicione:
   - `http://localhost:3000` (para ambiente de desenvolvimento)
   - `https://seu-dominio.com` (para produção)
   
8. Em "URIs de redirecionamento autorizados" adicione o URL de callback do Supabase:
   - Para desenvolvimento: `http://localhost:3000/auth/callback`
   - Para produção: `https://seu-dominio.com/auth/callback`
   
9. Clique em "Criar" e anote o Client ID e Client Secret.

### 2. Configurar o Supabase

1. Acesse o [Painel do Supabase](https://app.supabase.io) e selecione seu projeto.
2. Vá para "Authentication" > "Providers".
3. Encontre o provedor "Google" e ative-o.
4. Cole o Client ID e Client Secret que você obteve no Google Cloud Console.
5. Salve as configurações.

### 3. Testar o Login

Agora o login com Google deve estar funcionando na aplicação. Você pode testar acessando a página de login e clicando no botão "Entrar com Google".

## Utilizando o Login com Google na Aplicação

O login com Google já está implementado no CriaPrompt. A função `handleGoogleLogin` no arquivo `src/pages/auth/login.js` lida com o processo de autenticação.

O fluxo de login funciona da seguinte forma:

1. O usuário clica no botão "Entrar com Google".
2. O Supabase inicia o fluxo de autenticação OAuth.
3. O usuário é redirecionado para a tela de consentimento do Google.
4. Após a autorização, o usuário é redirecionado de volta para o CriaPrompt.
5. O Supabase processa o token e cria ou autentica o usuário.
6. O usuário é redirecionado para o dashboard.

Se você precisar personalizar o comportamento do login com Google, você pode modificar o arquivo `src/pages/auth/login.js`.

// ... resto do README existente ... 