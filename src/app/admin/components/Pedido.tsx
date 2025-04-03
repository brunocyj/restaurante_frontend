'use client';

import { useState, useEffect } from 'react';
import { 
  getPedidos, 
  createPedido, 
  updatePedido, 
  deletePedido,
  atualizarStatusPedido,
  getPedidosPorMesa,
  getPedidosPorStatus,
  StatusPedido,
  Pedido as PedidoType,
  removerItemDoPedido,
  adicionarItemAoPedido,
  atualizarItemDoPedido,
  MetodoPagamento
} from '@/lib/pedido';
import { getProdutos, Produto } from '@/lib/cardapio';
import { getMesas, Mesa } from '@/lib/mesa';
import axios from 'axios';

// Atualizando a interface PedidoType para usar id em vez de _id
interface PedidoWithFallbackId extends Omit<PedidoType, 'id'> {
  id: string;
  _id?: string; // Mantido para compatibilidade com código existente
}

// Interfaces para melhorar a tipagem e evitar 'any'
interface CurrentPedidoState {
  id?: string;
  _id?: string; // Mantido para compatibilidade
  mesa_id: string;
  itens: Array<{
    id?: string;
    _id?: string; // Mantido para compatibilidade
    produto_id: string;
    quantidade: number;
    observacoes?: string;
    preco_unitario?: number;
    valor_unitario?: number; // Adicionado para compatibilidade
    valor_total?: number;
    metodo_pagamento?: MetodoPagamento; // Adicionado para compatibilidade
    produto?: {
      nome: string;
      preco: number;
    }
  }>;
  status: StatusPedido;
  observacao_geral?: string;
  valor_total: number;
  metodo_pagamento?: MetodoPagamento;
}

interface CurrentItemState {
  id?: string;
  _id?: string; // Mantido para compatibilidade
  produto_id: string;
  quantidade: number;
  observacoes?: string;
  preco_unitario?: number;
  produto?: {
    nome: string;
    preco: number;
  }
}

