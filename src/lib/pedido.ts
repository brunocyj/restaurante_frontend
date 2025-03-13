import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export enum StatusPedido {
  ABERTO = "ABERTO",
  EM_ANDAMENTO = "EM ANDAMENTO",
  FINALIZADO = "FINALIZADO",
  CANCELADO = "CANCELADO"
}

// Ajustado para corresponder ao backend
export interface ItemPedido {
  produto_id: string;  // Alterado de 'item' para 'produto_id'
  quantidade: number;
  observacoes?: string;  // Adicionado campo de observações
}

export interface Pedido {
  _id: string;
  mesa_id: string;  // Alterado de 'mesa' para 'mesa_id'
  itens: ItemPedido[];
  status: StatusPedido;
  observacao_geral?: string;  // Alterado de 'observacoes' para 'observacao_geral'
  valor_total: number;
  criado_em: Date;
  manual?: boolean;  // Adicionado campo manual
}

export const getPedidos = async () => {
  const response = await axios.get(`${API_URL}/pedidos`);
  return response.data.pedidos;  // Ajustado para pegar pedidos do objeto retornado
};

export const getPedidoById = async (id: string) => {
  const response = await axios.get(`${API_URL}/pedidos/${id}`);
  return response.data;
};

export const createPedido = async (pedidoData: {
  mesa_id: string;  // Alterado de 'mesa' para 'mesa_id'
  itens: ItemPedido[];
  observacao_geral?: string;  // Alterado de 'observacoes' para 'observacao_geral'
  manual?: boolean;  // Adicionado campo manual
}) => {
  const response = await axios.post(`${API_URL}/pedidos`, pedidoData);
  return response.data;
};

export const updatePedido = async (
  id: string,
  pedidoData: {
    status?: StatusPedido;
    observacao_geral?: string;  // Alterado de 'observacoes' para 'observacao_geral'
  }
) => {
  const response = await axios.put(`${API_URL}/pedidos/${id}`, pedidoData);
  return response.data;
};

export const deletePedido = async (id: string) => {
  const response = await axios.delete(`${API_URL}/pedidos/${id}`);
  return response.data;
};

export const adicionarItemAoPedido = async (
  pedidoId: string,
  itemData: {
    produto_id: string;  // Alterado de 'item' para 'produto_id'
    quantidade: number;
    observacoes?: string;  // Adicionado campo de observações
  }
) => {
  const response = await axios.post(`${API_URL}/pedidos/${pedidoId}/itens`, itemData);
  return response.data;
};

export const removerItemDoPedido = async (
  pedidoId: string,
  itemId: string
) => {
  const response = await axios.delete(`${API_URL}/pedidos/${pedidoId}/itens/${itemId}`);
  return response.data;
};

export const atualizarQuantidadeItem = async (
  pedidoId: string,
  itemId: string,
  itemData: {
    quantidade: number;
    observacoes?: string;  // Adicionado campo de observações
  }
) => {
  const response = await axios.put(`${API_URL}/pedidos/${pedidoId}/itens/${itemId}`, itemData);
  return response.data;
};

export const atualizarStatusPedido = async (
  pedidoId: string,
  status: StatusPedido
) => {
  const response = await axios.put(`${API_URL}/pedidos/${pedidoId}`, { status });
  return response.data;
};

export const getPedidosPorMesa = async (mesaId: string) => {
  const response = await axios.get(`${API_URL}/pedidos?mesa_id=${mesaId}`);
  return response.data.pedidos;  // Ajustado para pegar pedidos do objeto retornado
};

export const getPedidosPorStatus = async (status: StatusPedido) => {
  const response = await axios.get(`${API_URL}/pedidos?status=${status}`);
  return response.data.pedidos;  // Ajustado para pegar pedidos do objeto retornado
};