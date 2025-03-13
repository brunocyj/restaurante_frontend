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
  ItemPedido
} from '@/lib/pedido';
import { getProdutos, Produto } from '@/lib/cardapio';
import { getMesas, Mesa } from '@/lib/mesa';

export default function Pedido() {
  // Estados para gerenciamento de pedidos
  const [pedidos, setPedidos] = useState<PedidoType[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusPedido | ''>('');
  const [filtroMesa, setFiltroMesa] = useState<string>('');

  // Estados para modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'criar' | 'editar' | 'visualizar'>('criar');
  const [currentPedido, setCurrentPedido] = useState<Partial<PedidoType>>({
    mesa_id: '',
    itens: [],
    status: StatusPedido.ABERTO,
    observacao_geral: '',
    valor_total: 0
  });

  // Estado para modal de item
  const [showItemModal, setShowItemModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ItemPedido>>({
    produto_id: '',
    quantidade: 1,
    observacoes: ''
  });
  const [itemModalMode, setItemModalMode] = useState<'adicionar' | 'editar'>('adicionar');
  const [itemIndex, setItemIndex] = useState<number>(-1);

  useEffect(() => {
    fetchData();
  }, [filtroStatus, filtroMesa]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar dados necessários
      const [produtosData, mesasData] = await Promise.all([
        getProdutos(),
        getMesas()
      ]);
      
      setProdutos(produtosData || []);
      setMesas(mesasData || []);
      
      // Carregar pedidos com filtros
      let pedidosData;
      if (filtroStatus && filtroMesa) {
        // Se ambos os filtros estiverem ativos, precisamos filtrar manualmente
        const pedidosPorStatus = await getPedidosPorStatus(filtroStatus as StatusPedido);
        pedidosData = pedidosPorStatus.filter(p => p.mesa_id === filtroMesa);
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
    setCurrentPedido({ ...pedido });
    setModalMode('editar');
    setShowModal(true);
  };

  const handleOpenViewModal = (pedido: PedidoType) => {
    setCurrentPedido({ ...pedido });
    setModalMode('visualizar');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
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

  const handleOpenEditItemModal = (item: ItemPedido, index: number) => {
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

  const handleSaveItem = () => {
    if (!currentItem.produto_id) {
      alert('Selecione um produto');
      return;
    }

    const produto = produtos.find(p => p.id === currentItem.produto_id);
    if (!produto) {
      alert('Produto não encontrado');
      return;
    }

    const novoItem = {
      produto_id: currentItem.produto_id,
      quantidade: currentItem.quantidade || 1,
      observacoes: currentItem.observacoes || '',
      preco_unitario: produto.preco,
      // Campos adicionais para exibição
      _id: currentItem._id || `temp-${Date.now()}`,
      produto: { nome: produto.nome, preco: produto.preco }
    };

    if (itemModalMode === 'adicionar') {
      setCurrentPedido(prev => ({
        ...prev,
        itens: [...(prev.itens || []), novoItem],
        valor_total: (prev.valor_total || 0) + (novoItem.quantidade * produto.preco)
      }));
    } else {
      const itensAtualizados = [...(currentPedido.itens || [])];
      const itemAntigo = itensAtualizados[itemIndex];
      itensAtualizados[itemIndex] = novoItem;
      
      // Recalcular valor total
      const valorAntigoItem = itemAntigo.quantidade * itemAntigo.preco_unitario;
      const valorNovoItem = novoItem.quantidade * novoItem.preco_unitario;
      const diferencaValor = valorNovoItem - valorAntigoItem;
      
      setCurrentPedido(prev => ({
        ...prev,
        itens: itensAtualizados,
        valor_total: (prev.valor_total || 0) + diferencaValor
      }));
    }

    setShowItemModal(false);
  };

  const handleRemoveItem = (index: number) => {
    const itens = [...(currentPedido.itens || [])];
    const itemRemovido = itens[index];
    const valorItemRemovido = itemRemovido.quantidade * itemRemovido.preco_unitario;
    
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
        // Formatar itens para o formato esperado pela API
        const itensFormatados = currentPedido.itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          observacoes: item.observacoes || undefined
        }));
        
        const novoPedido = await createPedido({
          mesa_id: currentPedido.mesa_id,
          itens: itensFormatados,
          observacao_geral: currentPedido.observacao_geral || undefined,
          manual: true
        });
        
        setPedidos(prev => [...prev, novoPedido]);
      } else if (modalMode === 'editar') {
        if (!currentPedido._id) return;
        
        // Atualizar apenas os campos permitidos
        const pedidoAtualizado = await updatePedido(currentPedido._id, {
          status: currentPedido.status,
          observacao_geral: currentPedido.observacao_geral
        });
        
        setPedidos(prev => 
          prev.map(p => p._id === pedidoAtualizado._id ? pedidoAtualizado : p)
        );
      }
      
      setShowModal(false);
      fetchData(); // Recarregar dados para garantir consistência
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
      setError('Falha ao salvar o pedido. Tente novamente mais tarde.');
    }
  };

  const handleDeletePedido = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    
    try {
      await deletePedido(id);
      setPedidos(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      setError('Falha ao excluir o pedido. Tente novamente mais tarde.');
    }
  };

  const handleChangeStatus = async (id: string, status: StatusPedido) => {
    try {
      const pedidoAtualizado = await atualizarStatusPedido(id, status);
      setPedidos(prev => 
        prev.map(p => p._id === pedidoAtualizado._id ? pedidoAtualizado : p)
      );
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

  const handleFinalizarEdicao = async () => {
    try {
      setIsLoading(true);
      // Aqui você pode adicionar a lógica para finalizar a edição do pedido
      // Por exemplo, atualizar o pedido no backend
      setSuccess("Edição finalizada com sucesso!");
      setIsModalOpen(false); // Fecha o modal após finalizar
    } catch (err) {
      console.error('Erro ao finalizar edição:', err);
      setError('Falha ao finalizar edição. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePedido = async () => {
    try {
      if (window.confirm('Tem certeza que deseja excluir este pedido?')) {
        setIsLoading(true);
        // Aqui você pode adicionar a lógica para excluir o pedido
        // Por exemplo, chamar a função deletePedido do backend
        setSuccess("Pedido excluído com sucesso!");
        setIsModalOpen(false); // Fecha o modal após excluir
      }
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      setError('Falha ao excluir pedido. Tente novamente.');
    } finally {
      setIsLoading(false);
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
              {/* Tabela para telas médias e grandes */}
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
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {pedidos.map((pedido) => (
                    <tr key={pedido._id} className="hover:bg-slate-800/50">
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
                              onClick={() => pedido._id && handleDeletePedido(pedido._id)}
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
              
              {/* Layout de cards para telas pequenas */}
              <div className="divide-y divide-slate-800 md:hidden">
                {pedidos.map((pedido) => (
                  <div key={pedido._id} className="block bg-slate-900 p-4 hover:bg-slate-800/50">
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
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-3">
                      <button 
                        onClick={() => handleOpenViewModal(pedido)}
                        className="rounded-md bg-slate-600/20 px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-600/30"
                      >
                        Ver
                      </button>
                      {(pedido.status === StatusPedido.ABERTO || pedido.status === StatusPedido.EM_ANDAMENTO) && (
                        <>
                          <button 
                            onClick={() => handleOpenEditModal(pedido)}
                            className="rounded-md bg-amber-600/20 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-600/30"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => pedido._id && handleDeletePedido(pedido._id)}
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
      
      {/* Modal de Pedido */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            {/* Overlay de fundo */}
            <div 
              className="fixed inset-0 bg-slate-950/80 transition-opacity" 
              aria-hidden="true"
              onClick={handleCloseModal}
            ></div>
            
            {/* Centralizador para telas maiores */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            
            {/* Modal */}
            <div className="inline-block w-full max-h-[90vh] transform overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-lg sm:align-middle md:w-full">
              {/* Cabeçalho do modal com botão de fechar */}
              <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                <h3 className="text-lg font-medium leading-6 text-white">
                  {modalMode === 'criar' ? 'Novo Pedido' : 
                   modalMode === 'editar' ? 'Editar Pedido' : 'Detalhes do Pedido'}
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
              
              {/* Corpo do modal com rolagem */}
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
                      disabled={modalMode === 'visualizar' || modalMode === 'editar'}
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
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-slate-300">
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

                    {(!currentPedido.itens || currentPedido.itens.length === 0) ? (
                      <div className="mt-2 rounded-md border border-slate-700 bg-slate-800/50 p-4 text-center text-sm text-slate-400">
                        Nenhum item adicionado ao pedido
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {currentPedido.itens.map((item, index) => (
                          <div key={item._id || index} className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-white">
                                  {item.produto?.nome || getProdutoNome(item.produto_id)}
                                </p>
                                <div className="mt-1 flex text-sm text-slate-400">
                                  <p className="mr-4">Qtd: {item.quantidade}</p>
                                  <p>Valor: {formatarPreco(item.preco_unitario * item.quantidade)}</p>
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
                    )}
                  </div>

                  {currentPedido.valor_total !== undefined && (
                    <div className="mt-4 flex justify-end border-t border-slate-700 pt-4">
                      <p className="text-lg font-medium text-white">
                        Total: {formatarPreco(currentPedido.valor_total)}
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* Rodapé do modal com botões */}
              <div className="border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
                {modalMode !== 'visualizar' && (
                  <button
                    type="submit"
                    form="pedido-form"
                    className="w-full inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {modalMode === 'criar' ? 'Criar Pedido' : 'Salvar Alterações'}
                  </button>
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
        </div>
      )}

      {/* Modal de Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            {/* Overlay de fundo */}
            <div 
              className="fixed inset-0 bg-slate-950/80 transition-opacity" 
              aria-hidden="true"
              onClick={handleCloseItemModal}
            ></div>

            {/* Centralizador para telas maiores */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            {/* Modal */}
            <div className="inline-block w-full max-h-[90vh] transform overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-left align-bottom shadow-xl transition-all sm:my-8 sm:max-w-md sm:align-middle md:w-full">
              {/* Cabeçalho do modal com botão de fechar */}
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

              {/* Corpo do modal */}
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

              {/* Rodapé do modal com botões */}
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
  );
}