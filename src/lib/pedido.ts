import axios from 'axios';
import api from './api';
import { marcarMesaComoOcupada, verificarEAtualizarStatusMesa } from './mesaHelper';

export enum StatusPedido {
  ABERTO = "ABERTO",
  EM_ANDAMENTO = "EM ANDAMENTO",
  FINALIZADO = "FINALIZADO",
  CANCELADO = "CANCELADO"
}

export enum MetodoPagamento {
  DINHEIRO = "DINHEIRO",
  CARTAO_CREDITO = "CARTAO_CREDITO",
  CARTAO_DEBITO = "CARTAO_DEBITO",
  PIX = "PIX",
  OUTROS = "OUTROS"
}

// Ajustado para corresponder ao backend
export interface ItemPedido {
  id?: string;  // Pode ser opcional na criação
  pedido_id?: string;  // Pode ser opcional na criação
  produto_id: string;
  quantidade: number;
  preco_unitario?: number;  // Pode ser calculado pelo backend
  observacoes?: string;
  criado_em?: Date;  // Definido pelo backend
  produto?: {
    nome: string;
    preco: number;
  };
}

export interface Pedido {
  id: string;  // Alterado de '_id' para 'id' para corresponder ao que o backend retorna
  mesa_id: string;
  itens: ItemPedido[];
  status: StatusPedido;
  observacao_geral?: string;
  valor_total: number;
  criado_em: Date;
  manual?: boolean;
  metodo_pagamento?: MetodoPagamento;
}

export const getPedidos = async () => {
  try {
    console.log('Enviando requisição GET para: /pedidos');
    const response = await api.get('/pedidos');
    console.log('Resposta da requisição GET:', response.data);
    return response.data.pedidos;
  } catch (error) {
    console.error('Erro na requisição GET pedidos:', error);
    throw error;
  }
};

export const getPedidoById = async (id: string) => {
  try {
    console.log(`Enviando requisição GET para: /pedidos/${id}`);
    const response = await api.get(`/pedidos/${id}`);
    console.log('Resposta da requisição GET:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro na requisição GET pedido por ID:', error);
    throw error;
  }
};

// Função original de criação de pedido
const _createPedido = async (pedidoData: {
  mesa_id: string;
  itens: ItemPedido[];
  observacao_geral?: string;
  manual?: boolean;
}) => {
  try {
    console.log('Enviando requisição POST para: /pedidos', pedidoData);
    const response = await api.post('/pedidos', pedidoData);
    console.log('Resposta da requisição POST:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro na requisição POST para criar pedido:', error);
    throw error;
  }
};

// Função wrapper que também atualiza o status da mesa
export const createPedido = async (pedidoData: {
  mesa_id: string;
  itens: ItemPedido[];
  observacao_geral?: string;
  manual?: boolean;
}) => {
  // Criar o pedido usando a função original
  const novoPedido = await _createPedido(pedidoData);
  
  // Marcar mesa como ocupada após criar o pedido
  if (novoPedido && novoPedido.mesa_id) {
    await marcarMesaComoOcupada(novoPedido.mesa_id);
  }
  
  return novoPedido;
};

// Função original de atualização de pedido
const _updatePedido = async (
  id: string,
  pedidoData: {
    status?: StatusPedido;
    observacao_geral?: string;
    mesa_id?: string;
    metodo_pagamento?: MetodoPagamento;
  }
) => {
  try {
    if (!id) {
      console.error('ID do pedido não fornecido para atualização');
      throw new Error('ID do pedido é obrigatório para atualização');
    }
    
    console.log(`Enviando requisição PUT para: /pedidos/${id}`);
    console.log('Tipo do ID:', typeof id);
    console.log('Valor do ID:', id);
    console.log('Dados enviados:', JSON.stringify(pedidoData));
    
    const response = await api.put(`/pedidos/${id}`, pedidoData);
    console.log('Resposta da requisição PUT:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('Erro na requisição PUT:');
    
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
    }
    
    // Verificar se é um erro do Axios
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
    
    throw error; // Re-throw para tratamento no componente
  }
};

// Função wrapper que também atualiza o status da mesa
export const updatePedido = async (
  id: string,
  pedidoData: {
    status?: StatusPedido;
    observacao_geral?: string;
    mesa_id?: string;
    metodo_pagamento?: MetodoPagamento;
  }
) => {
  // Atualizar o pedido usando a função original
  const pedidoAtualizado = await _updatePedido(id, pedidoData);
  
  // Se o status foi alterado para FINALIZADO ou CANCELADO, verificar se existem outros pedidos ativos
  // e atualizar o status da mesa conforme necessário
  if (pedidoAtualizado && pedidoAtualizado.mesa_id && 
      (pedidoData.status === StatusPedido.FINALIZADO || pedidoData.status === StatusPedido.CANCELADO)) {
    try {
      // Pequeno delay para garantir que a API processou a atualização do pedido
      setTimeout(async () => {
        await verificarEAtualizarStatusMesa(pedidoAtualizado.mesa_id);
      }, 500);
    } catch (error) {
      console.error(`Erro ao verificar status da mesa ${pedidoAtualizado.mesa_id}:`, error);
    }
  }
  
  return pedidoAtualizado;
};

