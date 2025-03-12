'use client';

import { useState, useEffect } from 'react';
import { 
    getMesas,
    createMesa,
    updateMesa,
    deleteMesa,
    Mesa as MesaType,
    MesaStatus
} from '@/lib/mesa';
import { getTiposCardapio, TipoCardapio } from '@/lib/cardapio';

export default function Mesa() {
    const [mesas, setMesas] = useState<MesaType[]>([]);
    const [mesasFiltradas, setMesasFiltradas] = useState<MesaType[]>([]);
    const [tiposCardapio, setTiposCardapio] = useState<TipoCardapio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [filtroStatus, setFiltroStatus] = useState<MesaStatus | 'TODOS'>('TODOS');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'criar' | 'editar'>('criar');
    const [currentMesa, setCurrentMesa] = useState<MesaType>({ 
        id: '',
        status: MesaStatus.LIVRE,
        tipo_cardapio_id: '',
        qr_code: '',
        ativa: true
    });

    // Status das mesas
    const statusOptions = [
        { value: MesaStatus.LIVRE, label: 'Livre', color: 'bg-green-500' },
        { value: MesaStatus.OCUPADA, label: 'Ocupada', color: 'bg-red-500' },
        { value: MesaStatus.RESERVADA, label: 'Reservada', color: 'bg-yellow-500' },
        { value: MesaStatus.MANUTENCAO, label: 'Manutenção', color: 'bg-gray-500' }
    ];


    // Função para obter a cor do status
    const getStatusColor = (status: string) => {
        const statusOption = statusOptions.find(option => option.value === status);
        return statusOption ? statusOption.color : 'bg-gray-500';
    };

    // Função para obter o label do status
    const getStatusLabel = (status: string) => {
        const statusOption = statusOptions.find(option => option.value === status);
        return statusOption ? statusOption.label : status;
    };

    // Função para renderizar o ícone da mesa baseado no status
    const renderMesaIcon = (status: MesaStatus) => {
        switch (status) {
            case MesaStatus.LIVRE:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case MesaStatus.OCUPADA:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case MesaStatus.RESERVADA:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case MesaStatus.MANUTENCAO:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);
                const [mesasResponse, tiposCardapioResponse] = await Promise.all([
                    getMesas(),
                    getTiposCardapio()
                ]);
                setMesas(mesasResponse || []);
                setMesasFiltradas(mesasResponse || []);
                setTiposCardapio(tiposCardapioResponse || []);
                setError(null);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                setError('Falha ao carregar os dados. Tente novamente mais tarde.');
                setMesas([]);
                setMesasFiltradas([]);
                setTiposCardapio([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, []);

    // Efeito para filtrar as mesas quando o filtro de status muda
    useEffect(() => {
        if (filtroStatus === 'TODOS') {
            setMesasFiltradas(mesas);
        } else {
            setMesasFiltradas(mesas.filter(mesa => mesa.status === filtroStatus));
        }
    }, [filtroStatus, mesas]);

    const handleOpenCreateModal = () => {
        setCurrentMesa({ 
            id: '',
            status: MesaStatus.LIVRE,
            tipo_cardapio_id: '',
            qr_code: '',
            ativa: true
        });
        setModalMode('criar');
        setShowModal(true);
    };

    const handleOpenEditModal = (mesa: MesaType) => {
        setCurrentMesa({ ...mesa });
        setModalMode('editar');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentMesa(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveMesa = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'criar') {
                const novaMesa = await createMesa(currentMesa);
                setMesas(prev => [...prev, novaMesa]);
                setSuccess(`Mesa #${novaMesa.id} criada com sucesso!`);
            } else {
                if (currentMesa.id) {
                    const mesaAtualizada = await updateMesa(currentMesa.id, currentMesa);
                    setMesas(prev => prev.map(mesa => mesa.id === mesaAtualizada.id ? mesaAtualizada : mesa));
                    setSuccess(`Mesa #${mesaAtualizada.id} atualizada com sucesso!`);
                }
            }
            handleCloseModal();
            
            // Limpar a mensagem de sucesso após 3 segundos
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
        } catch (err) {
            console.error('Erro ao salvar mesa:', err);
            setError('Falha ao salvar a mesa. Tente novamente mais tarde.');
        }
    };

    const handleDeleteMesa = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta mesa?')) {
            try {
                await deleteMesa(id);
                setMesas(prev => prev.filter(mesa => mesa.id !== id));
                setSuccess(`Mesa #${id} excluída com sucesso!`);
                
                // Limpar a mensagem de sucesso após 3 segundos
                setTimeout(() => {
                    setSuccess(null);
                }, 3000);
            } catch (err) {
                console.error('Erro ao excluir mesa:', err);
                setError('Falha ao excluir a mesa. Tente novamente mais tarde.');
            }
        }
    };

    // Função para obter o nome do tipo de cardápio pelo ID
    const getTipoCardapioNome = (id: string) => {
        const tipo = tiposCardapio.find(tipo => tipo.id === id);
        return tipo ? tipo.nome : 'Não especificado';
    };

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-md">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Gerenciamento de Mesas</h2>
                <button
                    onClick={handleOpenCreateModal}
                    className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                    Nova Mesa
                </button>
            </div>

            {/* Filtro de status */}
            <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">Filtrar por status:</span>
                        <button
                            onClick={() => setFiltroStatus('TODOS')}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                filtroStatus === 'TODOS'
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                        >
                            Todos
                        </button>
                        {statusOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => setFiltroStatus(option.value)}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    filtroStatus === option.value
                                        ? `${option.color} text-white`
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setIsLoading(true);
                            setFiltroStatus('TODOS');
                            getMesas().then(response => {
                                setMesas(response || []);
                                setMesasFiltradas(response || []);
                                setIsLoading(false);
                            }).catch(err => {
                                console.error('Erro ao atualizar mesas:', err);
                                setError('Falha ao atualizar as mesas. Tente novamente mais tarde.');
                                setIsLoading(false);
                            });
                        }}
                        className="rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700 flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <div className="flex items-center">
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-green-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Mesas Livres</p>
                            <p className="text-2xl font-bold text-white">
                                {mesas.filter(mesa => mesa.status === MesaStatus.LIVRE).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <div className="flex items-center">
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Mesas Ocupadas</p>
                            <p className="text-2xl font-bold text-white">
                                {mesas.filter(mesa => mesa.status === MesaStatus.OCUPADA).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <div className="flex items-center">
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Mesas Reservadas</p>
                            <p className="text-2xl font-bold text-white">
                                {mesas.filter(mesa => mesa.status === MesaStatus.RESERVADA).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                    <div className="flex items-center">
                        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/20 text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Em Manutenção</p>
                            <p className="text-2xl font-bold text-white">
                                {mesas.filter(mesa => mesa.status === MesaStatus.MANUTENCAO).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mensagens de erro e sucesso */}
            {error && (
                <div className="mb-4 rounded-md bg-red-500/20 p-4 text-red-500">
                    <p>{error}</p>
                </div>
            )}
            
            {success && (
                <div className="mb-4 rounded-md bg-green-500/20 p-4 text-green-500">
                    <p>{success}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-amber-500"></div>
                </div>
            ) : (
                <>
                    {mesasFiltradas.length === 0 ? (
                        <div className="rounded-md bg-slate-800 p-8 text-center">
                            <p className="text-slate-400">
                                {mesas.length === 0 
                                    ? 'Nenhuma mesa cadastrada.' 
                                    : 'Nenhuma mesa encontrada com o filtro selecionado.'}
                            </p>
                            <button
                                onClick={handleOpenCreateModal}
                                className="mt-4 inline-flex items-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                Adicionar Mesa
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {mesasFiltradas.map((mesa) => (
                                <div
                                    key={mesa.id}
                                    className={`relative rounded-lg border ${
                                        mesa.status === MesaStatus.LIVRE 
                                            ? 'border-green-800 bg-green-900/10' 
                                            : mesa.status === MesaStatus.OCUPADA 
                                            ? 'border-red-800 bg-red-900/10' 
                                            : mesa.status === MesaStatus.RESERVADA 
                                            ? 'border-yellow-800 bg-yellow-900/10' 
                                            : 'border-gray-800 bg-gray-900/10'
                                    } p-4 transition-colors hover:bg-slate-800`}
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-medium text-white">Mesa #{mesa.id}</h3>
                                        <div className={`h-3 w-3 rounded-full ${getStatusColor(mesa.status)}`}></div>
                                    </div>
                                    
                                    <div className="mb-4 flex justify-center">
                                        {renderMesaIcon(mesa.status)}
                                    </div>
                                    
                                    <p className="mb-2 text-sm text-slate-400">
                                        Status: <span className="font-medium text-white">{getStatusLabel(mesa.status)}</span>
                                    </p>
                                    
                                    <p className="mb-2 text-sm text-slate-400">
                                        Cardápio: <span className="font-medium text-white">{getTipoCardapioNome(mesa.tipo_cardapio_id)}</span>
                                    </p>
                                    
                                    {mesa.qr_code && (
                                        <p className="mb-2 text-sm text-slate-400">
                                            QR Code: <span className="font-medium text-white">Disponível</span>
                                        </p>
                                    )}
                                    <p className="mb-2 text-sm text-slate-400">
                                        Ativa: <span className="font-medium text-white">{mesa.ativa ? 'Sim' : 'Não'}</span>
                                    </p>
                                    
                                    <div className="mt-4 flex justify-end space-x-2">
                                        <button
                                            onClick={() => handleOpenEditModal(mesa)}
                                            className="rounded-md bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMesa(mesa.id)}
                                            className="rounded-md bg-red-500/20 px-3 py-1 text-xs text-red-500 hover:bg-red-500/30"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal para criar/editar mesa */}
            {showModal && (
                <div className="fixed inset-0 z-10 overflow-y-auto bg-slate-900/75">
                    <div className="flex min-h-screen items-center justify-center px-4 py-8">
                        <div className="w-full max-w-lg transform overflow-hidden rounded-lg bg-slate-900 shadow-xl transition-all">
                            <div className="border-b border-slate-800 px-6 py-4">
                                <h3 className="text-lg font-medium text-white">
                                    {modalMode === 'criar' ? 'Nova Mesa' : 'Editar Mesa'}
                                </h3>
                            </div>

                            <form onSubmit={handleSaveMesa}>
                                <div className="bg-slate-900 px-6 py-4">
                                    <div className="mb-4">
                                        <label htmlFor="id" className="block text-sm font-medium text-slate-400">
                                            ID da Mesa
                                        </label>
                                        <input
                                            type="text"
                                            id="id"
                                            name="id"
                                            value={currentMesa.id}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                                            required
                                            placeholder="Digite o nome da mesa nova (A001, A002, A003...)"
                                            disabled={modalMode === 'editar'}
                                        />
                                        {modalMode === 'criar' && (
                                            <p className="mt-1 text-xs text-slate-500">
                                            </p>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="status" className="block text-sm font-medium text-slate-400">
                                            Status
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={currentMesa.status}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                                            required
                                        >
                                            {statusOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="ativo"
                                                name="ativo"
                                                checked={currentMesa.ativa ?? true} // Default true se undefined
                                                onChange={(e) => setCurrentMesa(prev => ({ ...prev, ativa: e.target.checked }))}
                                                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500"
                                            />
                                            <label htmlFor="ativo" className="ml-2 block text-sm font-medium text-slate-400">
                                                Ativo
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label htmlFor="tipo_cardapio_id" className="block text-sm font-medium text-slate-400">
                                            Tipo de Cardápio
                                        </label>
                                        <select
                                            id="tipo_cardapio_id"
                                            name="tipo_cardapio_id"
                                            value={currentMesa.tipo_cardapio_id || ''}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                                            required
                                        >
                                            <option value="">Selecione um tipo de cardápio</option>
                                            {tiposCardapio.map((tipo) => (
                                                <option key={tipo.id} value={tipo.id}>
                                                    {tipo.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="qr_code" className="block text-sm font-medium text-slate-400">
                                        QR Code
                                    </label>
                                    <input
                                        type="text"
                                        id="qr_code"
                                        name="qr_code"
                                        value={currentMesa.qr_code || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-slate-700 bg-slate-800 text-white shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                                        placeholder="Digite o código QR ou um texto aleatorio no momento"
                                    />
                                </div>

                                <div className="border-t border-slate-800 px-6 py-4">
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                                        >
                                            {modalMode === 'criar' ? 'Criar' : 'Salvar'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 