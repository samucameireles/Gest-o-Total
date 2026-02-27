
import React, { useState, useEffect } from 'react';
import { CashRegisterSession, CashTransaction, Order, PaymentMethod } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    DollarSign,
    Calendar,
    Printer,
    AlertTriangle,
    Lock,
    Unlock,
    TrendingUp,
    CreditCard,
    Wallet,
    Smartphone,
    Search,
    ChevronLeft,
    ChevronRight,
    Archive,
    ShoppingBag
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface CashFlowProps {
    currentSession: CashRegisterSession | null;
    history: CashRegisterSession[];
    onOpenCash: (initialAmount: number) => void;
    onCloseCash: (finalAmount: number, notes: string) => void;
    onAddTransaction: (type: 'SUPPLY' | 'BLEED', amount: number, description: string) => void;
    orders: Order[]; // For historical calculation
    onEndDay: () => void;
    dailyHistory: any[];
}

export const CashFlow: React.FC<CashFlowProps> = ({
    currentSession,
    history,
    onOpenCash,
    onCloseCash,
    onAddTransaction,
    orders,
    onEndDay,
    dailyHistory
}) => {
    const { theme } = useTheme();
    const { role, user } = useAuth();
    const isDark = theme === 'dark';
    const isManager = role === 'owner' || role === 'gestor' || role === 'caixa' || !role; // Allow !role for dev/initial setup

    const [viewMode, setViewMode] = useState<'CURRENT' | 'HISTORY'>('CURRENT');
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState<'SUPPLY' | 'BLEED' | null>(null);

    // Modal States
    const [amountInput, setAmountInput] = useState('');
    const [descriptionInput, setDescriptionInput] = useState('');

    // --- Fix: Force List Update (User Logic: Dead List Fix) ---
    // User requested structure: { id, hora, tipo, descricao, valor, responsavel }
    interface MovimentacaoView {
        id: string | number;
        data_hora: string;
        tipo: 'Sangria' | 'Suprimento';
        descricao: string;
        valor: number;
        responsavel: string;
    }

    const [movimentacoes, setMovimentacoes] = useState<MovimentacaoView[]>([]);



    // --- Calculations ---

    // Helper to filter orders for a session
    const getSessionOrders = (session: CashRegisterSession) => {
        return orders.filter(o =>
            o.createdAt >= session.openedAt &&
            (session.closedAt ? o.createdAt <= session.closedAt : true) &&
            o.status !== 'CANCELLED'
        );
    };

    const activeSession = viewMode === 'CURRENT'
        ? currentSession
        : history.find(h => new Date(h.openedAt).toISOString().split('T')[0] === selectedHistoryDate);

    const activeOrders = activeSession ? getSessionOrders(activeSession) : [];

    useEffect(() => {
        const fetchMovimentacoes = async () => {
            if (!activeSession) {
                setMovimentacoes([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('movimentacoes_caixa')
                    .select('*')
                    .eq('caixa_id', activeSession.id)
                    .order('data_hora', { ascending: false });

                if (error) {
                    console.warn("Tabela movimentacoes_caixa não encontrada ou erro:", error);
                    const mapped = [...(activeSession.transactions || [])]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(t => ({
                            id: t.id,
                            data_hora: new Date(t.timestamp).toISOString(),
                            tipo: t.type === 'BLEED' ? 'Sangria' as const : 'Suprimento' as const,
                            descricao: t.description,
                            valor: t.amount,
                            responsavel: t.userId || 'Gerente'
                        }));
                    setMovimentacoes(mapped);
                    return;
                }

                if (data && data.length > 0) {
                    const mapped = data.map((t: any) => ({
                        id: t.id,
                        data_hora: t.data_hora,
                        tipo: t.tipo, // 'Sangria' | 'Suprimento'
                        descricao: t.descricao,
                        valor: t.valor,
                        responsavel: t.responsavel || 'Operador'
                    }));
                    setMovimentacoes(mapped);
                } else if (activeSession.transactions?.length > 0) {
                    const mapped = [...activeSession.transactions]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(t => ({
                            id: t.id,
                            data_hora: new Date(t.timestamp).toISOString(),
                            tipo: t.type === 'BLEED' ? 'Sangria' as const : 'Suprimento' as const,
                            descricao: t.description,
                            valor: t.amount,
                            responsavel: t.userId || 'Gerente'
                        }));
                    setMovimentacoes(mapped);
                } else {
                    setMovimentacoes([]);
                }
            } catch (err) {
                console.error("Erro geral no fetch de movimentacoes:", err);
            }
        };

        fetchMovimentacoes();
    }, [activeSession?.id]);

    // Totals
    const totalSales = activeOrders.reduce((sum, o) => sum + o.total, 0);
    const totalSupply = activeSession?.transactions.filter(t => t.type === 'SUPPLY').reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalBleed = activeSession?.transactions.filter(t => t.type === 'BLEED').reduce((sum, t) => sum + t.amount, 0) || 0;

    // Payment Methods Breakdown
    const salesByMethod = activeOrders.reduce((acc, o) => {
        acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
        return acc;
    }, {} as Record<PaymentMethod, number>);

    const chartData = [
        { name: 'Dinheiro', value: salesByMethod['CASH'] || 0, color: '#10B981' },
        { name: 'Crédito', value: salesByMethod['CREDIT'] || 0, color: '#3B82F6' },
        { name: 'Débito', value: salesByMethod['DEBIT'] || 0, color: '#6366F1' },
        { name: 'PIX', value: salesByMethod['PIX'] || 0, color: '#8B5CF6' },
    ].filter(d => d.value > 0);

    // Current Balance (Money in Drawer)
    // Initial + Supply - Bleed + Cash Sales
    const moneyInDrawer = (activeSession?.initialAmount || 0) + totalSupply - totalBleed + (salesByMethod['CASH'] || 0);

    // Handlers
    const handleOpenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onOpenCash(parseFloat(amountInput));
        setAmountInput('');
        setShowOpenModal(false);
    };

    const handleCloseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCloseCash(parseFloat(amountInput), descriptionInput); // descriptionInput used as Notes
        setAmountInput('');
        setDescriptionInput('');
        setShowCloseModal(false);
    };

    const handleTransactionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (showTransactionModal && activeSession) {
            const valor = parseFloat(amountInput);
            const tipoTransacao = showTransactionModal;
            const nomeTipo = tipoTransacao === 'BLEED' ? 'Sangria' : 'Suprimento';
            const descricao = descriptionInput || nomeTipo;
            const dataHoraAtual = new Date();
            const responsavelId = user?.email || 'Operador';

            // --- UI REATIVA INSTANTÂNEA ---
            const novaMovimentacao: MovimentacaoView = {
                id: Date.now().toString(),
                data_hora: dataHoraAtual.toISOString(),
                tipo: nomeTipo,
                descricao: descricao,
                valor: valor,
                responsavel: responsavelId
            };

            // Injeta no topo da lista instantaneamente
            setMovimentacoes(prevLista => [novaMovimentacao, ...prevLista]);

            // Mantém update local herdado pro restante do App (Dashboard)
            onAddTransaction(tipoTransacao, valor, descricao);

        }
        setAmountInput('');
        setDescriptionInput('');
        setShowTransactionModal(null);
    };

    // --- Render ---

    if (!activeSession && viewMode === 'CURRENT') {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95 duration-300">
                <div className={`w-32 h-32 rounded-3xl flex items-center justify-center mb-6 shadow-2xl ${isDark ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-500'}`}>
                    <Lock size={48} />
                </div>
                <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Caixa Fechado</h2>
                <p className={`text-lg mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Abra o caixa para começar a vender.</p>

                {isManager ? (
                    <button
                        onClick={() => setShowOpenModal(true)}
                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 flex items-center gap-3"
                    >
                        <Unlock size={24} />
                        ABRIR CAIXA
                    </button>
                ) : (
                    <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-xl font-medium border border-yellow-500/20">
                        Aguarde um gerente abrir o caixa.
                    </div>
                )}

                {/* Modal for Opening */}
                {showOpenModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-[#1E1E24] border border-white/10' : 'bg-white'}`}>
                            <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Abertura de Caixa</h3>
                            <form onSubmit={handleOpenSubmit} className="space-y-6">
                                <div>
                                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fundo de Troco (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        autoFocus
                                        required
                                        value={amountInput}
                                        onChange={e => setAmountInput(e.target.value)}
                                        className={`w-full p-4 rounded-xl text-2xl font-bold outline-none border transition-all ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'}`}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowOpenModal(false)} className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20">Confirmar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-6 animate-in fade-in duration-500 pb-16`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Fluxo de Caixa</h1>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {viewMode === 'CURRENT' ? 'Turno Atual - Em Aberto' : `Histórico de ${new Date(selectedHistoryDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('CURRENT')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'CURRENT' ? 'bg-white dark:bg-blue-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                    >
                        Atual
                    </button>
                    {isManager && (
                        <button
                            onClick={() => setViewMode('HISTORY')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-white dark:bg-blue-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                            Histórico
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'HISTORY' && (
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                    <Calendar className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    <input
                        type="date"
                        value={selectedHistoryDate}
                        onChange={e => setSelectedHistoryDate(e.target.value)}
                        className={`bg-transparent outline-none font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
                    />
                    {!activeSession && <span className="text-red-500 text-sm font-bold ml-auto">Nenhum caixa registrado nesta data.</span>}
                </div>
            )}

            {/* Main Dashboard - Only show if session exists */}
            {activeSession ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Sales */}
                        <div className={`p-6 rounded-2xl border relative overflow-hidden group ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign size={64} className="text-emerald-500" />
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vendas Totais</p>
                            <h3 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                R$ {totalSales.toFixed(2)}
                            </h3>
                            <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm font-bold">
                                <TrendingUp size={16} />
                                <span>{activeOrders.length} pedidos</span>
                            </div>
                        </div>

                        {/* Money in Drawer */}
                        <div className={`p-6 rounded-2xl border relative overflow-hidden group ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Wallet size={64} className="text-blue-500" />
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Em Gaveta (Espécie)</p>
                            <h3 className={`text-3xl font-extrabold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                R$ {moneyInDrawer.toFixed(2)}
                            </h3>
                            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Início: R$ {activeSession.initialAmount.toFixed(2)}
                            </p>
                        </div>

                        {/* Bleeds */}
                        <div className={`p-6 rounded-2xl border relative overflow-hidden group ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ArrowUpCircle size={64} className="text-red-500" />
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Saídas / Sangrias</p>
                            <h3 className={`text-3xl font-extrabold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                R$ {totalBleed.toFixed(2)}
                            </h3>
                        </div>

                        {/* Supplies */}
                        <div className={`p-6 rounded-2xl border relative overflow-hidden group ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ArrowDownCircle size={64} className="text-indigo-500" />
                            </div>
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Entradas / Suprimentos</p>
                            <h3 className={`text-3xl font-extrabold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                R$ {totalSupply.toFixed(2)}
                            </h3>
                        </div>
                    </div>

                    {/* Charts & Actions Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className={`lg:col-span-2 p-6 rounded-2xl border min-h-[300px] ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>Distribuição de Pagamentos</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: isDark ? '#333' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: isDark ? '#fff' : '#333' }}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Actions Panel */}
                        <div className={`p-6 rounded-2xl border flex flex-col gap-4 ${isDark ? 'bg-[#1E1E24] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Ações Rápidas</h3>

                            {viewMode === 'CURRENT' && (
                                <>
                                    <button
                                        onClick={() => setShowTransactionModal('BLEED')}
                                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-red-500/20"
                                    >
                                        <ArrowUpCircle size={20} /> SANGRIA (Retirada)
                                    </button>

                                    <button
                                        onClick={() => setShowTransactionModal('SUPPLY')}
                                        className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-indigo-500/20"
                                    >
                                        <ArrowDownCircle size={20} /> SUPRIMENTO (Entrada)
                                    </button>

                                    <div className="mt-auto pt-4 border-t border-dashed border-gray-700">
                                        <button
                                            onClick={() => setShowCloseModal(true)}
                                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
                                        >
                                            <Lock size={20} /> FECHAR CAIXA
                                        </button>

                                        {isManager && (
                                            <button
                                                onClick={onEndDay}
                                                className="w-full mt-4 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg border border-red-800"
                                            >
                                                <Archive size={20} /> ENCERRAR EXPEDIENTE
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {viewMode === 'HISTORY' && (
                                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                                    <Lock size={32} className="mb-2" />
                                    <p>Caixa Fechado</p>
                                    <p className="text-xs">Visualização Apenas</p>
                                    {activeSession.closedAt && (
                                        <p className="text-xs mt-2">Fechado às: {new Date(activeSession.closedAt).toLocaleTimeString()}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transaction History List */}
                    <div className={`rounded-2xl border mt-4 ${isDark ? 'bg-[#1E1E24] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        {/* Header */}
                        <div className={`px-6 py-5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Movimentações Detalhadas</h3>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {(movimentacoes.length + activeOrders.length)} registros neste turno
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={`text-left text-[11px] font-bold uppercase tracking-widest border-b ${isDark ? 'text-slate-500 border-white/5 bg-black/20' : 'text-slate-400 border-slate-100 bg-slate-50/80'}`}>
                                        <th className="py-3.5 px-6">Horário</th>
                                        <th className="py-3.5 px-6 text-center">Tipo</th>
                                        <th className="py-3.5 px-6">Descrição</th>
                                        <th className="py-3.5 px-6 text-right">Valor</th>
                                        <th className="py-3.5 px-6 text-right">Responsável</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimentacoes.length > 0 || activeOrders.length > 0 ? (
                                        <>
                                            {movimentacoes.map((item, idx) => (
                                                <tr
                                                    key={`mov-${item.id}`}
                                                    className={`border-b transition-colors ${isDark
                                                        ? `border-white/5 ${idx % 2 === 0 ? '' : 'bg-white/[0.02]'} hover:bg-white/[0.04]`
                                                        : `border-slate-100 ${idx % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-blue-50/30`
                                                        }`}
                                                >
                                                    <td className={`py-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {item.data_hora
                                                            ? new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                                            : '--:--'}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex justify-center">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide ${item.tipo === 'Sangria'
                                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                                }`}>
                                                                {item.tipo === 'Sangria' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                                                                {item.tipo || 'MOVIMENTAÇÃO'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-4 px-6 text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                        {item.descricao || 'Sem descrição'}
                                                    </td>
                                                    <td className={`py-4 px-6 text-right text-sm font-black tabular-nums ${item.tipo === 'Sangria' ? 'text-red-500' : 'text-emerald-600'
                                                        }`}>
                                                        {item.tipo === 'Sangria' ? '−' : '+'}&nbsp;R$&nbsp;{(item.valor || 0).toFixed(2)}
                                                    </td>
                                                    <td className={`py-4 px-6 text-right text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {item.responsavel || 'Operador'}
                                                    </td>
                                                </tr>
                                            ))}

                                            {activeOrders.map((o, idx) => (
                                                <tr
                                                    key={`ord-${o.id}`}
                                                    className={`border-b transition-colors ${isDark
                                                        ? `border-white/5 ${(movimentacoes.length + idx) % 2 === 0 ? '' : 'bg-white/[0.02]'} hover:bg-white/[0.04]`
                                                        : `border-slate-100 ${(movimentacoes.length + idx) % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-blue-50/30`
                                                        }`}
                                                >
                                                    <td className={`py-4 px-6 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {o.createdAt
                                                            ? new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                                            : '--:--'}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                                <ShoppingBag size={13} />
                                                                VENDA #{o.displayId || '---'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-4 px-6 text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                        Pagamento em&nbsp;<span className="font-black">{o.paymentMethod || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right text-sm font-black tabular-nums text-blue-600">
                                                        +&nbsp;R$&nbsp;{(o.total || 0).toFixed(2)}
                                                    </td>
                                                    <td className={`py-4 px-6 text-right text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        Balcão
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={5}>
                                                <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                                                    <TrendingUp size={40} strokeWidth={1} />
                                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nenhuma movimentação registrada neste turno.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : null}

            {/* Transaction Modal (Bleed/Supply) */}
            {showTransactionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${isDark ? 'bg-[#1E1E24] border border-white/10' : 'bg-white'}`}>
                        <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {showTransactionModal === 'BLEED' ? <ArrowUpCircle className="text-red-500" /> : <ArrowDownCircle className="text-indigo-500" />}
                            {showTransactionModal === 'BLEED' ? 'Realizar Sangria' : 'Realizar Suprimento'}
                        </h3>
                        <form onSubmit={handleTransactionSubmit} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    required
                                    value={amountInput}
                                    onChange={e => setAmountInput(e.target.value)}
                                    className={`w-full p-4 rounded-xl text-2xl font-bold outline-none border transition-all ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Motivo / Descrição</label>
                                <input
                                    type="text"
                                    required
                                    value={descriptionInput}
                                    onChange={e => setDescriptionInput(e.target.value)}
                                    className={`w-full p-4 rounded-xl outline-none border transition-all ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                    placeholder={showTransactionModal === 'BLEED' ? "Ex: Pagamento Fornecedor" : "Ex: Troco Adicional"}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowTransactionModal(null)} className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Cancelar</button>
                                <button type="submit" className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg ${showTransactionModal === 'BLEED' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'}`}>Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Close Cash Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl border ${isDark ? 'bg-[#1E1E24] border-red-500/20' : 'bg-white border-red-100'}`}>
                        <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mx-auto">
                            <Lock size={32} />
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>Fechar Caixa</h3>
                        <p className="text-center text-slate-500 mb-8">Confira os valores em dinheiro na gaveta antes de confirmar.</p>

                        <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl mb-6 flex justify-between items-center">
                            <span className="text-sm font-bold opacity-70">Saldo Esperado (Espécie):</span>
                            <span className="text-xl font-extrabold text-blue-500">R$ {moneyInDrawer.toFixed(2)}</span>
                        </div>

                        <form onSubmit={handleCloseSubmit} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Valor Declarado em Gaveta (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    required
                                    value={amountInput}
                                    onChange={e => setAmountInput(e.target.value)}
                                    className={`w-full p-4 rounded-xl text-2xl font-bold outline-none border transition-all ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-red-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-red-500'}`}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Observações</label>
                                <textarea
                                    value={descriptionInput}
                                    onChange={e => setDescriptionInput(e.target.value)}
                                    className={`w-full p-4 rounded-xl outline-none border transition-all min-h-[100px] resize-none ${isDark ? 'bg-black/20 border-white/10 text-white focus:border-red-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-red-500'}`}
                                    placeholder="Diferenças, justificativas..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowCloseModal(false)} className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20">CONFIRMAR FECHAMENTO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
