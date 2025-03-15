import { supabase } from './supabaseClient';

// Função para obter o token de autenticação atual
export const getAuthToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch (error) {
    console.error('Erro ao obter token de autenticação:', error);
    return null;
  }
};

// Função para obter headers de autenticação para chamadas fetch
export const getAuthHeaders = async () => {
  const token = await getAuthToken();
  
  if (!token) {
    console.warn('Nenhum token de autenticação disponível');
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Função para verificar se o usuário está autenticado
export const isAuthenticated = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session?.user;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
};

// Função para verificar e atualizar a sessão se necessário
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) throw error;
    
    return data?.session || null;
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return null;
  }
};