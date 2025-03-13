"use client";

import { useState } from "react";
import { 
  getPedidos, 
  getPedidoById, 
  createPedido, 
  updatePedido, 
  deletePedido,
  adicionarItemAoPedido,
  removerItemDoPedido,
  atualizarQuantidadeItem,
  atualizarStatusPedido,
  getPedidosPorMesa,
  getPedidosPorStatus,
  StatusPedido
} from '@/lib/pedido';

export default function TestePedidoPage() {
  const [endpoint, setEndpoint] = useState("");
  const [inputData, setInputData] = useState({
    id: "",
    mesa: "",
    itens: [{ item: "", quantidade: 1 }],
    observacoes: "",
    status: StatusPedido.ABERTO,
    itemId: "",
    quantidade: 1
  });
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputData({ ...inputData, [name]: value });
  };

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newItens = [...inputData.itens];
    newItens[index] = { ...newItens[index], [name]: value };
    setInputData({ ...inputData, itens: newItens });
  };

  const addItem = () => {
    setInputData({ ...inputData, itens: [...inputData.itens, { item: "", quantidade: 1 }] });
  };

  const removeItem = (index: number) => {
    const newItens = inputData.itens.filter((_, i) => i !== index);
    setInputData({ ...inputData, itens: newItens });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
  
    try {
      let result;
  
      switch (endpoint) {
        case "getPedidos":
          result = await getPedidos();
          break;
        
        case "getPedidoById":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          result = await getPedidoById(inputData.id);
          break;
        
        case "createPedido":
          if (!inputData.mesa) throw new Error("ID da mesa é obrigatório");
          if (inputData.itens.length === 0 || !inputData.itens[0].item) 
            throw new Error("Pelo menos um item válido é obrigatório");
          
          // Converter os itens para o formato esperado pelo backend
          const itensFormatados = inputData.itens.map(item => ({
            produto_id: item.item, // Convertendo 'item' para 'produto_id'
            quantidade: Number(item.quantidade),
            observacoes: "" // Campo opcional
          }));
          
          result = await createPedido({
            mesa_id: inputData.mesa, // Convertendo 'mesa' para 'mesa_id'
            itens: itensFormatados,
            observacao_geral: inputData.observacoes || undefined, // Convertendo 'observacoes' para 'observacao_geral'
            manual: false
          });
          break;
        
        case "updatePedido":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          
          const updateData: any = {};
          if (inputData.status) updateData.status = inputData.status;
          if (inputData.observacoes) updateData.observacao_geral = inputData.observacoes;
          
          result = await updatePedido(inputData.id, updateData);
          break;
        
        case "deletePedido":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          result = await deletePedido(inputData.id);
          break;
        
        case "adicionarItemAoPedido":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          if (!inputData.itemId) throw new Error("ID do item é obrigatório");
          if (!inputData.quantidade) throw new Error("Quantidade é obrigatória");
          
          result = await adicionarItemAoPedido(inputData.id, {
            produto_id: inputData.itemId, // Convertendo 'itemId' para 'produto_id'
            quantidade: Number(inputData.quantidade),
            observacoes: "" // Campo opcional
          });
          break;
        
        case "removerItemDoPedido":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          if (!inputData.itemId) throw new Error("ID do item é obrigatório");
          
          result = await removerItemDoPedido(inputData.id, inputData.itemId);
          break;
        
        case "atualizarQuantidadeItem":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          if (!inputData.itemId) throw new Error("ID do item é obrigatório");
          if (!inputData.quantidade) throw new Error("Quantidade é obrigatória");
          
          result = await atualizarQuantidadeItem(
            inputData.id, 
            inputData.itemId, 
            {
              quantidade: Number(inputData.quantidade),
              observacoes: "" // Campo opcional
            }
          );
          break;
        
        case "atualizarStatusPedido":
          if (!inputData.id) throw new Error("ID do pedido é obrigatório");
          if (!inputData.status) throw new Error("Status é obrigatório");
          
          result = await atualizarStatusPedido(inputData.id, inputData.status as StatusPedido);
          break;
        
        case "getPedidosPorMesa":
          if (!inputData.mesa) throw new Error("ID da mesa é obrigatório");
          
          result = await getPedidosPorMesa(inputData.mesa);
          break;
        
        case "getPedidosPorStatus":
          if (!inputData.status) throw new Error("Status é obrigatório");
          
          result = await getPedidosPorStatus(inputData.status as StatusPedido);
          break;
        
        default:
          throw new Error("Selecione um endpoint para testar");
      }
  
      // Adicionar um console.log para depuração
      console.log("Resposta recebida:", result);
      
      setResponse(result);
    } catch (err: any) {
      console.error("Erro completo:", err);
      
      // Tentar extrair mais informações do erro
      let errorMessage = err.message || "Ocorreu um erro ao chamar o endpoint";
      
      if (err.response) {
        console.error("Dados da resposta de erro:", err.response.data);
        errorMessage = `Erro ${err.response.status}: ${JSON.stringify(err.response.data)}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Função auxiliar para formatar a resposta de erro
  const formatarErroAPI = (err: any): string => {
    if (err.response && err.response.data) {
      // Tenta extrair a mensagem de erro do backend
      const { detail } = err.response.data;
      if (detail) {
        return `Erro ${err.response.status}: ${detail}`;
      }
      return `Erro ${err.response.status}: ${JSON.stringify(err.response.data)}`;
    }
    return err.message || "Erro desconhecido ao comunicar com o servidor";
  };

  // Função para validar os dados antes de enviar
  const validarDados = (): string | null => {
    switch (endpoint) {
      case "getPedidoById":
      case "updatePedido":
      case "deletePedido":
      case "adicionarItemAoPedido":
      case "removerItemDoPedido":
      case "atualizarQuantidadeItem":
      case "atualizarStatusPedido":
        if (!inputData.id.trim()) return "ID do pedido é obrigatório";
        break;
      
      case "createPedido":
        if (!inputData.mesa.trim()) return "ID da mesa é obrigatório";
        if (inputData.itens.length === 0 || !inputData.itens[0].item.trim()) 
          return "Pelo menos um item válido é obrigatório";
        break;
      
      case "getPedidosPorMesa":
        if (!inputData.mesa.trim()) return "ID da mesa é obrigatório";
        break;
      
      case "getPedidosPorStatus":
        if (!inputData.status) return "Status é obrigatório";
        break;
    }

    // Validações específicas para operações com itens
    if (["adicionarItemAoPedido", "removerItemDoPedido", "atualizarQuantidadeItem"].includes(endpoint)) {
      if (!inputData.itemId.trim()) return "ID do item é obrigatório";
      
      if (["adicionarItemAoPedido", "atualizarQuantidadeItem"].includes(endpoint)) {
        if (Number(inputData.quantidade) <= 0) return "Quantidade deve ser maior que zero";
      }
    }

    return null;
  };

  return (
    <div className="container mx-auto p-4 bg-slate-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6 text-slate-100">Teste de Endpoints de Pedido</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Selecione o Endpoint</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-slate-300">Endpoint</label>
              <select 
                className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              >
                <option value="">Selecione um endpoint</option>
                <option value="getPedidos">Listar Todos os Pedidos</option>
                <option value="getPedidoById">Buscar Pedido por ID</option>
                <option value="createPedido">Criar Pedido</option>
                <option value="updatePedido">Atualizar Pedido</option>
                <option value="deletePedido">Excluir Pedido</option>
                <option value="adicionarItemAoPedido">Adicionar Item ao Pedido</option>
                <option value="removerItemDoPedido">Remover Item do Pedido</option>
                <option value="atualizarQuantidadeItem">Atualizar Quantidade de Item</option>
                <option value="atualizarStatusPedido">Atualizar Status do Pedido</option>
                <option value="getPedidosPorMesa">Buscar Pedidos por Mesa</option>
                <option value="getPedidosPorStatus">Buscar Pedidos por Status</option>
              </select>
            </div>

            {endpoint && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-200">Parâmetros</h3>
                
                {["getPedidoById", "updatePedido", "deletePedido", "adicionarItemAoPedido", 
                  "removerItemDoPedido", "atualizarQuantidadeItem", "atualizarStatusPedido"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">ID do Pedido</label>
                    <input
                      type="text"
                      name="id"
                      value={inputData.id}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="ID do pedido"
                    />
                  </div>
                )}
                
                {["createPedido", "getPedidosPorMesa"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">ID da Mesa</label>
                    <input
                      type="text"
                      name="mesa"
                      value={inputData.mesa}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="ID da mesa"
                    />
                  </div>
                )}
                
                {["createPedido", "updatePedido"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Itens</label>
                    {inputData.itens.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          name="item"
                          value={item.item}
                          onChange={(e) => handleItemChange(index, e)}
                          className="w-1/2 p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                          placeholder="ID do item"
                        />
                        <input
                          type="number"
                          name="quantidade"
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(index, e)}
                          className="w-1/2 p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="px-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addItem}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Adicionar Item
                    </button>
                  </div>
                )}
                
                {["createPedido", "updatePedido"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Observações</label>
                    <textarea
                      name="observacoes"
                      value={inputData.observacoes}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="Observações do pedido"
                      rows={2}
                    />
                  </div>
                )}
                
                {["updatePedido", "atualizarStatusPedido", "getPedidosPorStatus"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Status</label>
                    <select
                      name="status"
                      value={inputData.status}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value={StatusPedido.ABERTO}>ABERTO</option>
                      <option value={StatusPedido.EM_ANDAMENTO}>EM ANDAMENTO</option>
                      <option value={StatusPedido.FINALIZADO}>FINALIZADO</option>
                      <option value={StatusPedido.CANCELADO}>CANCELADO</option>
                    </select>
                  </div>
                )}
                
                {["adicionarItemAoPedido", "removerItemDoPedido", "atualizarQuantidadeItem"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">ID do Item</label>
                    <input
                      type="text"
                      name="itemId"
                      value={inputData.itemId}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                      placeholder="ID do item"
                    />
                  </div>
                )}
                
                {["adicionarItemAoPedido", "atualizarQuantidadeItem"].includes(endpoint) && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Quantidade</label>
                    <input
                      type="number"
                      name="quantidade"
                      value={inputData.quantidade}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md bg-slate-700 text-white border-slate-600 focus:border-amber-500 focus:ring-amber-500"
                      min="1"
                    />
                  </div>
                )}
              </div>
            )}
            
            <button
              type="submit"
              disabled={!endpoint || loading}
              className="mt-6 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed"
            >
              {loading ? "Executando..." : "Executar"}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-slate-200">Resposta</h2>
          
          {loading && <p className="text-slate-400">Carregando...</p>}
          
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-md text-red-300 mb-4">
              <p className="font-medium">Erro:</p>
              <p>{error}</p>
            </div>
          )}
          
          {response && (
            <div className="overflow-auto max-h-[500px]">
              <pre className="bg-slate-700 p-4 rounded-md text-slate-200 whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}