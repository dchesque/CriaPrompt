// src/utils/promptUtils.js

/**
 * Verifica se o usuário atual é o proprietário do prompt
 * 
 * @param {string} promptUserId - ID do usuário que criou o prompt
 * @param {string} currentUserId - ID do usuário atual
 * @returns {boolean} - True se o usuário atual for o proprietário
 */
export const isPromptOwner = (promptUserId, currentUserId) => {
    return currentUserId && promptUserId === currentUserId;
  };
  
  /**
   * Função para extrair campos personalizados do texto de um prompt
   * Busca por padrões como #campo no texto
   * 
   * @param {string} promptText - Texto do prompt
   * @returns {Array} - Array de objetos com campos encontrados
   */
  export const extractCustomFields = (promptText) => {
    if (!promptText) return [];
    
    // Regex para encontrar campos no formato #campo
    const regex = /#([a-zA-Z0-9_]+)/g;
    const matches = promptText.matchAll(regex);
    
    // Extrair campos únicos
    const uniqueFields = new Set();
    for (const match of matches) {
      uniqueFields.add(match[1]);
    }
    
    // Transformar em array de objetos
    return Array.from(uniqueFields).map(field => ({
      nome: field,
      descricao: `Campo ${field}`,
      valorPadrao: ''
    }));
  };
  
  /**
   * Função para aplicar valores aos campos personalizados no texto do prompt
   * 
   * @param {string} promptText - Texto original do prompt
   * @param {Object} fieldValues - Objeto com os valores dos campos
   * @returns {string} - Texto do prompt com campos substituídos
   */
  export const applyCustomFieldValues = (promptText, fieldValues) => {
    if (!promptText || !fieldValues) return promptText;
    
    let modifiedText = promptText;
    
    // Substituir cada campo pelo seu valor
    Object.entries(fieldValues).forEach(([field, value]) => {
      if (value) {
        const regex = new RegExp(`#${field}`, 'g');
        modifiedText = modifiedText.replace(regex, value);
      }
    });
    
    return modifiedText;
  };
  
  /**
   * Função para validar se todos os campos obrigatórios foram preenchidos
   * 
   * @param {Object} fieldValues - Valores dos campos
   * @param {Array} requiredFields - Lista de nomes de campos obrigatórios
   * @returns {boolean} - True se todos os campos obrigatórios estão preenchidos
   */
  export const validateRequiredFields = (fieldValues, requiredFields = []) => {
    if (!fieldValues || !requiredFields.length) return true;
    
    for (const field of requiredFields) {
      if (!fieldValues[field] || fieldValues[field].trim() === '') {
        return false;
      }
    }
    
    return true;
  };