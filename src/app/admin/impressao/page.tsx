'use client';

import { useState, useEffect } from 'react';
import { getPedidos, Pedido, StatusPedido } from '@/lib/pedido';
import { getMesas, Mesa } from '@/lib/mesa';
import { getProdutos, Produto } from '@/lib/cardapio';
import Link from 'next/link';

export default function TesteImpressao() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nomeRestaurante, setNomeRestaurante] = useState('美滋滋烤串店');
  const [endereco, setEndereco] = useState('RUA TAQUARI 934 MOOCA');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [pedidosData, mesasData, produtosData] = await Promise.all([
        getPedidos(),
        getMesas(),
        getProdutos()
      ]);
      
      setPedidos(pedidosData || []);
      setMesas(mesasData || []);
      setProdutos(produtosData || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Falha ao carregar os dados. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePedidoSelect = (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      setPedidoSelecionado(pedido);
    }
  };

  const formatarData = (data: string | Date) => {
    return new Date(data).toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  const enviarParaImpressao = () => {
    if (!pedidoSelecionado) return;

    // Criar conteúdo para impressora térmica
    // Formatando para impressora térmica que recebe texto puro
    const criarConteudoTermico = () => {
      const linhas = [];
      const larguraMaxima = 42; // Caracteres por linha típicos para impressoras térmicas de 80mm
      
      // Centralizar texto
      const centralizar = (texto: string) => {
        const espacos = Math.max(0, Math.floor((larguraMaxima - texto.length) / 2));
        return ' '.repeat(espacos) + texto;
      };
      
      // Título
      linhas.push(centralizar(nomeRestaurante));
      linhas.push(centralizar(endereco));
      linhas.push('-'.repeat(larguraMaxima));
      
      // Informações do pedido
      linhas.push(`桌号: ${getMesaNome(pedidoSelecionado.mesa_id)}`);
      linhas.push(`流水号: #${pedidoSelecionado.id.substring(0, 8)}`);
      linhas.push(`Data: ${formatarData(pedidoSelecionado.criado_em).split(' ')[0]}`);
      linhas.push(`Hora: ${formatarData(pedidoSelecionado.criado_em).split(' ')[1]}`);
      linhas.push('-'.repeat(larguraMaxima));
      
      // Cabeçalho de itens
      linhas.push('QTD NOME                           VALOR');
      linhas.push('-'.repeat(larguraMaxima));
      
      // Definição explícita da largura de cada coluna em caracteres
      const LARGURA_TOTAL = 35;    // Caracteres por linha
      const LARGURA_QTD = 3;       // Espaço para quantidade
      const LARGURA_VALOR = 7;     // Reduzido de 10 para 7 (3 caracteres a menos à direita)
      const LARGURA_DESCRICAO = LARGURA_TOTAL - LARGURA_QTD - LARGURA_VALOR;
      
      // Itens
      pedidoSelecionado.itens.forEach(item => {
        const nome = getNomeProduto(item.produto_id);
        const descricao = getDescricaoProduto(item.produto_id);
        const valorTotal = (item.preco_unitario || 0) * item.quantidade;
        const valorFormatado = formatarPreco(valorTotal);
        
        // Largura efetiva para o nome (pode ser um pouco maior para compensar visualmente)
        const larguraEfetivaNome = LARGURA_DESCRICAO - 2; // -2 para dar um espaço visual entre nome e valor
        
        // Linha principal do item
        const qtdStr = item.quantidade.toString().padEnd(LARGURA_QTD);
        const nomesTruncado = nome.length > larguraEfetivaNome ? nome.substring(0, larguraEfetivaNome - 3) + '...' : nome.padEnd(larguraEfetivaNome);
        const valorStr = alinharDireita(valorFormatado, LARGURA_VALOR);
        
        // Combina os elementos com o espaçamento adequado
        linhas.push(qtdStr + nomesTruncado.padEnd(larguraEfetivaNome) + '  ' + valorStr);
        
        // Descrição e observações em linhas separadas com recuo
        if (descricao) {
          const descricaoFormatada = `  ${descricao}`;
          linhas.push(descricaoFormatada.length > larguraMaxima 
            ? descricaoFormatada.substring(0, larguraMaxima - 3) + '...' 
            : descricaoFormatada);
        }
        
        if (item.observacoes) {
          const obsFormatada = `  Obs: ${item.observacoes}`;
          linhas.push(obsFormatada.length > larguraMaxima 
            ? obsFormatada.substring(0, larguraMaxima - 3) + '...' 
            : obsFormatada);
        }
      });
      
      linhas.push('-'.repeat(larguraMaxima));
      
      // Total
      const totalStr = `TOTAL: R$ ${formatarPreco(pedidoSelecionado.valor_total)}`;
      linhas.push(totalStr.padStart(larguraMaxima));
      
      // Observação geral
      if (pedidoSelecionado.observacao_geral) {
        linhas.push('');
        linhas.push('Observações:');
        linhas.push(pedidoSelecionado.observacao_geral);
      }
      
      // Finalização
      linhas.push('');
      linhas.push('\n\n\n'); // Espaço para corte do papel
      
      return linhas.join('\n');
    };
    
    // Preparar conteúdo para impressão em HTML
    const conteudoHTML = document.createElement('pre');
    conteudoHTML.style.fontFamily = 'monospace';
    conteudoHTML.style.fontSize = '12px';
    conteudoHTML.style.whiteSpace = 'pre';
    conteudoHTML.style.margin = '0';
    conteudoHTML.style.padding = '0';
    conteudoHTML.textContent = criarConteudoTermico();
    
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
          font-size: 9pt;
          white-space: pre;
          margin: 0;
          padding: 1mm;
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
        <Link
          href="/admin"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Voltar para Admin
        </Link>
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
          
          </div>
          
          <h2 className="text-xl font-semibold mb-4">Selecionar Pedido</h2>
          
          {pedidos.length === 0 ? (
            <p className="text-slate-400">Nenhum pedido encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className={`p-3 rounded-md cursor-pointer border ${
                    pedidoSelecionado?.id === pedido.id
                      ? 'border-amber-500 bg-slate-700'
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
          
          <button
            onClick={enviarParaImpressao}
            disabled={!pedidoSelecionado}
            className={`mt-6 w-full py-2 rounded-md font-medium ${
              !pedidoSelecionado
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
          >
            Enviar para Impressão
          </button>
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
              
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="w-8">Qtd</th>
                    <th>Descrição</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidoSelecionado.itens.map((item, index) => {
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
                        <td className="text-right">{formatarPreco(valorTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="border-t border-b border-dashed border-gray-300 py-1 my-2"></div>
              
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>R$ {formatarPreco(pedidoSelecionado.valor_total)}</span>
              </div>
              
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