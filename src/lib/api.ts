import axios from 'axios';

// URL base da API - usando o proxy configurado no next.config.js
export const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' // Em produção, usamos o proxy
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Instância do Axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Aumentar o timeout para evitar falhas em redes lentas
  timeout: 15000,
});

// Interceptor para adicionar token de autenticação se disponível
api.interceptors.request.use(
  (config) => {
    // Verificar se estamos no navegador antes de acessar localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Log para debug
    console.log(`Fazendo requisição para: ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => {
    // Log para debug
    console.log(`Resposta recebida de: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    // Log detalhado do erro para depuração
    console.error('Erro na requisição API:', error);
    
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error('Dados da resposta de erro:', error.response.data);
      console.error('Status do erro:', error.response.status);
      
      // Se o erro for 401 (não autorizado), podemos fazer logout
      if (error.response.status === 401) {
        // Implementar lógica de logout se necessário
        console.warn('Sessão expirada ou inválida');
        // Exemplo: window.location.href = '/login';
      }
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
    }
    
    return Promise.reject(error);
  }
);

export default api; 