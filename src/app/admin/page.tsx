'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, getUserInfo } from '@/lib/auth';

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
              <h2 className="mb-6 text-xl font-semibold text-white">Visão Geral</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Pedidos Hoje</p>
                      <p className="text-2xl font-bold text-white">500</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Faturamento Hoje</p>
                      <p className="text-2xl font-bold text-white">R$ 0,00</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Ticket Médio</p>
                      <p className="text-2xl font-bold text-white">R$ 00,00</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                  <div className="flex items-center">
                    <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">Mesas Ocupadas</p>
                      <p className="text-2xl font-bold text-white">0/15</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="mb-4 text-lg font-medium text-slate-200">Ações rápidas</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <button 
                    onClick={() => setActiveTab('pedidos')}
                    className="group rounded-lg border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                  >
                    <span className="block text-sm font-medium text-amber-400 group-hover:text-amber-300">Novo Pedido</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('mesas')}
                    className="group rounded-lg border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                  >
                    <span className="block text-sm font-medium text-amber-400 group-hover:text-amber-300">Gerenciar Mesas</span>
                  </button>
                  <button className="group rounded-lg border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800">
                    <span className="block text-sm font-medium text-amber-400 group-hover:text-amber-300">Relatório do Dia</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cardapio' && <Cardapio />}    
          {activeTab === 'mesas' && <Mesa />}
          {activeTab === 'pedidos' && <Pedido />}
        </div>
      </main>
    
    </div>
  );
} 