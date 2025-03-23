import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabaseClient';

// Desabilitar o bodyParser para receber o stream do Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};

const webhookHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Obter configuração do modo Stripe (teste ou produção)
    const { data: configData } = await supabase
      .from('configuracoes_app')
      .select('valor')
      .eq('chave', 'modo_stripe')
      .single();
    
    const modo = configData?.valor || 'teste';
    
    // Determinar qual chave usar
    const webhookSecret = modo === 'producao'
      ? process.env.STRIPE_WEBHOOK_SECRET
      : process.env.STRIPE_TEST_WEBHOOK_SECRET;
    
    const stripe = new Stripe(
      modo === 'producao'
        ? process.env.STRIPE_SECRET_KEY
        : process.env.STRIPE_TEST_SECRET_KEY,
      {
        apiVersion: '2023-10-16',
      }
    );
    
    // Verificar assinatura do evento
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (error) {
    console.error(`Erro webhook: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  
  try {
    // Processar diferentes eventos
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }
    
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Erro ao processar evento: ${error.message}`);
    return res.status(500).json({ error: 'Erro ao processar evento' });
  }
};

// Handlers para eventos específicos

// Assinatura criada
const handleSubscriptionCreated = async (subscription) => {
  try {
    const userId = subscription.metadata?.user_id;
    const planoId = subscription.metadata?.plano_id;
    
    if (!userId || !planoId) {
      console.error('Metadados de usuário/plano ausentes na assinatura');
      return;
    }
    
    // Verificar se já existe uma assinatura com este stripe_subscription_id
    const { data: existingSubscription } = await supabase
      .from('assinaturas')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (existingSubscription) {
      // Já existe, não precisa criar novamente
      return;
    }
    
    // Mapear status da assinatura
    let status = 'pendente';
    if (subscription.status === 'active') status = 'ativa';
    if (subscription.status === 'trialing') status = 'teste';
    if (subscription.status === 'canceled') status = 'cancelada';
    if (subscription.status === 'unpaid') status = 'expirada';
    
    // Inserir nova assinatura
    await supabase.from('assinaturas').insert({
      user_id: userId,
      plano_id: parseInt(planoId),
      status: status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      data_inicio: new Date(subscription.start_date * 1000).toISOString(),
      data_termino: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancelamento_agendado: !!subscription.cancel_at_period_end
    });
    
    // Atualizar perfil do usuário
    await supabase
      .from('perfis_usuario')
      .upsert({
        user_id: userId,
        plano_atual: parseInt(planoId),
        updated_at: new Date().toISOString()
      });
      
  } catch (error) {
    console.error('Erro ao processar criação de assinatura:', error);
    throw error;
  }
};

