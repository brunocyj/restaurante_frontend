'use client';

import { useState, useEffect, useRef } from 'react';
import { getPedidos, Pedido, StatusPedido } from '@/lib/pedido';
import { getMesas, Mesa } from '@/lib/mesa';
import { getProdutos, Produto, getCategorias, Categoria, getTiposCardapio, TipoCardapio } from '@/lib/cardapio';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ImpressaoPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tiposCardapio, setTiposCardapio] = useState<TipoCardapio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nomeRestaurante, setNomeRestaurante] = useState('美滋滋');
  const [endereco, setEndereco] = useState('RUA TAQUARI 934 MOOCA');
  const [modoImpressao, setModoImpressao] = useState<'completo' | 'sem-precos'>('completo');
  const [filtroRecentes, setFiltroRecentes] = useState<boolean>(false);
  const [pedidosVistos, setPedidosVistos] = useState<Set<string>>(new Set());
  const [atualizacaoAutomatica, setAtualizacaoAutomatica] = useState<boolean>(false);
  const [margemLateral, setMargemLateral] = useState<number>(3);
  const [imprimirCategoriasSeparadas, setImprimirCategoriasSeparadas] = useState<boolean>(false);
  
  const conteudoImpressaoRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [pedidosData, mesasData, produtosData, categoriasData, tiposCardapioData] = await Promise.all([
        getPedidos(),
        getMesas(),
        getProdutos(),
        getCategorias(),
        getTiposCardapio()
      ]);
      
      setPedidos(pedidosData || []);
      setMesas(mesasData || []);
      setProdutos(produtosData || []);
      setCategorias(categoriasData || []);
      setTiposCardapio(tiposCardapioData || []);
      setError(null);
      
      // Verificar se há um pedidoId na URL
      const pedidoIdParam = searchParams.get('pedidoId');
      const modoParam = searchParams.get('modo');
      
      if (modoParam === 'sem-precos') {
        setModoImpressao('sem-precos');
      } else if (modoParam === 'todas') {
        // Se o modo for 'todas', vamos imprimir todas as notas em sequência
        setTimeout(() => {
          const pedidoEncontrado = pedidosData.find((p: Pedido) => p.id === pedidoIdParam);
          if (pedidoEncontrado) {
            setPedidoSelecionado(pedidoEncontrado);
            imprimirTodasNotas();
          }
        }, 500);
      }
      
      if (pedidoIdParam) {
        const pedidoEncontrado = pedidosData.find((p: Pedido) => p.id === pedidoIdParam);
        if (pedidoEncontrado) {
          setPedidoSelecionado(pedidoEncontrado);
          // Se veio pela URL, imprimir automaticamente (exceto modo 'todas' que já é tratado acima)
          if (modoParam !== 'todas') {
            setTimeout(() => {
              enviarParaImpressao();
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Falha ao carregar os dados. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar novos pedidos periodicamente apenas se a atualização automática estiver ativada
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (atualizacaoAutomatica) {
      intervalId = setInterval(() => {
        fetchData();
      }, 30000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [atualizacaoAutomatica]);

  // Atualizar somente quando os parâmetros de URL mudam, não periodicamente
  useEffect(() => {
    fetchData();
  }, [searchParams]);

  // Filtrar pedidos recentes não vistos
  const filtrarPedidosRecentes = () => {
    const agora = new Date();
    const trintaMinutosAtras = new Date(agora.getTime() - 30 * 60 * 1000);
    
    return pedidos.filter(pedido => {
      const dataPedido = new Date(pedido.criado_em);
      return dataPedido > trintaMinutosAtras && !pedidosVistos.has(pedido.id);
    });
  };

  // Marcar um pedido como visto
  const marcarComoVisto = (pedidoId: string) => {
    setPedidosVistos(prev => new Set([...prev, pedidoId]));
  };

  const handlePedidoSelect = (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      setPedidoSelecionado(pedido);
      marcarComoVisto(pedidoId);
    }
  };

  const formatarData = (data: string | Date) => {
    // Criar objeto Date a partir do input
    const dataObj = new Date(data);
    
    // Converter para horário de Brasília (UTC-3)
    return dataObj.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo' // Forçar fuso horário brasileiro
    });
  };

  const formatarPreco = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getNomeProduto = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const getDescricaoProduto = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.descricao || '';
  };

  const getMesaNome = (mesaId: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    return mesa ? `Mesa ${mesa.id}` : mesaId;
  };

  const alinharDireita = (texto: string, largura: number): string => {
    return ' '.repeat(Math.max(0, largura - texto.length)) + texto;
  };

  // Função para agrupar itens por categorias e separar por tipos mais específicos
  const agruparItensPorCozinha = (itens: any[]) => {
    // Estrutura para armazenar os grupos
    const grupos: { 
      [key: string]: { 
        nome: string; 
        ordem: number;
        itens: any[]; 
      } 
    } = {};

    // Definir grupos mais específicos baseados nas abas principais do cardápio
    const GRUPO_HOTPOT = 'hotpot';
    const GRUPO_ESPETOS = 'espetos';
    const GRUPO_PRATOS = 'pratos';
    const GRUPO_BEBIDAS = 'bebidas';
    const GRUPO_SOBREMESAS = 'sobremesas';

    // Inicializar grupos
    grupos[GRUPO_HOTPOT] = { nome: '---------HOTPOT---------', ordem: 10, itens: [] };
    grupos[GRUPO_ESPETOS] = { nome: '---------ESPETOS---------', ordem: 20, itens: [] };
    grupos[GRUPO_PRATOS] = { nome: '---------PRATOS---------', ordem: 30, itens: [] };
    grupos[GRUPO_BEBIDAS] = { nome: '---------BEBIDAS---------', ordem: 40, itens: [] };
    grupos[GRUPO_SOBREMESAS] = { nome: '---------SOBREMESAS---------', ordem: 50, itens: [] };

    // Para cada item do pedido
    itens.forEach(item => {
      // Encontrar o produto
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) {
        grupos[GRUPO_PRATOS].itens.push(item);
        return;
      }

      // Encontrar a categoria do produto
      const categoria = categorias.find(c => c.id === produto.categoria_id);
      if (!categoria) {
        grupos[GRUPO_PRATOS].itens.push(item);
        return;
      }

      // Encontrar o tipo de cardápio
      const tipoCardapio = tiposCardapio.find(t => t.id === categoria.tipo_cardapio_id);
      const tipoNome = tipoCardapio?.nome?.toLowerCase() || '';
      const categoriaNome = categoria.nome.toLowerCase();

      // Determinar o grupo baseado no tipo e categoria
      if (tipoNome.includes('bebida') || categoriaNome.includes('bebida') || categoriaNome.includes('drink')) {
        grupos[GRUPO_BEBIDAS].itens.push(item);
      } 
      else if (tipoNome.includes('sobremesa') || categoriaNome.includes('sobremesa') || categoriaNome.includes('doce')) {
        grupos[GRUPO_SOBREMESAS].itens.push(item);
      }
      else if (tipoNome.includes('hotpot') || categoriaNome.includes('hotpot')) {
        grupos[GRUPO_HOTPOT].itens.push(item);
      }
      else if (categoriaNome.includes('炸串') || categoriaNome.includes('烤串肉类')) {
        grupos[GRUPO_ESPETOS].itens.push(item);
      }
      else {
        // Todos os outros itens (incluindo pratos especiais e normais) vão para PRATOS
        grupos[GRUPO_PRATOS].itens.push(item);
      }
    });

    // Converter em array e ordenar por ordem
    return Object.values(grupos)
      .filter(grupo => grupo.itens.length > 0) // Remover grupos vazios
      .sort((a, b) => a.ordem - b.ordem);
  };

  // Função para alinhar centralmente o texto (com margem configurável)
  const centralizarTexto = (texto: string, larguraMaxima: number): string => {
    const margem = margemLateral;
    const larguraDisponivel = larguraMaxima - (margem * 2);
    const espacosEsquerda = Math.max(0, Math.floor((larguraDisponivel - texto.length) / 2)) + margem;
    return ' '.repeat(espacosEsquerda) + texto + ' '.repeat(Math.max(0, larguraMaxima - texto.length - espacosEsquerda));
  };

  // Função para calcular desconto quando pagamento for em dinheiro
  const calcularDescontoDinheiro = (valor: number) => {
    if (pedidoSelecionado?.metodo_pagamento === 'DINHEIRO') {
      return valor * 0.95; // 5% de desconto
    }
    return valor;
  };

  // Modificar o método enviarParaImpressao para usar as novas configurações
  const enviarParaImpressao = () => {
    if (!pedidoSelecionado) return;

    // Criar conteúdo para impressora térmica
    // Formatando para impressora térmica que recebe texto puro
    const criarConteudoTermico = (categoriaSelecionada?: string) => {
      const linhas: Array<{text: string, className?: string}> = [];
      // Largura padrão para impressoras térmicas de 80mm (reduzida para centralizar mais)
      const larguraMaxima = 42; 
      
      // Centralizar texto com margem configurável
      const centralizar = (texto: string) => {
        return centralizarTexto(texto, larguraMaxima);
      };
      
      // Título
      linhas.push({text: centralizar(nomeRestaurante)});
      linhas.push({text: centralizar(endereco)});
      linhas.push({text: centralizar('-'.repeat(larguraMaxima - (margemLateral * 2)))});
      
      // Informações do pedido
      const mesaNome = getMesaNome(pedidoSelecionado.mesa_id);
      const infoPedido = `Pedido: #${pedidoSelecionado.id.substring(0, 8)}`;
      const infoData = `Data: ${formatarData(pedidoSelecionado.criado_em).split(' ')[0]}`;
      const infoHora = `Hora: ${formatarData(pedidoSelecionado.criado_em).split(' ')[1]}`;
      
      // A linha da mesa tem classe especial para destacar
      linhas.push({text: ' '.repeat(margemLateral) + `MESA: ${mesaNome}`, className: 'mesa-destaque'});
      linhas.push({text: ' '.repeat(margemLateral) + infoPedido});
      linhas.push({text: ' '.repeat(margemLateral) + infoData});
      linhas.push({text: ' '.repeat(margemLateral) + infoHora});
      linhas.push({text: centralizar('-'.repeat(larguraMaxima - (margemLateral * 2)))});
      
      // Cabeçalho de itens - ajustar com base no modo de impressão
      if (modoImpressao === 'completo') {
        linhas.push({text: ' '.repeat(margemLateral) + 'QTD NOME                           VALOR'});
      } else {
        linhas.push({text: ' '.repeat(margemLateral) + 'QTD NOME'});
      }
      
      // Definição explícita da largura de cada coluna em caracteres (ajustadas para considerar a margem)
      const LARGURA_TOTAL = modoImpressao === 'completo' ? 35 - margemLateral : 38 - margemLateral;
      const LARGURA_QTD = 3;
      const LARGURA_VALOR = modoImpressao === 'completo' ? 7 : 0;
      const LARGURA_DESCRICAO = LARGURA_TOTAL - LARGURA_QTD - LARGURA_VALOR;
      
      // Todos os itens do pedido serão impressos
      let itensParaImprimir = pedidoSelecionado.itens;
      
      // Agrupar itens por categoria antes de imprimir
      const gruposDeItens = agruparItensPorCozinha(itensParaImprimir);
      
      // Se estamos imprimindo uma categoria específica, filtrar apenas ela
      const gruposParaImprimir = categoriaSelecionada 
        ? gruposDeItens.filter(grupo => grupo.nome.includes(categoriaSelecionada))
        : gruposDeItens;
      
      // Iterar sobre cada grupo
      gruposParaImprimir.forEach((grupo: { nome: string; itens: any[] }, grupoIndex: number) => {
        // Título do grupo
        linhas.push({text: centralizar('-'.repeat(larguraMaxima - (margemLateral * 2)))});
        linhas.push({text: centralizar(grupo.nome)});
        linhas.push({text: centralizar('-'.repeat(larguraMaxima - (margemLateral * 2)))});
        
        // Itens deste grupo
        grupo.itens.forEach((item: any) => {
          const nome = getNomeProduto(item.produto_id);
          const descricao = getDescricaoProduto(item.produto_id);
          const valorTotal = (item.preco_unitario || 0) * item.quantidade;
          const valorFormatado = formatarPreco(valorTotal);
          
          // Largura efetiva para o nome (pode ser um pouco maior para compensar visualmente)
          const larguraEfetivaNome = LARGURA_DESCRICAO - 2; // -2 para dar um espaço visual entre nome e valor
          
          // Linha principal do item
          const qtdStr = item.quantidade.toString().padEnd(LARGURA_QTD);
          const nomesTruncado = nome.length > larguraEfetivaNome ? nome.substring(0, larguraEfetivaNome - 3) + '...' : nome.padEnd(larguraEfetivaNome);
          
          if (modoImpressao === 'completo') {
            // Versão com preço
            const valorStr = alinharDireita(valorFormatado, LARGURA_VALOR);
            linhas.push({text: ' '.repeat(margemLateral) + qtdStr + nomesTruncado.padEnd(larguraEfetivaNome) + '  ' + valorStr});
          } else {
            // Versão sem preço (para cozinha)
            linhas.push({text: ' '.repeat(margemLateral) + qtdStr + " " + nomesTruncado});
          }
          
          // Descrição e observações em linhas separadas com recuo
          if (descricao) {
            // Centralizar a descrição do produto
            const espacoDisponivel = larguraMaxima - 6; // 6 para dar margem de segurança
            
            // Se o texto for maior que o espaço, truncar com reticências
            const descAjustada = descricao.length > espacoDisponivel 
              ? descricao.substring(0, espacoDisponivel - 3) + '...' 
              : descricao;
            
            // Usar a função de centralizar para posicionar o texto
            linhas.push({text: centralizar(descAjustada)});
          }
          
          if (item.observacoes) {
            // Centralizar as observações para evitar corte nas laterais
            const obsTexto = `Obs: ${item.observacoes}`;
            // Calcular espaço disponível depois de considerar a margem
            const espacoDisponivel = larguraMaxima - 6; // 6 para dar mais margem de segurança
            
            // Se o texto for maior que o espaço, truncar com reticências
            const obsAjustada = obsTexto.length > espacoDisponivel 
              ? obsTexto.substring(0, espacoDisponivel - 3) + '...' 
              : obsTexto;
            
            // Usar a função de centralizar para posicionar o texto
            linhas.push({text: centralizar(obsAjustada)});
          }
        });
        
        // Se não for o último grupo e não estamos imprimindo uma categoria específica
        // Adicionar comando de corte de papel
        if (!categoriaSelecionada && grupoIndex < gruposParaImprimir.length - 1) {
          linhas.push({text: '\n\n\n\x1D\x56\x41\x0A'});
        }
      });
      
      linhas.push({text: centralizar('-'.repeat(larguraMaxima - (margemLateral * 2)))});
      
      // Total (apenas no modo completo)
      if (modoImpressao === 'completo') {
        const valorTotal = pedidoSelecionado.valor_total;
        const valorComDesconto = calcularDescontoDinheiro(valorTotal);
        
        if (pedidoSelecionado.metodo_pagamento === 'DINHEIRO') {
          linhas.push({text: ' '.repeat(margemLateral) + `Subtotal: R$ ${formatarPreco(valorTotal)}`});
          linhas.push({text: ' '.repeat(margemLateral) + 'Desconto: 5% (Pagamento em Dinheiro)'});
          linhas.push({text: ' '.repeat(margemLateral) + `TOTAL: R$ ${formatarPreco(valorComDesconto)}`});
        } else {
          linhas.push({text: ' '.repeat(margemLateral) + `TOTAL: R$ ${formatarPreco(valorTotal)}`});
        }
      } else if (modoImpressao === 'sem-precos') {
        linhas.push({text: centralizar("*** COMANDA SEM PREÇOS ***")});
      }
      
      // Método de pagamento
      if (modoImpressao === 'completo' && pedidoSelecionado.metodo_pagamento) {
        linhas.push({text: ''});
        linhas.push({text: ' '.repeat(margemLateral) + `Forma de Pagamento: ${pedidoSelecionado.metodo_pagamento.replace('_', ' ')}`});
      }
      
      // Observação geral
      if (pedidoSelecionado.observacao_geral) {
        linhas.push({text: ''});
        linhas.push({text: centralizar('--- OBSERVAÇÕES ---')});
        
        // Dividir as observações gerais em linhas para melhor visualização
        const observacoes = pedidoSelecionado.observacao_geral.split('\n');
        observacoes.forEach(obs => {
          if (obs.trim()) {
            let obsRestante = obs.trim();
            // Quebrar texto longo em várias linhas
            while (obsRestante.length > 0) {
              const tamanhoLinha = Math.min(larguraMaxima - (margemLateral * 2), obsRestante.length);
              const parteObs = obsRestante.substring(0, tamanhoLinha);
              // Usar a função de centralizar para posicionar o texto
              linhas.push({text: centralizar(parteObs)});
              obsRestante = obsRestante.substring(tamanhoLinha);
            }
          }
        });
      }
      
      // Finalização
      linhas.push({text: ''});
      linhas.push({text: '\n\n\n'}); // Espaço para corte do papel
      
      return linhas;
    };
    
    // Imprimir todas as categorias em impressões separadas ou tudo junto
    if (imprimirCategoriasSeparadas) {
      // Obter todos os grupos para imprimir cada um separadamente
      const gruposDeItens = agruparItensPorCozinha(pedidoSelecionado.itens);
      
      // Criar um loop para imprimir cada categoria
      const imprimirProximaCategoria = (indice = 0) => {
        if (indice >= gruposDeItens.length) return;
        
        const grupo = gruposDeItens[indice];
        const categoriaNome = grupo.nome;
        
        // Preparar conteúdo para impressão em HTML
        const conteudoHTML = document.createElement('div');
        conteudoHTML.style.fontFamily = 'monospace';
        conteudoHTML.style.whiteSpace = 'pre';
        conteudoHTML.style.margin = '0';
        conteudoHTML.style.padding = '0';
        
        // Criar o HTML com as linhas formatadas
        const linhasConteudo = criarConteudoTermico(categoriaNome);
        linhasConteudo.forEach(linha => {
          const linhaElement = document.createElement('div');
          linhaElement.textContent = linha.text;
          if (linha.className) {
            linhaElement.className = linha.className;
          }
          conteudoHTML.appendChild(linhaElement);
        });
        
        // Criar um iframe para impressão
        const iframeImpressao = document.createElement('iframe');
        iframeImpressao.style.display = 'none';
        document.body.appendChild(iframeImpressao);
        
        // Configurar o conteúdo do iframe
        const doc = iframeImpressao.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write('<html><head><title>Impressão Térmica</title>');
          doc.write('<style>');
          doc.write(`
            @page {
              size: 80mm auto;  /* Largura fixa de 80mm para impressora térmica */
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
            pre {
              font-family: monospace;
              font-size: ${modoImpressao === 'sem-precos' ? '9pt' : '9pt'} !important;
              font-weight: ${modoImpressao === 'sem-precos' ? 'bold' : 'normal'};
              white-space: pre;
              margin: 0;
              padding: 1mm;
            }
            .mesa-destaque {
              font-size: 14pt !important;
              font-weight: bold !important;
            }
          `);
          doc.write('</style></head><body>');
          doc.write(conteudoHTML.outerHTML);
          doc.write('</body></html>');
          doc.close();
          
          // Aguardar carregamento do iframe antes de imprimir
          iframeImpressao.onload = function() {
            try {
              // Abre o diálogo de impressão do Windows
              iframeImpressao.contentWindow?.print();
              
              // Remover o iframe após um tempo
              setTimeout(function() {
                document.body.removeChild(iframeImpressao);
                
                // Imprimir próxima categoria
                imprimirProximaCategoria(indice + 1);
              }, 1500);
            } catch (error) {
              console.error('Erro ao imprimir:', error);
              alert('Erro ao abrir o diálogo de impressão. Verifique as configurações do seu navegador.');
              document.body.removeChild(iframeImpressao);
            }
          };
        }
      };
      
      // Iniciar impressão da primeira categoria
      imprimirProximaCategoria();
    } else {
      // Impressão normal (todos os itens juntos)
      // Preparar conteúdo para impressão em HTML
      const conteudoHTML = document.createElement('div');
      conteudoHTML.style.fontFamily = 'monospace';
      conteudoHTML.style.whiteSpace = 'pre';
      conteudoHTML.style.margin = '0';
      conteudoHTML.style.padding = '0';
      
      // Criar o HTML com as linhas formatadas
      const linhasConteudo = criarConteudoTermico();
      linhasConteudo.forEach(linha => {
        const linhaElement = document.createElement('div');
        linhaElement.textContent = linha.text;
        if (linha.className) {
          linhaElement.className = linha.className;
        }
        conteudoHTML.appendChild(linhaElement);
      });
      
      // Criar um iframe para impressão
      const iframeImpressao = document.createElement('iframe');
      iframeImpressao.style.display = 'none';
      document.body.appendChild(iframeImpressao);
      
      // Configurar o conteúdo do iframe
      const doc = iframeImpressao.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write('<html><head><title>Impressão Térmica</title>');
        doc.write('<style>');
        doc.write(`
          @page {
            size: 80mm auto;  /* Largura fixa de 80mm para impressora térmica */
            margin: 0mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          pre {
            font-family: monospace;
            font-size: ${modoImpressao === 'sem-precos' ? '9pt' : '9pt'} !important;
            font-weight: ${modoImpressao === 'sem-precos' ? 'bold' : 'normal'};
            white-space: pre;
            margin: 0;
            padding: 1mm;
          }
          .mesa-destaque {
            font-size: 14pt !important;
            font-weight: bold !important;
          }
        `);
        doc.write('</style></head><body>');
        doc.write(conteudoHTML.outerHTML);
        doc.write('</body></html>');
        doc.close();
        
        // Aguardar carregamento do iframe antes de imprimir
        iframeImpressao.onload = function() {
          try {
            // Abre o diálogo de impressão do Windows
            iframeImpressao.contentWindow?.print();
            
            // Remover o iframe após um tempo
            setTimeout(function() {
              document.body.removeChild(iframeImpressao);
            }, 1000);
          } catch (error) {
            console.error('Erro ao imprimir:', error);
            alert('Erro ao abrir o diálogo de impressão. Verifique as configurações do seu navegador.');
            document.body.removeChild(iframeImpressao);
          }
        };
      }
    }
  };

  // Função para imprimir todas as notas necessárias
  const imprimirTodasNotas = () => {
    if (!pedidoSelecionado) return;
    
    // Salvar modo atual
    const modoAtual = modoImpressao;
    
    // Imprimir nota completa com preços
    setModoImpressao('completo');
    setTimeout(() => {
      enviarParaImpressao();
      
      // Imprimir nota sem preços
      setModoImpressao('sem-precos');
      setTimeout(() => {
        enviarParaImpressao();
        
        // Restaurar modo original
        setModoImpressao(modoAtual);
        
        // Notificar que a impressão foi concluída
        const notificationDiv = document.createElement('div');
        notificationDiv.textContent = 'Todas as notas foram enviadas para impressão!';
        notificationDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg';
        document.body.appendChild(notificationDiv);
        
        // Remover a notificação após 3 segundos
        setTimeout(() => {
          document.body.removeChild(notificationDiv);
        }, 3000);
      }, 1000);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
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
    <div className="max-w-6xl mx-auto p-4 bg-slate-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-center">Impressão de Pedidos</h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchData}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Atualizar Dados
          </button>
          <Link
            href="/admin"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Voltar para Admin
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Configurações</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nome do Restaurante
              </label>
              <input
                type="text"
                value={nomeRestaurante}
                onChange={(e) => setNomeRestaurante(e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Endereço
              </label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Modo de Impressão
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modo-impressao"
                    checked={modoImpressao === 'completo'}
                    onChange={() => setModoImpressao('completo')}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-600 bg-slate-700"
                  />
                  <span className="ml-2 text-sm text-slate-300">Completo (com preços)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="modo-impressao"
                    checked={modoImpressao === 'sem-precos'}
                    onChange={() => setModoImpressao('sem-precos')}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-600 bg-slate-700"
                  />
                  <span className="ml-2 text-sm text-slate-300">Completo (sem preços)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Configurações de Layout
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={imprimirCategoriasSeparadas}
                    onChange={(e) => setImprimirCategoriasSeparadas(e.target.checked)}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-600 bg-slate-700"
                  />
                  <span className="ml-2 text-sm text-slate-300">Imprimir cada categoria em uma impressão separada</span>
                </label>
                
                <div className="flex items-center mt-1">
                  <span className="text-sm text-slate-300 mr-2">Margem lateral:</span>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={margemLateral}
                    onChange={(e) => setMargemLateral(parseInt(e.target.value))}
                    className="w-24 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-slate-300 ml-2">{margemLateral}</span>
                </div>
                
                <div className="mt-1 p-2 bg-slate-700 rounded-md">
                  <p className="text-xs text-slate-300">
                    <span className="font-semibold">Nota:</span> Por padrão, a impressão inclui comandos de corte automático entre cada categoria. Se sua impressora não suportar esses comandos, ative a opção acima para imprimir cada categoria separadamente.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={atualizacaoAutomatica}
                  onChange={(e) => setAtualizacaoAutomatica(e.target.checked)}
                  className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-600 bg-slate-700"
                />
                <span className="text-sm text-slate-300">Atualização automática (a cada 30s)</span>
              </label>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Selecionar Pedido</h2>
          
          <div className="mb-4 flex items-center justify-between">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filtroRecentes}
                onChange={(e) => setFiltroRecentes(e.target.checked)}
                className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-slate-600 bg-slate-700"
              />
              <span className="ml-2 text-sm text-slate-300">Mostrar apenas pedidos recentes não vistos</span>
            </label>
            
            {filtroRecentes && filtrarPedidosRecentes().length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                {filtrarPedidosRecentes().length} novos
              </span>
            )}
          </div>
          
          {pedidos.length === 0 ? (
            <p className="text-slate-400">Nenhum pedido encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(filtroRecentes ? filtrarPedidosRecentes() : pedidos).map((pedido) => (
                <div
                  key={pedido.id}
                  className={`p-3 rounded-md cursor-pointer border ${
                    pedidoSelecionado?.id === pedido.id
                      ? 'border-amber-500 bg-slate-700'
                      : !pedidosVistos.has(pedido.id)
                        ? 'border-green-500 bg-green-900/20 hover:bg-slate-700'
                        : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                  }`}
                  onClick={() => handlePedidoSelect(pedido.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{getMesaNome(pedido.mesa_id)}</p>
                      <p className="text-sm text-slate-400">
                        {formatarData(pedido.criado_em)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-amber-500">
                        R$ {formatarPreco(pedido.valor_total)}
                      </p>
                      <p className={`text-xs ${pedido.status === StatusPedido.FINALIZADO ? 'text-green-400' : pedido.status === StatusPedido.CANCELADO ? 'text-red-400' : 'text-amber-400'}`}>
                        {pedido.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={enviarParaImpressao}
              disabled={!pedidoSelecionado}
              className={`py-2 rounded-md font-medium ${
                !pedidoSelecionado
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              {modoImpressao === 'completo' 
                ? 'Imprimir Comanda' 
                : 'Imprimir Sem Preços'}
            </button>
            
            <button
              onClick={imprimirTodasNotas}
              disabled={!pedidoSelecionado}
              className={`py-2 rounded-md font-medium ${
                !pedidoSelecionado
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-500'
              }`}
            >
              Imprimir Todas as Notas
            </button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg text-black">
          <h2 className="text-xl font-semibold mb-4 text-center">Visualização do Cupom</h2>
          
          {!pedidoSelecionado ? (
            <div className="text-center py-12 text-slate-500">
              <p>Selecione um pedido para visualizar o cupom</p>
            </div>
          ) : (
            <div className="font-mono text-sm">
              <div className="text-center">
                <p className="font-bold">{nomeRestaurante}</p>
                <p>{endereco}</p>
                {modoImpressao !== 'completo' && (
                  <p className="mt-2 font-bold text-xs bg-gray-200 py-1">
                    {modoImpressao === 'sem-precos' && "*** COMANDA SEM PREÇOS ***"}
                  </p>
                )}
                <div className="my-2 border-t border-b border-dashed border-gray-300 py-1"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p>Mesa: {getMesaNome(pedidoSelecionado.mesa_id)}</p>
                  <p>Pedido: #{pedidoSelecionado.id.substring(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p>Data: {formatarData(pedidoSelecionado.criado_em).split(' ')[0]}</p>
                  <p>Hora: {formatarData(pedidoSelecionado.criado_em).split(' ')[1]}</p>
                </div>
              </div>
              
              <div className="border-t border-b border-dashed border-gray-300 py-1 my-2"></div>
              
              {/* Determinar quais itens mostrar com base no modo de impressão */}
              {(() => {
                let itensParaVisualizar = pedidoSelecionado.itens;
                
                const gruposVisualizados = agruparItensPorCozinha(itensParaVisualizar);
                
                return gruposVisualizados.map((grupo: { nome: string; itens: any[] }, grupoIndex: number) => (
                  <div key={grupoIndex} className="mb-4">
                    <h3 className="font-bold text-center my-2 py-1 bg-gray-100">{grupo.nome}</h3>
                    
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs">
                          <th className="w-8">Qtd</th>
                          <th>Descrição</th>
                          {modoImpressao === 'completo' && (
                            <th className="text-right">Valor</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.itens.map((item: any, index: number) => {
                          const nome = getNomeProduto(item.produto_id);
                          const descricao = getDescricaoProduto(item.produto_id);
                          const valorUnitario = item.preco_unitario || 0;
                          const valorTotal = valorUnitario * item.quantidade;
                          
                          return (
                            <tr key={index} className="align-top">
                              <td className="pr-2">{item.quantidade}</td>
                              <td>
                                <div className="font-semibold">{nome}</div>
                                {descricao && (
                                  <div className="text-xs text-gray-600">{descricao}</div>
                                )}
                                {item.observacoes && (
                                  <div className="text-xs text-gray-500">Obs: {item.observacoes}</div>
                                )}
                              </td>
                              {modoImpressao === 'completo' && (
                                <td className="text-right">{formatarPreco(valorTotal)}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ));
              })()}
              
              <div className="border-t border-b border-dashed border-gray-300 py-1 my-2"></div>
              
              {modoImpressao === 'completo' && (
                <div className="flex flex-col font-bold">
                  {pedidoSelecionado?.metodo_pagamento === 'DINHEIRO' ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span>R$ {formatarPreco(pedidoSelecionado.valor_total)}</span>
                      </div>
                      <div className="flex justify-between text-green-600 text-sm">
                        <span>Desconto (5%)</span>
                        <span>- R$ {formatarPreco(pedidoSelecionado.valor_total * 0.05)}</span>
                      </div>
                      <div className="flex justify-between text-amber-500 mt-2 text-lg">
                        <span>TOTAL</span>
                        <span>R$ {formatarPreco(pedidoSelecionado.valor_total * 0.95)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-amber-500">
                      <span>TOTAL</span>
                      <span>R$ {formatarPreco(pedidoSelecionado.valor_total)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {pedidoSelecionado.observacao_geral && (
                <div className="mt-4 text-xs">
                  <p className="font-bold">Observações:</p>
                  <p>{pedidoSelecionado.observacao_geral}</p>
                </div>
              )}
            
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 