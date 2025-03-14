import axios from 'axios';

// URL base da API - usando diferentes configurações dependendo do ambiente
export const API_URL = (() => {
  // Em produção no Railway, usar o endereço interno
  if (process.env.NODE_ENV === 'production') {
    // Verificar se estamos no Railway (ambiente de produção)
    if (process.env.RAILWAY_ENVIRONMENT === 'production') {
      return 'http://restaurante_backend'; // Endereço interno do Railway
    }
    // Caso esteja em produção mas não no Railway (ex: Vercel)
    return '/api'; // Usar o proxy configurado no next.config.js
  }
  // Em desenvolvimento local
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
})();

// Log para depuração
console.log(`Ambiente: ${process.env.NODE_ENV}`);
console.log(`URL da API configurada: ${API_URL}`);
console.log(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'não definido'}`);

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
    
    // Garantir que a URL não tenha barras duplicadas
    if (config.url && config.url.startsWith('/') && config.baseURL && config.baseURL.endsWith('/')) {
      config.url = config.url.substring(1);
    }
    
    // Log para debug - com informações mais detalhadas
    console.log(`[API Request] URL: ${config.baseURL}${config.url}, Method: ${config.method?.toUpperCase()}`);
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
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
      
      // Tentar novamente com endereço alternativo se estiver em produção
      if (process.env.NODE_ENV === 'production' && error.config && !error.config._retry) {
        console.log('Tentando novamente com endereço alternativo...');
        error.config._retry = true;
        
        // Criar uma nova instância do axios para esta requisição específica
        const retryInstance = axios.create({
          timeout: 15000,
          headers: error.config.headers
        });
        
        // Se falhou com o endereço interno, tentar com o endereço público
        if (API_URL === 'http://restaurante_backend') {
          error.config.baseURL = 'https://restaurantebackend-production.up.railway.app';
        } 
        // Se falhou com o proxy, tentar diretamente
        else if (API_URL === '/api') {
          error.config.baseURL = 'https://restaurantebackend-production.up.railway.app';
          // Remover a parte '/api' da URL se estiver presente
          if (error.config.url && error.config.url.startsWith('/api/')) {
            error.config.url = error.config.url.substring(5);
          }
        }
        
        console.log(`Tentando novamente com: ${error.config.baseURL}${error.config.url}`);
        return retryInstance(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 