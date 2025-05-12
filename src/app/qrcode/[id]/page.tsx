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
  updatePedido, 
  adicionarItemAoPedido, 
  StatusPedido, 
  Pedido,
  MetodoPagamento
} from '@/lib/pedido';
import Image from 'next/image';
import { Toaster } from 'react-hot-toast';

// Interface para o carrinho de compras
interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  observacoes?: string;
  produto: Produto & {
    descricao?: string;
  };
}

enum AbaPrincipal {
  HOTPOT = 'hotpot',
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
  const [pedidoAtual, setPedidoAtual] = useState<Pedido | null>(null);
  const [pedidoStatus, setPedidoStatus] = useState<StatusPedido | null>(null);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [sucessoEnvio, setSucessoEnvio] = useState<string | null>(null);
  const [showAcoesModal, setShowAcoesModal] = useState(false);
  const [observacaoGeral, setObservacaoGeral] = useState('');
  const [pedindoConta, setPedindoConta] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [metodoPagamentoSelecionado, setMetodoPagamentoSelecionado] = useState<MetodoPagamento | null>(null);
  
  // Estados para controle de modais
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  
  // Estados para controle de mensagens
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro'>('sucesso');
  const [showMensagem, setShowMensagem] = useState(false);
  
  // Estados para controle da nova navegação
  const [abaPrincipalAtiva, setAbaPrincipalAtiva] = useState<AbaPrincipal | null>(null);
  const [subcategorias, setSubcategorias] = useState<Categoria[]>([]);
  
  // Efeito para garantir que uma categoria seja selecionada automaticamente
  useEffect(() => {
    // Se já temos categorias e tipo de cardápio definido
    if (Object.keys(categoriasAgrupadas).length > 0 && tipoCardapio) {
      // Definir aba principal padrão com base no tipo de cardápio
      if (!abaPrincipalAtiva) {
        const abaInicial = tipoCardapio.nome.toLowerCase().includes('hotpot') 
          ? AbaPrincipal.HOTPOT 
          : AbaPrincipal.ESPETOS;
        setAbaPrincipalAtiva(abaInicial);
      }
      
      // Atualizar subcategorias quando a aba principal muda
      if (abaPrincipalAtiva) {
        const subcategoriasAba = getSubcategoriasPorAba(abaPrincipalAtiva);
        setSubcategorias(subcategoriasAba);
        
        // Selecionar primeira subcategoria se não houver categoria ativa ou se a categoria ativa não pertencer às subcategorias atuais
        if (subcategoriasAba.length > 0) {
          const categoriaAtivaValida = categoriaAtiva && subcategoriasAba.some(c => c.id === categoriaAtiva);
          if (!categoriaAtiva || !categoriaAtivaValida) {
            console.log("Selecionando subcategoria automaticamente:", subcategoriasAba[0].nome);
            setCategoriaAtiva(subcategoriasAba[0].id || null);
          }
        }
      }
    }
  }, [categoriasAgrupadas, tipoCardapio, abaPrincipalAtiva, categoriaAtiva]);
  
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
        
        // Verificar o formato dos produtos retornados pela API
        if (produtosData.length > 0) {
          console.log('Amostra de produto da API:', produtosData[0]);
          console.log('Chaves do produto:', Object.keys(produtosData[0]));
        }
        
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
            setPedidoAtual(pedidoAtivo);
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
    
    // Verificar a estrutura do produtoModal
    console.log('ProdutoModal completo:', produtoModal);
    console.log('ProdutoModal tem descricao?', 'descricao' in produtoModal);
    console.log('Valor da descricao no produtoModal:', produtoModal.descricao);
    
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
    
