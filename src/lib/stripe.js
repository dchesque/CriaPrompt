import Stripe from 'stripe';
import { supabase } from './supabaseClient';

// Inicializa o cliente Stripe com a chave secreta do ambiente
const getStripeClient = async () => {
  try {
    // Buscar configuração do modo Stripe (teste ou produção)
    const { data: configData, error: configError } = await supabase
      .from('configuracoes_app')
      .select('valor')
      .eq('chave', 'modo_stripe')
      .single();

    if (configError) {
      console.error('Erro ao buscar configuração do Stripe:', configError);
      throw new Error('Não foi possível inicializar o Stripe');
    }

    // Determinar qual chave usar com base no modo
    const modo = configData?.valor || 'teste';
    const stripeKey = modo === 'producao' 
      ? process.env.STRIPE_SECRET_KEY 
      : process.env.STRIPE_TEST_SECRET_KEY;

    if (!stripeKey) {
      throw new Error(`Chave do Stripe não configurada para o modo: ${modo}`);
    }

    return new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'CriaPrompt',
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Erro ao inicializar o Stripe:', error);
    // Fallback para o modo de teste
    return new Stripe(process.env.STRIPE_TEST_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'CriaPrompt',
        version: '1.0.0',
      },
    });
  }
};

export { getStripeClient };

// Funções auxiliares para lidar com assinaturas

// Criar ou atualizar um cliente no Stripe
export const criarOuAtualizarCliente = async (user) => {
  const stripe = await getStripeClient();
  
  try {
    // Verificar se o usuário já tem um customer_id
    const { data: perfilData } = await supabase
      .from('perfis_usuario')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    // Buscar assinatura para ver se já existe cliente
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const customerParams = {
      email: user.email,
      name: perfilData?.nome_completo || user.email,
      metadata: { 
        user_id: user.id,
        app: 'criaprompt'
      }
    };
    
    // Se já tiver um customer_id, atualiza os dados
    if (assinaturaData?.stripe_customer_id) {
      const customer = await stripe.customers.update(
        assinaturaData.stripe_customer_id,
        customerParams
      );
      return customer.id;
    }
    
    // Caso contrário, cria um novo
    const customer = await stripe.customers.create(customerParams);
    
    return customer.id;
  } catch (error) {
    console.error('Erro ao criar/atualizar cliente no Stripe:', error);
    throw error;
  }
};

// Criar uma assinatura no Stripe
export const criarAssinatura = async (user, planoId, paymentMethodId = null) => {
  const stripe = await getStripeClient();
  
  try {
    // Buscar dados do plano
    const { data: planoData, error: planoError } = await supabase
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .single();
      
    if (planoError || !planoData) {
      throw new Error('Plano não encontrado');
    }
    
    if (!planoData.stripe_price_id) {
      throw new Error('Este plano não está configurado no Stripe');
    }
    
    // Verificar se é um plano gratuito
    if (planoData.preco === 0) {
      // Para plano gratuito, apenas atualizar o perfil e criar entrada na tabela assinaturas
      await supabase.from('perfis_usuario').upsert({
        user_id: user.id,
        plano_atual: planoId,
        updated_at: new Date().toISOString()
      });
      
      await supabase.from('assinaturas').insert({
        user_id: user.id,
        plano_id: planoId,
        status: 'ativa',
        data_inicio: new Date().toISOString(),
        data_termino: null
      });
      
      return { success: true, subscriptionId: null };
    }
    
    // Para planos pagos, criar no Stripe
    const customerId = await criarOuAtualizarCliente(user);
    
    // Buscar configuração de dias de trial
    const { data: configData } = await supabase
      .from('configuracoes_app')
      .select('valor')
      .eq('chave', 'trial_dias')
      .single();
    
    const trialDias = configData?.valor ? parseInt(configData.valor, 10) : 7;
    
    // Calcular data de término do trial
    const trialEnd = Math.floor(Date.now() / 1000) + (trialDias * 24 * 60 * 60);
    
    // Criar a assinatura no Stripe
    const subscriptionParams = {
      customer: customerId,
      items: [{ price: planoData.stripe_price_id }],
      trial_end: trialEnd,
      metadata: {
        user_id: user.id,
        plano_id: planoId
      }
    };
    
    // Adicionar método de pagamento se fornecido
    if (paymentMethodId) {
      // Anexar o método de pagamento ao cliente
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      
      // Definir como padrão
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      subscriptionParams.default_payment_method = paymentMethodId;
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionParams);
    
    // Registrar a assinatura no banco de dados
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .insert({
        user_id: user.id,
        plano_id: planoId,
        status: 'teste',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        data_inicio: new Date().toISOString(),
        data_termino: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      })
      .select()
      .single();
      
    if (assinaturaError) {
      console.error('Erro ao registrar assinatura:', assinaturaError);
      // Tentar cancelar a assinatura no Stripe para evitar cobranças
      await stripe.subscriptions.del(subscription.id);
      throw new Error('Erro ao registrar assinatura no banco de dados');
    }
    
    // Atualizar o perfil do usuário com o plano atual
    await supabase.from('perfis_usuario').upsert({
      user_id: user.id,
      plano_atual: planoId,
      updated_at: new Date().toISOString()
    });
    
    return { 
      success: true, 
      subscriptionId: subscription.id,
      assinaturaId: assinaturaData.id 
    };
    
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    throw error;
  }
};

