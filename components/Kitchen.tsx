import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, Check, ArrowRight, Printer } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface KitchenProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onKitchenDismiss: (orderId: string) => void;
  onBulkPrepareToReady: () => void;
  onBulkKitchenDismiss: () => void;
}

export const Kitchen: React.FC<KitchenProps> = ({ orders, onUpdateStatus, onKitchenDismiss, onBulkPrepareToReady, onBulkKitchenDismiss }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // V10: Independent Kitchen View Logic
  // Left: Preparing
  const prepOrders = orders.filter(o => o && o.status === 'PREPARING').sort((a, b) => a.createdAt - b.createdAt);

  // Right: Ready AND NOT Dismissed by kitchen (regardless of payment/delivery status)
  const readyOrders = orders.filter(o => o && o.status === 'READY' && !o.kitchenDismissed).sort((a, b) => b.createdAt - a.createdAt);

  const getElapsedTime = (timestamp: number) => Math.floor((now - timestamp) / 60000);
  const getCardStyle = (minutes: number) => minutes > 20 ? 'border-l-danger bg-red-50' : minutes > 10 ? 'border-l-highlight bg-yellow-50' : 'border-l-success bg-white';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 h-full overflow-hidden">

      {/* Column 1: EM PREPARAÇÃO */}
      <div className="flex flex-col h-full bg-white rounded-3xl shadow-premium border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-background flex items-center justify-between">
          <h2 className="text-xl font-heading font-extrabold text-textPrimary flex items-center gap-2">
            <Clock className="text-highlight" /> EM PREPARAÇÃO ({prepOrders.length})
          </h2>
          {prepOrders.length > 0 && (
            <button
              onClick={onBulkPrepareToReady}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-textPrimary font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
            >
              Limpar tudo
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {prepOrders.map(order => {
            const minutes = getElapsedTime(order.createdAt);
            return (
              <div key={order.id} className={`bg-white border-l-[6px] rounded-r-xl shadow-sm p-4 ${getCardStyle(minutes)}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-heading font-black text-2xl text-textPrimary">#{order.displayId}</span>
                    <span className="text-xs uppercase font-bold text-textSecondary ml-2">
                      {order.type === 'DINE_IN' ? 'MESA' : order.type === 'PICKUP' ? 'RETIRADA' : 'DELIVERY'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`block font-mono text-xl font-bold leading-none ${minutes > 15 ? 'text-danger' : 'text-textPrimary'}`}>{minutes}'</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-3">
                  {order.customerName || order.tableName ? (
                    <p className="font-extrabold text-lg text-textPrimary leading-tight">
                      {order.type === 'DINE_IN' ? (order.tableName ? `Mesa: ${order.tableName}` : order.customerName) : order.customerName}
                    </p>
                  ) : null}

                  {order.type === 'DELIVERY' && (
                    <div className="mt-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
                      <div className="flex flex-wrap items-center gap-1 text-xs text-textSecondary">
                        <span>{order.deliveryDetails?.street}, {order.deliveryDetails?.number} {order.deliveryDetails?.complement ? `- ${order.deliveryDetails.complement}` : ''}</span>
                        {order.deliveryDetails?.neighborhood && (
                          <span className="font-black text-blue-700 bg-blue-100 border border-blue-200 px-1.5 rounded uppercase">{order.deliveryDetails.neighborhood}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="text-sm border-b border-dashed border-gray-100 last:border-0 pb-1">
                      <span className="font-bold text-textPrimary mr-2">{item.quantity}x</span>
                      <span className="text-textPrimary">{item.name}</span>
                      {item.notes && <div className="text-xs text-highlight font-bold italic ml-6">Obs: {item.notes}</div>}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-6 mt-1">
                          {item.selectedAddOns.map((addon, aIdx) => (
                            <span key={aIdx} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">+ {addon.quantity}x {addon.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateStatus(order.id, 'READY')}
                    className="flex-1 bg-success hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <CheckCircle size={18} /> PRONTO
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('printOrder', { detail: { order } }))}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    title="Imprimir Cupom"
                  >
                    <Printer size={18} /> IMPRIMIR
                  </button>
                </div>
              </div>
            );
          })}
          {prepOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-textSecondary opacity-40">
              <Clock size={40} className="mb-2" />
              <p>Sem pedidos na fila.</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: PRONTOS (Independent Flow) */}
      <div className="flex flex-col h-full bg-white rounded-3xl shadow-premium border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-background flex items-center justify-between">
          <h2 className="text-xl font-heading font-extrabold text-textPrimary flex items-center gap-2">
            <CheckCircle className="text-success" /> PRONTOS ({readyOrders.length})
          </h2>
          {readyOrders.length > 0 && (
            <button
              onClick={onBulkKitchenDismiss}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-textPrimary font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors"
            >
              Limpar tudo
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {readyOrders.map(order => (
            <div key={order.id} className="bg-white border border-border rounded-xl shadow-sm p-4 relative overflow-hidden group">
              {/* Color Coded Tag */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${order.type === 'DINE_IN' ? 'bg-blue-500' : order.type === 'PICKUP' ? 'bg-green-500' : 'bg-orange-500'}`}></div>

              <div className="flex justify-between items-center mb-3 mt-2">
                <span className="font-heading font-black text-2xl text-textPrimary">#{order.displayId}</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${order.type === 'DINE_IN' ? 'bg-blue-100 text-blue-700' : order.type === 'PICKUP' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {order.type === 'DINE_IN' ? 'MESA' : order.type === 'PICKUP' ? 'RETIRADA' : 'DELIVERY'}
                </span>
              </div>

              <div className="mb-4">
                <p className="font-bold text-textPrimary text-sm">{order.type === 'DINE_IN' ? (order.tableName ? `Mesa: ${order.tableName}` : order.customerName) : order.customerName}</p>
                {order.type === 'DELIVERY' && (
                  <div className="text-xs text-textSecondary overflow-hidden mt-1 bg-white p-2 rounded border border-gray-100">
                    <p className="truncate font-medium">{order.deliveryDetails ? `${order.deliveryDetails.street}, ${order.deliveryDetails.number} ${order.deliveryDetails.complement ? `- ${order.deliveryDetails.complement}` : ''}` : ''}</p>
                    {order.deliveryDetails?.complement && <p className="truncate text-xs text-amber-600 font-bold">{order.deliveryDetails.complement}</p>}
                    {/* V13: Highlight Neighborhood */}
                    {order.deliveryDetails?.neighborhood && <p className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-1 uppercase text-[10px]">{order.deliveryDetails.neighborhood}</p>}
                  </div>
                )}
              </div>

              {/* V10: Mandatory Items List in Right Column */}
              <div className="space-y-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-sm border-b border-dashed border-gray-200 last:border-0 pb-1">
                    <span className="font-bold text-textPrimary mr-2">{item.quantity}x</span>
                    <span className="text-textPrimary">{item.name}</span>
                    {item.notes && <div className="text-xs text-highlight font-bold italic ml-6">Obs: {item.notes}</div>}
                    {/* V12: Show AddOns in Ready Column too */}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-6 mt-1">
                        {item.selectedAddOns.map((addon, aIdx) => (
                          <span key={aIdx} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">+ {addon.quantity}x {addon.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* V10: Kitchen Dismiss ONLY */}
              <div className="flex gap-2">
                <button
                  onClick={() => onKitchenDismiss(order.id)}
                  className="flex-1 bg-textPrimary hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Check size={18} /> CONCLUIR
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('printOrder', { detail: { order } }))}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                  title="Imprimir Cupom"
                >
                  <Printer size={18} /> IMPRIMIR
                </button>
              </div>
            </div>
          ))}
          {readyOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-textSecondary opacity-40">
              <CheckCircle size={40} className="mb-2" />
              <p>Nenhum pedido aguardando.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};