export const deletePedido = async (id: string) => {
  try {
    console.log(`Enviando requisição DELETE para: /pedidos/${id}`);
    const response = await api.delete(`/pedidos/${id}`);
    console.log('Resposta da requisição DELETE:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro na requisição DELETE:', error);
    throw error; // Re-throw para tratamento no componente
  }
};

export const adicionarItemAoPedido = async (pedidoId: string, item: Omit<ItemPedido, 'id' | 'pedido_id' | 'preco_unitario' | 'criado_em'>): Promise<Pedido> => {
  try {
    console.log(`Enviando requisição POST para: /pedidos/${pedidoId}/itens`, item);
    const response = await api.post(`/pedidos/${pedidoId}/itens`, item);
    console.log('Resposta da requisição POST:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro na requisição POST:', error);
    throw error;
  }
};

export const atualizarItemDoPedido = async (pedidoId: string, itemId: string, dadosAtualizacao: { quantidade?: number, observacoes?: string }): Promise<Pedido> => {
  try {
    if (!pedidoId) {
      console.error('ID do pedido não fornecido para atualização de item');
      throw new Error('ID do pedido é obrigatório para atualização de item');
    }
    
    if (!itemId) {
      console.error('ID do item não fornecido para atualização');
      throw new Error('ID do item é obrigatório para atualização');
    }
    
    console.log(`Enviando requisição PUT para: /pedidos/${pedidoId}/itens/${itemId}`);
    console.log('Pedido ID:', pedidoId, 'Tipo:', typeof pedidoId);
    console.log('Item ID:', itemId, 'Tipo:', typeof itemId);
    console.log('Dados enviados:', JSON.stringify(dadosAtualizacao));
    
    const response = await api.put(`/pedidos/${pedidoId}/itens/${itemId}`, dadosAtualizacao);
    console.log('Resposta da requisição PUT para atualizar item:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('Erro na requisição PUT para atualizar item:');
    
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
    }
    
    // Verificar se é um erro do Axios
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
    
    throw error;
  }
};

export const removerItemDoPedido = async (pedidoId: string, itemId: string): Promise<Pedido> => {
  try {
    if (!pedidoId) {
      console.error('ID do pedido não fornecido para remoção de item');
      throw new Error('ID do pedido é obrigatório para remoção de item');
    }
    
    if (!itemId) {
      console.error('ID do item não fornecido para remoção');
      throw new Error('ID do item é obrigatório para remoção');
    }
    
    console.log(`Enviando requisição DELETE para: /pedidos/${pedidoId}/itens/${itemId}`);
    console.log('Pedido ID:', pedidoId, 'Tipo:', typeof pedidoId);
    console.log('Item ID:', itemId, 'Tipo:', typeof itemId);
    
    const response = await api.delete(`/pedidos/${pedidoId}/itens/${itemId}`);
    console.log('Resposta da requisição DELETE para remover item:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('Erro na requisição DELETE para remover item:');
    
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
    }
    
    // Verificar se é um erro do Axios
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
    
    throw error;
  }
};

export const atualizarStatusPedido = async (
  pedidoId: string,
  status: StatusPedido
) => {
  try {
    console.log(`Enviando requisição PUT para: /pedidos/${pedidoId} com status:`, status);
    const response = await api.put(`/pedidos/${pedidoId}`, { status });
    console.log('Resposta da requisição PUT status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro na requisição PUT para atualizar status:', error);
    throw error;
  }
};

export const getPedidosPorMesa = async (mesaId: string) => {
  try {
    console.log(`Enviando requisição GET para: /pedidos?mesa_id=${mesaId}`);
    const response = await api.get(`/pedidos?mesa_id=${mesaId}`);
    console.log('Resposta da requisição GET por mesa:', response.data);
    return response.data.pedidos;
  } catch (error) {
    console.error('Erro na requisição GET por mesa:', error);
    throw error;
  }
};

export const getPedidosPorStatus = async (status: StatusPedido) => {
  try {
    console.log(`Enviando requisição GET para: /pedidos?status=${status}`);
    const response = await api.get(`/pedidos?status=${status}`);
    console.log('Resposta da requisição GET por status:', response.data);
    return response.data.pedidos;
  } catch (error) {
    console.error('Erro na requisição GET por status:', error);
    throw error;
  }
};