    // Atualizar a página para refletir os novos itens
    atualizarDados();
  };
  
  // Função para atualizar dados da página
  const atualizarDados = async () => {
    try {
      // Buscar dados da mesa
      const mesaData = await getMesaById(mesaId);
      setMesa(mesaData);
      
      // Verificar se já existe um pedido aberto para esta mesa
      const pedidosMesa = await getPedidosPorMesa(mesaId);
      const pedidosAtivos = pedidosMesa.filter(
        (p: Pedido) => p.status === StatusPedido.ABERTO || p.status === StatusPedido.EM_ANDAMENTO
      );
      
      if (pedidosAtivos.length > 0) {
        // Existe um pedido ativo para esta mesa
        const pedidoAtivo = pedidosAtivos[0];
        setPedidoAtual(pedidoAtivo);
        setPedidoStatus(pedidoAtivo.status);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    }
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
  
  // Obter abas principais disponíveis com base no tipo de cardápio
  const getAbasPrincipais = () => {
    if (!tipoCardapio) return [];
    
    const tipoCardapioNome = tipoCardapio.nome.toLowerCase();
    
    // Abas para cardápio hotpot
    if (tipoCardapioNome.includes('hotpot')) {
      return [
        AbaPrincipal.HOTPOT,
        AbaPrincipal.PRATOS_ESPECIAIS, 
        AbaPrincipal.ESPETOS,
        AbaPrincipal.PRATOS_NORMAIS,
        AbaPrincipal.BEBIDAS,
        AbaPrincipal.SOBREMESAS
      ];
    }
    
    // Abas para cardápio normal
    return [
      AbaPrincipal.ESPETOS,
      AbaPrincipal.PRATOS_NORMAIS,
      AbaPrincipal.PRATOS_ESPECIAIS,
      AbaPrincipal.BEBIDAS,
      AbaPrincipal.SOBREMESAS
    ];
  };
  
  // Obter nome amigável para exibição da aba
  const getNomeAba = (aba: AbaPrincipal) => {
    switch (aba) {
      case AbaPrincipal.HOTPOT: return '美滋滋火锅-Hotpot';
      case AbaPrincipal.PRATOS_ESPECIAIS: return '特色菜品-Pratos Especiais';
      case AbaPrincipal.ESPETOS: return '烤串-Espetos';
      case AbaPrincipal.PRATOS_NORMAIS: return '其他菜品-Pratos Normais';
      case AbaPrincipal.BEBIDAS: return '饮料-Bebidas';
      case AbaPrincipal.SOBREMESAS: return '甜品-Sobremesas';
      default: return 'Desconhecido';
    }
  };
  
  // Obter ícone para cada aba principal
  const getIconeAba = (aba: AbaPrincipal) => {
    switch (aba) {
      case AbaPrincipal.HOTPOT:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case AbaPrincipal.PRATOS_ESPECIAIS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case AbaPrincipal.ESPETOS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        );
      case AbaPrincipal.PRATOS_NORMAIS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case AbaPrincipal.BEBIDAS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case AbaPrincipal.SOBREMESAS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Obter subcategorias para a aba principal selecionada
  const getSubcategoriasPorAba = (aba: AbaPrincipal): Categoria[] => {
    if (!tipoCardapio) return [];
    
    // Preparar arrays vazios para retorno quando não há subcategorias
    const vazias: Categoria[] = [];
    
    switch (aba) {
      case AbaPrincipal.HOTPOT:
        // Todas as categorias do tipo hotpot
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId, _]) => tiposCardapio[tipoId]?.toLowerCase().includes('hotpot'))
          .flatMap(([_, cats]) => cats)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.PRATOS_ESPECIAIS:
        // Categorias específicas do tipo normal que são consideradas "especiais"
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId, _]) => tiposCardapio[tipoId]?.toLowerCase().includes('normal'))
          .flatMap(([_, cats]) => cats.filter(cat => 
            CATEGORIAS_PRATOS_ESPECIAIS.some(nome => 
              cat.nome.toLowerCase().includes(nome.toLowerCase())
            )
          ))
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.ESPETOS:
        // Categorias que começam com "Espeto" ou "Espetos"
        return Object.entries(categoriasAgrupadas)
          .flatMap(([_, cats]) => cats.filter(cat => 
            cat.nome.toLowerCase().startsWith('烤串肉类') || 
            cat.nome.toLowerCase().startsWith('炸串')
          ))
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.PRATOS_NORMAIS:
        // Categorias do tipo normal, exceto as categorias especiais e espetos
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId, _]) => tiposCardapio[tipoId]?.toLowerCase() === '普通菜normal')
          .flatMap(([_, cats]) => cats.filter(cat => 
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
          .filter(([tipoId, _]) => tiposCardapio[tipoId]?.toLowerCase() === '饮品bebidas')
          .flatMap(([_, cats]) => cats)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      case AbaPrincipal.SOBREMESAS:
        // Todas as categorias do tipo sobremesas
        return Object.entries(categoriasAgrupadas)
          .filter(([tipoId, _]) => tiposCardapio[tipoId]?.toLowerCase() === '甜点sobremesas')
          .flatMap(([_, cats]) => cats)
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
          
      default:
        return vazias;
    }
  };
  
  // Filtrar categorias com base no tipo de cardápio
  const filtrarCategorias = () => {
    if (!tipoCardapio) return [];
    
    // Determinar quais tipos de cardápio devem ser excluídos
    const tipoExcluido = tipoCardapio.nome.toLowerCase().includes('normal') ? 'hotpot' : 'normal';
    
    // Filtrar categorias
    return Object.entries(categoriasAgrupadas)
    .flatMap(([tipoId, cats]) => {
      const nomeTipo = tiposCardapio[tipoId]?.toLowerCase() || '';

      // Se o tipo for o excluído, só mantém categorias que começam com "Espeto" ou "Espetos"
      if (nomeTipo.includes(tipoExcluido)) {
        return cats.filter(categoria =>
          categoria.nome.toLowerCase().startsWith('espeto') ||
          categoria.nome.toLowerCase().startsWith('espetos')
        );
      }

      // Se não for o tipo excluído, mantém todas as categorias
      return cats;
    })
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
};
  
  // Obter produtos da categoria ativa
  const getProdutosPorCategoria = (categoriaId: string | null) => {
    if (!categoriaId) return [];
    const produtosFiltrados = produtos.filter(produto => produto.categoria_id === categoriaId);
    
    // Verificar a estrutura dos produtos
    if (produtosFiltrados.length > 0) {
      console.log('Exemplo de produto:', produtosFiltrados[0]);
      console.log('Propriedade descricao existe?', 'descricao' in produtosFiltrados[0]);
      console.log('Valor da descricao:', produtosFiltrados[0].descricao);
    }
    
    return produtosFiltrados;
  };
  
  // Função para enviar pedido
  const enviarPedido = async () => {
    try {
      setEnviandoPedido(true);
      
      // Formatar itens para o formato esperado pela API
      const itensFormatados = carrinho.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacoes: item.observacoes
      }));
      
      if (pedidoAtual) {
        // Já existe um pedido, adicionar itens a ele
        for (const item of itensFormatados) {
          await adicionarItemAoPedido(pedidoAtual.id, item);
        }
        
        // Atualizar observação geral se existir
        if (observacaoGeral) {
          await updatePedido(pedidoAtual.id, { observacao_geral: observacaoGeral });
        }
        
        // Atualizar os dados do pedido
        await atualizarDados();
        
        // Mostrar mensagem de sucesso
        setMensagem('Itens adicionados ao pedido com sucesso!');
        setTipoMensagem('sucesso');
        setShowMensagem(true);
        
        // Esconder mensagem após 3 segundos
        setTimeout(() => {
          setShowMensagem(false);
        }, 3000);
      } else {
        // Criar um novo pedido
        const dadosPedido = {
          mesa_id: mesaId,
          itens: itensFormatados,
          observacao_geral: observacaoGeral || undefined
        };
        
        const novoPedido = await createPedido(dadosPedido);
        setPedidoAtual(novoPedido);
        setPedidoStatus(novoPedido.status);
        
        // Mostrar mensagem de sucesso
        setMensagem('Pedido enviado com sucesso!');
        setTipoMensagem('sucesso');
        setShowMensagem(true);
        
        // Esconder mensagem após 3 segundos
        setTimeout(() => {
          setShowMensagem(false);
        }, 3000);
      }
      
      // Limpar carrinho e fechar modal
      setCarrinho([]);
      setObservacaoGeral('');
      setShowCarrinho(false);
      
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      
      // Mostrar mensagem de erro
      setMensagem('Erro ao enviar pedido. Tente novamente.');
      setTipoMensagem('erro');
      setShowMensagem(true);
      
      // Esconder mensagem após 3 segundos
      setTimeout(() => {
        setShowMensagem(false);
      }, 3000);
    } finally {
      setEnviandoPedido(false);
    }
  };
  
  // Função para pedir a conta
  const pedirConta = async () => {
    try {
      setPedindoConta(true);
      
      if (!pedidoAtual) {
        throw new Error('Não há pedido ativo para encerrar');
      }
      
      // Verificar se o método de pagamento foi selecionado
      if (!metodoPagamentoSelecionado) {
        setShowPagamentoModal(true);
        setPedindoConta(false);
        return;
      }
      
      // Atualizar o status do pedido para finalizado e incluir método de pagamento
      await updatePedido(pedidoAtual.id, {
        status: StatusPedido.FINALIZADO,
        metodo_pagamento: metodoPagamentoSelecionado
      });
      
      // Buscar os dados atualizados do pedido
      await atualizarDados();
      
      setPedidoStatus(StatusPedido.FINALIZADO);
      
      // Mostrar mensagem de sucesso
      setMensagem('Conta solicitada com sucesso!');
      setTipoMensagem('sucesso');
      setShowMensagem(true);
      
      // Esconder mensagem após 3 segundos
      setTimeout(() => {
        setShowMensagem(false);
      }, 3000);
      
      // Fechar modal de ações
      setShowAcoesModal(false);
      
      // Mostrar o resumo do pedido para o cliente
      setShowPedidoModal(true);
    } catch (error) {
      console.error('Erro ao pedir a conta:', error);
      
      // Mostrar mensagem de erro
      setMensagem('Erro ao pedir a conta. Tente novamente.');
      setTipoMensagem('erro');
      setShowMensagem(true);
      
      // Esconder mensagem após 3 segundos
      setTimeout(() => {
        setShowMensagem(false);
      }, 3000);
    } finally {
      setPedindoConta(false);
    }
  };
  
  // Função para confirmar o pagamento com o método selecionado
  const confirmarPagamento = async () => {
    setShowPagamentoModal(false);
    if (metodoPagamentoSelecionado) {
      await pedirConta();
    }
  };
  
  // Filtrar categorias com base no tipo de cardápio
  const categoriasFiltradas = filtrarCategorias();
  
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
  
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Toast notifications */}
      <Toaster position="top-center" />
      
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
                onClick={() => {
                  atualizarDados().then(() => setShowPedidoModal(true));
                }}
                className="rounded-full bg-green-600 p-2 text-white hover:bg-green-700"
                title="Ver pedido atual"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {getNomeAba(aba)}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Conteúdo principal */}
      <main className="mx-auto max-w-7xl px-0 sm:px-4 py-6 flex flex-col lg:flex-row">
        {/* Barra lateral de subcategorias - visível se houver subcategorias */}
        {subcategorias.length > 0 && (
          <div className="w-full md:w-56 md:flex-shrink-0 md:pr-4 mb-4 md:mb-0">
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-white font-medium">{abaPrincipalAtiva ? getNomeAba(abaPrincipalAtiva) : 'Categorias'}</h3>
              </div>
              
              {/* Subcategorias na versão mobile - seleção horizontal */}
              <div className="flex overflow-x-auto px-2 py-2 md:hidden">
                {subcategorias.map((subcategoria) => (
                  <button
                    key={subcategoria.id}
                    onClick={() => subcategoria.id && setCategoriaAtiva(subcategoria.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium mr-1 ${
                      categoriaAtiva === subcategoria.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {subcategoria.nome}
                    {subcategoria.descricao && (
                      <span className="ml-1 text-xs opacity-90"> - {subcategoria.descricao}</span>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Subcategorias na versão desktop - listagem vertical */}
              <div className="hidden md:block">
                <ul className="py-2">
                  {subcategorias.map((subcategoria) => (
                    <li key={subcategoria.id}>
                      <button
                        onClick={() => subcategoria.id && setCategoriaAtiva(subcategoria.id)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          categoriaAtiva === subcategoria.id
                            ? 'bg-amber-500/10 text-amber-400 font-medium'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {subcategoria.nome}
                        {subcategoria.descricao && (
                          <span className="ml-1 text-xs opacity-90"> - {subcategoria.descricao}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Conteúdo com produtos da categoria selecionada */}
        <div className="flex-1">
          {/* Título da categoria selecionada */}
          {categoriaAtiva && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
              <h2 className="text-lg font-medium text-white">
                {(() => {
                  const categoria = subcategorias.find(c => c.id === categoriaAtiva);
                  if (!categoria) return 'Produtos';
                  
                  return (
                    <>
                      {categoria.nome}
                      {categoria.descricao && (
                        <span className="ml-2 text-sm text-amber-400"> - {categoria.descricao}</span>
                      )}
                    </>
                  );
                })()}
              </h2>
            </div>
          )}
          
          {/* Lista de produtos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 md:px-0">
            {getProdutosPorCategoria(categoriaAtiva).map(produto => (
              <div 
                key={produto.id} 
                className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-md transition-transform hover:scale-[1.02]"
                onClick={() => {
                  const item = carrinho.find(item => item.produto_id === produto.id);
                  if (item) {
                    atualizarQuantidade(produto.id!, item.quantidade + 1); // Aumenta a quantidade se já estiver no carrinho
                  } else {
                    setCarrinho([...carrinho, {
                      produto_id: produto.id!,
                      quantidade: 1,
                      produto
                    }]); // Adiciona o produto ao carrinho
                  }
                }}
              >
                <div className="flex flex-row items-center gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white">{produto.nome}</h3>
                    
                    {produto && 'descricao' in produto && produto['descricao'] && (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                        {produto['descricao']}
                      </p>
                    )}
                    
                    <div className="mt-3">
                      <p className="text-lg font-bold text-amber-500">{formatarPreco(produto.preco)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {produto.imagem_url && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <div className="h-full w-full overflow-hidden rounded-md bg-slate-800 flex items-center justify-center relative">
                          <Image 
                            src={produto.imagem_url}
                            alt={produto.nome} 
                            fill
                            sizes="96px"
                            className="object-cover"
                            quality={80}
                            priority={false}
                            onError={(e) => {
                              console.error(`Erro ao carregar imagem para o produto ${produto.id}:`, produto.imagem_url);
                              const target = e.target as HTMLImageElement;
                              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' className='h-12 w-12 text-slate-500' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E";
                            }}
                            unoptimized={produto.imagem_url.startsWith('http://') || !produto.imagem_url.includes('meizizi.com.br')}
                          />
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const item = carrinho.find(item => item.produto_id === produto.id);
                        if (item) {
                          atualizarQuantidade(produto.id!, item.quantidade + 1); // Aumenta a quantidade
                        } else {
                          setCarrinho([...carrinho, {
                            produto_id: produto.id!,
                            quantidade: 1,
                            produto
                          }]); // Adiciona o produto ao carrinho
                        }
                      }}
                      className="rounded-full bg-amber-500 p-2 text-white hover:bg-amber-600 flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {getProdutosPorCategoria(categoriaAtiva).length === 0 && (
            <div className="mt-10 text-center">
              <p className="text-slate-400">Nenhum produto disponível nesta categoria</p>
            </div>
          )}
        </div>
        
        {/* Carrinho lateral - apenas para desktop */}
        <div className="hidden lg:block w-80 ml-4 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden sticky top-24">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
              <h3 className="text-white font-medium flex items-center">
                Pedido - Mesa {mesa.id}
                {carrinho.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {carrinho.reduce((total, item) => total + item.quantidade, 0)}
                  </span>
                )}
              </h3>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              {carrinho.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mt-4 text-slate-400">Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="space-y-1 p-4">
                  {carrinho.map(item => (
                    <div key={item.produto_id} className="flex justify-between items-center text-sm text-white">
                      <span className="flex-1">{item.produto.nome}</span>
                      <span className="mr-2">{item.quantidade} x {formatarPreco(item.produto.preco)}</span>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                          className="rounded-full bg-slate-700 p-1 text-white hover:bg-slate-600 transition duration-200"
                          title="Reduzir quantidade"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => removerDoCarrinho(item.produto_id)}
                          className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600 transition duration-200"
                          title="Remover item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {carrinho.length > 0 && (
              <div className="border-t border-slate-800 p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-medium text-white">Total</p>
                  <p className="text-lg font-bold text-amber-500">{formatarPreco(calcularTotal())}</p>
                </div>
                
                <button 
                  onClick={enviarPedido}
                  disabled={enviandoPedido || carrinho.length === 0}
                  className="w-full rounded-md bg-amber-500 py-3 px-4 text-center font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition duration-200"
                >
                  {enviandoPedido ? 'Enviando...' : 'Finalizar Pedido'}
                </button>
              </div>
            )}
          </div>
        </div>
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
                <div className="mt-3 h-48 w-full overflow-hidden rounded-md bg-slate-800 flex items-center justify-center relative">
                  {(() => {
                    try {
                      return (
                        <Image 
                          src={produtoModal.imagem_url}
                          alt={produtoModal.nome} 
                          fill
                          sizes="(max-width: 768px) 100vw, 500px"
                          className="object-cover"
                          quality={85}
                          priority={true}
                          onError={(e) => {
                            console.error(`Erro ao carregar imagem para o modal do produto ${produtoModal.id}:`, produtoModal.imagem_url);
                            const target = e.target as HTMLImageElement;
                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' className='h-12 w-12 text-slate-500' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E";
                          }}
                          unoptimized={produtoModal.imagem_url.startsWith('http://') || !produtoModal.imagem_url.includes('meizizi.com.br')}
                        />
                      );
                    } catch (error) {
                      console.error(`Erro ao renderizar imagem para o modal do produto ${produtoModal.id}:`, error);
                      return (
                        <div className="h-full w-full flex items-center justify-center bg-slate-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              
              {produtoModal && 'descricao' in produtoModal && produtoModal['descricao'] && (
                <p className="mt-3 text-sm text-slate-400">
                  {produtoModal['descricao']}
                </p>
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
          <div className="w-full max-h-[90vh] sm:max-h-[80vh] max-w-md rounded-t-lg bg-slate-900 shadow-xl sm:rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
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
            
            <div className="flex-1 overflow-y-auto p-4">
              {carrinho.length === 0 ? (
                <div className="py-8 text-center">
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
                <div className="space-y-3">
                  {carrinho.map(item => (
                    <div key={item.produto_id} className="rounded-md border border-slate-800 bg-slate-800/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{item.produto.nome}</p>
                          {item.produto && 'descricao' in item.produto && item.produto['descricao'] && (
                            <p className="text-xs text-slate-400 mt-1 mb-1">
                              {item.produto['descricao']}
                            </p>
                          )}
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
              )}
            </div>
            
            {carrinho.length > 0 && (
              <div className="border-t border-slate-800 p-4 bg-slate-900 sticky bottom-0">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-medium text-white">Total</p>
                  <p className="text-lg font-bold text-amber-500">{formatarPreco(calcularTotal())}</p>
                </div>
                
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
            )}
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
      
      {/* Modal para visualizar pedido atual */}
      {showPedidoModal && pedidoAtual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-75 sm:items-center">
          <div className="w-full max-h-[90vh] sm:max-h-[80vh] max-w-md rounded-t-lg bg-slate-900 shadow-xl sm:rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h3 className="text-lg font-medium text-white">Pedido Atual</h3>
              <button 
                onClick={() => setShowPedidoModal(false)}
                className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-300">Status:</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    pedidoAtual.status === StatusPedido.ABERTO ? 'bg-yellow-500/20 text-yellow-400' :
                    pedidoAtual.status === StatusPedido.EM_ANDAMENTO ? 'bg-blue-500/20 text-blue-400' :
                    pedidoAtual.status === StatusPedido.FINALIZADO ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {pedidoAtual.status === StatusPedido.ABERTO ? 'Pendente' :
                     pedidoAtual.status === StatusPedido.EM_ANDAMENTO ? 'Preparando' :
                     pedidoAtual.status === StatusPedido.FINALIZADO ? 'Pronto para entrega' :
                     pedidoAtual.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-slate-300">Número do pedido:</p>
                  <p className="text-white font-medium">{pedidoAtual.id}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-slate-300">Horário:</p>
                  <p className="text-white">{new Date(pedidoAtual.criado_em).toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
              
              <h4 className="font-medium text-white mb-2 mt-4">Itens do pedido:</h4>
              <div className="space-y-3">
                {pedidoAtual.itens.map((item, index) => (
                  <div key={index} className="rounded-md border border-slate-800 bg-slate-800/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {(() => {
                          // Buscar informações do produto na lista de produtos
                          const produtoEncontrado = produtos.find(p => p.id === item.produto_id);
                          
                          // Usar informações do produto se disponível
                          const nome = item.produto?.nome || produtoEncontrado?.nome || `Produto ${item.produto_id}`;
                          
                          // Verificar qual descrição está disponível
                          let descricao = '';
                          try {
                            if (item.produto && 'descricao' in item.produto) {
                              descricao = String(item.produto['descricao'] || '');
                            } else if (produtoEncontrado && 'descricao' in produtoEncontrado) {
                              descricao = String(produtoEncontrado['descricao'] || '');
                            }
                          } catch (e) {
                            console.error('Erro ao acessar descricao:', e);
                            descricao = '';
                          }
                          
                          const preco = item.produto?.preco || produtoEncontrado?.preco || 0;
                          
                          return (
                            <>
                              <p className="font-medium text-white">{nome}</p>
                              {descricao && (
                                <p className="text-xs text-slate-400 mt-1 mb-1">
                                  {descricao}
                                </p>
                              )}
                              <div className="mt-1 flex text-sm text-slate-400">
                                <p className="mr-4">Qtd: {item.quantidade}</p>
                                <p>Valor unitário: {formatarPreco(preco)}</p>
                              </div>
                              <p className="mt-1 text-sm text-amber-500">
                                Total: {formatarPreco(preco * item.quantidade)}
                              </p>
                              {item.observacoes && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Obs: {item.observacoes}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {pedidoAtual.observacao_geral && (
                <div className="mt-4">
                  <h4 className="font-medium text-white mb-2">Observações gerais:</h4>
                  <p className="text-slate-400 text-sm bg-slate-800/50 p-3 rounded-md border border-slate-800">
                    {pedidoAtual.observacao_geral}
                  </p>
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-800 p-4 bg-slate-900 sticky bottom-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-medium text-white">Total</p>
                <p className="text-lg font-bold text-amber-500">
                  {formatarPreco(
                    pedidoAtual.itens.reduce((total: number, item: { produto_id: string; quantidade: number; produto?: { preco: number } }) => {
                      // Encontrar o produto na lista de produtos
                      const produtoEncontrado = produtos.find(p => p.id === item.produto_id);
                      // Usar o preço do produto encontrado ou do item, ou zero como fallback
                      const preco = item.produto?.preco || produtoEncontrado?.preco || 0;
                      return total + (preco * item.quantidade);
                    }, 0)
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    setMetodoPagamentoSelecionado(null);
                    setShowPagamentoModal(true);
                    setShowPedidoModal(false);
                  }}
                  className="rounded-md bg-green-600 py-2 px-4 text-center font-medium text-white hover:bg-green-700"
                >
                  Pedir a Conta
                </button>
                <button 
                  onClick={() => setShowPedidoModal(false)}
                  className="rounded-md bg-slate-700 py-2 px-4 text-center font-medium text-white hover:bg-slate-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para seleção de método de pagamento */}
      {showPagamentoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-75 sm:items-center">
          <div className="w-full max-w-md rounded-t-lg bg-slate-900 shadow-xl sm:rounded-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Selecione o método de pagamento</h3>
              <button 
                onClick={() => setShowPagamentoModal(false)}
                className="rounded-full bg-slate-800 p-1 text-slate-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                {Object.values(MetodoPagamento).map((metodo) => (
                  <button
                    key={metodo}
                    onClick={() => setMetodoPagamentoSelecionado(metodo)}
                    className={`w-full p-3 rounded-md flex items-center justify-between ${
                      metodoPagamentoSelecionado === metodo 
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-400' 
                        : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
                    }`}
                  >
                    <span>{metodo.replace('_', ' ')}</span>
                    {metodoPagamentoSelecionado === metodo && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <button
                  onClick={confirmarPagamento}
                  disabled={!metodoPagamentoSelecionado}
                  className="w-full rounded-md bg-green-600 py-3 px-4 text-center font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Confirmar e Finalizar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Botões flutuantes para dispositivos móveis */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col space-y-2">
        {pedidoAtual && (
          <button
            onClick={() => {
              atualizarDados().then(() => setShowPedidoModal(true));
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 sm:hidden"
            aria-label="Ver pedido atual"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        )}
        
        <button
          onClick={() => setShowCarrinho(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600"
          aria-label="Ver carrinho"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {carrinho.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold">
              {carrinho.length}
            </span>
          )}
        </button>
      </div>
      
      {/* Mensagem de status do pedido (visível quando há pedido ativo) */}
      {pedidoStatus && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 text-center text-sm">
          <span className="text-amber-400">
            Status do pedido: <span className="font-medium">{pedidoStatus}</span>
          </span>
        </div>
      )}
      
      {/* Componente de mensagem */}
      {showMensagem && mensagem && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-md shadow-lg ${
          tipoMensagem === 'sucesso' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <div className="flex items-center">
            {tipoMensagem === 'sucesso' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="text-white">{mensagem}</p>
          </div>
        </div>
      )}
    </div>
  );
} 
