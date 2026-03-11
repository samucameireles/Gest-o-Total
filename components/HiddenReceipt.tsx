import React from 'react';
import { Order, PrinterSettings, StoreSettings } from '../types';

interface HiddenReceiptProps {
    order: Order;
    settings: PrinterSettings | null;
    storeSettings: StoreSettings;
}

export const HiddenReceipt: React.FC<HiddenReceiptProps> = ({ order, settings, storeSettings }) => {
    if (!order) return null;

    // Usa 80mm como padrão se não configurado
    const paperWidth = settings?.paper_size === '58mm' ? 'w-[58mm]' : 'w-[80mm]';

    return (
        <div className={`${paperWidth} mx-auto bg-white text-black p-0 m-0 font-mono text-xs leading-snug`}>
            {/* CABEÇALHO */}
            <div className="text-center mb-4">
                {storeSettings?.logoUrl && settings?.print_logo && (
                    <img src={storeSettings.logoUrl} alt="Logo" className="w-16 h-16 mx-auto mb-2 grayscale" />
                )}
                <h1 className="font-bold text-lg uppercase">{storeSettings?.name || 'ESTABELECIMENTO'}</h1>
                {storeSettings?.address && (
                    <p className="text-[10px] break-words">{storeSettings.address}</p>
                )}
                <div className="border-b border-black border-dashed my-2"></div>
                <h2 className="font-bold text-xl uppercase">PEDIDO DE {order.type === 'DELIVERY' ? 'DELIVERY' : 'BALCÃO'}</h2>
                <div className="border-b border-black border-dashed my-2"></div>
            </div>

            {/* DADOS DO PEDIDO */}
            <div className="mb-4">
                <p><strong>ID:</strong> #{order.displayId}</p>
                <p><strong>DATA:</strong> {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                {order.customerName && <p><strong>CLIENTE:</strong> {order.customerName}</p>}
                {order.tableName && <p><strong>MESA:</strong> {order.tableName}</p>}
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* ITENS */}
            <table className="w-full text-left mb-4">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-1">QTD/ITEM</th>
                        <th className="py-1 text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, idx) => {
                        const addOnsTotal = item.selectedAddOns?.reduce((sum, a) => sum + (a.price * a.quantity), 0) || 0;
                        const itemTotal = (item.price + addOnsTotal) * item.quantity;
                        return (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td className="py-1 whitespace-pre-wrap break-words pr-2">
                                        {item.quantity}UN {item.name}
                                    </td>
                                    <td className="py-1 text-right font-bold align-top whitespace-nowrap">
                                        {itemTotal.toFixed(2)}
                                    </td>
                                </tr>
                                {item.notes && (
                                    <tr>
                                        <td colSpan={2} className="text-[10px] pb-1 pl-4">* {item.notes}</td>
                                    </tr>
                                )}
                                {item.selectedAddOns && item.selectedAddOns.map((addon, aIdx) => (
                                    <tr key={aIdx}>
                                        <td colSpan={2} className="text-[10px] pb-1 pl-4">+ {addon.quantity}UN {addon.name}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* TOTAIS */}
            <div className="space-y-1 mb-4">
                {(order.deliveryFee > 0 || order.discount > 0) && (
                    <>
                        <div className="flex justify-between">
                            <span>SUBTOTAL</span>
                            <span>R$ {(order.total - (order.deliveryFee || 0) + (order.discount || 0)).toFixed(2)}</span>
                        </div>
                        {order.deliveryFee > 0 && (
                            <div className="flex justify-between">
                                <span>TAXA ENTREGA</span>
                                <span>R$ {order.deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        {order.discount > 0 && (
                            <div className="flex justify-between">
                                <span>DESCONTO</span>
                                <span>- R$ {order.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="border-b border-black border-dashed my-1"></div>
                    </>
                )}
                <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="border-b border-black border-dashed my-2"></div>

            {/* ENTREGA */}
            {order.type === 'DELIVERY' && order.deliveryDetails && (
                <div className="mt-4 break-words">
                    <h3 className="font-bold uppercase text-center mb-2">ENTREGA:</h3>
                    <p>{order.deliveryDetails.street}, {order.deliveryDetails.number}</p>
                    {order.deliveryDetails.complement && <p>COMPL.: {order.deliveryDetails.complement}</p>}
                    <p>{order.deliveryDetails.neighborhood}</p>
                    <p>TEL: {order.deliveryDetails.phone}</p>
                </div>
            )}

            {/* RODA PÉ / CORTE */}
            <div className="mt-8 text-center text-[10px] text-gray-500">
                - - - - - - - - - - - - - - - - -
            </div>
        </div>
    );
};
