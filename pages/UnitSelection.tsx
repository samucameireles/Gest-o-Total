import React, { useEffect, useState } from 'react';
import { supabase, setTenant } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Store, Plus, ArrowRight, LogOut, Loader2, Sun, Moon } from 'lucide-react';
import logoWhite from '../fotos/gestaototalwhite.png';
import logoDark from '../fotos/gestaototaldark.png';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    role: string;
}

export default function UnitSelection() {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const navigate = useNavigate();

    const isDark = theme === 'dark';

    useEffect(() => {
        if (user) {
            fetchTenants();
        }
    }, [user]);

    const fetchTenants = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Join user_roles to tenants
        const { data, error } = await supabase
            .from('user_roles')
            .select('role, tenants(id, name, slug)')
            .eq('user_id', user?.id);

        if (data) {
            const formatted = data.map((item: any) => ({
                id: item.tenants.id,
                name: item.tenants.name,
                slug: item.tenants.slug,
                role: item.role
            }));
            setTenants(formatted);
        }
        setLoading(false);
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        const slug = newStoreName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

        const { data, error } = await supabase
            .from('tenants')
            .insert([{ name: newStoreName, slug }])
            .select()
            .single();

        if (data) {
            // Trigger handles role assignment
            await fetchTenants();
            setNewStoreName('');
            setCreating(false);
        } else {
            alert('Erro ao criar loja: ' + error?.message);
            setCreating(false);
        }
    };

    const handleSelectStore = (id: string) => {
        setTenant(id);
        navigate(`/dashboard/${id}`);
    };

    return (
        <div className={`min-h-screen transition-colors duration-700 ${isDark ? 'bg-[#050507] text-white' : 'bg-[#F4F7FA] text-slate-900'} flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden`}>
            {/* Background elements for atmosphere - only visible in dark mode for that premium feel */}
            {isDark && (
                <>
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none"></div>
                </>
            )}

            {/* Theme & Profile Actions */}
            <div className="absolute top-8 right-8 z-20 flex gap-4">
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl transition-all duration-300 shadow-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-yellow-400 border border-white/10' : 'bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200'}`}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="w-full max-w-5xl z-10">
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="inline-flex items-center justify-center w-full max-w-[400px] h-32 mb-8 transition-all duration-500">
                        <img
                            src={isDark ? logoDark : logoWhite}
                            alt="GestãoTotal Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        <span className={`${isDark ? 'text-white/60' : 'text-slate-400'} font-light`}>Selecione sua</span> <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">Operação</span>
                    </h1>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-lg max-w-md`}>Escolha o estabelecimento que deseja gerenciar hoje no ecossistema GestãoTotal.</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-24">
                        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                        <span className="text-slate-500 font-medium animate-pulse">Carregando unidades...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Existing Tenants */}
                        {tenants.map((tenant) => (
                            <button
                                key={tenant.id}
                                onClick={() => handleSelectStore(tenant.id)}
                                className={`group relative p-8 rounded-[2rem] border shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center overflow-hidden h-[320px] ${isDark
                                    ? 'bg-[#0D0D10]/80 backdrop-blur-xl border-white/5 hover:border-blue-500/40 hover:shadow-blue-500/10'
                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl'
                                    }`}
                            >
                                {/* Glow Effect on Hover (Dark Only) */}
                                {isDark && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}

                                <div className="relative mb-6">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 border ${isDark
                                        ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-white/10'
                                        : 'bg-blue-50 border-blue-100'
                                        }`}>
                                        <Store className="text-blue-500" size={40} />
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] ${isDark ? 'border-[#0D0D10]' : 'border-white'}`}></div>
                                </div>

                                <div className="mt-2 mb-6">
                                    <span className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-3 inline-block ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                                        }`}>
                                        {tenant.role}
                                    </span>
                                    <h3 className={`text-2xl font-bold transition-colors duration-300 truncate max-w-[220px] ${isDark ? 'text-white/90 group-hover:text-white' : 'text-slate-800'
                                        }`}>
                                        {tenant.name}
                                    </h3>
                                    <p className="text-emerald-500 text-sm font-medium mt-1">Online</p>
                                </div>

                                <div className={`mt-auto w-full py-4 px-6 border rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                    <span className="font-bold text-sm">ACESSAR PAINEL</span>
                                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                                </div>
                            </button>
                        ))}

                        {/* Create New Card */}
                        <div className={`group relative bg-transparent border-2 border-dashed transition-all duration-500 h-[320px] overflow-hidden rounded-[2rem] flex flex-col ${creating
                            ? (isDark ? 'border-blue-500/50 bg-blue-500/5' : 'border-blue-400 bg-blue-50')
                            : (isDark ? 'border-white/10' : 'border-slate-200')
                            }`}>
                            {!creating ? (
                                <button
                                    className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-white'}`}
                                    onClick={() => setCreating(true)}
                                >
                                    <div className={`w-20 h-20 border rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 mb-6 ${isDark
                                        ? 'bg-white/5 border-white/10 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30'
                                        : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 shadow-sm'
                                        }`}>
                                        <Plus size={32} />
                                    </div>
                                    <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-800'}`}>Criar Nova Operação</span>
                                    <p className={`text-sm mt-2 font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Configure uma nova loja</p>
                                </button>
                            ) : (
                                <div className={`flex flex-col h-full p-8 items-center justify-center backdrop-blur-md ${isDark ? 'bg-[#0D0D10]/80' : 'bg-white/90'}`}>
                                    <form onSubmit={handleCreateStore} className="w-full flex flex-col items-center">
                                        <div className={`w-16 h-16 border rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                                            }`}>
                                            <Plus size={24} className="text-blue-500" />
                                        </div>
                                        <input
                                            autoFocus
                                            placeholder="Nome da Unidade"
                                            className={`w-full border text-center rounded-xl px-4 py-4 mb-6 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-lg font-medium ${isDark
                                                ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600'
                                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                                                }`}
                                            value={newStoreName}
                                            onChange={e => setNewStoreName(e.target.value)}
                                        />
                                        <div className="flex gap-4 w-full">
                                            <button
                                                type="button"
                                                onClick={() => setCreating(false)}
                                                className={`flex-1 text-sm font-bold py-3 transition-colors border rounded-xl ${isDark
                                                    ? 'text-slate-400 hover:text-white border-white/5 hover:bg-white/5'
                                                    : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newStoreName}
                                                className="flex-1 bg-blue-600 text-white text-sm py-3 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all"
                                            >
                                                Criar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {user && (
                    <div className="mt-16 text-center">
                        <button
                            onClick={() => signOut()}
                            className={`inline-flex items-center gap-2 px-6 py-3 border text-sm font-bold rounded-2xl transition-all duration-300 ${isDark
                                ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-sm'
                                }`}
                        >
                            <LogOut size={18} /> Encerrar Sessão
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
