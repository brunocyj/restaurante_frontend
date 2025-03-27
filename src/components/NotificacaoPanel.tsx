'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getNotificacoes, 
  marcarNotificacaoComoLida, 
  removerNotificacao,
  TipoNotificacao,
  Notificacao,
  formatarDataNotificacao,
  ItemNotificacao,
  GrupoItensNotificacao
} from '@/lib/notificacao';
import { getProdutoById, Produto } from '@/lib/cardapio';
import { getMesaById, Mesa } from '@/lib/mesa';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProdutoCache {
  [id: string]: Produto;
}

interface MesaCache {
  [id: string]: Mesa;
}

export default function NotificacaoPanel() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<string[]>([]);
  const [produtosCache, setProdutosCache] = useState<ProdutoCache>({});
  const [mesasCache, setMesasCache] = useState<MesaCache>({});
  const router = useRouter();

  // Definir handleExpandNotification antes de usá-lo em outras funções
  const handleExpandNotification = useCallback((notificationId: string) => {
    setExpandedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  }, []);

  // Função para buscar detalhes do produto
  const fetchProdutoDetails = useCallback(async (produtoId: string) => {
    if (produtosCache[produtoId]) {
      return produtosCache[produtoId];
    }
    
    try {
      const produto = await getProdutoById(produtoId);
      setProdutosCache(prev => ({ ...prev, [produtoId]: produto }));
      return produto;
    } catch (error) {
      console.error(`Erro ao buscar detalhes do produto ${produtoId}:`, error);
      return null;
    }
  }, [produtosCache]);

  // Função para buscar detalhes da mesa
  const fetchMesaDetails = useCallback(async (mesaId: string) => {
    if (mesasCache[mesaId]) {
      return mesasCache[mesaId];
    }
    
    try {
      const mesa = await getMesaById(mesaId);
      setMesasCache(prev => ({ ...prev, [mesaId]: mesa }));
      return mesa;
    } catch (error) {
      console.error(`Erro ao buscar detalhes da mesa ${mesaId}:`, error);
      return null;
    }
  }, [mesasCache]);

  // Função para buscar detalhes adicionais quando expandir notificações
  const expandNotificationWithDetails = useCallback(async (notificacao: Notificacao) => {
    handleExpandNotification(notificacao.id);
    
    // Se for uma notificação de itens adicionados, buscar detalhes dos produtos
    if (notificacao.type === TipoNotificacao.ITEMS_ADICIONADOS && notificacao.items) {
      // Buscar detalhes dos produtos mencionados na notificação
      for (const grupo of notificacao.items) {
        if (grupo.items) {
          for (const item of grupo.items) {
            if (item.produto_id && !produtosCache[item.produto_id]) {
              try {
                const produto = await getProdutoById(item.produto_id);
                if (produto) {
                  console.log(`Produto carregado para notificação: ID=${item.produto_id}, Nome=${produto.nome}`);
                  setProdutosCache(prev => ({ ...prev, [item.produto_id]: produto }));
                } else {
                  console.error(`Produto não encontrado: ${item.produto_id}`);
                }
              } catch (error) {
                console.error(`Erro ao carregar produto ${item.produto_id}:`, error);
              }
            }
          }
        }
      }
    }
    
    // Buscar detalhes da mesa se houver mesa_id
    if (notificacao.content.mesa_id && !mesasCache[notificacao.content.mesa_id]) {
      await fetchMesaDetails(notificacao.content.mesa_id);
    }
  }, [fetchProdutoDetails, fetchMesaDetails, handleExpandNotification, produtosCache, mesasCache]);

  // Função para buscar notificações periodicamente
  useEffect(() => {
    const fetchNotificacoes = async () => {
      try {
        const data = await getNotificacoes();
        
        // Verificar se há notificações novas comparando com o estado atual
        if (notificacoes.length > 0 && data.length > notificacoes.length) {
          const novasNotificacoes = data.filter(
            n => !notificacoes.some(on => on.id === n.id)
          );
          
          // Tocar som para novas notificações
          if (novasNotificacoes.length > 0) {
            // Priorizar o som de chamada de atendente
            const chamadaAtendente = novasNotificacoes.find(
              n => n.type === TipoNotificacao.CHAMADA_ATENDENTE
            );
            
            // Carregar detalhes básicos das novas notificações
            for (const notificacao of novasNotificacoes) {
              // Buscar info da mesa
              if (notificacao.content.mesa_id) {
                fetchMesaDetails(notificacao.content.mesa_id);
              }
              
              // Pré-carregar informações de produtos para notificações de itens adicionados
              if (notificacao.type === TipoNotificacao.ITEMS_ADICIONADOS && notificacao.items) {
                for (const grupo of notificacao.items) {
                  if (grupo.items) {
                    for (const item of grupo.items) {
                      if (item.produto_id && !produtosCache[item.produto_id]) {
                        fetchProdutoDetails(item.produto_id).catch(error => 
                          console.error(`Erro ao pré-carregar produto ${item.produto_id}:`, error)
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        setNotificacoes(data);
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        toast.error('Erro ao carregar notificações');
      } finally {
        setLoading(false);
      }
    };

    // Buscar inicialmente e configurar o intervalo
    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 5000);

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, [notificacoes, fetchMesaDetails, fetchProdutoDetails]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await marcarNotificacaoComoLida(notificationId);
      if (success) {
        setNotificacoes(notificacoes.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
        toast.success('Notificação marcada como lida');
      } else {
        throw new Error('Falha ao marcar como lida');
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleRemoveNotification = async (notificationId: string) => {
    try {
      const success = await removerNotificacao(notificationId);
      if (success) {
        setNotificacoes(notificacoes.filter(n => n.id !== notificationId));
        toast.success('Notificação removida');
      } else {
        throw new Error('Falha ao remover notificação');
      }
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
      toast.error('Erro ao remover notificação');
    }
  };

  const navegarParaImpressao = (pedidoId: string | undefined, modo: string = 'cozinha-pratos') => {
    if (!pedidoId) {
      console.error('ID do pedido indefinido, não é possível navegar para impressão');
      toast.error('Erro ao imprimir: ID do pedido não encontrado');
      return;
    }
    router.push(`/admin/impressao?pedidoId=${pedidoId}&modo=${modo}`);
  };

  // Adicionar a função para imprimir todas as notas
  const imprimirTodasNotas = (pedidoId: string) => {
    // Navega para a página de impressão com um parâmetro especial
    router.push(`/admin/impressao?pedidoId=${pedidoId}&modo=todas`);
  };

  // Adicionar esta função após o handleRemoveNotification
  const imprimirItensNotificacao = (notificacao: Notificacao) => {
    // Extrair os itens da notificação
    const itensNotificacao = notificacao.items?.flatMap(grupo => 
      grupo.items?.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacoes: item.observacoes,
        // Adicionar outros dados necessários para a impressão
        preco_unitario: produtosCache[item.produto_id]?.preco || 0
      })) || []
    ) || [];

    if (itensNotificacao.length === 0) {
      toast.error("Não há itens para imprimir nesta notificação");
      return;
    }

    // Informações básicas
    const nomeRestaurante = '美滋滋烤肉 青岛';
    const endereco = 'RUA TAQUARI 934 MOOCA';
    const mesa = notificacao.content.mesa_id ? 
      `Mesa ${mesasCache[notificacao.content.mesa_id]?.id || notificacao.content.mesa_id}` : 
      'Mesa não identificada';
    const pedidoId = notificacao.content.pedido_id || '';
    
    // Criar conteúdo para impressão
    const criarConteudoTermico = () => {
      const linhas = [];
      const larguraMaxima = 42; // Largura padrão para impressoras térmicas de 80mm
      
      // Função para centralizar texto
      const centralizar = (texto: string) => {
        const espacos = Math.max(0, Math.floor((larguraMaxima - texto.length) / 2));
        return ' '.repeat(espacos) + texto;
      };
      
      // Cabeçalho
      linhas.push(centralizar(nomeRestaurante));
      linhas.push(centralizar(endereco));
      linhas.push('-'.repeat(larguraMaxima));
      
      // Informações do pedido
      linhas.push(`${mesa}`);
      if (pedidoId) linhas.push(`Pedido: #${pedidoId.substring(0, 8)}`);
      
      // Data e hora
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Sao_Paulo' // Fuso horário brasileiro
      });
      
      linhas.push(`Data/Hora: ${dataFormatada}`);
      linhas.push('-'.repeat(larguraMaxima));
      
      // Título da seção
      linhas.push(centralizar('*** NOVOS ITENS ADICIONADOS ***'));
      linhas.push('-'.repeat(larguraMaxima));
      
      // Itens
      linhas.push('QTD NOME');
      
      itensNotificacao.forEach(item => {
        const produto = produtosCache[item.produto_id];
        if (!produto) return;
        
        // Linha do item
        linhas.push(`${item.quantidade}x ${produto.nome}`);
        
        // Descrição do produto, se houver
        if (produto.descricao) {
          linhas.push(`  ${produto.descricao}`);
        }
        
        // Observação, se houver
        if (item.observacoes) {
          linhas.push(`  Obs: ${item.observacoes}`);
        }
      });
      
      linhas.push('-'.repeat(larguraMaxima));
      linhas.push(centralizar('*** PEDIDO PARA COZINHA ***'));
      linhas.push('\n\n\n'); // Espaço para corte
      
      return linhas.join('\n');
    };
    
    // Criar iframe para impressão
    const conteudo = criarConteudoTermico();
    const iframeImpressao = document.createElement('iframe');
    iframeImpressao.style.display = 'none';
    document.body.appendChild(iframeImpressao);
    
    const doc = iframeImpressao.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write('<html><head><title>Impressão Novos Itens</title>');
      doc.write('<style>');
      doc.write(`
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: monospace;
        }
        pre {
          font-family: monospace;
          font-size: 9pt;
          white-space: pre;
          margin: 0;
          padding: 1mm;
        }
      `);
      doc.write('</style></head><body>');
      doc.write(`<pre>${conteudo}</pre>`);
      doc.write('</body></html>');
      doc.close();
      
      // Imprimir e então remover o iframe
      iframeImpressao.onload = () => {
        try {
          iframeImpressao.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframeImpressao);
          }, 1000);
        } catch (error) {
          console.error('Erro ao imprimir:', error);
          document.body.removeChild(iframeImpressao);
          toast.error('Erro ao imprimir os itens');
        }
      };
    }
  };

  // Renderizar item da notificação com detalhes do produto
  const renderItemComProduto = (item: ItemNotificacao) => {
    const produto = produtosCache[item.produto_id];
    
    return (
      <div className="flex flex-col items-start ml-6 mt-1 mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-amber-400">{item.quantidade}x</span>
          <span className="font-semibold">{produto?.nome}</span>
          {produto?.descricao && (
            <span className="text-xs text-gray-600">({produto.descricao})</span>
          )}
        </div>
        {expandedNotifications.includes(item.produto_id) && item.observacoes && (
          <span className="text-xs text-gray-500">Obs: {item.observacoes}</span>
        )}
      </div>
    );
  };

  // Renderizar notificação com base no tipo
  const renderNotificacaoContent = (notificacao: Notificacao) => {
    const isExpanded = expandedNotifications.includes(notificacao.id);
    const mesa = notificacao.content.mesa_id ? mesasCache[notificacao.content.mesa_id] : null;
    
    switch (notificacao.type) {
      case TipoNotificacao.CHAMADA_ATENDENTE:
        return (
          <div className="flex flex-col">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
              <p className="text-red-500 font-semibold">Chamada de Atendente</p>
            </div>
            <p className="mt-1">
              {mesa 
                ? `Mesa ${mesa.id} chamou o atendente` 
                : notificacao.content.message
              }
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {formatarDataNotificacao(notificacao.created_at)}
            </p>
          </div>
        );
        
      case TipoNotificacao.ITEMS_ADICIONADOS:
        // Extrair todos os itens de produtos do formato aninhado
        const todosProdutos = notificacao.items?.flatMap(grupo => 
          grupo.items?.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            observacoes: item.observacoes
          })) || []
        ) || [];
        
        // Buscar detalhes dos produtos ao renderizar se ainda não tiverem sido carregados
        if (isExpanded) {
          todosProdutos.forEach(item => {
            if (item.produto_id && !produtosCache[item.produto_id]) {
              fetchProdutoDetails(item.produto_id);
            }
          });
        }
                
        return (
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                <p className="text-blue-500 font-semibold">Itens Adicionados ao Pedido</p>
              </div>
              
              {notificacao.content.pedido_id && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => imprimirItensNotificacao(notificacao)}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded"
                  >
                    Imprimir Novos Itens
                  </button>
                  <button 
                    onClick={() => navegarParaImpressao(notificacao.content.pedido_id, 'cozinha-pratos')}
                    className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Imprimir p/ Cozinha
                  </button>
                </div>
              )}
            </div>
            
            <p className="mt-1">
              {mesa 
                ? `${notificacao.count || todosProdutos.length || 'Novos'} itens adicionados ao pedido da Mesa ${mesa.id}` 
                : notificacao.content.message
              }
            </p>
            
            {isExpanded && todosProdutos.length > 0 && (
              <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-800">
                {todosProdutos.map((item, index) => (
                  <div key={index} className="text-sm">
                    {renderItemComProduto(item)}
                  </div>
                ))}
              </div>
            )}
            
            {!isExpanded && todosProdutos.length > 0 && (
              <button
                onClick={() => expandNotificationWithDetails(notificacao)}
                className="text-amber-500 text-sm mt-1 hover:text-amber-400"
              >
                Ver {todosProdutos.length} item(ns)
              </button>
            )}
            
            <p className="text-sm text-slate-400 mt-1">
              {formatarDataNotificacao(notificacao.created_at)}
            </p>
          </div>
        );
        
      case TipoNotificacao.PEDIDO_FINALIZADO:
        return (
          <div className="flex flex-col">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
              <p className="text-green-500 font-semibold">Pedido Finalizado</p>
            </div>
            <p className="mt-1">
              {mesa 
                ? `Mesa ${mesa.id} finalizou o pedido e pediu a conta` 
                : notificacao.content.message
              }
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {formatarDataNotificacao(notificacao.created_at)}
            </p>
          </div>
        );
        
      default:
        // Para notificações de novos pedidos (que podem não estar no enum)
        if (notificacao.type === 'new_order' || 
            notificacao.content.message?.includes('novo pedido')) {
          const pedidoId = notificacao.content.pedido_id || notificacao.entity_id;
          
          return (
            <div>
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Novo pedido da {mesa ? `Mesa ${mesa.id}` : 'mesa'}
                </div>
                {pedidoId && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => navegarParaImpressao(pedidoId, 'cozinha-pratos')}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-1"
                    >
                      Imprimir p/ Cozinha
                    </button>
                    <button 
                      onClick={() => imprimirTodasNotas(pedidoId)}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                    >
                      Imprimir Tudo
                    </button>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {formatarDataNotificacao(notificacao.created_at)}
              </div>
            </div>
          );
        }
        
        // Notificações de itens adicionados (formato alternativo)
        if (notificacao.type === 'items_added' || 
            notificacao.content.message?.includes('adicionados')) {
          const pedidoId = notificacao.content.pedido_id || notificacao.entity_id;
          
          return (
            <div>
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Itens adicionados ao pedido da {mesa ? `Mesa ${mesa.id}` : 'mesa'}
                </div>
                {pedidoId && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => imprimirItensNotificacao(notificacao)}
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded"
                    >
                      Imprimir Novos Itens
                    </button>
                    <button 
                      onClick={() => navegarParaImpressao(pedidoId, 'cozinha-pratos')}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Imprimir p/ Cozinha
                    </button>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 mb-2">
                {formatarDataNotificacao(notificacao.created_at)}
              </div>
            </div>
          );
        }
      
        // Fallback para qualquer outro tipo de notificação
        return (
          <div className="flex flex-col">
            <p>{notificacao.content.message}</p>
            <p className="text-sm text-slate-400 mt-1">
              {formatarDataNotificacao(notificacao.created_at)}
            </p>
          </div>
        );
    }
  };

  // Ordenar notificações: não lidas primeiro, depois por data
  const notificacoesOrdenadas = [...notificacoes].sort((a, b) => {
    // Primeiro por status de leitura
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }
    
    // Depois por data (mais recentes primeiro)
    return b.created_at - a.created_at;
  });

  // Se estiver carregando, mostrar indicador
  if (loading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-slate-800 rounded"></div>
          <div className="h-20 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Se não houver notificações, mostrar mensagem
  if (notificacoesOrdenadas.length === 0) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h2 className="text-lg font-medium text-white mb-4">Notificações</h2>
        <div className="py-4 text-center text-slate-400">
          <p>Nenhuma notificação no momento</p>
        </div>
      </div>
    );
  }

  // Renderizar lista de notificações
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <h2 className="text-lg font-medium text-white mb-4 flex items-center justify-between">
        <span>Notificações</span>
        {notificacoesOrdenadas.filter(n => !n.read).length > 0 && (
          <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            {notificacoesOrdenadas.filter(n => !n.read).length} não lida(s)
          </span>
        )}
      </h2>
      
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {notificacoesOrdenadas.map(notificacao => (
          <div 
            key={notificacao.id} 
            className={`rounded-lg border p-3 ${
              notificacao.read 
                ? 'border-slate-800 bg-slate-800/30' 
                : 'border-amber-800/50 bg-amber-900/20'
            }`}
          >
            {renderNotificacaoContent(notificacao)}
            
            <div className="flex justify-end mt-2 space-x-2">
              {!notificacao.read && (
                <button
                  onClick={() => handleMarkAsRead(notificacao.id)}
                  className="text-sm px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Marcar como lida
                </button>
              )}
              
              {expandedNotifications.includes(notificacao.id) && (
                <button
                  onClick={() => handleExpandNotification(notificacao.id)}
                  className="text-sm px-3 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Recolher
                </button>
              )}
              
              <button
                onClick={() => handleRemoveNotification(notificacao.id)}
                className="text-sm px-3 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 