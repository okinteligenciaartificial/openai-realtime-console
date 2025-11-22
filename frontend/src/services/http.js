/**
 * Cliente HTTP base para fazer requisições à API do backend
 */

// URL base da API - usar variável de ambiente ou padrão
// Em desenvolvimento, usar proxy do Vite (/api)
// Em produção, usar URL completa ou variável de ambiente
const API_BASE = import.meta.env.VITE_API_BASE || 
  (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

// Obter token do localStorage
function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

// Headers padrão
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Função helper para fazer requisições HTTP
 */
export async function request(endpoint, options = {}) {
  // Não fazer requisições durante SSR
  if (typeof window === 'undefined') {
    throw new Error('Cannot make API requests during SSR');
  }

  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Tratamento específico para parsing JSON
    let data;
    try {
      const text = await response.text();
      if (!text) {
        data = {};
      } else {
        data = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }

    if (!response.ok) {
      // Criar um erro com mais informações para tratamento adequado
      const error = new Error(data.error || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.response = { data };
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

export default request;