// Cancelar uma assinatura
export const cancelarAssinatura = async (assinaturaId, userId) => {
  const stripe = await getStripeClient();
  
  try {
    // Buscar dados da assinatura
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .eq('user_id', userId)
      .single();
      
    if (assinaturaError || !assinaturaData) {
      throw new Error('Assinatura não encontrada ou não pertence ao usuário');
    }
    
    if (assinaturaData.stripe_subscription_id) {
      // Cancelar no Stripe
      await stripe.subscriptions.update(assinaturaData.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }
    
    // Atualizar no banco de dados
    await supabase
      .from('assinaturas')
      .update({
        cancelamento_agendado: true,
        status: 'cancelada',
        updated_at: new Date().toISOString()
      })
      .eq('id', assinaturaId);
      
    // Atualizar o perfil do usuário para o plano gratuito
    await supabase
      .from('perfis_usuario')
      .update({
        plano_atual: 1, // Id do plano gratuito
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
      
    return { success: true };
    
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    throw error;
  }
};

// Obter detalhes da assinatura
export const obterDetalhesAssinatura = async (userId) => {
  try {
    // Buscar assinatura atual
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select(`
        *,
        planos (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (assinaturaError || !assinaturaData) {
      return null;
    }
    
    return assinaturaData;
    
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error);
    return null;
  }
};

// Verificar se um usuário tem um plano pago ativo
export const temPlanoAtivo = async (userId) => {
  try {
    // Buscar perfil do usuário
    const { data: perfilData, error: perfilError } = await supabase
      .from('perfis_usuario')
      .select('plano_atual')
      .eq('user_id', userId)
      .single();
      
    if (perfilError || !perfilData || !perfilData.plano_atual) {
      return false;
    }
    
    // Verificar se não é o plano gratuito
    if (perfilData.plano_atual === 1) {
      return false;
    }
    
    // Verificar se a assinatura está ativa
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('status')
      .eq('user_id', userId)
      .eq('plano_id', perfilData.plano_atual)
      .in('status', ['ativa', 'teste'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (assinaturaError || !assinaturaData) {
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Erro ao verificar plano ativo:', error);
    return false;
  }
};

// Criar checkout session para mudança de plano
export const criarCheckoutSession = async (userId, planoId, successUrl, cancelUrl) => {
  const stripe = await getStripeClient();
  
  try {
    // Buscar dados do plano
    const { data: planoData, error: planoError } = await supabase
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .single();
      
    if (planoError || !planoData || !planoData.stripe_price_id) {
      throw new Error('Plano não encontrado ou não configurado no Stripe');
    }
    
    // Criar ou atualizar o cliente
    const user = { id: userId };
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user) {
      user.email = userData.user.email;
    }
    
    const customerId = await criarOuAtualizarCliente(user);
    
    // Criar a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: planoData.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        plano_id: planoId,
      },
    });
    
    return session;
    
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    throw error;
  }
};

// Criar portal de gerenciamento de assinatura
export const criarPortalSession = async (userId, returnUrl) => {
  const stripe = await getStripeClient();
  
  try {
    // Buscar customer_id do usuário
    const { data: assinaturaData, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (assinaturaError || !assinaturaData?.stripe_customer_id) {
      throw new Error('Usuário não possui assinatura');
    }
    
    // Criar a sessão do portal
    const session = await stripe.billingPortal.sessions.create({
      customer: assinaturaData.stripe_customer_id,
      return_url: returnUrl,
    });
    
    return session;
    
  } catch (error) {
    console.error('Erro ao criar sessão do portal:', error);
    throw error;
  }
}; 