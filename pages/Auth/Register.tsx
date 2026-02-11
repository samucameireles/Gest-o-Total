
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, User } from 'lucide-react';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
        });

        if (error) {
            // Translate common errors
            if (error.status === 429) {
                setError('Muitas tentativas recentemente. Por favor, aguarde alguns minutos antes de tentar novamente.');
            } else if (error.message.includes('already registered')) {
                setError('Este email já está cadastrado.');
            } else {
                setError(error.message);
            }
            setLoading(false);
        } else if (data.user && data.session === null) {
            // Email confirmation required
            setSuccess(true);
            setLoading(false);
        } else {
            // Auto-login success (rare if confirmation is ON)
            navigate('/');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-green-100 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                        <Mail size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifique seu Email</h2>
                    <p className="text-slate-600 mb-6">
                        Enviamos um link de confirmação para <strong>{email}</strong>.
                        <br /><br />
                        Por favor, clique no link para ativar sua conta.
                    </p>
                    <Link to="/login" className="text-blue-600 font-bold hover:underline">Voltar para o Login</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-200">
                        <User size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Crie sua Conta</h1>
                    <p className="text-slate-500">Comece a usar o GestãoTotal hoje mesmo</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Criar Conta Grátis'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                        Já tem conta? <Link to="/login" className="text-blue-600 font-bold hover:underline">Fazer Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
