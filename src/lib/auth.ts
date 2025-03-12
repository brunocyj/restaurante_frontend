import axios from 'axios';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface LoginCredentials {
    username: string;
    password: string;
}

interface AuthTokens {
    access_token: string;
    refresh_token: string;
}
interface UserInfo {
    id: string;
    username: string;
    [key: string]: string | string[] | undefined;
}

/**
 * Realiza o login no sistema
 * @param credentials Credenciais de login
 * @returns Promise com os tokens de autenticação
 */
export async function login(credentials: LoginCredentials): Promise<void> {
    try {
      const response = await axios.post<AuthTokens>(
        `${API_URL}/auth/login`,
        new URLSearchParams({
          username: credentials.username,
          password: credentials.password,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
  
      const { access_token, refresh_token } = response.data;
      
      // Armazenando os tokens no localStorage com nomes consistentes
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      
      // Armazenando a data de expiração (assumindo 15 minutos para o access token)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      localStorage.setItem('expiresAt', expiresAt.toISOString());
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se o usuário está autenticado
   * @returns boolean indicando se o usuário está autenticado
   */
  export function isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const token = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('expiresAt');
    
    if (!token || !expiresAt) {
      return false;
    }
    
    const now = new Date();
    const expiration = new Date(expiresAt);
    
    return now < expiration;
  }
  
  /**
   * Obtém o token de acesso atual
   * @returns O token de acesso ou null se não estiver autenticado
   */
  export function getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    return localStorage.getItem('accessToken');
  }

  export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    return localStorage.getItem('refreshToken');
  }
  
  /**
   * Atualiza o token de acesso usando o refresh token
   * @returns Promise<boolean> indicando se o refresh foi bem-sucedido
   */
  export async function refreshToken(): Promise<boolean> {
    try {
      const refreshTokenValue = getRefreshToken();
      
      if (!refreshTokenValue) {
        return false;
      }
      
      // Chamar o endpoint correto conforme definido no backend
      const response = await axios.post<AuthTokens>(
        `${API_URL}/auth/refresh-token`,
        { refresh_token: refreshTokenValue },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const { access_token, refresh_token } = response.data;
      
      // Atualizar os tokens no localStorage
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('refreshToken', refresh_token || refreshTokenValue);
      
      // Atualizar a data de expiração
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      localStorage.setItem('expiresAt', expiresAt.toISOString());
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return false;
    }
  }
  
  /**
   * Obtém informações do usuário atual
   * @returns Promise com as informações do usuário
   */
  export async function getUserInfo(): Promise<UserInfo | null> {
    try {
      const token = getAccessToken();
      
      if (!token) {
        return null;
      }
      
      const response = await axios.get<UserInfo>(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter informações do usuário:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const refreshed = await refreshToken();
        
        if (refreshed) {
          return getUserInfo();
        }
      }
      
      return null;
    }
  }
  
  /**
   * Realiza o logout do usuário
   * @returns Promise indicando se o logout foi bem-sucedido
   */
  export async function logout(): Promise<boolean> {
    try {
      const token = getAccessToken();
      
      if (!token) {
        return false;
      }
      
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      
      return false;
    }
  }
  
  export function setupAuthInterceptor(): void {
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes('/auth/refresh-token')
        ) {
          originalRequest._retry = true;
          
          const refreshed = await refreshToken();
          
          if (refreshed) {
            const token = getAccessToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
  } 