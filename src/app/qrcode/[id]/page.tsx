'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMesaById, Mesa } from '@/lib/mesa';
import { 
  getTipoCardapioById, 
  getCategorias, 
  getProdutos, 
  TipoCardapio, 
  Categoria, 
  Produto 
} from '@/lib/cardapio';
import { 
  createPedido, 
  getPedidosPorMesa, 
  adicionarItemAoPedido, 
  atualizarStatusPedido, 
  StatusPedido,
  Pedido
} from '@/lib/pedido';

// Interface para o carrinho de compras
interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  observacoes?: string;
  produto: Produto;
}

export default function QRCodePage() {
  const params = useParams();
  const mesaId = params.id as string;
  
  // Estados para armazenar os dados
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [tipoCardapio, setTipoCardapio] = useState<TipoCardapio | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState<{[key: string]: Categoria[]}>({});
  const [tiposCardapio, setTiposCardapio] = useState<{[key: string]: string}>({});
  
  // Estados para controle da interface
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [observacoesModal, setObservacoesModal] = useState('');
  
  // Estados para pedidos e notificações
  const [pedidoAtual, setPedidoAtual] = useState<string | null>(null);
  const [pedidoStatus, setPedidoStatus] = useState<StatusPedido | null>(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [sucessoEnvio, setSucessoEnvio] = useState<string | null>(null);
  const [showAcoesModal, setShowAcoesModal] = useState(false);
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [chamandoAtendente, setChamandoAtendente] = useState(false);
  const [pedindoConta, setPedindoConta] = useState(false);
  
  // Carregar dados da mesa e do cardápio
  useEffect(() => {
    async function carregarDados() {
      try {
        setIsLoading(true);
        
        // Buscar dados da mesa
        const mesaData = await getMesaById(mesaId);
        setMesa(mesaData);
        
        if (!mesaData || !mesaData.tipo_cardapio_id) {
          throw new Error('Mesa não encontrada ou sem cardápio associado');
        }
        
        // Buscar tipo de cardápio da mesa
        const tipoCardapioData = await getTipoCardapioById(mesaData.tipo_cardapio_id);
        setTipoCardapio(tipoCardapioData);
        
        // Buscar todas as categorias e produtos
        const [categoriasData, produtosData] = await Promise.all([
          getCategorias(),
          getProdutos()
        ]);
        
        // Filtrar apenas categorias e produtos ativos
        const categoriasAtivas = categoriasData.filter(cat => cat.ativo);
        const produtosAtivos = produtosData.filter(prod => prod.ativo);
        
        setProdutos(produtosAtivos);
        
        // Agrupar categorias por tipo de cardápio
        const agrupamento: {[key: string]: Categoria[]} = {};
        const tiposNomes: {[key: string]: string} = {};
        
        for (const categoria of categoriasAtivas) {
          if (!agrupamento[categoria.tipo_cardapio_id]) {
            agrupamento[categoria.tipo_cardapio_id] = [];
            
            // Buscar o nome do tipo de cardápio para exibição
            try {
              const tipoInfo = await getTipoCardapioById(categoria.tipo_cardapio_id);
              tiposNomes[categoria.tipo_cardapio_id] = tipoInfo.nome;
            } catch (err) {
              console.error(`Erro ao buscar tipo de cardápio ${categoria.tipo_cardapio_id}:`, err);
              tiposNomes[categoria.tipo_cardapio_id] = 'Desconhecido';
            }
          }
          
          agrupamento[categoria.tipo_cardapio_id].push(categoria);
        }
        
        // Ordenar categorias por ordem em cada grupo
        for (const tipoId in agrupamento) {
          agrupamento[tipoId].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        }
        
        setCategoriasAgrupadas(agrupamento);
        setTiposCardapio(tiposNomes);
        
        // Definir a primeira categoria como ativa
        if (categoriasAtivas.length > 0 && categoriasAtivas[0].id) {
          setCategoriaAtiva(categoriasAtivas[0].id);
        }
        
        // Verificar se já existe um pedido aberto para esta mesa
        try {
          const pedidosMesa = await getPedidosPorMesa(mesaId);
          const pedidosAtivos = pedidosMesa.filter(
            (p: Pedido) => p.status === StatusPedido.ABERTO || p.status === StatusPedido.EM_ANDAMENTO
          );
          
          if (pedidosAtivos.length > 0) {
            // Existe um pedido ativo para esta mesa
            const pedidoAtivo = pedidosAtivos[0];
            setPedidoAtual(pedidoAtivo.id);
            setPedidoStatus(pedidoAtivo.status);
            
            // Exibir mensagem informativa
            setSucessoEnvio(`Você já tem um pedido ${pedidoAtivo.status.toLowerCase()} para esta mesa.`);
          }
        } catch (err) {
          console.error('Erro ao verificar pedidos da mesa:', err);
          // Não exibir erro para o usuário, apenas continuar normalmente
        }
        
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError('Não foi possível carregar o cardápio. Tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    }
    
    carregarDados();
  }, [mesaId]);
  
  // Função para adicionar item ao carrinho
  const adicionarAoCarrinho = () => {
    if (!produtoModal) return;
    
    // Verificar se o produto já está no carrinho
    const itemExistente = carrinho.find(item => item.produto_id === produtoModal.id);
    
    if (itemExistente) {
      // Atualizar quantidade se já existir
      setCarrinho(carrinho.map(item => 
        item.produto_id === produtoModal.id 
          ? { ...item, quantidade: item.quantidade + quantidadeModal, observacoes: observacoesModal || item.observacoes } 
          : item
      ));
    } else {
      // Adicionar novo item
      setCarrinho([...carrinho, {
        produto_id: produtoModal.id!,
        quantidade: quantidadeModal,
        observacoes: observacoesModal || undefined,
        produto: produtoModal
      }]);
    }
    
    // Fechar modal e resetar estados
    setProdutoModal(null);
    setQuantidadeModal(1);
    setObservacoesModal('');
  };
  
  // Função para remover item do carrinho
  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto_id !== produtoId));
  };
  
  // Função para atualizar quantidade de um item no carrinho
  const atualizarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }
    
    setCarrinho(carrinho.map(item => 
      item.produto_id === produtoId 
        ? { ...item, quantidade: novaQuantidade } 
        : item
    ));
  };
  
  // Função para calcular o valor total do carrinho
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => {
      return total + (item.produto.preco * item.quantidade);
    }, 0);
  };
  
  // Função para formatar preço
  const formatarPreco = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  
  // Função para filtrar categorias com base no tipo de cardápio da mesa
  const filtrarCategorias = () => {
    if (!tipoCardapio) return [];
    
    // Determinar quais tipos de cardápio devem ser excluídos
    const tipoExcluido = tipoCardapio.nome.toLowerCase() === 'normal' ? 'hotpot' : 'normal';
    
    // Filtrar categorias
    return Object.entries(categoriasAgrupadas)
      .filter(([tipoId]) => {
        const nomeTipo = tiposCardapio[tipoId]?.toLowerCase();
        return nomeTipo !== tipoExcluido;
      })
      .flatMap(([, cats]) => cats)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  };
  
  // Obter produtos da categoria ativa
  const getProdutosPorCategoria = (categoriaId: string | null) => {
    if (!categoriaId) return [];
    return produtos.filter(produto => produto.categoria_id === categoriaId);
  };
  
  // Função para enviar pedido
  const enviarPedido = async () => {
    if (carrinho.length === 0) {
      setError('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      setEnviandoPedido(true);
      setError(null);
      
      // Formatar itens para o formato esperado pela API
      const itensFormatados = carrinho.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacoes: item.observacoes
      }));
      
      if (pedidoAtual) {
        // Já existe um pedido, adicionar itens a ele
        for (const item of itensFormatados) {
          await adicionarItemAoPedido(pedidoAtual, item);
        }
        
        setSucessoEnvio('Itens adicionados ao seu pedido com sucesso!');
      } else {
        // Criar um novo pedido
        const dadosPedido = {
          mesa_id: mesaId,
          itens: itensFormatados,
          observacao_geral: observacaoGeral || undefined
        };
        
        const novoPedido = await createPedido(dadosPedido);
        setPedidoAtual(novoPedido.id);
        setPedidoStatus(novoPedido.status);
        
        setSucessoEnvio('Pedido enviado com sucesso!');
      }
      
      // Limpar o carrinho após o envio
      setCarrinho([]);
      setShowCarrinho(false);
      
      // Exibir modal de ações após o envio
      setTimeout(() => {
        setShowAcoesModal(true);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      setError('Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setEnviandoPedido(false);
    }
  };
  
  // Função para chamar atendente
  const chamarAtendente = async () => {
    try {
      setChamandoAtendente(true);
      
      // Aqui você implementaria a lógica para enviar uma notificação ao sistema
      // Por exemplo, usando uma API de notificações ou websockets
      
      // Simulação de envio de notificação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSucessoEnvio('Atendente chamado com sucesso! Logo alguém virá atendê-lo.');
      setShowAcoesModal(false);
    } catch (error) {
      console.error('Erro ao chamar atendente:', error);
      setError('Não foi possível chamar o atendente. Tente novamente.');
    } finally {
      setChamandoAtendente(false);
    }
  };
  
  // Função para pedir a conta
  const pedirConta = async () => {
    if (!pedidoAtual) {
      setError('Não há pedido ativo para esta mesa.');
      return;
    }
    
    try {
      setPedindoConta(true);
      
      // Atualizar o status do pedido para finalizado
      await atualizarStatusPedido(pedidoAtual, StatusPedido.FINALIZADO);
      setPedidoStatus(StatusPedido.FINALIZADO);
      
      // Simulação de envio de notificação
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSucessoEnvio('Conta solicitada com sucesso! Logo alguém trará sua conta.');
      setShowAcoesModal(false);
    } catch (error) {
      console.error('Erro ao pedir a conta:', error);
      setError('Não foi possível solicitar a conta. Tente novamente.');
    } finally {
      setPedindoConta(false);
    }
  };
  
  // Renderizar o estado de carregamento
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">MEIZIZI</h1>
            <p className="mt-2 text-amber-400">Cardápio Digital</p>
          </div>
          <div className="flex justify-center mt-6">
            <svg className="h-10 w-10 animate-spin text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-center text-slate-400">Carregando cardápio...</p>
        </div>
      </div>
    );
  }
  
  // Renderizar mensagem de erro
  if (error || !mesa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">MEIZIZI</h1>
            <p className="mt-2 text-amber-400">Cardápio Digital</p>
          </div>
          <div className="mt-6 rounded-md bg-red-900/30 p-4 text-sm text-red-300 border border-red-800">
            <p>{error || 'Mesa não encontrada'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Filtrar categorias com base no tipo de cardápio
  const categoriasFiltradas = filtrarCategorias();
  
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">MEIZIZI</h1>
            <p className="text-sm text-amber-400">Mesa {mesa.id}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {pedidoAtual && (
              <button
                onClick={() => setShowAcoesModal(true)}
                className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600"
                title="Ações (chamar atendente, pedir conta)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            )}
            
            <button 
              onClick={() => setShowCarrinho(true)}
              className="relative rounded-full bg-amber-500 p-2 text-white hover:bg-amber-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              
              {carrinho.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
                  {carrinho.reduce((total, item) => total + item.quantidade, 0)}
                </span>
              )}
            </button>
          </div>
          
          {/* Mensagens de sucesso/erro */}
          {(sucessoEnvio || error) && (
            <div className={`px-4 py-2 text-sm ${sucessoEnvio ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {sucessoEnvio || error}
            </div>
          )}
        </div>
        
        {/* Navegação de categorias */}
        <div className="border-t border-slate-800 bg-slate-900 overflow-x-auto">
          <div className="flex space-x-2 px-4 py-2">
            {categoriasFiltradas.map(categoria => (
              <button
                key={categoria.id}
                onClick={() => categoria.id && setCategoriaAtiva(categoria.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                  categoriaAtiva === categoria.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {categoria.nome}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Conteúdo principal */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Lista de produtos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {getProdutosPorCategoria(categoriaAtiva).map(produto => (
            <div 
              key={produto.id} 
              onClick={() => {
                setProdutoModal(produto);
                setQuantidadeModal(1);
                setObservacoesModal('');
              }}
              className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-md transition-transform hover:scale-[1.02]"
            >
              {produto.imagem_url && (
                <div className="mb-3 h-40 w-full overflow-hidden rounded-md">
                  <img 
                    src={produto.imagem_url} 
                    alt={produto.nome} 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              
              <h3 className="text-lg font-medium text-white">{produto.nome}</h3>
              
              {produto.descricao && (
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">{produto.descricao}</p>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-bold text-amber-500">{formatarPreco(produto.preco)}</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const item = carrinho.find(item => item.produto_id === produto.id);
                    if (item) {
                      atualizarQuantidade(produto.id!, item.quantidade + 1);
                    } else {
                      setCarrinho([...carrinho, {
                        produto_id: produto.id!,
                        quantidade: 1,
                        produto
                      }]);
                    }
                  }}
                  className="rounded-full bg-amber-500 p-1 text-white hover:bg-amber-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {getProdutosPorCategoria(categoriaAtiva).length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-slate-400">Nenhum produto disponível nesta categoria</p>
          </div>
        )}
      </main>
      
      {/* Modal de produto */}
      {produtoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="w-full max-w-md rounded-lg bg-slate-900 shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">{produtoModal.nome}</h3>
                <button 
                  onClick={() => setProdutoModal(null)}
                  className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {produtoModal.imagem_url && (
                <div className="mt-3 h-48 w-full overflow-hidden rounded-md">
                  <img 
                    src={produtoModal.imagem_url} 
                    alt={produtoModal.nome} 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              
              {produtoModal.descricao && (
                <p className="mt-3 text-sm text-slate-400">{produtoModal.descricao}</p>
              )}
              
              <p className="mt-3 text-lg font-bold text-amber-500">{formatarPreco(produtoModal.preco)}</p>
              
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Quantidade</label>
                  <div className="mt-1 flex items-center">
                    <button 
                      onClick={() => setQuantidadeModal(Math.max(1, quantidadeModal - 1))}
                      className="rounded-l-md border border-r-0 border-slate-700 bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantidadeModal}
                      onChange={(e) => setQuantidadeModal(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 border-y border-slate-700 bg-slate-800 py-2 text-center text-white"
                    />
                    <button 
                      onClick={() => setQuantidadeModal(quantidadeModal + 1)}
                      className="rounded-r-md border border-l-0 border-slate-700 bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300">Observações</label>
                  <textarea 
                    value={observacoesModal}
                    onChange={(e) => setObservacoesModal(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-800 py-2 px-3 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                    placeholder="Ex: Sem cebola, bem passado, etc."
                  />
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-800 p-4">
              <button 
                onClick={adicionarAoCarrinho}
                className="w-full rounded-md bg-amber-500 py-2 px-4 text-center font-medium text-white hover:bg-amber-600"
              >
                Adicionar ao Pedido - {formatarPreco(produtoModal.preco * quantidadeModal)}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal do carrinho */}
      {showCarrinho && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-75 sm:items-center">
          <div className="w-full max-w-md rounded-t-lg bg-slate-900 shadow-xl sm:rounded-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Seu Pedido</h3>
                <button 
                  onClick={() => setShowCarrinho(false)}
                  className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {carrinho.length === 0 ? (
                <div className="mt-4 py-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-4 text-slate-400">Seu carrinho está vazio</p>
                  <button 
                    onClick={() => setShowCarrinho(false)}
                    className="mt-4 text-amber-500 hover:text-amber-400"
                  >
                    Continuar comprando
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-4 max-h-80 overflow-y-auto">
                    {carrinho.map(item => (
                      <div key={item.produto_id} className="mb-3 rounded-md border border-slate-800 bg-slate-800/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white">{item.produto.nome}</p>
                            <div className="mt-1 flex text-sm text-slate-400">
                              <p className="mr-4">Qtd: {item.quantidade}</p>
                              <p>Valor: {formatarPreco(item.produto.preco * item.quantidade)}</p>
                            </div>
                            {item.observacoes && (
                              <p className="mt-1 text-xs text-slate-500">
                                Obs: {item.observacoes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                              className="rounded-full bg-slate-700 p-1 text-white hover:bg-slate-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                              className="rounded-full bg-slate-700 p-1 text-white hover:bg-slate-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => removerDoCarrinho(item.produto_id)}
                              className="rounded-full bg-red-500/20 p-1 text-red-400 hover:bg-red-500/30"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-white">Total</p>
                      <p className="text-lg font-bold text-amber-500">{formatarPreco(calcularTotal())}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Observações gerais</label>
                      <textarea 
                        value={observacaoGeral}
                        onChange={(e) => setObservacaoGeral(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-slate-700 bg-slate-800 py-2 px-3 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        placeholder="Alguma observação para todo o pedido?"
                      />
                    </div>
                    
                    <button 
                      onClick={enviarPedido}
                      disabled={enviandoPedido || carrinho.length === 0}
                      className="w-full rounded-md bg-amber-500 py-3 px-4 text-center font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {enviandoPedido ? (
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Enviando...</span>
                        </div>
                      ) : (
                        pedidoAtual ? 'Adicionar ao Pedido' : 'Finalizar Pedido'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de ações (chamar atendente, pedir conta) */}
      {showAcoesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="w-full max-w-md rounded-lg bg-slate-900 shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Ações</h3>
                <button 
                  onClick={() => setShowAcoesModal(false)}
                  className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {sucessoEnvio && (
                <div className="mt-4 rounded-md bg-green-900/30 p-3 text-sm text-green-300 border border-green-800">
                  {sucessoEnvio}
                </div>
              )}
              
              <div className="mt-6 space-y-4">
                <button 
                  onClick={chamarAtendente}
                  disabled={chamandoAtendente}
                  className="flex w-full items-center justify-center space-x-2 rounded-md bg-blue-600 py-3 px-4 text-center font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {chamandoAtendente ? (
                    <>
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Chamando...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>Chamar Atendente</span>
                    </>
                  )}
                </button>
                
                <button 
                  onClick={pedirConta}
                  disabled={pedindoConta || !pedidoAtual}
                  className="flex w-full items-center justify-center space-x-2 rounded-md bg-green-600 py-3 px-4 text-center font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {pedindoConta ? (
                    <>
                      <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Pedir a Conta</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão flutuante do carrinho (visível apenas em mobile quando o carrinho tem itens) */}
      {carrinho.length > 0 && !showCarrinho && (
        <div className="fixed bottom-4 right-4 sm:hidden">
          <button 
            onClick={() => setShowCarrinho(true)}
            className="flex items-center space-x-2 rounded-full bg-amber-500 py-2 px-4 text-white shadow-lg hover:bg-amber-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">{carrinho.reduce((total, item) => total + item.quantidade, 0)}</span>
          </button>
        </div>
      )}
      
      {/* Botão flutuante para ações (visível apenas em mobile quando há pedido ativo) */}
      {pedidoAtual && !showAcoesModal && !showCarrinho && (
        <div className="fixed bottom-4 left-4 sm:hidden">
          <button 
            onClick={() => setShowAcoesModal(true)}
            className="flex items-center space-x-2 rounded-full bg-blue-500 py-2 px-4 text-white shadow-lg hover:bg-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span className="font-medium">Ações</span>
          </button>
        </div>
      )}
      
      {/* Mensagem de status do pedido (visível quando há pedido ativo) */}
      {pedidoStatus && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 text-center text-sm">
          <span className="text-amber-400">
            Status do pedido: <span className="font-medium">{pedidoStatus}</span>
          </span>
        </div>
      )}
    </div>
  );
} 