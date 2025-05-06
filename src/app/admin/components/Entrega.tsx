'use client';

/*
 * Componente de Entrega otimizado para evitar recarregamentos desnecessários
 * 
 * Implementações de otimização:
 * 1. Cache global para armazenar dados entre mudanças de abas
 * 2. Verificação para carregar dados apenas na primeira montagem do componente
 * 3. Atualização local e no cache quando o status de pedidos é alterado
 * 4. Recarregamento manual de dados apenas quando explicitamente solicitado
 * 5. Atualização automática ao criar novos pedidos
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  updatePedido,
  StatusPedido, 
  Pedido
} from '@/lib/pedido';
import { Toaster, toast } from 'react-hot-toast';
import { getMesaById } from '@/lib/mesa';

// Interface para o carrinho de compras
interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  observacoes?: string;
  produto: Produto & {
    descricao?: string;
  };
}

// Interface para o cliente de entrega
interface ClienteEntrega {
  nome: string;
  telefone: string;
  endereco: string;
  complemento?: string;
  referencia?: string;
}

// ID da mesa especial para entregas
const MESA_ENTREGA_ID = "ENTREGA";

// Enums para abas de navegação
enum AbaPrincipal {
  PRATOS_ESPECIAIS = 'pratos_especiais',
  ESPETOS = 'espetos',
  PRATOS_NORMAIS = 'pratos_normais',
  BEBIDAS = 'bebidas',
  SOBREMESAS = 'sobremesas'
}

// Lista de categorias especiais que pertencem a "Pratos Especiais"
const CATEGORIAS_PRATOS_ESPECIAIS = [
  '特色菜品',
  '时令菜', 
  '海鲜美食'
];

// Cache global para armazenar dados entre mudanças de aba
const cacheGlobal = {
  dadosCarregados: false,
  tipoCardapio: null as TipoCardapio | null,
  produtos: [] as Produto[],
  categoriasAgrupadas: {} as {[key: string]: Categoria[]},
  tiposCardapio: {} as {[key: string]: string},
  pedidosEntrega: [] as Pedido[]
};

export default function Entrega() {
  // Estados para armazenar os dados
  const [tipoCardapio, setTipoCardapio] = useState<TipoCardapio | null>(cacheGlobal.tipoCardapio);
  const [produtos, setProdutos] = useState<Produto[]>(cacheGlobal.produtos);
  const [categoriasAgrupadas, setCategoriasAgrupadas] = useState<{[key: string]: Categoria[]}>(cacheGlobal.categoriasAgrupadas);
  const [tiposCardapio, setTiposCardapio] = useState<{[key: string]: string}>(cacheGlobal.tiposCardapio);
  
  // Estados para controle da interface
  const [isLoading, setIsLoading] = useState(!cacheGlobal.dadosCarregados);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [observacoesModal, setObservacoesModal] = useState('');
  
  // Estados para o cliente
  const [cliente, setCliente] = useState<ClienteEntrega>({
    nome: '',
    telefone: '',
    endereco: '',
    complemento: '',
    referencia: ''
  });

  // Estados para exibição de pedidos de entrega
  const [pedidosEntrega, setPedidosEntrega] = useState<Pedido[]>(cacheGlobal.pedidosEntrega);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  
  // Estados para modos de visualização
  const [modoCriacao, setModoCriacao] = useState(true);
  
  // Estados para controle da nova navegação
  const [abaPrincipalAtiva, setAbaPrincipalAtiva] = useState<AbaPrincipal | null>(null);
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);

  // Carregar dados iniciais do cardápio e pedidos de entrega
  useEffect(() => {
    // Verificar se precisamos carregar os dados ou usar cache
    if (!cacheGlobal.dadosCarregados) {
      carregarDados();
    } else {
      // Usar dados do cache
      setIsLoading(false);
      
      // Se já temos categorias e tipo de cardápio no cache, inicializar a aba
      if (Object.keys(cacheGlobal.categoriasAgrupadas).length > 0 && cacheGlobal.tipoCardapio) {
        // Definir aba principal padrão
        setAbaPrincipalAtiva(AbaPrincipal.PRATOS_NORMAIS);
      }
    }
  }, []);

  // Efeito para garantir que uma categoria seja selecionada automaticamente
  useEffect(() => {
    // Se já temos categorias e tipo de cardápio definido
    if (Object.keys(categoriasAgrupadas).length > 0 && tipoCardapio) {
      // Definir aba principal padrão
      if (!abaPrincipalAtiva) {
        setAbaPrincipalAtiva(AbaPrincipal.PRATOS_NORMAIS);
      }
      
      // Atualizar subcategorias quando a aba principal muda
      if (abaPrincipalAtiva) {
        const subcategoriasAba = getSubcategoriasPorAba(abaPrincipalAtiva);
        setSubcategorias(subcategoriasAba);
        
        // Selecionar primeira subcategoria se não houver categoria ativa ou se a categoria ativa não pertencer às subcategorias atuais
        if (subcategoriasAba.length > 0) {
          const categoriaAtivaValida = categoriaAtiva && subcategoriasAba.some(c => c.id === categoriaAtiva);
          if (!categoriaAtiva || !categoriaAtivaValida) {
            setCategoriaAtiva(subcategoriasAba[0].id || null);
          }
        }
      }
    }
  }, [categoriasAgrupadas, tipoCardapio, abaPrincipalAtiva, categoriaAtiva]);

  // Função para carregar dados do cardápio e pedidos de entrega
  const carregarDados = async () => {
    try {
      setIsLoading(true);
      
      // Buscar todas as categorias e produtos
      const [categoriasData, produtosData] = await Promise.all([
        getCategorias(),
        getProdutos()
      ]);
      
      // Filtrar apenas categorias e produtos ativos
      const categoriasAtivas = categoriasData.filter(cat => cat.ativo);
      const produtosAtivos = produtosData.filter(prod => prod.ativo);
      
      setProdutos(produtosAtivos);
      // Atualizar cache global
      cacheGlobal.produtos = produtosAtivos;
      
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
          } catch (_) {
            console.error(`Erro ao buscar tipo de cardápio ${categoria.tipo_cardapio_id}:`, _);
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
      
      // Atualizar cache global
      cacheGlobal.categoriasAgrupadas = agrupamento;
      cacheGlobal.tiposCardapio = tiposNomes;
      
      // Buscar a mesa de entrega para obter o tipo de cardápio principal (se existir)
      try {
        const mesaEntregaData = await getMesaById(MESA_ENTREGA_ID);
        
        // Se a mesa existe e tem cardápio associado, definir como tipo principal
        if (mesaEntregaData && mesaEntregaData.tipo_cardapio_id) {
          const tipoCardapioData = await getTipoCardapioById(mesaEntregaData.tipo_cardapio_id);
          setTipoCardapio(tipoCardapioData);
          cacheGlobal.tipoCardapio = tipoCardapioData;
        } else {
          // Se não tem cardápio específico, pegar o primeiro tipo disponível
          const primeiroTipoId = Object.keys(agrupamento)[0];
          if (primeiroTipoId) {
            const tipoCardapioData = await getTipoCardapioById(primeiroTipoId);
            setTipoCardapio(tipoCardapioData);
            cacheGlobal.tipoCardapio = tipoCardapioData;
          }
        }
      } catch (err) {
        console.error('Erro ao buscar mesa de entrega:', err);
        // Tentar usar o primeiro tipo de cardápio disponível
        const primeiroTipoId = Object.keys(agrupamento)[0];
        if (primeiroTipoId) {
          try {
            const tipoCardapioData = await getTipoCardapioById(primeiroTipoId);
            setTipoCardapio(tipoCardapioData);
            cacheGlobal.tipoCardapio = tipoCardapioData;
          } catch (error) {
            console.error('Erro ao buscar tipo de cardápio:', error);
            toast.error('Não foi possível carregar o cardápio');
          }
        }
      }
      
      // Buscar pedidos de entrega existentes
      await carregarPedidosEntrega();
      
      // Marcar que dados foram carregados
      cacheGlobal.dadosCarregados = true;
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para gerenciar o carrinho
  const adicionarAoCarrinho = () => {
    if (!produtoModal || !produtoModal.id) return;
    
    // Verificar se o produto já está no carrinho
    const itemExistente = carrinho.find(item => item.produto_id === produtoModal.id);
    
    if (itemExistente) {
      // Atualizar quantidade se o produto já existe no carrinho
      setCarrinho(
        carrinho.map(item => 
          item.produto_id === produtoModal.id 
            ? { 
                ...item, 
                quantidade: item.quantidade + quantidadeModal,
                observacoes: observacoesModal || item.observacoes
              } 
            : item
        )
      );
    } else {
      // Adicionar novo item ao carrinho
      setCarrinho([
        ...carrinho,
        {
          produto_id: produtoModal.id,
          quantidade: quantidadeModal,
          observacoes: observacoesModal || undefined,
          produto: produtoModal
        }
      ]);
    }
    
    // Fechar modal e resetar estados
    setProdutoModal(null);
    setQuantidadeModal(1);
    setObservacoesModal('');
    
    // Mostrar mensagem de sucesso
    toast.success('Item adicionado ao carrinho!');
  };

  // Remover item do carrinho
  const removerDoCarrinho = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto_id !== produtoId));
  };

  // Atualizar quantidade de um item no carrinho
  const atualizarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }
    
    setCarrinho(
      carrinho.map(item => 
        item.produto_id === produtoId 
          ? { ...item, quantidade: novaQuantidade } 
          : item
      )
    );
  };

  // Calcular total do pedido
  const calcularTotal = () => {
    return carrinho.reduce((total, item) => {
      const preco = item.produto?.preco || 0;
      return total + (preco * item.quantidade);
    }, 0);
  };

  // Formatar preço para exibição
  const formatarPreco = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Obter abas principais disponíveis
  const getAbasPrincipais = () => {
    return [
      AbaPrincipal.PRATOS_NORMAIS,
      AbaPrincipal.PRATOS_ESPECIAIS,
      AbaPrincipal.ESPETOS,
      AbaPrincipal.BEBIDAS,
      AbaPrincipal.SOBREMESAS
    ];
  };

  // Obter nome amigável para exibição da aba
  const getNomeAba = (aba: AbaPrincipal) => {
    switch (aba) {
      case AbaPrincipal.PRATOS_ESPECIAIS: return '特色菜品-Pratos Especiais';
      case AbaPrincipal.ESPETOS: return '烤串-Espetos';
      case AbaPrincipal.PRATOS_NORMAIS: return '其他菜品-Pratos Normais';
      case AbaPrincipal.BEBIDAS: return '饮料-Bebidas';
      case AbaPrincipal.SOBREMESAS: return '甜品-Sobremesas';
      default: return 'Desconhecido';
    }
  };

  // Obter subcategorias para a aba principal selecionada
  const getSubcategoriasPorAba = (aba: AbaPrincipal): Categoria[] => {
    if (!tipoCardapio) return [];
    
    // Preparar arrays vazios para retorno quando não há subcategorias
    const vazias: Categoria[] = [];
    
    switch (aba) {
      case AbaPrincipal.PRATOS_ESPECIAIS:
        // Categorias específicas do tipo normal que são consideradas "especiais"
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId]) => tiposCardapio[tipoId]?.toLowerCase().includes('normal'))
          .flatMap(([, cats]) => cats.filter(cat => 
            CATEGORIAS_PRATOS_ESPECIAIS.some(nome => 
              cat.nome.toLowerCase().includes(nome.toLowerCase())
            )
          ))
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.ESPETOS:
        // Categorias que começam com "Espeto" ou "Espetos"
        return Object.entries(categoriasAgrupadas)
          .flatMap(([, cats]) => cats.filter(cat => 
            cat.nome.toLowerCase().startsWith('烤串肉类') || 
            cat.nome.toLowerCase().startsWith('炸串')
          ))
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.PRATOS_NORMAIS:
        // Categorias do tipo normal, exceto as categorias especiais e espetos
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId]) => tiposCardapio[tipoId]?.toLowerCase() === '普通菜normal')
          .flatMap(([, cats]) => cats.filter(cat => 
            // Excluir categorias especiais
            !CATEGORIAS_PRATOS_ESPECIAIS.some(nome => 
              cat.nome.toLowerCase().includes(nome.toLowerCase())
            ) &&
            // Excluir categorias de espetos
            !cat.nome.toLowerCase().startsWith('烤串肉类') && 
            !cat.nome.toLowerCase().startsWith('炸串')
          ))
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.BEBIDAS:
        // Todas as categorias do tipo bebidas
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId]) => tiposCardapio[tipoId]?.toLowerCase() === '饮品bebidas')
          .flatMap(([, cats]) => cats)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.SOBREMESAS:
        // Todas as categorias do tipo sobremesas
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId]) => tiposCardapio[tipoId]?.toLowerCase() === '甜点sobremesas')
          .flatMap(([, cats]) => cats)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      default:
        return vazias;
    }
  };

  // Obter produtos por categoria
  const getProdutosPorCategoria = (categoriaId: string | null) => {
    if (!categoriaId) return [];
    
    return produtos
      .filter(produto => produto.categoria_id === categoriaId && produto.ativo)
      .sort((a, b) => {
        // Usar uma ordenação básica já que ordem não é uma propriedade padrão
        const ordemA = (a as unknown as { ordem?: number }).ordem || 0;
        const ordemB = (b as unknown as { ordem?: number }).ordem || 0;
        return ordemA - ordemB;
      });
  };
  
  // Carregar pedidos de entrega
  const carregarPedidosEntrega = async () => {
    try {
      const pedidosMesa = await getPedidosPorMesa(MESA_ENTREGA_ID);
      // Ordenar pedidos por data (mais recentes primeiro)
      const pedidosOrdenados = [...pedidosMesa].sort(
        (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      );
      setPedidosEntrega(pedidosOrdenados);
      
      // Atualizar cache global
      cacheGlobal.pedidosEntrega = pedidosOrdenados;
    } catch (err) {
      console.error('Erro ao carregar pedidos de entrega:', err);
      toast.error('Não foi possível carregar pedidos de entrega');
    }
  };

  // Válidar dados do cliente
  const validarDadosCliente = () => {
    if (!cliente.nome.trim()) {
      toast.error('Informe o nome do cliente');
      return false;
    }
    if (!cliente.telefone.trim()) {
      toast.error('Informe o telefone do cliente');
      return false;
    }
    if (!cliente.endereco.trim()) {
      toast.error('Informe o endereço do cliente');
      return false;
    }
    return true;
  };

  // Preparar observações para pedido
  const prepararObservacaoGeral = () => {
    return `ENTREGA\nCliente: ${cliente.nome}\nTelefone: ${cliente.telefone}\nEndereço: ${cliente.endereco}${cliente.complemento ? `\nComplemento: ${cliente.complemento}` : ''}${cliente.referencia ? `\nReferência: ${cliente.referencia}` : ''}`;
  };

  // Criar pedido de entrega
  const criarPedidoEntrega = async () => {
    // Valida dados obrigatórios
    if (!validarDadosCliente()) return;
    if (carrinho.length === 0) {
      toast.error('Adicione itens ao pedido!');
      return;
    }
    
    try {
      setEnviandoPedido(true);
      
      // Preparar itens do pedido
      const itensPedido = carrinho.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacoes: item.observacoes
      }));
      
      // Criar o pedido
      const observacaoGeral = prepararObservacaoGeral();
      
      const novoPedido = await createPedido({
        mesa_id: MESA_ENTREGA_ID,
        itens: itensPedido,
        observacao_geral: observacaoGeral,
        manual: true
      });
      
      // Limpar o carrinho
      setCarrinho([]);
      
      // Limpar dados do cliente
      setCliente({
        nome: '',
        telefone: '',
        endereco: '',
        complemento: '',
        referencia: ''
      });
      
      // Recarregar pedidos
      await carregarPedidosEntrega();
      
      toast.success('Pedido de entrega criado com sucesso!');
      
      // Atualizar modo
      setModoCriacao(false);
      setPedidoSelecionado(novoPedido);
      
    } catch (error) {
      console.error('Erro ao criar pedido de entrega:', error);
      toast.error('Erro ao criar pedido de entrega');
    } finally {
      setEnviandoPedido(false);
    }
  };

  // Funções de atualização de status de pedidos
  const atualizarStatusPedido = async (pedidoId: string, novoStatus: StatusPedido) => {
    try {
      await updatePedido(pedidoId, { status: novoStatus });
      
      // Atualizar o pedido localmente antes de buscar da API
      const pedidosAtualizados = pedidosEntrega.map(pedido => 
        pedido.id === pedidoId ? { ...pedido, status: novoStatus } : pedido
      );
      
      setPedidosEntrega(pedidosAtualizados);
      
      // Atualizar também no cache global
      cacheGlobal.pedidosEntrega = pedidosAtualizados;
      
      // Atualizar o pedido selecionado se for o mesmo
      if (pedidoSelecionado && pedidoSelecionado.id === pedidoId) {
        setPedidoSelecionado({ ...pedidoSelecionado, status: novoStatus });
      }
      
      // Mostrar mensagem de sucesso
      let mensagem = 'Status atualizado com sucesso!';
      if (novoStatus === StatusPedido.EM_ANDAMENTO) {
        mensagem = 'Pedido em preparo!';
      } else if (novoStatus === StatusPedido.FINALIZADO) {
        mensagem = 'Pedido finalizado!';
      } else if (novoStatus === StatusPedido.CANCELADO) {
        mensagem = 'Pedido cancelado!';
      }
      
      toast.success(mensagem);
      
    } catch (error) {
      console.error(`Erro ao atualizar status para ${novoStatus}:`, error);
      toast.error(`Erro ao atualizar status do pedido para ${novoStatus}`);
    }
  };
  
  const iniciarPreparo = (pedidoId: string) => {
    if (confirm('Confirmar início do preparo deste pedido?')) {
      atualizarStatusPedido(pedidoId, StatusPedido.EM_ANDAMENTO);
    }
  };
  
  const finalizarPedido = (pedidoId: string) => {
    if (confirm('Confirmar que o pedido foi entregue?')) {
      atualizarStatusPedido(pedidoId, StatusPedido.FINALIZADO);
    }
  };
  
  const cancelarPedido = (pedidoId: string) => {
    if (confirm('Tem certeza que deseja cancelar este pedido?')) {
      atualizarStatusPedido(pedidoId, StatusPedido.CANCELADO);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Toaster position="top-center" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-center">Gerenciamento de Entregas</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => { setModoCriacao(!modoCriacao); setPedidoSelecionado(null); }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {modoCriacao ? 'Ver Pedidos' : 'Novo Pedido'}
          </button>
          <Link
            href="/admin"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Voltar para Admin
          </Link>
        </div>
      </div>
      
      {/* Conteúdo principal baseado no modo atual */}
      {modoCriacao ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Formulário de dados do cliente */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">Dados do Cliente</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-slate-300 mb-1">
                  Nome completo*
                </label>
                <input
                  type="text"
                  id="nome"
                  value={cliente.nome}
                  onChange={(e) => setCliente({...cliente, nome: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Nome do cliente"
                />
              </div>
              
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-slate-300 mb-1">
                  Telefone*
                </label>
                <input
                  type="text"
                  id="telefone"
                  value={cliente.telefone}
                  onChange={(e) => setCliente({...cliente, telefone: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div>
                <label htmlFor="endereco" className="block text-sm font-medium text-slate-300 mb-1">
                  Endereço completo*
                </label>
                <input
                  type="text"
                  id="endereco"
                  value={cliente.endereco}
                  onChange={(e) => setCliente({...cliente, endereco: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Rua, número, bairro"
                />
              </div>
              
              <div>
                <label htmlFor="complemento" className="block text-sm font-medium text-slate-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  id="complemento"
                  value={cliente.complemento}
                  onChange={(e) => setCliente({...cliente, complemento: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Apto, bloco, etc."
                />
              </div>
              
              <div>
                <label htmlFor="referencia" className="block text-sm font-medium text-slate-300 mb-1">
                  Ponto de referência
                </label>
                <input
                  type="text"
                  id="referencia"
                  value={cliente.referencia}
                  onChange={(e) => setCliente({...cliente, referencia: e.target.value})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Próximo a..."
                />
              </div>
              
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-2">* Campos obrigatórios</p>
                <button
                  onClick={() => setShowCarrinho(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md font-medium text-white transition-colors"
                >
                  Visualizar Carrinho {carrinho.length > 0 ? `(${carrinho.length})` : ''}
                </button>
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Cardápio com categorias */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-md lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">Adicionar Itens ao Pedido</h2>
            
            {/* Navegação de abas principais */}
            <div className="mb-4 overflow-x-auto whitespace-nowrap pb-2">
              <div className="flex space-x-2">
                {getAbasPrincipais().map((aba) => (
                  <button
                    key={aba}
                    onClick={() => {
                      setAbaPrincipalAtiva(aba);
                      // Resetar categoria ativa ao mudar de aba
                      setCategoriaAtiva(null);
                    }}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                      abaPrincipalAtiva === aba
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {getNomeAba(aba)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Lista de subcategorias */}
            <div className="mb-6 overflow-x-auto whitespace-nowrap pb-2">
              <div className="flex space-x-2">
                {subcategorias.map((categoria) => (
                  <button
                    key={categoria.id || ''}
                    onClick={() => categoria.id && setCategoriaAtiva(categoria.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      categoriaAtiva === categoria.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {categoria.nome}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Grade de produtos da categoria selecionada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {getProdutosPorCategoria(categoriaAtiva).map((produto) => (
                <div
                  key={produto.id}
                  className="bg-slate-700 rounded-lg p-3 cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => {
                    setProdutoModal(produto);
                    setQuantidadeModal(1);
                    setObservacoesModal('');
                  }}
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-white">{produto.nome}</h3>
                      {produto.descricao && (
                        <p className="text-sm text-slate-300 mt-1">{produto.descricao}</p>
                      )}
                    </div>
                    <p className="text-emerald-400 font-bold">
                      {formatarPreco(produto.preco)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Modal de produto */}
          {produtoModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
                <h3 className="text-xl font-bold">{produtoModal.nome}</h3>
                {produtoModal.descricao && (
                  <p className="text-slate-300 mt-2">{produtoModal.descricao}</p>
                )}
                <p className="text-emerald-400 font-bold text-xl mt-2">
                  {formatarPreco(produtoModal.preco)}
                </p>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Quantidade
                  </label>
                  <div className="flex items-center">
                    <button
                      onClick={() => setQuantidadeModal(Math.max(1, quantidadeModal - 1))}
                      className="bg-slate-700 text-white px-3 py-1 rounded-l-md"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantidadeModal}
                      onChange={(e) => setQuantidadeModal(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center bg-slate-700 text-white p-1 border-x border-slate-600"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantidadeModal(quantidadeModal + 1)}
                      className="bg-slate-700 text-white px-3 py-1 rounded-r-md"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="observacoes" className="block text-sm font-medium text-slate-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    id="observacoes"
                    value={observacoesModal}
                    onChange={(e) => setObservacoesModal(e.target.value)}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                    rows={3}
                    placeholder="Ex: Sem cebola, bem passado, etc."
                  ></textarea>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={adicionarAoCarrinho}
                    className="flex-1 bg-emerald-600 text-white py-2 rounded-md font-medium hover:bg-emerald-500"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setProdutoModal(null)}
                    className="flex-1 bg-slate-700 text-white py-2 rounded-md font-medium hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal do carrinho */}
          {showCarrinho && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Seu Pedido</h3>
                  <button
                    onClick={() => setShowCarrinho(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                {carrinho.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center">Seu carrinho está vazio</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {carrinho.map((item) => (
                        <div key={item.produto_id} className="flex justify-between items-start border-b border-slate-700 pb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.produto.nome}</h4>
                            {item.observacoes && (
                              <p className="text-sm text-slate-400">Obs: {item.observacoes}</p>
                            )}
                            <div className="flex items-center mt-2">
                              <button
                                onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                                className="bg-slate-700 text-white px-2 py-0.5 rounded-l-md"
                              >
                                -
                              </button>
                              <span className="px-3 bg-slate-700 text-white">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                                className="bg-slate-700 text-white px-2 py-0.5 rounded-r-md"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold">
                              {formatarPreco((item.produto.preco || 0) * item.quantidade)}
                            </p>
                            <button
                              onClick={() => removerDoCarrinho(item.produto_id)}
                              className="text-red-400 text-sm mt-1 hover:text-red-300"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-slate-700 pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-emerald-400">{formatarPreco(calcularTotal())}</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <button
                        onClick={criarPedidoEntrega}
                        disabled={enviandoPedido || carrinho.length === 0}
                        className={`w-full py-3 rounded-md font-medium ${
                          enviandoPedido || carrinho.length === 0
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {enviandoPedido ? 'Processando...' : 'Finalizar Pedido de Entrega'}
                      </button>
                      <button
                        onClick={() => setShowCarrinho(false)}
                        className="w-full py-2 bg-slate-700 text-white rounded-md font-medium hover:bg-slate-600"
                      >
                        Continuar Adicionando Itens
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Lista de pedidos de entrega */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-md lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">Pedidos de Entrega</h2>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {pedidosEntrega.length === 0 ? (
                <p className="text-slate-400 text-center py-6">Nenhum pedido de entrega encontrado</p>
              ) : (
                pedidosEntrega.map((pedido) => {
                  // Extrair informações do cliente das observações
                  const linhas = pedido.observacao_geral?.split('\n') || [];
                  const clienteNome = linhas.find(l => l.startsWith('Cliente:'))?.replace('Cliente:', '').trim() || 'Cliente';
                  
                  return (
                    <div 
                      key={pedido.id}
                      onClick={() => setPedidoSelecionado(pedido)}
                      className={`p-3 rounded-md cursor-pointer border transition-colors ${
                        pedidoSelecionado?.id === pedido.id
                          ? 'border-emerald-500 bg-slate-700'
                          : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-emerald-400">{clienteNome}</h3>
                          <p className="text-xs text-slate-400">
                            {new Date(pedido.criado_em).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatarPreco(pedido.valor_total)}</p>
                          <p className={`text-xs ${
                            pedido.status === StatusPedido.FINALIZADO 
                              ? 'text-green-400' 
                              : pedido.status === StatusPedido.CANCELADO 
                                ? 'text-red-400' 
                                : pedido.status === StatusPedido.EM_ANDAMENTO
                                  ? 'text-yellow-400'
                                  : 'text-blue-400'
                          }`}>
                            {pedido.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="mt-4">
              <button
                onClick={carregarPedidosEntrega}
                className="w-full py-2 bg-slate-700 text-white rounded-md font-medium hover:bg-slate-600"
              >
                Atualizar Lista
              </button>
            </div>
          </div>
          
          {/* Coluna 2-3: Detalhes do pedido selecionado */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-md lg:col-span-2">
            {pedidoSelecionado ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-emerald-400">Detalhes do Pedido</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pedidoSelecionado.status === StatusPedido.FINALIZADO 
                      ? 'bg-green-900 text-green-300' 
                      : pedidoSelecionado.status === StatusPedido.CANCELADO 
                        ? 'bg-red-900 text-red-300' 
                        : pedidoSelecionado.status === StatusPedido.EM_ANDAMENTO
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-blue-900 text-blue-300'
                  }`}>
                    {pedidoSelecionado.status}
                  </span>
                </div>
                
                {/* Informações da entrega */}
                <div className="bg-slate-700 p-3 rounded-md mb-4">
                  <h3 className="font-semibold text-emerald-300 mb-2">Informações da Entrega</h3>
                  <div className="whitespace-pre-line text-slate-300 text-sm">
                    {pedidoSelecionado.observacao_geral}
                  </div>
                </div>
                
                {/* Itens do pedido */}
                <div className="mb-4">
                  <h3 className="font-semibold text-emerald-300 mb-2">Itens do Pedido</h3>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {pedidoSelecionado.itens.map((item) => (
                      <div key={item.id} className="bg-slate-700 p-3 rounded-md">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium">
                              {item.quantidade}x {produtos.find(p => p.id === item.produto_id)?.nome || 'Produto não encontrado'}
                            </h4>
                            {item.observacoes && (
                              <p className="text-sm text-slate-400">Obs: {item.observacoes}</p>
                            )}
                          </div>
                          <p className="text-emerald-400 font-medium">
                            {formatarPreco((item.preco_unitario || 0) * item.quantidade)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Total e ações */}
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total</span>
                    <span className="text-emerald-400">{formatarPreco(pedidoSelecionado.valor_total)}</span>
                  </div>
                  
                  {/* Ações do pedido */}
                  <div className="grid grid-cols-2 gap-3">
                    {pedidoSelecionado.status === StatusPedido.ABERTO && (
                      <>
                        <button
                          onClick={() => iniciarPreparo(pedidoSelecionado.id)}
                          className="py-2 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-500"
                        >
                          Iniciar Preparo
                        </button>
                        
                        <button
                          onClick={() => cancelarPedido(pedidoSelecionado.id)}
                          className="py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-500"
                        >
                          Cancelar Pedido
                        </button>
                      </>
                    )}
                    
                    {pedidoSelecionado.status === StatusPedido.EM_ANDAMENTO && (
                      <>
                        <button
                          onClick={() => finalizarPedido(pedidoSelecionado.id)}
                          className="py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-500"
                        >
                          Finalizar Entrega
                        </button>
                        
                        <button
                          onClick={() => cancelarPedido(pedidoSelecionado.id)}
                          className="py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-500"
                        >
                          Cancelar Pedido
                        </button>
                      </>
                    )}
                    
                    {(pedidoSelecionado.status === StatusPedido.FINALIZADO || 
                      pedidoSelecionado.status === StatusPedido.CANCELADO) && (
                      <Link
                        href={`/admin/impressao?pedidoId=${pedidoSelecionado.id}&modo=completo`}
                        className="py-2 col-span-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-500 text-center"
                        target="_blank"
                      >
                        Imprimir Comprovante
                      </Link>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">Selecione um pedido para ver os detalhes</p>
                <button
                  onClick={() => setModoCriacao(true)}
                  className="py-2 px-4 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-500"
                >
                  Criar Novo Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 