// Assinatura atualizada
const handleSubscriptionUpdated = async (subscription) => {
  try {
    // Mapear status da assinatura
    let status = 'pendente';
    if (subscription.status === 'active') status = 'ativa';
    if (subscription.status === 'trialing') status = 'teste';
    if (subscription.status === 'canceled') status = 'cancelada';
    if (subscription.status === 'unpaid') status = 'expirada';
    
    // Atualizar assinatura existente
    await supabase
      .from('assinaturas')
      .update({
        status: status,
        data_termino: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancelamento_agendado: !!subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
      
    // Se foi cancelada, atualizar plano do usuário para gratuito
    if (status === 'cancelada') {
      const { data: assinaturaData } = await supabase
        .from('assinaturas')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();
        
      if (assinaturaData?.user_id) {
        await supabase
          .from('perfis_usuario')
          .update({
            plano_atual: 1, // Plano gratuito
            updated_at: new Date().toISOString()
          })
          .eq('user_id', assinaturaData.user_id);
      }
    }
    
  } catch (error) {
    console.error('Erro ao processar atualização de assinatura:', error);
    throw error;
  }
};

// Assinatura excluída
const handleSubscriptionDeleted = async (subscription) => {
  try {
    // Buscar assinatura para obter user_id
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    // Atualizar status no banco de dados
    await supabase
      .from('assinaturas')
      .update({
        status: 'cancelada',
        data_termino: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
      
    // Atualizar perfil do usuário para o plano gratuito
    if (assinaturaData?.user_id) {
      await supabase
        .from('perfis_usuario')
        .update({
          plano_atual: 1, // Plano gratuito
          updated_at: new Date().toISOString()
        })
        .eq('user_id', assinaturaData.user_id);
    }
    
  } catch (error) {
    console.error('Erro ao processar exclusão de assinatura:', error);
    throw error;
  }
};

// Pagamento de fatura bem-sucedido
const handleInvoicePaymentSucceeded = async (invoice) => {
  try {
    // Buscar a assinatura relacionada
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select('id, user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();
      
    if (!assinaturaData) {
      console.error('Assinatura não encontrada para a fatura:', invoice.id);
      return;
    }
    
    // Registrar transação
    await supabase.from('transacoes').insert({
      user_id: assinaturaData.user_id,
      assinatura_id: assinaturaData.id,
      valor: invoice.amount_paid / 100, // Convertendo de centavos para unidades
      moeda: invoice.currency.toUpperCase(),
      status: 'sucesso',
      tipo: 'pagamento',
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_invoice_id: invoice.id,
      metodo_pagamento: 'cartão',
      descricao: `Pagamento de assinatura - ${invoice.billing_reason}`
    });
    
    // Se o pagamento foi para uma assinatura que estava em período de teste, atualizar o status
    if (invoice.billing_reason === 'subscription_cycle') {
      await supabase
        .from('assinaturas')
        .update({
          status: 'ativa',
          updated_at: new Date().toISOString()
        })
        .eq('id', assinaturaData.id)
        .eq('status', 'teste');
    }
    
    // Atualizar estatísticas diárias
    const hoje = new Date().toISOString().split('T')[0];
    
    // Verificar se já existe registro para o dia
    const { data: estatisticaExistente } = await supabase
      .from('estatisticas')
      .select('id, receita_total')
      .eq('data', hoje)
      .single();
      
    if (estatisticaExistente) {
      // Atualizar receita
      await supabase
        .from('estatisticas')
        .update({
          receita_total: estatisticaExistente.receita_total + (invoice.amount_paid / 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', estatisticaExistente.id);
    } else {
      // Criar novo registro
      await supabase.from('estatisticas').insert({
        data: hoje,
        receita_total: invoice.amount_paid / 100
      });
    }
    
  } catch (error) {
    console.error('Erro ao processar pagamento de fatura:', error);
    throw error;
  }
};

// Falha no pagamento de fatura
const handleInvoicePaymentFailed = async (invoice) => {
  try {
    // Buscar a assinatura relacionada
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select('id, user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();
      
    if (!assinaturaData) {
      console.error('Assinatura não encontrada para a fatura:', invoice.id);
      return;
    }
    
    // Registrar transação de falha
    await supabase.from('transacoes').insert({
      user_id: assinaturaData.user_id,
      assinatura_id: assinaturaData.id,
      valor: invoice.amount_due / 100, // Convertendo de centavos para unidades
      moeda: invoice.currency.toUpperCase(),
      status: 'falha',
      tipo: 'pagamento',
      stripe_payment_intent_id: invoice.payment_intent,
      stripe_invoice_id: invoice.id,
      metodo_pagamento: 'cartão',
      descricao: `Falha no pagamento de assinatura - ${invoice.billing_reason}`
    });
    
    // Se após múltiplas tentativas, mudar o status da assinatura para expirada
    if (invoice.attempt_count > 3) {
      await supabase
        .from('assinaturas')
        .update({
          status: 'expirada',
          updated_at: new Date().toISOString()
        })
        .eq('id', assinaturaData.id);
        
      // Atualizar perfil do usuário para o plano gratuito
      await supabase
        .from('perfis_usuario')
        .update({
          plano_atual: 1, // Plano gratuito
          updated_at: new Date().toISOString()
        })
        .eq('user_id', assinaturaData.user_id);
    }
    
  } catch (error) {
    console.error('Erro ao processar falha de pagamento:', error);
    throw error;
  }
};

export default webhookHandler; 