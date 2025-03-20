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

  // Renderizar item da notificação com detalhes do produto
  const renderItemComProduto = (item: ItemNotificacao) => {
    const produto = produtosCache[item.produto_id];
    
    return (
      <p>
        <span className="font-medium">{item.quantidade}x</span>{' '}
        {produto 
          ? <span className="text-white">{produto.nome}</span> 
          : <span className="text-slate-400">Produto {item.produto_id?.substring(0, 8)}</span>
        }
        {item.observacoes && (
          <span className="text-slate-400 ml-1">
            (Obs: {item.observacoes})
          </span>
        )}
      </p>
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
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
              <p className="text-blue-500 font-semibold">Itens Adicionados ao Pedido</p>
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