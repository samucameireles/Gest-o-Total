import React from 'react';
import { Order, PrinterSettings, StoreSettings } from '../types';

interface HiddenReceiptProps {
    order: Order;
    settings: PrinterSettings | null;
    storeSettings: StoreSettings;
}

export const HiddenReceipt: React.FC<HiddenReceiptProps> = ({ order, settings, storeSettings }) => {
    if (!order) return null;

    const separator = <div className="text-center w-full leading-none my-1 select-none overflow-hidden">------------------------------------------</div>;

    return (
        <div className="w-full mx-auto bg-white text-black p-0 m-0 font-mono text-[14pt] leading-tight flex flex-col items-center">
            {/* CABEÇALHO */}
            <div className="text-center w-full mb-1">
                {storeSettings?.logoUrl && settings?.print_logo && (
                    <img src={storeSettings.logoUrl} alt="Logo" className="w-16 h-16 mx-auto mb-1 grayscale" />
                )}
                <h1 className="font-bold text-[16pt] uppercase m-0 p-0 leading-none">{storeSettings?.name || 'ESTABELECIMENTO'}</h1>
                {storeSettings?.address && (
                    <p className="text-[12pt] break-words m-0 p-0 mt-1">{storeSettings.address}</p>
                )}
                {separator}
                <h2 className="font-bold text-[15pt] uppercase m-0 p-0">PEDIDO DE {order.type === 'DELIVERY' ? 'DELIVERY' : 'BALCÃO'}</h2>
                {separator}
            </div>

            {/* DADOS DO PEDIDO */}
            <div className="text-center w-full mb-1">
                <p className="m-0 p-0 uppercase"><strong>ID:</strong> #{order.displayId}</p>
                <p className="m-0 p-0 uppercase"><strong>DATA:</strong> {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                {order.customerName && <p className="m-0 p-0 uppercase"><strong>CLIENTE:</strong> {order.customerName}</p>}
                {order.tableName && <p className="m-0 p-0 uppercase"><strong>MESA:</strong> {order.tableName}</p>}
            </div>

            {separator}

            {/* ITENS */}
            <div className="w-full text-left mb-1">
                {order.items.map((item, idx) => {
                    const addOnsTotal = item.selectedAddOns?.reduce((sum, a) => sum + (a.price * a.quantity), 0) || 0;
                    const itemTotal = (item.price + addOnsTotal) * item.quantity;
                    return (
                        <div key={idx} className="mb-3 w-full">
                            <div className="flex justify-between items-start w-full text-[13pt] leading-tight">
                                <div className="flex-1 pr-2 uppercase">
                                    <strong>{item.quantity}UN</strong> {item.name}
                                </div>
                                <div className="font-bold whitespace-nowrap">
                                    {itemTotal.toFixed(2)}
                                </div>
                            </div>

                            {item.notes && (
                                <div className="pl-6 text-[12pt] leading-tight uppercase font-medium mt-[2px]">
                                    * {item.notes}
                                </div>
                            )}

                            {item.selectedAddOns && item.selectedAddOns.map((addon, aIdx) => (
                                <div key={aIdx} className="pl-6 text-[12pt] leading-tight uppercase font-medium mt-[2px]">
                                    + {addon.quantity}UN {addon.name}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {separator}

            {/* TOTAIS */}
            <div className="w-full text-right mb-1">
                {(order.deliveryFee > 0 || order.discount > 0) && (
                    <>
                        <p className="m-0 p-0 text-[14pt]">SUBTOTAL: R$ {(order.total - (order.deliveryFee || 0) + (order.discount || 0)).toFixed(2)}</p>
                        {order.deliveryFee > 0 && (
                            <p className="m-0 p-0 text-[14pt]">TAXA ENTREGA: R$ {order.deliveryFee.toFixed(2)}</p>
                        )}
                        {order.discount > 0 && (
                            <p className="m-0 p-0 text-[14pt]">DESCONTO: - R$ {order.discount.toFixed(2)}</p>
                        )}
                        {separator}
                    </>
                )}
                <p className="m-0 p-0 font-bold text-[16pt] uppercase mt-1">TOTAL: R$ {order.total.toFixed(2)}</p>
            </div>

            {separator}

            {/* ENTREGA */}
            {order.type === 'DELIVERY' && order.deliveryDetails && (
                <div className="mt-1 w-full text-center break-words">
                    <h3 className="font-bold uppercase mb-1 m-0 p-0 text-[15pt]">DADOS DE ENTREGA</h3>
                    <p className="m-0 p-0 uppercase">{order.deliveryDetails.street}, {order.deliveryDetails.number}</p>
                    {order.deliveryDetails.complement && <p className="m-0 p-0 uppercase">COMPL.: {order.deliveryDetails.complement}</p>}
                    <p className="m-0 p-0 uppercase">{order.deliveryDetails.neighborhood}</p>
                    <p className="m-0 p-0 mt-1 font-bold uppercase">TEL: {order.deliveryDetails.phone}</p>
                    {separator}
                </div>
            )}

            {/* RODA PÉ / CORTE */}
            <div className="mt-2 text-center text-[12pt] text-black pb-4 uppercase w-full">
                *** OBRIGADO PELA PREFERÊNCIA! ***
            </div>
        </div>
    );
};
