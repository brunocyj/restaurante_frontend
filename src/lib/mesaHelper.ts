import { getMesaById, updateMesa, MesaStatus, getMesas } from '@/lib/mesa';
import { getPedidosPorMesa, StatusPedido, Pedido, getPedidos } from '@/lib/pedido';

/**
 * Verifica se existem pedidos ativos (ABERTO ou EM ANDAMENTO) para uma mesa
 * e atualiza o status da mesa conforme apropriado:
 * - Se existirem pedidos ativos: status = OCUPADA
 * - Se não existirem pedidos ativos: status = LIVRE
 * 
 * @param mesaId ID da mesa a ser verificada
 * @returns Promise<boolean> true se o status foi alterado, false caso contrário
 */
export const verificarEAtualizarStatusMesa = async (mesaId: string): Promise<boolean> => {
  try {
    // Obter a mesa atual
    const mesa = await getMesaById(mesaId);
    
    // Se a mesa estiver em manutenção ou reservada, não alterar o status
    if (mesa.status === MesaStatus.MANUTENCAO || mesa.status === MesaStatus.RESERVADA) {
      return false;
    }
    
    // Buscar pedidos da mesa
    const pedidos = await getPedidosPorMesa(mesaId);
    
    // Verificar se existem pedidos ativos (ABERTO ou EM_ANDAMENTO)
    const existemPedidosAtivos = pedidos.some(
      (pedido: Pedido) => pedido.status === StatusPedido.ABERTO || pedido.status === StatusPedido.EM_ANDAMENTO
    );
    
    const novoStatus = existemPedidosAtivos ? MesaStatus.OCUPADA : MesaStatus.LIVRE;
    
    // Se o status atual for diferente do novo status calculado, atualizar a mesa
    if (mesa.status !== novoStatus) {
      await updateMesa(mesaId, { status: novoStatus });
      return true; // Status foi alterado
    }
    
    return false; // Nenhuma alteração foi necessária
  } catch (error) {
    console.error(`Erro ao verificar e atualizar status da mesa ${mesaId}:`, error);
    return false;
  }
};

/**
 * Atualiza o status de uma mesa para OCUPADA quando um novo pedido é criado
 * 
 * @param mesaId ID da mesa onde o pedido foi criado
 */
export const marcarMesaComoOcupada = async (mesaId: string): Promise<void> => {
  try {
    const mesa = await getMesaById(mesaId);
    
    // Se a mesa não estiver em manutenção ou reservada, atualizar para ocupada
    if (mesa.status !== MesaStatus.MANUTENCAO && mesa.status !== MesaStatus.RESERVADA) {
      await updateMesa(mesaId, { status: MesaStatus.OCUPADA });
    }
  } catch (error) {
    console.error(`Erro ao marcar mesa ${mesaId} como ocupada:`, error);
  }
};

/**
 * Verifica todas as mesas do sistema e atualiza seus status com base nos pedidos ativos
 * Implementação otimizada para evitar chamadas sequenciais para cada mesa
 * 
 * @param mesaIds Lista de IDs das mesas a serem verificadas
 * @returns Promise<number> Número de mesas que tiveram seu status alterado
 */
export const verificarTodasAsMesas = async (mesaIds: string[]): Promise<number> => {
  try {
    // 1. Obter todas as mesas em uma única chamada
    const todasMesas = await getMesas();
    const mesasFiltradas = mesaIds.length > 0 
      ? todasMesas.filter(mesa => mesaIds.includes(mesa.id))
      : todasMesas;
    
    // 2. Obter todos os pedidos ativos em uma única chamada
    const todosPedidos = await getPedidos();
    const pedidosAtivos = todosPedidos.filter(
      (pedido: Pedido) => pedido.status === StatusPedido.ABERTO || pedido.status === StatusPedido.EM_ANDAMENTO
    );

    // 3. Mapear quais mesas têm pedidos ativos
    const mesasComPedidosAtivos = new Set<string>();
    pedidosAtivos.forEach((pedido: Pedido) => mesasComPedidosAtivos.add(pedido.mesa_id));
    
    // 4. Atualizar as mesas que precisam ser atualizadas
    let mesasAtualizadas = 0;
    const atualizacoes = [];
    
    for (const mesa of mesasFiltradas) {
      // Não alterar mesas em manutenção ou reservadas
      if (mesa.status === MesaStatus.MANUTENCAO || mesa.status === MesaStatus.RESERVADA) {
        continue;
      }
      
      const temPedidoAtivo = mesasComPedidosAtivos.has(mesa.id);
      const novoStatus = temPedidoAtivo ? MesaStatus.OCUPADA : MesaStatus.LIVRE;
      
      // Se o status atual for diferente do novo status, atualizar a mesa
      if (mesa.status !== novoStatus) {
        atualizacoes.push(updateMesa(mesa.id, { status: novoStatus }));
        mesasAtualizadas++;
      }
    }
    
    // Executar todas as atualizações em paralelo
    if (atualizacoes.length > 0) {
      await Promise.all(atualizacoes);
    }
    
    return mesasAtualizadas;
  } catch (error) {
    console.error("Erro ao verificar todas as mesas:", error);
    return 0;
  }
}; 