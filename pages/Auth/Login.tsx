import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Lock, Mail, Loader2, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
const logo = '/fotos/gestaototal.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const isDark = theme === 'dark';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-700 ${isDark ? 'bg-[#050507] text-white' : 'bg-[#F4F7FA] text-slate-900'} flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden`}>
            {/* Background elements for atmosphere - Dark Mode only */}
            {isDark && (
                <>
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[130px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[130px] rounded-full pointer-events-none"></div>
                </>
            )}

            {/* Theme Toggle */}
            <div className="absolute top-8 right-8 z-20">
                <button
                    onClick={toggleTheme}
                    className={`p-3 rounded-2xl transition-all duration-300 shadow-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-yellow-400 border border-white/10' : 'bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200'}`}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <div className="w-full max-w-md z-10 transition-all duration-500 hover:scale-[1.01]">
                <div className={`p-10 rounded-[2.5rem] shadow-2xl transition-all duration-500 border ${isDark
                    ? 'bg-[#0D0D10]/80 backdrop-blur-xl border-white/5 shadow-blue-500/5'
                    : 'bg-white/90 backdrop-blur-md border-slate-100 shadow-slate-200'
                    }`}>
                    <div className="text-center mb-10">
                        <div className={`w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 border overflow-hidden ${isDark
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] border-white/10'
                            : 'bg-blue-600 shadow-lg shadow-blue-200 border-blue-500'
                            }`}>
                            <img src={logo} alt="GestãoTotal Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className={`text-3xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            Gestão<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Total</span>
                        </h1>
                        <p className={`text-lg transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bem-vindo de volta!</p>
                    </div>

                    {error && (
                        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 text-sm font-medium border animate-in fade-in slide-in-from-top-4 ${isDark
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-red-50 border-red-100 text-red-600'
                            }`}>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className={`text-sm font-bold ml-1 tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>EMAIL</label>
                            <div className="relative group">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-600 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} size={20} />
                                <input
                                    type="email"
                                    required
                                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all font-medium text-lg outline-none ${isDark
                                        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:bg-white/[0.08] focus:border-blue-500/50'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="seu@dominio.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className={`text-sm font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>SENHA</label>
                                <button type="button" className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider">Esqueceu?</button>
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-600 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className={`w-full pl-12 pr-12 py-4 rounded-2xl border transition-all font-medium text-lg outline-none ${isDark
                                        ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-700 focus:bg-white/[0.08] focus:border-blue-500/50'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                        }`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-extrabold text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg shadow-xl ${isDark
                                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 hover:shadow-blue-500/40'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:shadow-blue-300'
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : 'ACESSAR GESTÃOTOTAL'}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Não possui permissão? <Link to="/register" className="text-blue-500 font-bold hover:text-blue-400 transition-colors">Solicitar Acesso</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

