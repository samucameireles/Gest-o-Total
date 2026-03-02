import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Archive, Clock, Store, X, MapPin } from 'lucide-react';
import { Order, DailyHistory } from '../types';

interface ReportsProps {
  orders: Order[];
  dailyHistory?: DailyHistory[];
}

export const Reports: React.FC<ReportsProps> = ({ orders, dailyHistory = [] }) => {
  const getBusinessDate = (date: Date) => {
    const d = new Date(date);
    if (d.getHours() < 6) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  const bizDate = getBusinessDate(new Date());
  const todayDay = bizDate.getDate().toString().padStart(2, '0');
  const todayMonth = (bizDate.getMonth() + 1).toString().padStart(2, '0');
  const todayYear = bizDate.getFullYear().toString();

  const [selectedDay, setSelectedDay] = useState<string>(todayDay);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayMonth);
  const [selectedYear, setSelectedYear] = useState<string>(todayYear);

  // V10: Dashboard reads from Paid orders (Financial View).
  // Includes ARCHIVED (completed) or just marked as isPaid.
  // Determine the business day for any given timestamp (6 AM rollover)
  const getOrderBusinessDay = (timestamp: number) => {
    const date = new Date(timestamp);
    const hour = date.getHours();

    // If before 6 AM, it belongs to the previous calendar day
    if (hour < 6) {
      date.setDate(date.getDate() - 1);
    }

    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      year: date.getFullYear().toString()
    };
  };

  // Collect ALL orders from both history and live state
  const allAvailableOrders = [
    ...(dailyHistory.flatMap(h => h.orders || [])),
    ...orders
  ];

  // Apply filters based on the individual order's business day
  const filteredOrders = allAvailableOrders.filter(o => {
    if (!o || !o.id || !o.createdAt) return false;

    const bizDay = getOrderBusinessDay(o.createdAt);

    if (selectedYear !== 'todos' && bizDay.year !== selectedYear) return false;
    if (selectedMonth !== 'todos' && bizDay.month !== selectedMonth) return false;
    if (selectedDay !== 'todos' && bizDay.day !== selectedDay) return false;

    // Only count paid or archived orders in financial reports
    return (o.isPaid || o.status === 'ARCHIVED') && o.status !== 'CANCELLED';
  });

  // Unique orders only (deduplicate by ID across history/live)
  const uniqueOrdersMap = new Map<string, Order>();
  filteredOrders.forEach(o => uniqueOrdersMap.set(o.id, o));
  const paidOrders = Array.from(uniqueOrdersMap.values());
  const currentOrders = paidOrders; // Backward compatibility for following logic

  const isViewingToday = selectedDay === todayDay && selectedMonth === todayMonth && selectedYear === todayYear;
  const liveOrdersInView = orders.filter(o => {
    const bizDay = getOrderBusinessDay(o.createdAt);
    return bizDay.day === todayDay && bizDay.month === todayMonth && bizDay.year === todayYear;
  }).length;
  const includesToday = isViewingToday && liveOrdersInView > 0;

  const totalSales = paidOrders.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = paidOrders.length;
  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Data for Pie Charts - V10: BY VALUE (R$)
  const paymentMethods = ['CREDIT', 'DEBIT', 'CASH', 'PIX'];
  const paymentData = paymentMethods.map(method => ({
    name: method === 'CREDIT' ? 'Crédito' : method === 'DEBIT' ? 'Débito' : method === 'CASH' ? 'Dinheiro' : 'Pix',
    value: paidOrders.filter(o => o.paymentMethod === method).reduce((acc, o) => acc + o.total, 0) // Sum Total, not Count
  })).filter(d => d.value > 0);

  const originData = [
    { name: 'Mesa/Balcão', value: paidOrders.filter(o => o.type === 'DINE_IN').length },
    { name: 'Delivery', value: paidOrders.filter(o => o.type === 'DELIVERY').length },
    { name: 'Retirada', value: paidOrders.filter(o => o.type === 'PICKUP').length }
  ].filter(d => d.value > 0);

  const COLORS = ['#2563EB', '#10B981', '#CA8A04', '#EF4444'];
  const ORIGIN_COLORS = ['#CA8A04', '#2563EB', '#10B981'];

  // Recent Sales List
  const recentOrders = [...paidOrders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  // V12: Audit Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <div className="h-full overflow-y-auto pr-2 pb-20 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-textPrimary">Dashboard de Performance</h2>
          <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-xl p-2 px-4 shadow-sm mt-3 w-fit">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A16207] uppercase tracking-wider">Dia</span>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="bg-[#fefce8] text-[#713f12] border-none outline-none text-sm font-semibold rounded-lg py-1 px-2 cursor-pointer focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="todos">Todos</option>
                {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A16207] uppercase tracking-wider">Mês</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-[#fefce8] text-[#713f12] border-none outline-none text-sm font-semibold rounded-lg py-1 px-2 cursor-pointer focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="todos">Todos os Meses</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#A16207] uppercase tracking-wider">Ano</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="bg-[#fefce8] text-[#713f12] border-none outline-none text-sm font-semibold rounded-lg py-1 px-2 cursor-pointer focus:ring-2 focus:ring-yellow-500/20"
              >
                <option value="todos">Todos os Anos</option>
                {Array.from({ length: 5 }, (_, i) => (2024 + i).toString()).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border ${includesToday ? 'text-textSecondary bg-white border-border' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
          <div className={`w-2 h-2 rounded-full ${includesToday ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
          {includesToday ? 'Inclui tempo real' : 'Histórico Consolidado'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-border shadow-premium hover:shadow-premium-hover transition-shadow relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
            <DollarSign size={100} />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-green-50 rounded-2xl text-success w-fit mb-4"><DollarSign size={24} /></div>
            <p className="text-textSecondary text-sm font-bold uppercase tracking-wider">Faturamento Total</p>
            <h3 className="text-4xl font-heading font-black text-textPrimary mt-1">R$ {totalSales.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-border shadow-premium hover:shadow-premium-hover transition-shadow group">
          <div className="p-3 bg-blue-50 rounded-2xl text-accent w-fit mb-4"><ShoppingBag size={24} /></div>
          <p className="text-textSecondary text-sm font-bold uppercase tracking-wider">Vendas (Pagas)</p>
          <h3 className="text-4xl font-heading font-black text-textPrimary mt-1">{totalOrders}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-border shadow-premium hover:shadow-premium-hover transition-shadow group">
          <div className="p-3 bg-yellow-50 rounded-2xl text-highlight w-fit mb-4"><TrendingUp size={24} /></div>
          <p className="text-textSecondary text-sm font-bold uppercase tracking-wider">Ticket Médio</p>
          <h3 className="text-4xl font-heading font-black text-textPrimary mt-1">R$ {averageTicket.toFixed(2)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Payment Methods Chart */}
        <div className="bg-white p-8 rounded-3xl border border-border shadow-premium flex flex-col items-center">
          <h3 className="text-lg font-heading font-bold text-textPrimary mb-6 w-full text-left flex items-center gap-2"><DollarSign className="text-textSecondary" size={18} /> Formas de Pagamento (R$)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {paymentData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: 'none' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-textSecondary opacity-40">Sem dados de vendas</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origin Chart */}
        <div className="bg-white p-8 rounded-3xl border border-border shadow-premium flex flex-col items-center">
          <h3 className="text-lg font-heading font-bold text-textPrimary mb-6 w-full text-left flex items-center gap-2"><Store className="text-textSecondary" size={18} /> Origem do Pedido (Qtd)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {originData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={originData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ORIGIN_COLORS[index % ORIGIN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: 'none' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-textSecondary opacity-40">Sem dados de vendas</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="bg-white rounded-3xl border border-border shadow-premium overflow-hidden">
        <div className="p-6 border-b border-border bg-background">
          <h3 className="font-heading font-bold text-lg text-textPrimary flex items-center gap-2"><Archive className="text-accent" /> Últimas Vendas Realizadas</h3>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scrollbar">
          {recentOrders.map(order => (
            <div key={order.id} onClick={() => setSelectedOrder(order)} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-accent group-hover:text-white transition-colors rounded-full flex items-center justify-center text-xs font-bold text-textSecondary">
                  #{order.displayId}
                </div>
                <div>
                  <p className="font-bold text-textPrimary text-sm">{order.customerName || 'Cliente'}</p>
                  <p className="text-xs text-textSecondary flex items-center gap-1"><Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString()} - {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-success text-sm">+ R$ {order.total.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-textSecondary uppercase">{order.paymentMethod === 'CREDIT' ? 'Crédito' : order.paymentMethod}</p>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <div className="p-8 text-center text-textSecondary text-sm">Nenhum pagamento registrado.</div>
          )}
        </div>
      </div>

      {/* V12: Audit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border bg-background flex justify-between items-center">
              <h3 className="text-xl font-heading font-extrabold text-textPrimary">Detalhes do Pedido #{selectedOrder.displayId}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-xl border border-border">
                <p className="text-xs font-bold text-textSecondary uppercase mb-2">Cliente</p>
                <p className="font-bold text-lg text-textPrimary">{selectedOrder.customerName || 'Não identificado'}</p>
                {selectedOrder.type === 'DELIVERY' && selectedOrder.deliveryDetails ? (
                  <div className="flex items-start gap-2 mt-2 text-sm text-textSecondary">
                    <MapPin size={16} className="mt-0.5" />
                    <span>{selectedOrder.deliveryDetails.street}, {selectedOrder.deliveryDetails.number} - {selectedOrder.deliveryDetails.neighborhood}</span>
                  </div>
                ) : selectedOrder.type === 'PICKUP' ? (
                  <div className="flex items-start gap-2 mt-2 text-sm text-green-600 font-semibold bg-green-50 p-2 rounded-lg">
                    <span>Retirada no Balcão</span>
                  </div>
                ) : null}
                <p className="text-xs text-textSecondary mt-2"><Clock size={12} className="inline mr-1" /> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-textSecondary uppercase mb-2">Itens do Pedido</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                      <div>
                        <p className="text-sm font-bold text-textPrimary">{item.quantity}x {item.name}</p>
                        {item.notes && <p className="text-xs text-highlight italic">Obs: {item.notes}</p>}
                        {item.selectedAddOns && item.selectedAddOns.map((addon, aIdx) => (
                          <p key={aIdx} className="text-xs text-green-600 font-bold">+ {addon.name}</p>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-textPrimary">
                          R$ {((item.price + (item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Finance */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-blue-800 uppercase">Total Pago</p>
                  <p className="text-2xl font-black text-blue-900">R$ {selectedOrder.total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-800 uppercase">Método</p>
                  <span className="inline-block bg-white text-blue-900 px-3 py-1 rounded font-bold text-sm shadow-sm border border-blue-100">
                    {selectedOrder.paymentMethod === 'CREDIT' ? 'CRÉDITO' : selectedOrder.paymentMethod}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};