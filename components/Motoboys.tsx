import React, { useState } from 'react';
import { Bike, Plus, Trash2, Map, Save, X, Phone, User, DollarSign, Package, Calendar } from 'lucide-react';
import { Driver, NeighborhoodFee, Order, DailyHistory } from '../types';

interface MotoboysProps {
  drivers: Driver[];
  onAddDriver: (name: string) => void;
  onRemoveDriver: (id: string) => void;
  neighborhoodFees: NeighborhoodFee[];
  onUpdateFee: (neighborhood: string, price: number) => void;
  onRemoveFee: (id: string) => void;
  orders: Order[]; // Received from Dashboard (Active Orders)
  dailyHistory: DailyHistory[];
}

export const Motoboys: React.FC<MotoboysProps> = ({ drivers, onAddDriver, onRemoveDriver, neighborhoodFees, onUpdateFee, onRemoveFee, orders, dailyHistory }) => {
  const [newDriverName, setNewDriverName] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newFeePrice, setNewFeePrice] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // V10: History View
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-')); // YYYY-MM-DD

  // Determine what data to show
  // If Active: use props.drivers and props.orders
  // If History: find entry in dailyHistory. Use entry.drivers (if exists) and entry.orders

  const historyEntry = viewMode === 'HISTORY' ? dailyHistory.find(h => h.id === selectedDate) : null;

  const displayedDrivers = viewMode === 'HISTORY'
    ? (historyEntry?.drivers || []) // Use snapshot if available
    : drivers;

  const displayedOrders = viewMode === 'HISTORY'
    ? (historyEntry?.orders || [])
    : orders;

  const handleAddDriverHandler = () => {
    if (newDriverName.trim()) {
      onAddDriver(newDriverName);
      setNewDriverName('');
    }
  };

  const handleAddFeeHandler = () => {
    if (newNeighborhood.trim() && newFeePrice) {
      onUpdateFee(newNeighborhood, parseFloat(newFeePrice));
      setNewNeighborhood('');
      setNewFeePrice('');
    }
  };

  const handleOpenOrder = (displayId: number) => {
    // Search in displayedOrders
    const order = displayedOrders.find(o => o.displayId === displayId);

    if (order) {
      setSelectedOrder(order);
    } else {
      alert(`Pedido #${displayId} não encontrado.`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full relative">
      {/* Drivers List */}
      <div className="bg-white rounded-3xl shadow-premium border border-border overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-background flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-heading font-extrabold text-textPrimary flex items-center gap-2">
              <Bike className="text-accent" /> Equipe de Entregas
            </h2>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('ACTIVE')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'ACTIVE' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Hoje
              </button>
              <button
                onClick={() => setViewMode('HISTORY')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Histórico
              </button>
            </div>
          </div>

          {viewMode === 'HISTORY' && (
            <div className="flex items-center gap-2 pb-2 border-b border-border border-dashed">
              <Calendar size={16} className="text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none w-full"
              />
              {!historyEntry && <span className="text-xs text-red-500 flex-shrink-0">Sem dados</span>}
            </div>
          )}

          <p className="text-sm text-textSecondary">
            {viewMode === 'ACTIVE' ? 'Gerencie os motoboys e visualize métricas em tempo real' : 'Visualize o desempenho da equipe em datas passadas'}
          </p>
        </div>

        {viewMode === 'ACTIVE' && (
          <div className="p-6 border-b border-border bg-white flex gap-2">
            <input
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              placeholder="Nome do Motoboy"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
            />
            <button
              onClick={handleAddDriverHandler}
              className="bg-accent hover:bg-accentDark text-white px-6 rounded-xl font-bold flex items-center gap-2"
            >
              <Plus size={18} /> Adicionar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {displayedDrivers.map(driver => (
            <div key={driver.id} className="p-5 bg-background border border-border rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-border shadow-sm">
                    <Bike size={24} className="text-textSecondary" />
                  </div>
                  <div>
                    <p className="font-bold text-textPrimary text-lg">{driver.name}</p>
                    <p className="text-xs text-textSecondary">
                      {driver.deliveriesCount} entregas | <span className="text-success font-bold">R$ {driver.commissionTotal.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                {viewMode === 'ACTIVE' && (
                  <button
                    onClick={() => onRemoveDriver(driver.id)}
                    className="text-textSecondary hover:text-danger hover:bg-white p-2 rounded-full transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              {/* History of IDs */}
              <div className="bg-white rounded-lg p-3 border border-border">
                <p className="text-[10px] text-textSecondary uppercase font-bold mb-2">Entregas Recentes (ID)</p>
                <div className="flex flex-wrap gap-2">
                  {driver.history && driver.history.length > 0 ? (
                    driver.history.slice(-10).map((histId, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOpenOrder(histId)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-xs px-2 py-1 rounded font-mono font-bold transition-colors cursor-pointer"
                      >
                        #{histId}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-textSecondary italic">Nenhuma entrega registrada.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {displayedDrivers.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhum motoboy encontrado.</div>
          )}
        </div>
      </div>

      {/* Neighborhood Fees - Only editable in ACTIVE mode usually, but visible always */}
      <div className="bg-white rounded-3xl shadow-premium border border-border overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-background">
          <h2 className="text-xl font-heading font-extrabold text-textPrimary flex items-center gap-2">
            <Map className="text-highlight" /> Taxas por Bairro
          </h2>
          <p className="text-sm text-textSecondary">Configure o valor da entrega por região</p>
        </div>

        {viewMode === 'ACTIVE' && (
          <div className="p-6 border-b border-border bg-white flex gap-2">
            <input
              value={newNeighborhood}
              onChange={(e) => setNewNeighborhood(e.target.value)}
              placeholder="Bairro"
              className="flex-[2] bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
            />
            <input
              value={newFeePrice}
              onChange={(e) => setNewFeePrice(e.target.value)}
              placeholder="R$"
              type="number"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
            />
            <button
              onClick={handleAddFeeHandler}
              className="bg-highlight hover:bg-yellow-600 text-white px-4 rounded-xl font-bold flex items-center gap-2"
            >
              <Save size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs text-textSecondary uppercase bg-background font-bold">
              <tr>
                <th className="p-4 rounded-tl-xl">Bairro</th>
                <th className="p-4 text-center">Valor (R$)</th>
                <th className="p-4 text-right rounded-tr-xl">Ação</th>
              </tr>
            </thead>
            <tbody>
              {neighborhoodFees.map(fee => (
                <tr key={fee.id} className="border-b border-border hover:bg-background/50">
                  <td className="p-4 font-medium text-textPrimary">{fee.name}</td>
                  <td className="p-4 text-center font-bold text-textPrimary">{fee.price.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    {viewMode === 'ACTIVE' && (
                      <button
                        onClick={() => onRemoveFee(fee.id)}
                        className="text-textSecondary hover:text-danger p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {neighborhoodFees.length === 0 && (
            <div className="text-center p-8 text-textSecondary text-sm">Nenhuma taxa cadastrada.</div>
          )}
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border bg-background flex justify-between items-center sticky top-0">
              <div>
                <h3 className="font-heading font-bold text-xl text-textPrimary">Detalhes do Pedido</h3>
                <span className="text-sm font-mono text-textSecondary">#{selectedOrder.displayId}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">

              {/* BLOCK 1: ITEMS */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-textSecondary uppercase tracking-wider">
                  <Package size={16} /> Itens do Pedido
                </h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="border-b border-dashed border-slate-200 last:border-0 pb-2 last:pb-0">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800 text-sm">{item.quantity}x {item.name}</span>
                        <span className="text-slate-500 text-sm">R$ {item.price.toFixed(2)}</span>
                      </div>
                      {/* AddOns */}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 ml-2">
                          {item.selectedAddOns.map(addon => (
                            <span key={addon.id} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">+ {addon.name}</span>
                          ))}
                        </div>
                      )}
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-amber-600 italic mt-1 ml-2">Obs: {item.notes}</p>
                      )}
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800">
                    <span>Total Geral</span>
                    <span>R$ {selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* BLOCK 2: CUSTOMER */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-textSecondary uppercase tracking-wider">
                  <User size={16} /> Cliente e Entrega
                </h4>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm">
                  <p className="font-bold text-blue-900 text-lg mb-1">{selectedOrder.customerName || 'Cliente sem nome'}</p>
                  {selectedOrder.deliveryDetails ? (
                    <div className="space-y-1 text-blue-800">
                      <p>{selectedOrder.deliveryDetails.street}, {selectedOrder.deliveryDetails.number}</p>
                      <p>{selectedOrder.deliveryDetails.neighborhood} {selectedOrder.deliveryDetails.complement ? `- ${selectedOrder.deliveryDetails.complement}` : ''}</p>
                      <a
                        href={`https://wa.me/55${selectedOrder.deliveryDetails.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-green-600 font-bold mt-2 hover:underline"
                      >
                        <Phone size={14} /> {selectedOrder.deliveryDetails.phone} (WhatsApp)
                      </a>
                    </div>
                  ) : (
                    <span className="italic text-gray-500">Dados de entrega não disponíveis.</span>
                  )}
                </div>
              </div>

              {/* BLOCK 3: PAYMENT */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-textSecondary uppercase tracking-wider">
                  <DollarSign size={16} /> Financeiro
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Método</span>
                    <span className="block text-gray-800 font-bold">
                      {selectedOrder.paymentMethod === 'CREDIT' ? 'CRÉDITO' :
                        selectedOrder.paymentMethod === 'DEBIT' ? 'DÉBITO' :
                          selectedOrder.paymentMethod === 'CASH' ? 'DINHEIRO' :
                            selectedOrder.paymentMethod === 'PIX' ? 'PIX' : 'PENDENTE'}
                    </span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                    <span className="block text-xs text-green-600 uppercase font-bold">Total Pago</span>
                    <span className="block text-green-800 font-bold text-lg">R$ {selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-border bg-background">
              <button onClick={() => setSelectedOrder(null)} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};