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
import { verificarTodasAsMesas } from '@/lib/mesaHelper';
import axios from 'axios';

// Definindo uma interface estendida para uso interno no componente
interface MesaWithLegacyAtivo extends MesaType {
    ativo?: boolean; // Campo mantido para compatibilidade com o código existente
}

export default function Mesa() {
    const [mesas, setMesas] = useState<MesaType[]>([]);
    const [mesasFiltradas, setMesasFiltradas] = useState<MesaType[]>([]);
    const [tiposCardapio, setTiposCardapio] = useState<TipoCardapio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [filtroStatus, setFiltroStatus] = useState<MesaStatus | 'TODOS'>('TODOS');
    const [filtroSecao, setFiltroSecao] = useState<string>('TODAS');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'criar' | 'editar'>('criar');
    const [currentMesa, setCurrentMesa] = useState<MesaWithLegacyAtivo>({ 
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case MesaStatus.OCUPADA:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case MesaStatus.RESERVADA:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case MesaStatus.MANUTENCAO:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Função para carregar e atualizar mesas
    const carregarMesas = async (verificarStatus = false) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await getMesas();
            setMesas(response || []);
            
            // Se solicitado, verificar e atualizar o status das mesas com base nos pedidos ativos
            if (verificarStatus && response && response.length > 0) {
                const mesaIds = response.map(mesa => mesa.id);
                
                // Verificar e atualizar status das mesas sem mostrar mensagem
                const mesasAtualizadas = await verificarTodasAsMesas(mesaIds);
                
                if (mesasAtualizadas > 0) {
                    // Se houve atualizações, recarregar as mesas novamente para obter os estados atualizados
                    const mesasAtualizadasResponse = await getMesas();
                    setMesas(mesasAtualizadasResponse || []);
                    // Não exibir mensagem de sucesso
                }
                // Não exibir mensagem de sucesso quando não há atualizações
            }
            // Não exibir mensagem genérica de sucesso
        } catch (error) {
            console.error('Erro ao carregar mesas:', error);
            setError('Falha ao carregar as mesas. Tente novamente mais tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    // Efeito para carregar mesas e tipos de cardápio quando o componente é montado
    useEffect(() => {
        // Carregar tipos de cardápio
        getTiposCardapio()
            .then(response => {
                setTiposCardapio(response);
            })
            .catch(error => {
                console.error('Erro ao carregar tipos de cardápio:', error);
                setError('Falha ao carregar os tipos de cardápio.');
            });
        
        // Carregar mesas e verificar status
        carregarMesas(true); // Passa true para verificar o status das mesas
    }, []);

    // Função para obter seções únicas a partir dos IDs das mesas
    const getSecoesUnicas = () => {
        const secoes = new Set<string>();
        mesas.forEach(mesa => {
            if (mesa.id.length > 0) {
                secoes.add(mesa.id.charAt(0).toUpperCase());
            }
        });
        return Array.from(secoes).sort();
    };

    // Função para converter o ID da seção para o nome de exibição
    const getNomeSecao = (secao: string) => {
        switch (secao) {
            case 'A':
                return '烧烤区A';
            case 'B':
                return '烧烤区B';
            case 'C':
                return '火锅区C';
            case 'F':
                return '烧烤区B'; // F é parte de 烧烤区B
            default:
                return `Seção ${secao}`;
        }
    };

    // Função para determinar se uma seção deve ser exibida no filtro
    const deveExibirSecao = (secao: string) => {
        return secao !== 'E' && secao !== 'F'; // Não exibir seções E e F (F está incluído em B)
    };

    // Função personalizada para ordenar as seções conforme requisitos
    const ordenarSecoes = (secoes: string[]) => {
        const ordemPreferida = ['A', 'B', 'C'];
        
        // Filtrar apenas as seções desejadas e remover F (já incluído em B)
        const secoesFiltradas = secoes
            .filter(secao => deveExibirSecao(secao) && secao !== 'F');
        
        // Ordenar baseado na ordem preferida
        return secoesFiltradas.sort((a, b) => {
            const indexA = ordemPreferida.indexOf(a);
            const indexB = ordemPreferida.indexOf(b);
            
            // Se ambos estão na lista de preferência, usar essa ordem
            if (indexA >= 0 && indexB >= 0) return indexA - indexB;
            
            // Se apenas um está na lista, priorizar ele
            if (indexA >= 0) return -1;
            if (indexB >= 0) return 1;
            
            // Caso contrário, ordenar alfabeticamente
            return a.localeCompare(b);
        });
    };

    // Efeito para filtrar as mesas quando o filtro de status ou seção muda
    useEffect(() => {
        let mesasFiltradas = [...mesas];
        
        // Primeiro ordenar todas as mesas pelo ID
        mesasFiltradas.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
        
        // Aplicar filtro de status
        if (filtroStatus !== 'TODOS') {
            mesasFiltradas = mesasFiltradas.filter(mesa => mesa.status === filtroStatus);
        }
        
        // Aplicar filtro de seção (baseado na primeira letra do ID)
        if (filtroSecao !== 'TODAS') {
            // Caso especial para seção F que deve aparecer com B
            if (filtroSecao === 'B') {
                mesasFiltradas = mesasFiltradas.filter(mesa => {
                    const primeiraLetra = mesa.id.charAt(0).toUpperCase();
                    return primeiraLetra === 'B' || primeiraLetra === 'F';
                });
            } else {
                mesasFiltradas = mesasFiltradas.filter(mesa => {
                    const primeiraLetra = mesa.id.charAt(0).toUpperCase();
                    return primeiraLetra === filtroSecao;
                });
            }
        }
        
        setMesasFiltradas(mesasFiltradas);
    }, [filtroStatus, filtroSecao, mesas]);

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

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { checked } = e.target;
        setCurrentMesa(prev => ({ ...prev, ativa: checked }));
    };

    const handleSaveMesa = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Log detalhado dos dados que serão enviados
            console.log('===== INÍCIO DA CRIAÇÃO/EDIÇÃO DE MESA =====');
            console.log('Modo:', modalMode);
            console.log('Dados da mesa a serem enviados:', currentMesa);
            
            // Verificar se todos os campos obrigatórios estão preenchidos
            if (!currentMesa.id) {
                console.error('ID da mesa não informado');
                setError('ID da mesa é obrigatório');
                return;
            }
            
            if (!currentMesa.tipo_cardapio_id) {
                console.error('Tipo de cardápio não selecionado');
                setError('Tipo de cardápio é obrigatório');
                return;
            }
            
            if (!currentMesa.qr_code) {
                console.error('QR Code não informado');
                setError('QR Code é obrigatório');
                return;
            }
            
            // Verificar se o campo ativa está definido
            if (currentMesa.ativa === undefined) {
                console.warn('Campo ativa não definido, definindo como true');
                setCurrentMesa(prev => ({ ...prev, ativa: true }));
            }
            
            if (modalMode === 'criar') {
                console.log('Enviando requisição POST para criar mesa');
                console.log('Dados formatados para envio:', JSON.stringify(currentMesa));
                
                try {
                    const novaMesa = await createMesa(currentMesa);
                    console.log('Resposta da API após criação:', novaMesa);
                    setMesas(prev => [...prev, novaMesa]);
                    setSuccess(`Mesa #${novaMesa.id} criada com sucesso!`);
                } catch (err: unknown) {
                    console.error('Erro detalhado ao criar mesa:', err);
                    
                    if (axios.isAxiosError(err) && err.response) {
                        console.error('Status do erro:', err.response.status);
                        console.error('Dados do erro:', err.response.data);
                        console.error('Headers:', err.response.headers);
                        
                        // Mensagem de erro mais específica
                        if (err.response.status === 422) {
                            setError(`Erro de validação: ${JSON.stringify(err.response.data)}`);
                        } else {
                            const errorMessage = err.response.data.detail || (err instanceof Error ? err.message : 'Erro desconhecido');
                            setError(`Falha ao criar a mesa: ${errorMessage}`);
                        }
                    } else {
                        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
                        setError(`Falha ao criar a mesa: ${errorMessage}`);
                    }
                    return;
                }
            } else {
                if (currentMesa.id) {
                    console.log('Enviando requisição PUT para atualizar mesa');
                    console.log('Dados formatados para envio:', JSON.stringify(currentMesa));
                    
                    try {
                        const mesaAtualizada = await updateMesa(currentMesa.id, currentMesa);
                        console.log('Resposta da API após atualização:', mesaAtualizada);
                        setMesas(prev => prev.map(mesa => mesa.id === mesaAtualizada.id ? mesaAtualizada : mesa));
                        setSuccess(`Mesa #${mesaAtualizada.id} atualizada com sucesso!`);
                    } catch (err: unknown) {
                        console.error('Erro detalhado ao atualizar mesa:', err);
                        
                        if (axios.isAxiosError(err) && err.response) {
                            console.error('Status do erro:', err.response.status);
                            console.error('Dados do erro:', err.response.data);
                            console.error('Headers:', err.response.headers);
                            
                            // Mensagem de erro mais específica
                            if (err.response.status === 422) {
                                setError(`Erro de validação: ${JSON.stringify(err.response.data)}`);
                            } else {
                                const errorMessage = err.response.data.detail || (err instanceof Error ? err.message : 'Erro desconhecido');
                                setError(`Falha ao atualizar a mesa: ${errorMessage}`);
                            }
                        } else {
                            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
                            setError(`Falha ao atualizar a mesa: ${errorMessage}`);
                        }
                        return;
                    }
                }
            }
            
            console.log('===== FIM DA CRIAÇÃO/EDIÇÃO DE MESA =====');
            handleCloseModal();
            
            // Limpar a mensagem de sucesso após 3 segundos
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
        } catch (err: unknown) {
            console.error('Erro geral ao salvar mesa:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(`Falha ao salvar a mesa: ${errorMessage}`);
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
            {/* Cabeçalho com título e estatísticas em linha horizontal */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-y-3">
                <h2 className="text-xl font-semibold text-white">Gerenciamento de Mesas</h2>
                
                {/* Estatísticas em linha */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center text-green-500">
                        <div className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-xs">{mesas.filter(mesa => mesa.status === MesaStatus.LIVRE).length}</span>
                    </div>
                    
                    <div className="flex items-center text-red-500">
                        <div className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <span className="text-xs">{mesas.filter(mesa => mesa.status === MesaStatus.OCUPADA).length}</span>
                    </div>
                    
                    <div className="flex items-center text-yellow-500">
                        <div className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="text-xs">{mesas.filter(mesa => mesa.status === MesaStatus.RESERVADA).length}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-500">
                        <div className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-xs">{mesas.filter(mesa => mesa.status === MesaStatus.MANUTENCAO).length}</span>
                    </div>
                    
                    <button
                        onClick={handleOpenCreateModal}
                        className="ml-2 rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
                    >
                        Nova Mesa
                    </button>
                </div>
            </div>

            {/* Filtros em uma única linha */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
                {/* Filtro de status */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Status:</span>
                    <button
                        onClick={() => setFiltroStatus('TODOS')}
                        className={`rounded-full px-2 py-0.5 text-xs ${
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
                            className={`rounded-full px-2 py-0.5 text-xs ${
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
                        carregarMesas(true);
                    }}
                    className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-white hover:bg-slate-700 flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar
                </button>
            </div>

            {/* Filtro de seções compacto */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Seção:</span>
                <button
                    onClick={() => setFiltroSecao('TODAS')}
                    className={`rounded-md border px-2 py-0.5 text-xs ${
                        filtroSecao === 'TODAS'
                            ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500/50'
                    }`}
                >
                    Todas
                </button>
                {ordenarSecoes(getSecoesUnicas()).map(secao => (
                    <button
                        key={secao}
                        onClick={() => setFiltroSecao(secao)}
                        className={`rounded-md border px-2 py-0.5 text-xs ${
                            filtroSecao === secao
                                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500/50'
                        }`}
                    >
                        {getNomeSecao(secao)}
                    </button>
                ))}
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
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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
                                    } p-2 transition-colors hover:bg-slate-800`}
                                >
                                    <div className="mb-1 flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-white">#{mesa.id}</h3>
                                        <div className={`h-2 w-2 rounded-full ${getStatusColor(mesa.status)}`}></div>
                                    </div>
                                    
                                    <div className="mb-1 flex justify-center">
                                        {renderMesaIcon(mesa.status)}
                                    </div>
                                    
                                    <div className="flex flex-col text-xs">
                                        <p className="flex items-center justify-between">
                                            <span className="text-slate-400">Status:</span> 
                                            <span className="font-medium text-white">{getStatusLabel(mesa.status)}</span>
                                        </p>
                                        
                                        <p className="flex items-center justify-between">
                                            <span className="text-slate-400">Cardápio:</span>
                                            <span className="font-medium text-white truncate max-w-[60px]" title={getTipoCardapioNome(mesa.tipo_cardapio_id)}>
                                                {getTipoCardapioNome(mesa.tipo_cardapio_id)}
                                            </span>
                                        </p>
                                    </div>
                                    
                                    <div className="mt-2 flex justify-end space-x-1">
                                        <button
                                            onClick={() => handleOpenEditModal(mesa)}
                                            className="rounded-md bg-slate-700 px-2 py-0.5 text-xs text-white hover:bg-slate-600"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMesa(mesa.id)}
                                            className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs text-red-500 hover:bg-red-500/30"
                                        >
                                            Excluir
                                        </button>
                                        {mesa.qr_code && (
                                            <button
                                                onClick={() => {
                                                    let url = mesa.qr_code;
                                                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                                        url = 'https://' + url;
                                                    }
                                                    window.open(url, '_blank');
                                                }}
                                                className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs text-blue-500 hover:bg-blue-500/30"
                                            >
                                                QR
                                            </button>
                                        )}
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
                                                onChange={handleCheckboxChange}
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