// src/tests/test-app.js

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();
const readline = require('readline');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuração do servidor da aplicação
const API_URL = 'http://localhost:3000/api';

// Email para teste
const TEST_USER_EMAIL = 'dchesque@gmail.com';

// Configurar readline para input no terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar no terminal
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Função principal de teste
async function runTests() {
  console.log('🔍 Iniciando testes do CriaPrompt');
  
  try {
    console.log('\n📋 VERIFICAÇÃO DO BANCO DE DADOS');
    console.log('Testando acesso às tabelas principais...');
    
    // Verificar tabelas principais
    const tables = ['prompts', 'favoritos', 'perfis', 'configuracoes', 'tags'];
    const tableResults = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          tableResults[table] = { exists: false, error: error.message };
          console.log(`❌ Tabela "${table}": Erro de acesso - ${error.message}`);
        } else {
          tableResults[table] = { exists: true, count: data.count };
          console.log(`✅ Tabela "${table}": Acessível`);
        }
      } catch (error) {
        tableResults[table] = { exists: false, error: error.message };
        console.log(`❌ Tabela "${table}": Erro - ${error.message}`);
      }
    }
    
    // Verificar estrutura da tabela de prompts
    console.log('\n📋 VERIFICANDO ESTRUTURA DA TABELA PROMPTS');
    
    try {
      // Tentar obter um prompt existente para verificar a estrutura
      const { data: existingPrompts, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .limit(1);
      
      if (promptsError) {
        console.log(`❌ Erro ao acessar prompts: ${promptsError.message}`);
      } else if (existingPrompts && existingPrompts.length > 0) {
        const prompt = existingPrompts[0];
        console.log('Colunas encontradas na tabela prompts:');
        
        const columns = Object.keys(prompt);
        columns.forEach(col => {
          console.log(`- ${col}: ${typeof prompt[col]}`);
        });
        
        // Verificar especificamente o campo de descrição
        if ('descricao' in prompt) {
          console.log('✅ Campo "descricao" encontrado na tabela prompts');
        } else {
          console.log('❌ Campo "descricao" NÃO encontrado na tabela prompts');
        }
      } else {
        console.log('ℹ️ Nenhum prompt encontrado para verificar estrutura');
        
        // Solicitar permissão para criar um prompt anônimo para teste
        const createTest = await question('Deseja criar um prompt de teste para verificar a estrutura? (s/n): ');
        
        if (createTest.toLowerCase() === 's') {
          // Tentar criar um prompt anônimo para teste
          const { data: createdPrompt, error: createError } = await supabase
            .from('prompts')
            .insert({
              titulo: 'Prompt de Teste Estrutural',
              texto: 'Este é um prompt criado apenas para testar a estrutura do banco de dados',
              descricao: 'Descrição de teste para verificar o campo',
              categoria: 'teste',
              publico: false,
              views: 0,
              // user_id será null, o que pode não ser permitido pelas regras RLS
            })
            .select();
          
          if (createError) {
            console.log(`❌ Erro ao criar prompt de teste: ${createError.message}`);
            console.log('ℹ️ Isso é esperado se as regras RLS exigirem um usuário autenticado');
          } else if (createdPrompt && createdPrompt.length > 0) {
            console.log('✅ Prompt de teste criado com sucesso');
            
            const testPrompt = createdPrompt[0];
            console.log('Colunas encontradas:');
            
            const columns = Object.keys(testPrompt);
            columns.forEach(col => {
              console.log(`- ${col}: ${typeof testPrompt[col]}`);
            });
            
            if ('descricao' in testPrompt) {
              console.log('✅ Campo "descricao" encontrado na tabela prompts');
            } else {
              console.log('❌ Campo "descricao" NÃO encontrado na tabela prompts');
            }
            
            // Limpar o prompt de teste
            await supabase.from('prompts').delete().eq('id', testPrompt.id);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar estrutura: ${error.message}`);
    }
    
    // Verificar funções e triggers
    console.log('\n📋 VERIFICANDO FUNÇÕES NO BANCO DE DADOS');
    
    try {
      // Temos que usar SQL para verificar funções/triggers
      // Mas isso requer permissões elevadas que o anon key não possui
      // Então vamos apenas verificar se algumas tabelas importantes existem
      
      // Tabelas para verificar
      const metaTables = ['pg_proc', 'pg_trigger'];
      let canCheckDB = true;
      
      for (const table of metaTables) {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          canCheckDB = false;
          console.log(`❌ Sem acesso a "${table}" - ${error.message}`);
        }
      }
      
      if (!canCheckDB) {
        console.log('ℹ️ Sem permissões para verificar funções e triggers');
        console.log('ℹ️ Isso é normal com a anon key do Supabase');
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    // Verificar se o anon key tem acesso público a prompts públicos
    console.log('\n📋 VERIFICANDO ACESSO ANÔNIMO A PROMPTS PÚBLICOS');
    
    try {
      const { data: publicPrompts, error: publicError } = await supabase
        .from('prompts')
        .select('id, titulo, publico')
        .eq('publico', true)
        .limit(5);
      
      if (publicError) {
        console.log(`❌ Erro ao acessar prompts públicos: ${publicError.message}`);
      } else {
        console.log(`✅ Acesso a prompts públicos funcionando! (${publicPrompts.length} encontrados)`);
        
        if (publicPrompts.length > 0) {
          console.log('Exemplos de prompts públicos:');
          publicPrompts.forEach(p => {
            console.log(`- ${p.id}: ${p.titulo}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    console.log('\n🎉 VERIFICAÇÃO DO BANCO DE DADOS CONCLUÍDA! 🎉');
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:');
    console.error(error.message);
  } finally {
    rl.close();
  }
}

// Executar testes
runTests();