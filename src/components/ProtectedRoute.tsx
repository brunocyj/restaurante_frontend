'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      
      if (!authenticated) {
        const callbackUrl = encodeURIComponent(window.location.pathname);
        router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
      } else {
        setIsAuthorized(true);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [router, redirectTo]);

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
          <p className="text-center text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }
  return isAuthorized ? <>{children}</> : null;
} 