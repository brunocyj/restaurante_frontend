import api from './api';

export enum TipoNotificacao {
  CHAMADA_ATENDENTE = 'waiter_call',
  ITEMS_ADICIONADOS = 'order_items_added',
  PEDIDO_FINALIZADO = 'order_finalized'
}

export interface ItemNotificacao {
  produto_id: string;
  quantidade: number;
  observacoes: string | null;
}

export interface GrupoItensNotificacao {
  pedido_id: string;
  mesa_id: string;
  items: ItemNotificacao[];
  message: string;
}

export interface Notificacao {
  id: string;
  type: TipoNotificacao;
  entity_id: string;
  content: {
    mesa_id?: string;
    pedido_id?: string;
    message: string;
  };
  items?: GrupoItensNotificacao[];
  count?: number;
  created_at: number;
  updated_at?: number;
  read: boolean;
}

/**
 * Busca todas as notificações não lidas
 */
export async function getNotificacoes(limit: number = 50): Promise<Notificacao[]> {
  try {
    const response = await api.get(`/notificacoes?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

/**
 * Marca uma notificação como lida
 */
export async function marcarNotificacaoComoLida(notificationId: string): Promise<boolean> {
  try {
    const response = await api.put(`/notificacoes/${notificationId}/read`);
    return response.data.success;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return false;
  }
}

/**
 * Remove uma notificação
 */
export async function removerNotificacao(notificationId: string): Promise<boolean> {
  try {
    const response = await api.delete(`/notificacoes/${notificationId}`);
    return response.data.success;
  } catch (error) {
    console.error('Erro ao remover notificação:', error);
    return false;
  }
}

/**
 * Chama atendente para uma mesa específica
 */
export async function chamarAtendente(mesaId: string): Promise<{success: boolean, notification_id?: string}> {
  try {
    const response = await api.post(`/mesas/${mesaId}/chamar-atendente`);
    return response.data;
  } catch (error) {
    console.error('Erro ao chamar atendente:', error);
    return { success: false };
  }
}

/**
 * Formata uma data unix para exibição
 */
export function formatarDataNotificacao(timestamp: number): string {
  const data = new Date(timestamp * 1000);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 