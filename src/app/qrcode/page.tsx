'use client';

import Link from 'next/link';

export default function QRCodePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">MEIZIZI</h1>
          <p className="mt-2 text-amber-400">Cardápio Digital</p>
        </div>
        
        <div className="mt-6 rounded-md bg-slate-800/50 p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-white">Escaneie o QR Code da sua mesa</h2>
          <p className="mt-2 text-slate-400">
            Para acessar o cardápio digital e fazer seu pedido, escaneie o QR Code disponível na sua mesa.
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-amber-500 hover:text-amber-400"
          >
            <span>Voltar para a página inicial</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
} 