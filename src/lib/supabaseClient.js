import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas. ' +
    'Verifique se o arquivo .env.local está configurado corretamente.'
  );
}

// Criar e exportar o cliente do Supabase com configurações otimizadas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: fetch.bind(globalThis)
  }
});

// Função auxiliar para usar em contexto servidor-side com cookies
export const createServerSupabaseClient = (context) => {
  if (context?.req && context?.res) {
    // Servidor side: usar cookie da requisição
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          cookie: context.req.headers.cookie || ''
        }
      }
    });
  }
  // Cliente side: usar o cliente padrão
  return supabase;
};