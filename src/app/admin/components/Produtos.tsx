'use client';

import { useState, useEffect } from 'react';
import { 
    getProdutos as listarProdutos, 
    createProduto as criarProduto, 
    updateProduto as atualizarProduto, 
    deleteProduto as excluirProduto,
    getCategorias as listarCategorias,
    Produto,
    Categoria
} from '@/lib/cardapio';

export default function Produtos() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'criar' | 'editar'>('criar');
    const [currentProduto, setCurrentProduto] = useState<Partial<Produto>>({ 
        nome: '', 
        descricao: '', 
        preco: 0,
        ativo: true,
        imagem_url: '',
        categoria_id: ''
    });

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [produtosResponse, categoriasResponse] = await Promise.all([
                    listarProdutos(),
                    listarCategorias()
                ]);
                setProdutos(produtosResponse || []);
                setCategorias(categoriasResponse || []);
                setError(null);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                setError('Falha ao carregar os dados. Tente novamente mais tarde.');
                setProdutos([]);
                setCategorias([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleOpenCreateModal = () => {
        setCurrentProduto({ 
            nome: '', 
            descricao: '', 
            preco: 0,
            ativo: true,
            imagem_url: '',
            categoria_id: categorias.length > 0 ? categorias[0].id || '' : ''
        });
        setModalMode('criar');
        setShowModal(true);
    };

    const handleOpenEditModal = (produto: Produto) => {
        setCurrentProduto({ ...produto });
        setModalMode('editar');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setCurrentProduto(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'preco') {
            setCurrentProduto(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setCurrentProduto(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveProduto = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'criar') {
                const novoProduto = await criarProduto(currentProduto as Omit<Produto, 'id'>);
                setProdutos(prev => [...prev, novoProduto]);
            } else {
                const produtoAtualizado = await atualizarProduto(currentProduto.id!, currentProduto as Partial<Produto>);
                setProdutos(prev => 
                    prev.map(prod => prod.id === produtoAtualizado.id ? produtoAtualizado : prod)
                );
            }
            setShowModal(false);
        } catch (err) {
            console.error('Erro ao salvar produto:', err);
            setError('Falha ao salvar o produto. Tente novamente mais tarde.');
        }
    };

    const handleDeleteProduto = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await excluirProduto(id);
            setProdutos(prev => prev.filter(prod => prod.id !== id));
        } catch (err) {
            console.error('Erro ao excluir produto:', err);
            setError('Falha ao excluir o produto. Tente novamente mais tarde.');
        }
    };

    const formatarPreco = (preco: number) => {
        return preco.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
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
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-200">Produtos</h3>
            <button
              onClick={handleOpenCreateModal}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Adicionar Produto
            </button>
          </div>
          
          {produtos.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-8 text-center">
              <p className="text-slate-400">Nenhum produto cadastrado.</p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Adicionar Primeiro Produto
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
                          Nome
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Descrição
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Categoria
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Preço
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                      {produtos.map((produto) => (
                        <tr key={produto.id} className="hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                            {produto.nome}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {produto.descricao}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {categorias.find(c => c.id === produto.categoria_id)?.nome || 'Não encontrada'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {formatarPreco(produto.preco)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              produto.ativo 
                                ? 'bg-emerald-900/30 text-emerald-400' 
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                              {produto.ativo ? 'Disponível' : 'Indisponível'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                            <button 
                              onClick={() => handleOpenEditModal(produto)}
                              className="mr-3 text-amber-500 hover:text-amber-400"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => produto.id && handleDeleteProduto(produto.id)}
                              className="text-red-500 hover:text-red-400"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Layout de cards para telas pequenas */}
                  <div className="divide-y divide-slate-800 md:hidden">
                    {produtos.map((produto) => (
                      <div key={produto.id} className="block bg-slate-900 p-4 hover:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-white">{produto.nome}</h3>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            produto.ativo 
                              ? 'bg-emerald-900/30 text-emerald-400' 
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {produto.ativo ? 'Disponível' : 'Indisponível'}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-slate-300">
                          <p className="truncate">{produto.descricao}</p>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-300">
                          <div>
                            <span className="font-medium text-slate-400">Categoria:</span>
                            <p>{categorias.find(c => c.id === produto.categoria_id)?.nome || 'Não encontrada'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-400">Preço:</span>
                            <p>{formatarPreco(produto.preco)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end space-x-3">
                          <button 
                            onClick={() => handleOpenEditModal(produto)}
                            className="rounded-md bg-amber-600/20 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-600/30"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => produto.id && handleDeleteProduto(produto.id)}
                            className="rounded-md bg-red-600/20 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-600/30"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal de Criação/Edição */}
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
                      {modalMode === 'criar' ? 'Adicionar Produto' : 'Editar Produto'}
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
                    <form onSubmit={handleSaveProduto} id="produto-form" className="space-y-5">
                      <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-slate-300">
                          Nome
                        </label>
                        <input
                          type="text"
                          name="nome"
                          id="nome"
                          value={currentProduto.nome}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="categoria_id" className="block text-sm font-medium text-slate-300">
                          Categoria
                        </label>
                        <select
                          name="categoria_id"
                          id="categoria_id"
                          value={currentProduto.categoria_id}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        >
                          <option value="">Selecione uma categoria</option>
                          {categorias.map(categoria => (
                            <option key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-slate-300">
                          Descrição
                        </label>
                        <textarea
                          name="descricao"
                          id="descricao"
                          rows={3}
                          value={currentProduto.descricao}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="preco" className="block text-sm font-medium text-slate-300">
                            Preço (R$)
                          </label>
                          <input
                            type="number"
                            name="preco"
                            id="preco"
                            min="0"
                            step="0.01"
                            value={currentProduto.preco}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="imagem_url" className="block text-sm font-medium text-slate-300">
                            URL da Imagem
                          </label>
                          <input
                            type="text"
                            name="imagem_url"
                            id="imagem_url"
                            value={currentProduto.imagem_url}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="ativo"
                          id="ativo"
                          checked={currentProduto.ativo}
                          onChange={(e) => setCurrentProduto(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500"
                        />
                        <label htmlFor="ativo" className="ml-2 block text-sm text-slate-300">
                          Disponível
                        </label>
                      </div>
                    </form>
                  </div>
                  
                  {/* Rodapé do modal com botões */}
                  <div className="border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      form="produto-form"
                      className="w-full inline-flex justify-center rounded-md border border-transparent bg-amber-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {modalMode === 'criar' ? 'Adicionar' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
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