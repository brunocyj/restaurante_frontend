'use client';

import { useState, useEffect } from 'react';
import { 
    getTiposCardapio as listarTiposCardapio, 
    createTipoCardapio as criarTipoCardapio, 
    updateTipoCardapio as atualizarTipoCardapio, 
    deleteTipoCardapio as excluirTipoCardapio,
    TipoCardapio 
} from '@/lib/cardapio';

export default function TiposCardapio() {
    const [tiposCardapio, setTiposCardapio] = useState<TipoCardapio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'criar' | 'editar'>('criar');
    const [currentTipo, setCurrentTipo] = useState<Partial<TipoCardapio>>({ nome: '', descricao: '', ativo: true });

    useEffect(() => {
        async function fetchTiposCardapio() {
            try {
                setIsLoading(true);
                const response = await listarTiposCardapio();
                setTiposCardapio(response || []);
                setError(null);
            } catch (err) {
                console.error('Erro ao carregar tipos de cardápio:', err);
                setError('Falha ao carregar os tipos de cardápio. Tente novamente mais tarde.');
                setTiposCardapio([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTiposCardapio();
    }, []);

    const handleOpenCreateModal = () => {
        setCurrentTipo({ nome: '', descricao: '', ativo: true });
        setModalMode('criar');
        setShowModal(true);
    };

    const handleOpenEditModal = (tipo: TipoCardapio) => {
        setCurrentTipo({ ...tipo });
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
            setCurrentTipo(prev => ({ ...prev, [name]: checked }));
        } else {
            setCurrentTipo(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveTipo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'criar') {
                const novoTipo = await criarTipoCardapio(currentTipo as Omit<TipoCardapio, 'id'>);
                setTiposCardapio(prev => [...prev, novoTipo]);
            } else {
                const tipoAtualizado = await atualizarTipoCardapio(currentTipo.id!, currentTipo as Partial<TipoCardapio>);
                setTiposCardapio(prev => 
                    prev.map(tipo => tipo.id === tipoAtualizado.id ? tipoAtualizado : tipo)
                );
            }
            setShowModal(false);
        } catch (err) {
            console.error('Erro ao salvar tipo de cardápio:', err);
            setError('Falha ao salvar o tipo de cardápio. Tente novamente mais tarde.');
        }
    };

    const handleDeleteTipo = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este tipo de cardápio?')) return;
        try {
            await excluirTipoCardapio(id);
            setTiposCardapio(prev => prev.filter(tipo => tipo.id !== id));
        } catch (err) {
            console.error('Erro ao excluir tipo de cardápio:', err);
            setError('Falha ao excluir o tipo de cardápio. Tente novamente mais tarde.');
        }
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
            <h3 className="text-lg font-medium text-slate-200">Tipos de Cardápio</h3>
            <button
              onClick={handleOpenCreateModal}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Adicionar Tipo
            </button>
          </div>
          
          {tiposCardapio.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-8 text-center">
              <p className="text-slate-400">Nenhum tipo de cardápio cadastrado.</p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Adicionar Primeiro Tipo
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
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                      {tiposCardapio.map((tipo) => (
                        <tr key={tipo.id} className="hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                            {tipo.nome}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            {tipo.descricao}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              tipo.ativo 
                                ? 'bg-emerald-900/30 text-emerald-400' 
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                              {tipo.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                            <button 
                              onClick={() => handleOpenEditModal(tipo)}
                              className="mr-3 text-amber-500 hover:text-amber-400"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => tipo.id && handleDeleteTipo(tipo.id)}
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
                    {tiposCardapio.map((tipo) => (
                      <div key={tipo.id} className="block bg-slate-900 p-4 hover:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-white">{tipo.nome}</h3>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            tipo.ativo 
                              ? 'bg-emerald-900/30 text-emerald-400' 
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {tipo.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-slate-300">
                          <p className="truncate">{tipo.descricao}</p>
                        </div>
                        
                        <div className="mt-4 flex justify-end space-x-3">
                          <button 
                            onClick={() => handleOpenEditModal(tipo)}
                            className="rounded-md bg-amber-600/20 px-3 py-1.5 text-sm font-medium text-amber-500 hover:bg-amber-600/30"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => tipo.id && handleDeleteTipo(tipo.id)}
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
                      {modalMode === 'criar' ? 'Adicionar Tipo de Cardápio' : 'Editar Tipo de Cardápio'}
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
                    <form onSubmit={handleSaveTipo} id="tipo-form" className="space-y-5">
                      <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-slate-300">
                          Nome
                        </label>
                        <input
                          type="text"
                          name="nome"
                          id="nome"
                          value={currentTipo.nome}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-slate-300">
                          Descrição
                        </label>
                        <textarea
                          name="descricao"
                          id="descricao"
                          rows={3}
                          value={currentTipo.descricao}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 py-2 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="ativo"
                          id="ativo"
                          checked={currentTipo.ativo}
                          onChange={(e) => setCurrentTipo(prev => ({ ...prev, ativo: e.target.checked }))}
                          className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500"
                        />
                        <label htmlFor="ativo" className="ml-2 block text-sm text-slate-300">
                          Ativo
                        </label>
                      </div>
                    </form>
                  </div>
                  
                  {/* Rodapé do modal com botões */}
                  <div className="border-t border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      form="tipo-form"
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

