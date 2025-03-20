'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, getUserInfo } from '@/lib/auth';
import { getMesas, MesaStatus, Mesa as MesaType } from '@/lib/mesa';
import { getPedidosPorStatus, StatusPedido, Pedido as PedidoType } from '@/lib/pedido';
import NotificacaoPanel from '@/components/NotificacaoPanel';
import { Toaster } from 'react-hot-toast';

import Cardapio from './components/Cardapio';
import Mesa from './components/Mesa';
import Pedido from './components/Pedido';

interface UserData {
  username: string;
  email?: string;
  roles?: string[];
  [key: string]: string | string[] | undefined;
}

type TabType = 'dashboard' | 'mesas' | 'pedidos' | 'cardapio';

export default function AdminPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Estados para o dashboard
  const [mesas, setMesas] = useState<MesaType[]>([]);
  const [pedidos, setPedidos] = useState<PedidoType[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const userInfo = await getUserInfo();
        setUserData(userInfo);
      } catch (error) {
        console.error('Erro ao obter informações do usuário:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);
  
  // Função para carregar dados do dashboard
  const loadDashboardData = async () => {
    if (activeTab !== 'dashboard') return;
    
    try {
      setDashboardLoading(true);
      setDashboardError(null);
      
      // Carregar mesas e pedidos em paralelo
      const [mesasData, pedidosAbertos, pedidosEmAndamento] = await Promise.all([
        getMesas(),
        getPedidosPorStatus(StatusPedido.ABERTO),
        getPedidosPorStatus(StatusPedido.EM_ANDAMENTO)
      ]);
      
      setMesas(mesasData || []);
      
      // Combinar pedidos abertos e em andamento
      const todosPedidosAtivos = [...(pedidosAbertos || []), ...(pedidosEmAndamento || [])];
      setPedidos(todosPedidosAtivos);
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setDashboardError('Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setDashboardLoading(false);
    }
  };
  
  // Carregar dados do dashboard quando a aba estiver ativa
  useEffect(() => {
    loadDashboardData();
    
    // Configurar atualização automática a cada 30 segundos
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">MEIZIZI</h1>
            <p className="mt-2 text-amber-400">Sistema de Gestão de Restaurante</p>
          </div>
          <div className="flex justify-center mt-6">
            <svg className="h-10 w-10 animate-spin text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-center text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Toaster position="top-right" />
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white">RESTAURANTE MEIZIZI</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">
              Olá, <span className="font-medium text-slate-200">{userData?.username}</span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="hidden md:flex md:-mb-px md:space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('mesas')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'mesas'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              Mesas
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'pedidos'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab('cardapio')}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'cardapio'
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              Cardápio
            </button>
          </nav>
          
          <div className="md:hidden py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-amber-500 font-medium">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'mesas' && 'Mesas'}
                  {activeTab === 'pedidos' && 'Pedidos'}
                  {activeTab === 'cardapio' && 'Cardápio'}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-400 hover:text-white focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {mobileMenuOpen && (
              <div className="mt-2 space-y-1 px-2 pb-3 pt-2">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                    activeTab === 'dashboard'
                      ? 'bg-slate-800 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveTab('mesas');
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                    activeTab === 'mesas'
                      ? 'bg-slate-800 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Mesas
                </button>
                <button
                  onClick={() => {
                    setActiveTab('pedidos');
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                    activeTab === 'pedidos'
                      ? 'bg-slate-800 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Pedidos
                </button>
                <button
                  onClick={() => {
                    setActiveTab('cardapio');
                    setMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                    activeTab === 'cardapio'
                      ? 'bg-slate-800 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Cardápio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'dashboard' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Visão Geral</h2>
                
                <button 
                  onClick={loadDashboardData}
                  disabled={dashboardLoading}
                  className="flex items-center space-x-1 rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {dashboardLoading ? (
                    <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>Atualizar</span>
                </button>
              </div>
              
              {dashboardError && (
                <div className="mb-6 rounded-md bg-red-900/30 p-3 text-sm text-red-300 border border-red-800">
                  {dashboardError}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Mesas Ocupadas</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardLoading ? (
                          <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-700"></span>
                        ) : (
                          `${mesas.filter(mesa => mesa.status === MesaStatus.OCUPADA).length}/${mesas.length}`
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Pedidos em Andamento</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardLoading ? (
                          <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-700"></span>
                        ) : (
                          pedidos.filter(p => p.status === StatusPedido.EM_ANDAMENTO).length
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Pedidos Aguardando</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardLoading ? (
                          <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-700"></span>
                        ) : (
                          pedidos.filter(p => p.status === StatusPedido.ABERTO).length
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Lista de mesas ocupadas */}
                <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                  <h3 className="mb-4 text-lg font-medium text-slate-200">Mesas Ocupadas</h3>
                  
                  {dashboardLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full animate-pulse rounded bg-slate-800"></div>
                      ))}
                    </div>
                  ) : mesas.filter(mesa => mesa.status === MesaStatus.OCUPADA).length === 0 ? (
                    <p className="text-center py-4 text-slate-400">Nenhuma mesa ocupada no momento</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {mesas
                        .filter(mesa => mesa.status === MesaStatus.OCUPADA)
                        .map(mesa => (
                          <div key={mesa.id} className="rounded-md border border-slate-700 bg-slate-800 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-white">Mesa {mesa.id}</p>
                              </div>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">
                                Ocupada
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                {/* Lista de pedidos ativos */}
                <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                  <h3 className="mb-4 text-lg font-medium text-slate-200">Pedidos Ativos</h3>
                  
                  {dashboardLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full animate-pulse rounded bg-slate-800"></div>
                      ))}
                    </div>
                  ) : pedidos.length === 0 ? (
                    <p className="text-center py-4 text-slate-400">Nenhum pedido ativo no momento</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {pedidos.map(pedido => {
                        const statusColor = 
                          pedido.status === StatusPedido.ABERTO 
                            ? 'bg-blue-500' 
                            : pedido.status === StatusPedido.EM_ANDAMENTO 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500';
                              
                        return (
                          <div key={pedido.id} className="rounded-md border border-slate-700 bg-slate-800 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className={`h-2 w-2 rounded-full ${statusColor}`}></span>
                                  <p className="font-medium text-white">Mesa {pedido.mesa_id}</p>
                                </div>
                                <p className="text-sm text-slate-400">
                                  {pedido.status === StatusPedido.ABERTO ? 'Aguardando' : 'Em andamento'}
                                </p>
                              </div>
                              <button
                                className="rounded-md bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600"
                                onClick={() => setActiveTab('pedidos')}
                              >
                                Gerenciar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Painel de Notificações */}
              <div className="mt-8">
                <NotificacaoPanel />
              </div>
            </div>
          )}
          
          {activeTab === 'mesas' && <Mesa />}
          {activeTab === 'pedidos' && <Pedido />}
          {activeTab === 'cardapio' && <Cardapio />}
        </div>
      </main>
    </div>
  );
} 