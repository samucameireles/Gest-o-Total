import React, { useState } from 'react';
import { Truck, MapPin, Check, User, Bike, ChevronRight, Archive, CheckCircle, Printer } from 'lucide-react';
import { Order, Driver, OrderStatus } from '../types';

interface LogisticsProps {
  orders: Order[];
  drivers: Driver[];
  onAssignDriver: (orderId: string, driverId: string) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const Logistics: React.FC<LogisticsProps> = ({ orders, drivers, onAssignDriver, onUpdateStatus }) => {
  const [selectedOrderForAssignment, setSelectedOrderForAssignment] = useState<string | null>(null);

  // V10: STRICT FILTERING - Delivery ONLY
  // Ready orders appear here.
  const readyForDelivery = orders.filter(o =>
    o &&
    o.type === 'DELIVERY' &&
    o.status === 'READY' &&
    !o.assignedDriverId
  );

  const inTransit = orders.filter(o =>
    o &&
    o.type === 'DELIVERY' &&
    (o.status === 'READY' || o.status === 'DELIVERED') && // Include delivered temporarily or just ready/assigned? Usually transit is Ready+Assigned.
    o.assignedDriverId
  );

  const handleAssign = (driverId: string) => {
    if (selectedOrderForAssignment) {
      onAssignDriver(selectedOrderForAssignment, driverId);
      setSelectedOrderForAssignment(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Column 1: Expedição (Aguardando / Prontos) */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-3xl shadow-premium border border-border">
        <h3 className="font-heading font-extrabold text-textPrimary text-lg border-b border-border pb-4 flex items-center gap-2">
          <Truck className="text-highlight" /> Expedição (Delivery)
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {readyForDelivery.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-textSecondary opacity-50">
              <Check size={40} />
              <p className="mt-2 text-sm">Expedição vazia</p>
            </div>
          )}
          {readyForDelivery.map(order => (
            <div key={order.id} className="bg-background border border-border rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
              {/* V7 Yellow Badge */}
              <div className="bg-highlight text-white text-[10px] font-black uppercase tracking-widest text-center py-1 absolute top-0 left-0 right-0">
                PRONTO PARA ENTREGA
              </div>

              <div className="flex justify-between mb-3 mt-4">
                <span className="font-heading font-bold text-textPrimary text-lg">#{order.displayId}</span>
                <span className="text-xs font-bold text-textSecondary bg-white px-2 py-1 rounded shadow-sm">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2 mb-3 text-sm text-textPrimary font-medium">
                <User size={16} className="text-textSecondary" />
                <span>{order.deliveryDetails?.customerName || order.customerName}</span>
              </div>

              <div className="mb-3 text-xs text-textSecondary bg-white p-2 rounded border border-border">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex flex-col border-b border-border/50 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                    <div className="flex justify-between">
                      <span className="font-bold">{it.quantity}x {it.name}</span>
                    </div>
                    {it.selectedAddOns && it.selectedAddOns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {it.selectedAddOns.map((addon, aIdx) => (
                          <span key={aIdx} className="text-[9px] text-green-700 font-bold">+ {addon.quantity}x {addon.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {order.type === 'DELIVERY' && (
                <div className="flex items-start gap-2 mb-5 text-xs text-textSecondary bg-white p-3 rounded-lg border border-border">
                  <MapPin size={14} className="mt-0.5 text-accent" />
                  <span className="line-clamp-2">
                    {order.deliveryDetails
                      ? `${order.deliveryDetails.street}, ${order.deliveryDetails.number} ${order.deliveryDetails.complement ? `- ${order.deliveryDetails.complement}` : ''} - ${order.deliveryDetails.neighborhood}`
                      : 'Endereço não informado'}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedOrderForAssignment(order.id)}
                  className="flex-1 bg-textPrimary hover:bg-black text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
                >
                  Chamar Motoboy <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('printOrder', { detail: { order } }))}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center"
                  title="Imprimir Cupom"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: In Transit */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        <h3 className="font-heading font-extrabold text-textPrimary text-lg bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center gap-2">
          <Bike className="text-accent" /> Pedidos em Rota
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto pr-2 pb-20 content-start">
          {inTransit.length === 0 && <p className="text-textSecondary text-sm col-span-full text-center py-10">Nenhum pedido saindo para entrega agora.</p>}
          {inTransit.map(order => {
            const driver = drivers.find(d => d.id === order.assignedDriverId);
            const isDelivered = order.status === 'DELIVERED';
            return (
              <div key={order.id} className={`bg-white border ${isDelivered ? 'border-success/50 bg-green-50' : 'border-border'} rounded-2xl p-6 shadow-premium hover:border-accent transition-colors flex flex-col justify-between min-h-64`}>
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="font-heading font-black text-2xl text-textPrimary">#{order.displayId}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${isDelivered ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-accent border-blue-100'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isDelivered ? 'bg-green-600' : 'bg-accent animate-pulse'}`}></div>
                      {isDelivered ? 'ENTREGUE' : 'EM TRÂNSITO'}
                    </span>
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="text-textPrimary font-bold">{order.deliveryDetails?.customerName || order.customerName}</p>
                    <p className="text-textSecondary text-xs">
                      {order.deliveryDetails
                        ? `${order.deliveryDetails.street}, ${order.deliveryDetails.number} ${order.deliveryDetails.complement ? `- ${order.deliveryDetails.complement}` : ''}`
                        : 'Endereço não disponível'}
                    </p>
                    {order.deliveryDetails && <p className="text-textSecondary text-xs font-bold">{order.deliveryDetails.neighborhood}</p>}
                  </div>

                  <div className="flex items-center gap-3 bg-background p-3 rounded-xl border border-border">
                    <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-textSecondary shadow-sm">
                      <Bike size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-textSecondary">Responsável</p>
                      <p className="text-sm font-bold text-textPrimary">{driver?.name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {isDelivered ? (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'ARCHIVED')}
                      className="flex-1 bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Archive size={18} /> Arquivar
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
                      className="flex-1 bg-success hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Confirmar
                    </button>
                  )}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('printOrder', { detail: { order } }))}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center"
                    title="Imprimir Cupom"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Driver Selection */}
      {selectedOrderForAssignment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-background">
              <h3 className="text-xl font-heading font-bold text-textPrimary">Selecionar Entregador</h3>
              <p className="text-textSecondary text-sm mt-1">Pedido <span className="font-bold">#{orders.find(o => o.id === selectedOrderForAssignment)?.displayId}</span></p>
            </div>
            <div className="p-2 overflow-y-auto max-h-96">
              {drivers.filter(d => d.active).map(driver => (
                <button
                  key={driver.id}
                  onClick={() => handleAssign(driver.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-background rounded-2xl transition-colors group border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-colors text-textSecondary">
                      <User size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-textPrimary text-lg">{driver.name}</p>
                      <p className="text-xs text-textSecondary">{driver.deliveriesCount} entregas hoje</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-textSecondary">Comissão</p>
                    <p className="text-sm font-bold text-success">R$ {driver.commissionTotal.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-gray-50">
              <button
                onClick={() => setSelectedOrderForAssignment(null)}
                className="w-full bg-white border border-border hover:bg-gray-100 text-textPrimary font-bold py-3 rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};