export default function Pedido() {
  // Estados para gerenciamento de pedidos
  const [pedidos, setPedidos] = useState<PedidoWithFallbackId[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | ''>('');
  const [filtroMesa, setFiltroMesa] = useState<string>('');

  // Estados para modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'criar' | 'editar' | 'visualizar'>('criar');
  const [currentPedido, setCurrentPedido] = useState<CurrentPedidoState>({
    mesa_id: '',
    itens: [],
    status: StatusPedido.ABERTO,
    observacao_geral: '',
    valor_total: 0
  });

  // Estado para modal de item
  const [showItemModal, setShowItemModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<CurrentItemState>({
    produto_id: '',
    quantidade: 1,
    observacoes: ''
  });
  const [itemModalMode, setItemModalMode] = useState<'adicionar' | 'editar'>('adicionar');
  const [itemIndex, setItemIndex] = useState<number>(-1);

  useEffect(() => {
    fetchData();
  }, [filtroStatus, filtroMesa]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
        fetchData();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [produtosData, mesasData] = await Promise.all([
        getProdutos(),
        getMesas()
      ]);
      setProdutos(produtosData || []);
      setMesas(mesasData || []);
      let pedidosData;
      if (filtroStatus && filtroMesa) {
        const pedidosPorStatus = await getPedidosPorStatus(filtroStatus as StatusPedido);
        pedidosData = pedidosPorStatus.filter((p: PedidoType) => p.mesa_id === filtroMesa);
      } else if (filtroStatus) {
        pedidosData = await getPedidosPorStatus(filtroStatus as StatusPedido);
      } else if (filtroMesa) {
        pedidosData = await getPedidosPorMesa(filtroMesa);
      } else {
        pedidosData = await getPedidos();
      }
      setPedidos(pedidosData || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Falha ao carregar os dados. Tente novamente mais tarde.');
      setPedidos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setError(null);
    setSuccess(null);
    setCurrentPedido({
      mesa_id: mesas.length > 0 ? mesas[0].id : '',
      itens: [],
      status: StatusPedido.ABERTO,
      observacao_geral: '',
      valor_total: 0
    });
    setModalMode('criar');
    setShowModal(true);
  };

  const handleOpenEditModal = (pedido: PedidoType) => {
    setError(null);
    setSuccess(null);
    if (!pedido.id) {
      console.error('Tentativa de editar pedido sem ID:', pedido);
      setError('Não é possível editar um pedido sem ID');
      return;
    }
    console.log('Abrindo modal de edição para pedido:', pedido);
    console.log('ID do pedido a ser editado:', pedido.id);
    const pedidoCopy = { ...pedido };
    console.log('Cópia do pedido para edição:', pedidoCopy);
    setCurrentPedido(pedidoCopy);
    setModalMode('editar');
    setShowModal(true);
  };

  const handleOpenViewModal = (pedido: PedidoType) => {
    setError(null);
    setSuccess(null);
    setCurrentPedido({ ...pedido });
    setModalMode('visualizar');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    fetchData();
  };

  const handleOpenAddItemModal = () => {
    setCurrentItem({
      produto_id: produtos.length > 0 ? produtos[0].id || '' : '',
      quantidade: 1,
      observacoes: ''
    });
    setItemModalMode('adicionar');
    setItemIndex(-1);
    setShowItemModal(true);
  };

  const handleOpenEditItemModal = (item: CurrentItemState, index: number) => {
    setCurrentItem({ ...item });
    setItemModalMode('editar');
    setItemIndex(index);
    setShowItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowItemModal(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentPedido(prev => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'quantidade') {
      setCurrentItem(prev => ({ ...prev, [name]: parseInt(value) || 1 }));
    } else {
      setCurrentItem(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRemoveItemFromPedido = async (pedidoId: string, itemId: string) => {
    try {
      console.log('===== INÍCIO DA REMOÇÃO DE ITEM VIA API =====');
      console.log('ID do pedido:', pedidoId);
      console.log('ID do item:', itemId);
      const resultado = await removerItemDoPedido(pedidoId, itemId);
      console.log('Resposta da API após remoção de item:', resultado);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? resultado : p));
      if (currentPedido.id === pedidoId) {
        setCurrentPedido(resultado);
      }
      setSuccess('Item removido com sucesso!');
      console.log('===== FIM DA REMOÇÃO DE ITEM VIA API =====');
    } catch (error: unknown) {
      console.error('Erro detalhado ao remover item:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao remover item: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao remover item: ${errorMessage}`);
      }
    }
  };

  const handleAddItemToPedido = async (pedidoId: string, item: { produto_id: string; quantidade: number; observacoes?: string }) => {
    try {
      console.log('===== INÍCIO DA ADIÇÃO DE ITEM VIA API =====');
      console.log('ID do pedido:', pedidoId);
      console.log('Dados do item a adicionar:', item);
      const resultado = await adicionarItemAoPedido(pedidoId, item);
      console.log('Resposta da API após adição de item:', resultado);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? resultado : p));
      if (currentPedido.id === pedidoId) {
        setCurrentPedido(resultado);
      }
      setSuccess('Item adicionado com sucesso!');
      console.log('===== FIM DA ADIÇÃO DE ITEM VIA API =====');
      return resultado;
    } catch (error: unknown) {
      console.error('Erro detalhado ao adicionar item:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao adicionar item: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao adicionar item: ${errorMessage}`);
      }
      throw error;
    }
  };

  const handleUpdateItemQuantity = async (pedidoId: string, itemId: string, quantidade: number, observacoes?: string) => {
    try {
      console.log('===== INÍCIO DA ATUALIZAÇÃO DE ITEM VIA API =====');
      console.log('ID do pedido:', pedidoId);
      console.log('ID do item:', itemId);
      console.log('Nova quantidade:', quantidade);
      console.log('Observações:', observacoes);
      const resultado = await atualizarItemDoPedido(pedidoId, itemId, { quantidade, observacoes });
      console.log('Resposta da API após atualização de item:', resultado);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? resultado : p));
      if (currentPedido.id === pedidoId) {
        setCurrentPedido(resultado);
      }
      setSuccess('Item atualizado com sucesso!');
      console.log('===== FIM DA ATUALIZAÇÃO DE ITEM VIA API =====');
      return resultado;
    } catch (error: unknown) {
      console.error('Erro detalhado ao atualizar item:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao atualizar item: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao atualizar item: ${errorMessage}`);
      }
      throw error;
    }
  };

  const handleSaveItem = () => {
    console.log('===== INÍCIO DO SALVAMENTO DE ITEM =====');
    console.log('Estado atual do item:', currentItem);
    console.log('Modo do item:', itemModalMode);
    try {
      if (!currentItem.produto_id) {
        console.error('Produto não selecionado');
        setError('Selecione um produto');
        return;
      }
      if (!currentItem.quantidade || currentItem.quantidade <= 0) {
        console.error('Quantidade inválida:', currentItem.quantidade);
        setError('Informe uma quantidade válida');
        return;
      }
      const produtoSelecionado = produtos.find(p => p.id === currentItem.produto_id);
      if (!produtoSelecionado) {
        console.error('Produto não encontrado na lista:', currentItem.produto_id);
        setError('Produto não encontrado');
        return;
      }
      console.log('Produto selecionado:', produtoSelecionado);
      if (currentPedido.id) {
        console.log('Pedido já existe no backend, usando APIs para manipulação de itens');
        if (itemModalMode === 'adicionar') {
          handleAddItemToPedido(currentPedido.id, {
            produto_id: currentItem.produto_id,
            quantidade: currentItem.quantidade,
            observacoes: currentItem.observacoes
          });
          setShowItemModal(false);
          return;
        } else if (itemModalMode === 'editar') {
          if (itemIndex === null || itemIndex < 0 || !currentPedido.itens || !currentPedido.itens[itemIndex]) {
            console.error('Item não encontrado para edição');
            setError('Item não encontrado para edição');
            return;
          }
          const itemAtual = currentPedido.itens[itemIndex];
          const itemId = itemAtual.id || itemAtual._id;
          if (!itemId) {
            console.error('ID do item não encontrado para atualização');
            setError('ID do item não encontrado. Não é possível atualizar.');
            return;
          }
          handleUpdateItemQuantity(
            currentPedido.id, 
            itemId, 
            currentItem.quantidade, 
            currentItem.observacoes
          );
          setShowItemModal(false);
          return;
        }
      }
      if (itemModalMode === 'adicionar') {
        const novoItem = {
          id: `temp-${Date.now()}`,
          produto_id: currentItem.produto_id,
          produto: produtoSelecionado,
          quantidade: currentItem.quantidade,
          observacoes: currentItem.observacoes,
          valor_unitario: produtoSelecionado.preco,
          valor_total: produtoSelecionado.preco * currentItem.quantidade
        };
        console.log('Novo item a ser adicionado:', novoItem);
        setCurrentPedido(prev => ({
          ...prev,
          itens: [...(prev.itens || []), novoItem],
          valor_total: (prev.valor_total || 0) + novoItem.valor_total
        }));
        console.log('Item adicionado com sucesso');
      } else if (itemModalMode === 'editar') {
        if (itemIndex === null || itemIndex < 0) {
          console.error('Índice do item inválido:', itemIndex);
          setError('Item não encontrado para edição');
          return;
        }
        console.log('Índice do item para edição:', itemIndex);
        if (!currentPedido.itens || !currentPedido.itens[itemIndex]) {
          console.error('Item não encontrado no índice:', itemIndex);
          setError('Item não encontrado no pedido');
          return;
        }
        const valorTotal = produtoSelecionado.preco * currentItem.quantidade;
        const itemAtual = currentPedido.itens[itemIndex];
        const valorAnterior = itemAtual.valor_total || 0;
        console.log('Valor anterior do item:', valorAnterior);
        console.log('Novo valor do item:', valorTotal);
        const itensAtualizados = [...currentPedido.itens];
        itensAtualizados[itemIndex] = {
          ...itemAtual,
          produto_id: currentItem.produto_id,
          produto: produtoSelecionado,
          quantidade: currentItem.quantidade,
          observacoes: currentItem.observacoes,
          valor_unitario: produtoSelecionado.preco,
          valor_total: valorTotal
        };
        setCurrentPedido(prev => ({
          ...prev,
          itens: itensAtualizados,
          valor_total: (prev.valor_total || 0) - valorAnterior + valorTotal
        }));
        console.log('Item atualizado com sucesso');
      }
      setCurrentItem({
        produto_id: '',
        quantidade: 1,
        observacoes: ''
      });
      setShowItemModal(false);
      console.log('===== FIM DO SALVAMENTO DE ITEM =====');
    } catch (error: unknown) {
      console.error('Erro detalhado ao salvar item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Falha ao salvar o item: ${errorMessage}`);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!currentPedido || !currentPedido.itens || !currentPedido.itens[index]) {
      console.error('Pedido ou item não encontrado para remover');
      setError('Pedido ou item não encontrado');
      return;
    }
    const item = currentPedido.itens[index];
    console.log('Item a ser removido:', item);
    if (currentPedido.id) {
      const itemId = item.id || item._id;
      if (itemId) {
        console.log(`Removendo item pelo ID: ${itemId} do pedido: ${currentPedido.id}`);
        handleRemoveItemFromPedido(currentPedido.id, itemId);
        return;
      } else {
        console.error('ID do item não encontrado para remoção via API');
        setError('ID do item não encontrado. Não é possível remover.');
        return;
      }
    }
    console.log('Removendo item localmente (pedido em criação)');
    const itens = [...(currentPedido.itens || [])];
    const itemRemovido = itens[index];
    let valorItemRemovido = 0;
    if (itemRemovido.preco_unitario) {
      valorItemRemovido = itemRemovido.quantidade * itemRemovido.preco_unitario;
    } else if (itemRemovido.produto?.preco) {
      valorItemRemovido = itemRemovido.quantidade * itemRemovido.produto.preco;
    }
    itens.splice(index, 1);
    setCurrentPedido(prev => ({
      ...prev,
      itens: itens,
      valor_total: (prev.valor_total || 0) - valorItemRemovido
    }));
  };

  const handleSavePedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPedido.mesa_id) {
      alert('Selecione uma mesa');
      return;
    }
    if (!currentPedido.itens || currentPedido.itens.length === 0) {
      alert('Adicione pelo menos um item ao pedido');
      return;
    }
    try {
      if (modalMode === 'criar') {
        console.log('===== INÍCIO DA CRIAÇÃO DE PEDIDO =====');
        console.log('Mesa ID:', currentPedido.mesa_id);
        console.log('Quantidade de itens:', currentPedido.itens.length);
        const itensFormatados = currentPedido.itens.map(item => {
          const itemFormatado = {
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            observacoes: item.observacoes || undefined
          };
          console.log('Item formatado:', itemFormatado);
          return itemFormatado;
        });
        const dadosPedido = {
          mesa_id: currentPedido.mesa_id,
          itens: itensFormatados,
          observacao_geral: currentPedido.observacao_geral || undefined,
          metodo_pagamento: currentPedido.metodo_pagamento || undefined,
          manual: true
        };
        console.log('Dados do pedido a ser enviado:', dadosPedido);
        const novoPedido = await createPedido(dadosPedido);
        console.log('Resposta da API após criação:', novoPedido);
        setPedidos(prev => [...prev, novoPedido]);
      } else if (modalMode === 'editar') {
        if (!currentPedido.id) return;
        const pedidoAtualizado = await updatePedido(currentPedido.id, {
          status: currentPedido.status,
          observacao_geral: currentPedido.observacao_geral,
          mesa_id: currentPedido.mesa_id,
          metodo_pagamento: currentPedido.metodo_pagamento
        });
        setPedidos(prev => prev.map(p => p.id === pedidoAtualizado.id ? pedidoAtualizado : p));
      }
      setShowModal(false);
      setSuccess("Pedido salvo com sucesso!");
      fetchData();
    } catch (error: unknown) {
      console.error('Erro detalhado ao salvar pedido:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao salvar o pedido: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao salvar o pedido: ${errorMessage}`);
      }
    }
  };

  const handleDeletePedido = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      console.log('===== INÍCIO DA EXCLUSÃO =====');
      console.log('ID recebido pela função:', id);
      console.log('Tipo do ID:', typeof id);
      if (!id) {
        console.error('ID inválido ou undefined');
        setError('ID do pedido inválido ou não encontrado');
        return;
      }
      console.log('Iniciando exclusão do pedido ID:', id);
      setIsLoading(true);
      const resultado = await deletePedido(id);
      console.log('Resposta da API após exclusão:', resultado);
      setPedidos(prev => prev.filter(p => p.id !== id));
      setSuccess('Pedido excluído com sucesso!');
      setShowModal(false);
      console.log('===== FIM DA EXCLUSÃO =====');
    } catch (error: unknown) {
      console.error('Erro detalhado ao excluir pedido:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao excluir o pedido: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao excluir o pedido: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeStatus = async (id: string, status: StatusPedido) => {
    try {
      const pedidoAtualizado = await atualizarStatusPedido(id, status);
      setPedidos(prev => prev.map(p => p.id === pedidoAtualizado.id ? pedidoAtualizado : p));
    } catch (err) {
      console.error('Erro ao atualizar status do pedido:', err);
      setError('Falha ao atualizar o status do pedido. Tente novamente mais tarde.');
    }
  };

  const formatarData = (data: string | Date) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarPreco = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusColor = (status: StatusPedido) => {
    switch (status) {
      case StatusPedido.ABERTO:
        return 'bg-blue-900/30 text-blue-400';
      case StatusPedido.EM_ANDAMENTO:
        return 'bg-amber-900/30 text-amber-400';
      case StatusPedido.FINALIZADO:
        return 'bg-emerald-900/30 text-emerald-400';
      case StatusPedido.CANCELADO:
        return 'bg-red-900/30 text-red-400';
      default:
        return 'bg-slate-900/30 text-slate-400';
    }
  };

  const getMesaNome = (id: string) => {
    const mesa = mesas.find(m => m.id === id);
    return mesa ? `Mesa ${mesa.id}` : id;
  };

  const getProdutoNome = (id: string) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const getProdutoDescricao = (id: string) => {
    const produto = produtos.find(p => p.id === id);
    return produto?.descricao || '';
  };

  const handleFinalizarEdicao = async () => {
    try {
      console.log('===== INÍCIO DA FINALIZAÇÃO DE EDIÇÃO =====');
      console.log('Estado atual do pedido:', currentPedido);
      const pedidoId = currentPedido.id;
      if (!pedidoId) {
        console.error('ID do pedido não encontrado para finalizar edição');
        setError('ID do pedido não encontrado para finalizar edição');
        return;
      }
      console.log('ID do pedido para finalização:', pedidoId);
      console.log('Tipo do ID:', typeof pedidoId);
      if (!currentPedido.itens || currentPedido.itens.length === 0) {
        console.error('Pedido sem itens para finalizar');
        setError('Adicione pelo menos um item ao pedido');
        return;
      }
      console.log('Quantidade de itens:', currentPedido.itens.length);
      const itensFormatados = currentPedido.itens.map(item => {
        const itemFormatado = {
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          observacoes: item.observacoes || undefined
        };
        console.log('Item formatado:', itemFormatado);
        return itemFormatado;
      });
      const dadosAtualizacao = {
        mesa_id: currentPedido.mesa_id,
        itens: itensFormatados,
        observacao_geral: currentPedido.observacao_geral || undefined,
        status: currentPedido.status,
        metodo_pagamento: currentPedido.metodo_pagamento
      };
      console.log('Dados para atualização:', dadosAtualizacao);
      console.log('URL completa:', `/api/pedidos/${pedidoId}`);
      const pedidoAtualizado = await updatePedido(pedidoId, {
        status: currentPedido.status,
        observacao_geral: currentPedido.observacao_geral,
        mesa_id: currentPedido.mesa_id,
        metodo_pagamento: currentPedido.metodo_pagamento
      });
      console.log('Resposta da API após atualização:', pedidoAtualizado);
      setPedidos(prev => prev.map(p => (p.id === pedidoId || p._id === pedidoId) ? pedidoAtualizado : p));
      setShowModal(false);
      setSuccess('Pedido atualizado com sucesso!');
      console.log('===== FIM DA FINALIZAÇÃO DE EDIÇÃO =====');
      fetchData();
    } catch (error: unknown) {
      console.error('Erro detalhado ao finalizar edição:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Resposta da API:', error.response.data);
        console.error('Status:', error.response.status);
        console.error('Headers:', error.response.headers);
        const errorMessage = error.response.data.detail || (error instanceof Error ? error.message : 'Erro desconhecido');
        setError(`Falha ao atualizar o pedido: ${errorMessage}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setError(`Falha ao atualizar o pedido: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <svg className="h-8 w-8 animate-spin text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mb-4">
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Sucesso</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
        <Pedido />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-md">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-white mb-4 md:mb-0">Gerenciamento de Pedidos</h2>
        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex items-center">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusPedido | '')}
              className="rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
            >
              <option value="">Todos os Status</option>
              <option value={StatusPedido.ABERTO}>Aberto</option>
              <option value={StatusPedido.EM_ANDAMENTO}>Em Andamento</option>
              <option value={StatusPedido.FINALIZADO}>Finalizado</option>
              <option value={StatusPedido.CANCELADO}>Cancelado</option>
            </select>
          </div>
          <div className="flex items-center">
            <select
              value={filtroMesa}
              onChange={(e) => setFiltroMesa(e.target.value)}
              className="rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
            >
              <option value="">Todas as Mesas</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  Mesa {mesa.id}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Novo Pedido
          </button>
        </div>
      </div>
      {pedidos.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-8 text-center">
          <p className="text-slate-400">Nenhum pedido encontrado.</p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Criar Primeiro Pedido
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-lg border border-slate-800 shadow">
              <table className="hidden min-w-full divide-y divide-slate-800 md:table">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Mesa
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Valor Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Método de Pagamento
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                        {getMesaNome(pedido.mesa_id)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(pedido.status)}`}>
                          {pedido.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {formatarPreco(pedido.valor_total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {pedido.metodo_pagamento ? pedido.metodo_pagamento.replace('_', ' ') : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {formatarData(pedido.criado_em)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <button 
                          onClick={() => handleOpenViewModal(pedido)}
                          className="mr-3 text-slate-400 hover:text-slate-300"
                        >
                          Ver
                        </button>
                        {(pedido.status === StatusPedido.ABERTO || pedido.status === StatusPedido.EM_ANDAMENTO) && (
                          <>
                            <button 
                              onClick={() => handleOpenEditModal(pedido)}
                              className="mr-3 text-amber-500 hover:text-amber-400"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => {
                                console.log('Dados do pedido completo:', pedido);
                                console.log('Botão de exclusão clicado para pedido ID:', pedido.id);
                                if (pedido.id) {
                                  handleDeletePedido(pedido.id);
                                } else {
                                  console.error('ID do pedido não encontrado ao tentar excluir');
                                  setError('ID do pedido não encontrado');
                                }
                              }}
                              className="text-red-500 hover:text-red-400"
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="divide-y divide-slate-800 md:hidden">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="block bg-slate-900 p-4 hover:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium text-white">{getMesaNome(pedido.mesa_id)}</h3>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-300">
                      <div>
                        <span className="font-medium text-slate-400">Valor:</span>
                        <p>{formatarPreco(pedido.valor_total)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Data:</span>
                        <p>{formatarData(pedido.criado_em)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Pagamento:</span>
                        <p>{pedido.metodo_pagamento ? pedido.metodo_pagamento.replace('_', ' ') : '-'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-3">
                      <button 
                        onClick={() => handleOpenViewModal(pedido)}
                        className="rounded-md bg-slate-600/20 px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-600/30"
                      >
                        Ver
                      </button>
                      {(pedido.status === StatusPedido.ABERTO || pedido.status === StatusPedido.EM_ANDAMENTO || pedido.status === StatusPedido.FINALIZADO) && (
                        <>
                          <button 
                            onClick={() => handleOpenEditModal(pedido)}
                            className="rounded-md bg-amber-600/20 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-600/30"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Dados do pedido completo:', pedido);
                              console.log('Botão de exclusão clicado para pedido ID:', pedido.id);
                              if (pedido.id) {
                                handleDeletePedido(pedido.id);
                              } else {
                                console.error('ID do pedido não encontrado ao tentar excluir');
                                setError('ID do pedido não encontrado');
                              }
                            }}
                            className="rounded-md bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-600/30"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div 
              className="fixed inset-0 bg-slate-950/80 transition-opacity" 
              aria-hidden="true"
              onClick={handleCloseModal}
            ></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="inline-block w-full max-h-[90vh] transform overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-lg sm:align-middle md:w-full">
              <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                <h3 className="text-lg font-medium leading-6 text-white">
                  {modalMode === 'criar' ? 'Novo Pedido' : modalMode === 'editar' ? 'Editar Pedido' : 'Detalhes do Pedido'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md bg-slate-900 text-slate-400 hover:text-white focus:outline-none"
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                <form onSubmit={handleSavePedido} id="pedido-form" className="space-y-5">
                  <div>
                    <label htmlFor="mesa_id" className="block text-sm font-medium text-slate-300">
                      Mesa
                    </label>
                    <select
                      id="mesa_id"
                      name="mesa_id"
                      value={currentPedido.mesa_id}
                      onChange={handleInputChange}
                      disabled={modalMode === 'visualizar'}
                      className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm disabled:opacity-70"
                    >
                      <option value="">Selecione uma mesa</option>
                      {mesas.map((mesa) => (
                        <option key={mesa.id} value={mesa.id}>
                          Mesa {mesa.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(modalMode === 'editar' || modalMode === 'visualizar') && (
                    <div>                     <label htmlFor="status" className="block text-sm font-medium text-slate-300">
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={currentPedido.status}
                        onChange={handleInputChange}
                        disabled={modalMode === 'visualizar'}
                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm disabled:opacity-70"
                      >
                        <option value={StatusPedido.ABERTO}>Aberto</option>
                        <option value={StatusPedido.EM_ANDAMENTO}>Em Andamento</option>
                        <option value={StatusPedido.FINALIZADO}>Finalizado</option>
                        <option value={StatusPedido.CANCELADO}>Cancelado</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor="observacao_geral" className="block text-sm font-medium text-slate-300">
                      Observações
                    </label>
                    <textarea
                      id="observacao_geral"
                      name="observacao_geral"
                      rows={3}
                      value={currentPedido.observacao_geral || ''}
                      onChange={handleInputChange}
                      disabled={modalMode === 'visualizar'}
                      className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm disabled:opacity-70"
                      placeholder="Observações gerais do pedido"
                    />
                  </div>
                  <div>
                    <label htmlFor="metodo_pagamento" className="block text-sm font-medium text-slate-300">
                      Método de Pagamento
                    </label>
                    <select
                      id="metodo_pagamento"
                      name="metodo_pagamento"
                      value={currentPedido.metodo_pagamento || ''}
                      onChange={handleInputChange}
                      disabled={modalMode === 'visualizar'}
                      className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm disabled:opacity-70"
                    >
                      <option value="">Selecione um método de pagamento</option>
                      <option value={MetodoPagamento.DINHEIRO}>Dinheiro</option>
                      <option value={MetodoPagamento.CARTAO_CREDITO}>Cartão de Crédito</option>
                      <option value={MetodoPagamento.CARTAO_DEBITO}>Cartão de Débito</option>
                      <option value={MetodoPagamento.PIX}>PIX</option>
                      <option value={MetodoPagamento.OUTROS}>Outros</option>
                    </select>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-300">
                        Itens do Pedido
                      </label>
                      {modalMode !== 'visualizar' && (
                        <button
                          type="button"
                          onClick={handleOpenAddItemModal}
                          className="inline-flex items-center rounded-md bg-amber-600/20 px-2 py-1 text-xs font-medium text-amber-500 hover:bg-amber-600/30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Adicionar Item
                        </button>
                      )}
                    </div>
                    {(currentPedido.itens && currentPedido.itens.length > 0) ? (
                      <div className="mt-2 space-y-2">
                        {currentPedido.itens.map((item, index: number) => (
                          <div key={item.id || `item-${index}`} className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-white">
                                  {item.produto?.nome || getProdutoNome(item.produto_id)}
                                </p>
                                {getProdutoDescricao(item.produto_id) && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {getProdutoDescricao(item.produto_id)}
                                  </p>
                                )}
                                <div className="mt-1 flex text-sm text-slate-400">
                                  <p className="mr-4">Qtd: {item.quantidade}</p>
                                  <p>Valor: {formatarPreco((item.preco_unitario || 0) * item.quantidade)}</p>
                                </div>
                                {item.observacoes && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Obs: {item.observacoes}
                                  </p>
                                )}
                              </div>
                              {modalMode !== 'visualizar' && (
                                <div className="flex space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditItemModal(item, index)}
                                    className="rounded-md bg-slate-700 p-1 text-slate-300 hover:bg-slate-600 hover:text-white"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="rounded-md bg-red-900/30 p-1 text-red-400 hover:bg-red-900/50 hover:text-red-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 rounded-md border border-slate-700 bg-slate-800/50 p-4 text-center text-sm text-slate-400">
                        Nenhum item adicionado ao pedido
                      </div>
                    )}
                  </div>
                  {currentPedido.valor_total !== undefined && (
                    <div className="mt-4 flex justify-end border-t border-slate-700 pt-4">
                      <p className="text-lg font-medium text-white">
                        Total: {formatarPreco(currentPedido.valor_total)}
                      </p>
                    </div>
                  )}
                  {currentPedido.metodo_pagamento && (
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-slate-300">Método de pagamento:</p>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-500/20 text-slate-400">
                        {currentPedido.metodo_pagamento.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </form>
              </div>
              <div className="border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
                {modalMode !== 'visualizar' && (
                  <>
                    <button
                      type="submit"
                      form="pedido-form"
                      className="w-full inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {modalMode === 'criar' ? 'Criar Pedido' : 'Salvar Alterações'}
                    </button>
                    {modalMode === 'editar' && (
                      <button
                        type="button"
                        onClick={handleFinalizarEdicao}
                        className="w-full inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Finalizar Edição
                      </button>
                    )}
                  </>
                )}
                {modalMode === 'visualizar' && currentPedido._id && (
                  <>
                    {currentPedido.status === StatusPedido.ABERTO && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentPedido._id) {
                            handleChangeStatus(currentPedido._id, StatusPedido.EM_ANDAMENTO);
                            handleCloseModal();
                          }
                        }}
                        className="w-full inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Iniciar Preparo
                      </button>
                    )}
                    {currentPedido.status === StatusPedido.EM_ANDAMENTO && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentPedido._id) {
                            handleChangeStatus(currentPedido._id, StatusPedido.FINALIZADO);
                            handleCloseModal();
                          }
                        }}
                        className="w-full inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Finalizar Pedido
                      </button>
                    )}
                    {(currentPedido.status === StatusPedido.ABERTO || currentPedido.status === StatusPedido.EM_ANDAMENTO) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (currentPedido._id) {
                            handleChangeStatus(currentPedido._id, StatusPedido.CANCELADO);
                            handleCloseModal();
                          }
                        }}
                        className="w-full inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Cancelar Pedido
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-base font-medium text-slate-300 shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  {modalMode === 'visualizar' ? 'Fechar' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
          {showItemModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div 
                  className="fixed inset-0 bg-slate-950/80 transition-opacity" 
                  aria-hidden="true"
                  onClick={handleCloseItemModal}
                ></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                <div className="inline-block w-full max-h-[90vh] transform overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-md sm:align-middle md:w-full">
                  <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                    <h3 className="text-lg font-medium leading-6 text-white">
                      {itemModalMode === 'adicionar' ? 'Adicionar Item' : 'Editar Item'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseItemModal}
                      className="rounded-md bg-slate-900 text-slate-400 hover:text-white focus:outline-none"
                    >
                      <span className="sr-only">Fechar</span>
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="produto_id" className="block text-sm font-medium text-slate-300">
                          Produto
                        </label>
                        <select
                          id="produto_id"
                          name="produto_id"
                          value={currentItem.produto_id}
                          onChange={handleItemInputChange}
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        >
                          <option value="">Selecione um produto</option>
                          {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} - {formatarPreco(produto.preco)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="quantidade" className="block text-sm font-medium text-slate-300">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          id="quantidade"
                          name="quantidade"
                          min="1"
                          value={currentItem.quantidade}
                          onChange={handleItemInputChange}
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="observacoes" className="block text-sm font-medium text-slate-300">
                          Observações
                        </label>
                        <textarea
                          id="observacoes"
                          name="observacoes"
                          rows={2}
                          value={currentItem.observacoes || ''}
                          onChange={handleItemInputChange}
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                          placeholder="Ex: Sem cebola, bem passado, etc."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={handleSaveItem}
                      className="w-full inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {itemModalMode === 'adicionar' ? 'Adicionar' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseItemModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-base font-medium text-slate-300 shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
