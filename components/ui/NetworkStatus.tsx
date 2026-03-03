import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-white/10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-red-500/10 p-4 rounded-full">
                    <WifiOff className="w-12 h-12 text-red-500 animate-pulse" />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Conexão Perdida
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-[280px] mx-auto">
                    Verifique sua internet. O sistema voltará automaticamente assim que o sinal retornar.
                </p>

                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-medium transition-colors text-sm w-full"
                >
                    Tentar Reconectar
                </button>
            </div>
        </div>
    );
}
