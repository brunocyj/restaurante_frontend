'use client';

import { useState } from 'react';
import TiposCardapio from './TiposCardapio';
import Categorias from './Categorias';
import Produtos from './Produtos';

type CardapioTab = 'tipos' | 'categorias' | 'produtos';

export default function Cardapio() {
  const [activeTab, setActiveTab] = useState<CardapioTab>('tipos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-md">
      <h2 className="mb-6 text-xl font-semibold text-white">Gerenciamento de Cardápio</h2>
      
      {/* Navegação para desktop */}
      <div className="mb-6 border-b border-slate-800 hidden md:block">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tipos')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'tipos'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            Tipos de Cardápio
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'categorias'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('produtos')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'produtos'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            Produtos
          </button>
        </nav>
      </div>
      
      {/* Navegação para mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="text-amber-500 font-medium">
            {activeTab === 'tipos' && 'Tipos de Cardápio'}
            {activeTab === 'categorias' && 'Categorias'}
            {activeTab === 'produtos' && 'Produtos'}
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
                setActiveTab('tipos');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                activeTab === 'tipos'
                  ? 'bg-slate-800 text-amber-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tipos de Cardápio
            </button>
            <button
              onClick={() => {
                setActiveTab('categorias');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                activeTab === 'categorias'
                  ? 'bg-slate-800 text-amber-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Categorias
            </button>
            <button
              onClick={() => {
                setActiveTab('produtos');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left rounded-md px-3 py-2 text-base font-medium ${
                activeTab === 'produtos'
                  ? 'bg-slate-800 text-amber-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Produtos
            </button>
          </div>
        )}
      </div>
      
      {activeTab === 'tipos' && <TiposCardapio />}
      {activeTab === 'categorias' && <Categorias />}
      {activeTab === 'produtos' && <Produtos />}
    </div>
  );
} 