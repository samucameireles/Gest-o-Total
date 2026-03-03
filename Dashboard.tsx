import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setTenant, supabase } from './lib/supabase';
import { Loader2, Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { POS } from './components/POS';
import { Kitchen } from './components/Kitchen';
import { Inventory } from './components/Inventory';
import { Logistics } from './components/Logistics';
import { Reports } from './components/Reports';
import { Motoboys } from './components/Motoboys';
import { Settings } from './components/Settings';
import { CRM } from './components/CRM';
import { CashFlow } from './components/CashFlow';
import { Order, CartItem, OrderType, PaymentMethod, Ingredient, OrderStatus, Driver, Product, NeighborhoodFee, DeliveryDetails, StoreSettings, Unit, Customer, Coupon, WasteLog, AddOn, CashRegisterSession, CashTransaction, DailyHistory, PrinterSettings } from './types';
import { INITIAL_INVENTORY, RECIPES, DRIVERS, PRODUCTS, INITIAL_ADDONS } from './constants';
import { PrinterService } from './services/PrinterService';

import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

export default function Dashboard() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { user } = useAuth(); // Needed for ID

    const handleUpdateSettings = async (s: StoreSettings) => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('tenants').update({
                name: s.name,
                logo_url: s.logoUrl,
                logo_path: s.logoPath,
                theme_color: s.themeColor,
                settings: {
                    ...(s.menu ? { menu: s.menu } : {}),
                    logoUrl: s.logoUrl,
                    address: s.address,
                    googleMapsUrl: s.googleMapsUrl,
                    operatingHours: s.operatingHours
                }
            }).eq('id', selectedUnit.id);
            if (error) throw error;
            setStoreSettings(s);
            setSelectedUnit(prev => prev ? { ...prev, name: s.name, logoUrl: s.logoUrl, logoPath: s.logoPath, themeColor: s.themeColor } : null);
        } catch (err: any) {
            console.error('Error updating settings:', err);
            alert('Erro ao atualizar configurações: ' + err.message);
        }
    };

    const [activeTab, setActiveTab] = useState('pos');
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isDark = theme === 'dark';

    // --- POS & Printing State ---
    const [orders, setOrders] = useState<Order[]>([]);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [orderSequence, setOrderSequence] = useState<number>(1);
    const [inventory, setInventory] = useState<Ingredient[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [neighborhoodFees, setNeighborhoodFees] = useState<NeighborhoodFee[]>([]);
    const [storeSettings, setStoreSettings] = useState<StoreSettings>({ name: '', logoUrl: '' });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [categorias, setCategorias] = useState<{ id: string, label: string }[]>([]);
    const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);
    const [dailyHistory, setDailyHistory] = useState<any[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
    const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({
        customerName: '',
        phone: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: ''
    });
    const [dineInName, setDineInName] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT');
    const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');
    const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(null);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const printedOrdersRef = React.useRef<Set<string>>(new Set());

    // --- WhatsApp Notification State ---
    const [whatsappToast, setWhatsappToast] = useState<{
        phone: string;
        message: string;
        customerName: string;
    } | null>(null);

    // --- WhatsApp Notification Logic ---
    const triggerWhatsAppNotification = (order: Order, triggerType: 'PREPARING' | 'DELIVERY') => {
        try {
            // Segura a extração do telefone (trata delivery e presencial)
            const phone = (order as any)?.customer?.phone || order?.deliveryDetails?.phone || (order.customerName ? customers.find(c => c.name === order.customerName)?.phone : null);

            if (!phone) return; // Regra de Ouro: Sem telefone, não faz nada silenciosamente.

            const nome = order?.customerName || order?.deliveryDetails?.customerName || 'Cliente';
            const itens = order?.items?.map(i => i.name || 'Item').join(', ') || 'Seu pedido';
            const endereco = order?.deliveryDetails ? `${order.deliveryDetails.street}, ${order.deliveryDetails.number} - ${order.deliveryDetails.neighborhood}` : 'Endereço cadastrado';

            // Dados Financeiros
            const rawTotal = order?.total || (order as any)?.total_amount || 0;
            const formatTotal = typeof rawTotal === 'number'
                ? rawTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : 'R$ 0,00';

            // Mapeamento de Pagamento para Português
            let payment = order?.paymentMethod || (order as any)?.payment_method || 'A confirmar';
            if (payment === 'CREDIT' || payment === 'credit_card') payment = 'Cartão de Crédito';
            if (payment === 'DEBIT' || payment === 'debit_card') payment = 'Cartão de Débito';
            if (payment === 'CASH' || payment === 'cash' || payment === 'money') payment = 'Dinheiro';
            if (payment === 'PIX' || payment === 'pix') payment = 'PIX';
            if (payment === 'PENDING') payment = 'A cobrar na entrega';

            // Nome da Loja (Segurança: fallback garantido)
            const nomeLoja = storeSettings?.name || selectedUnit?.name || 'O Restaurante';

            let text = '';
            if (triggerType === 'PREPARING') {
                const l1 = `*${nomeLoja}* informa: %0A*${nome}* seu pedido começou a ser preparado! 🔥`;
                const l2 = `Assim que sair para entrega eu te aviso!`;
                text = l1 + "%0A%0A" + l2;
            } else if (triggerType === 'DELIVERY') {
                const enderecoCompleto = order?.deliveryDetails
                    ? `${order.deliveryDetails.street || 'Rua'}, ${order.deliveryDetails.number || 'S/N'} - ${order.deliveryDetails.neighborhood || 'Bairro'}`
                    : 'Retirada / Balcão';

                const financeiro = `R$ ${formatTotal} (${payment})`;

                const linhas = [
                    `*${nomeLoja}* informa:`,
                    `*${nome}* seu pedido saiu para entrega! 🛵`,
                    "",
                    `📦 *Resumo:* ${itens}`,
                    `📍 *Indo para:* ${enderecoCompleto}`,
                    `💰 *Total:* ${financeiro}`,
                    "",
                    "Fique de olho na campainha!"
                ];

                text = linhas.join('\n');
            }

            if (text) {
                setWhatsappToast({
                    phone: phone.replace(/\D/g, ''),
                    message: encodeURIComponent(text),
                    customerName: nome
                });
            }
        } catch (e) {
            console.error('Error triggering WhatsApp notification:', e);
            // Regra de Ouro: Em caso de erro ao montar texto, loga e continua normal, evita tela branca
        }
    };

    // --- Printer Configuration Handler ---
    useEffect(() => {
        if (!tenantId) return;
        supabase.from('printer_settings').select('*').eq('tenant_id', tenantId).single().then(({ data }) => {
            if (data) setPrinterSettings(data as PrinterSettings);
        });
    }, [tenantId]);



    // --- Entity Management (Hoisted for Effects) ---
    const handleFetchOrderDetails = React.useCallback(async (displayId: number): Promise<Order | null> => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        products (*),
                        order_item_addons (
                            *,
                            addons (*)
                        )
                    )
                `)
                .eq('tenant_id', tenantId) // use tenantId from params
                .eq('display_id', displayId)
                .single();

            if (error || !data) return null;

            return {
                id: data.id,
                displayId: data.display_id,
                total: data.total,
                discount: data.discount,
                status: data.status,
                type: data.type,
                isPaid: data.is_paid,
                kitchenDismissed: data.kitchen_dismissed,
                deliveryDetails: data.delivery_details,
                paymentMethod: data.payment_method,
                createdAt: new Date(data.created_at).getTime(),
                assignedDriverId: data.driver_id,
                customerName: data.customer_name || (data.type === 'DELIVERY' ? data.delivery_details?.customerName : ''),
                tableName: data.table_name,
                receivedAmount: data.received_amount,
                changeAmount: data.change_amount,
                deliveryFee: data.delivery_fee || 0,
                items: (data.order_items || []).map((oi: any) => ({
                    ...oi.products,
                    cartId: oi.id,
                    quantity: oi.quantity,
                    price: oi.price_at_time,
                    notes: oi.notes,
                    selectedAddOns: (oi.order_item_addons || []).map((oia: any) => ({
                        ...oia.addons,
                        price: oia.price_at_time,
                        quantity: oia.quantity
                    }))
                }))
            };
        } catch (err: any) {
            console.error('Error fetching order details:', err);
            return null;
        }
    }, [tenantId]);



    const fetchOrders = React.useCallback(async () => {
        if (!tenantId) return;
        const { data: ords } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (*),
                    order_item_addons (
                        *,
                        addons (*)
                    )
                )
            `)
            .eq('tenant_id', tenantId)
            // Fetch all orders for the dashboard reports to be accurate. 
            // We can limit this later if the database grows too large.
            .order('created_at', { ascending: false });

        if (ords) {
            const mappedOrders: Order[] = ords.map(o => ({
                id: o.id,
                displayId: o.display_id,
                total: o.total,
                discount: o.discount,
                status: o.status,
                type: o.type,
                isPaid: o.is_paid,
                kitchenDismissed: o.kitchen_dismissed,
                deliveryDetails: o.delivery_details,
                paymentMethod: o.payment_method,
                createdAt: new Date(o.created_at).getTime(),
                assignedDriverId: o.driver_id,
                customerName: o.customer_name || (o.type === 'DELIVERY' ? o.delivery_details?.customerName : ''),
                tableName: o.table_name,
                receivedAmount: o.received_amount,
                changeAmount: o.change_amount,
                deliveryFee: o.delivery_fee || 0,
                items: (o.order_items || []).map((oi: any) => ({
                    ...oi.products,
                    cartId: oi.id,
                    quantity: oi.quantity,
                    price: oi.price_at_time,
                    notes: oi.notes,
                    selectedAddOns: (oi.order_item_addons || []).map((oia: any) => ({
                        ...oia.addons,
                        price: oia.price_at_time,
                        quantity: oia.quantity
                    }))
                }))
            }));
            setOrders(mappedOrders);

            // Synchronize Order Sequence
            const maxId = ords.reduce((max, o) => Math.max(max, o.display_id), 0);
            setOrderSequence(maxId + 1);
        }
    }, [tenantId]);

    // Real-time Updates Effect
    useEffect(() => {
        if (!tenantId) return;

        // Initial fetch handled by main useEffect, but we could also put it here
        // to be completely isolated. However, keeping logic centralized is better.

        const channel = supabase
            .channel(`dashboard-orders-global`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                (payload: any) => {
                    console.log('Realtime change detected:', payload);
                    const newOrder = payload.new;
                    const oldOrder = payload.old;
                    if ((newOrder && newOrder.tenant_id === tenantId) || (oldOrder && oldOrder.tenant_id === tenantId)) {
                        fetchOrders();

                        // Automated Thermal Printing for NEW orders (e.g., from Online Menu)
                        if (payload.eventType === 'INSERT' && newOrder.status === 'PREPARING') {
                            setTimeout(async () => {
                                if (printedOrdersRef.current.has(newOrder.id)) return;
                                const fullOrder = await handleFetchOrderDetails(newOrder.display_id);
                                if (fullOrder) {
                                    PrinterService.sendToPrinter(fullOrder, printerSettings, storeSettings).catch(e => console.error('Auto-print error:', e));
                                    printedOrdersRef.current.add(fullOrder.id);
                                }
                            }, 2500); // 2.5s delay to allow item inserts to complete
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, fetchOrders, printerSettings, storeSettings]);

    // --- Effects ---


    // (Persistence Logic below)



    // --- POS Persistence Effects ---
    useEffect(() => {
        if (!tenantId) return;

        const cartKey = `gestao_total_pos_${tenantId}_cart`;
        const typeKey = `gestao_total_pos_${tenantId}_orderType`;
        const formKey = `gestao_total_pos_${tenantId}_deliveryForm`;
        const nameKey = `gestao_total_pos_${tenantId}_dineInName`;
        const custKey = `gestao_total_pos_${tenantId}_selectedCustomer`;
        const checkoutKey = `gestao_total_pos_${tenantId}_showCheckout`;
        const payKey = `gestao_total_pos_${tenantId}_paymentMethod`;
        const couponKey = `gestao_total_pos_${tenantId}_appliedCoupon`;
        const amountKey = `gestao_total_pos_${tenantId}_receivedAmountStr`;

        const savedCart = localStorage.getItem(cartKey);
        const savedOrderType = localStorage.getItem(typeKey);
        const savedDeliveryForm = localStorage.getItem(formKey);
        const savedDineInName = localStorage.getItem(nameKey);
        const savedSelectedCustomer = localStorage.getItem(custKey);
        const savedShowCheckout = localStorage.getItem(checkoutKey);
        const savedPaymentMethod = localStorage.getItem(payKey);
        const savedAppliedCoupon = localStorage.getItem(couponKey);
        const savedReceivedAmountStr = localStorage.getItem(amountKey);

        if (savedCart && savedCart !== 'undefined') setCart(JSON.parse(savedCart));
        if (savedOrderType) setOrderType(savedOrderType as OrderType);
        if (savedDeliveryForm && savedDeliveryForm !== 'undefined') setDeliveryForm(JSON.parse(savedDeliveryForm));
        if (savedDineInName) setDineInName(savedDineInName);
        if (savedSelectedCustomer && savedSelectedCustomer !== 'undefined') setSelectedCustomer(JSON.parse(savedSelectedCustomer));
        if (savedShowCheckout) setShowCheckout(savedShowCheckout === 'true');
        if (savedPaymentMethod) setPaymentMethod(savedPaymentMethod as PaymentMethod);
        if (savedAppliedCoupon && savedAppliedCoupon !== 'undefined') setAppliedCoupon(JSON.parse(savedAppliedCoupon));
        if (savedReceivedAmountStr) setReceivedAmountStr(savedReceivedAmountStr);
    }, [tenantId]);



    useEffect(() => {
        if (!tenantId) return;

        const cartKey = `gestao_total_pos_${tenantId}_cart`;
        const typeKey = `gestao_total_pos_${tenantId}_orderType`;
        const formKey = `gestao_total_pos_${tenantId}_deliveryForm`;
        const nameKey = `gestao_total_pos_${tenantId}_dineInName`;
        const custKey = `gestao_total_pos_${tenantId}_selectedCustomer`;
        const checkoutKey = `gestao_total_pos_${tenantId}_showCheckout`;
        const payKey = `gestao_total_pos_${tenantId}_paymentMethod`;
        const couponKey = `gestao_total_pos_${tenantId}_appliedCoupon`;
        const amountKey = `gestao_total_pos_${tenantId}_receivedAmountStr`;

        localStorage.setItem(cartKey, JSON.stringify(cart));
        localStorage.setItem(typeKey, orderType);
        localStorage.setItem(formKey, JSON.stringify(deliveryForm));
        localStorage.setItem(nameKey, dineInName);
        localStorage.setItem(custKey, JSON.stringify(selectedCustomer));
        localStorage.setItem(checkoutKey, String(showCheckout));
        localStorage.setItem(payKey, paymentMethod);
        localStorage.setItem(couponKey, JSON.stringify(appliedCoupon));
        localStorage.setItem(amountKey, receivedAmountStr);
    }, [cart, orderType, deliveryForm, dineInName, selectedCustomer, showCheckout, paymentMethod, appliedCoupon, receivedAmountStr, tenantId]);

    const resetPOSState = () => {
        setCart([]);
        setAppliedCoupon(null);
        setDineInName('');
        setDeliveryForm({
            customerName: '',
            phone: '',
            street: '',
            number: '',
            neighborhood: ''
        });
        setSelectedCustomer(null);
        setShowCheckout(false);
        setPaymentMethod('CREDIT');
        setReceivedAmountStr('');

        if (tenantId) {
            localStorage.removeItem(`gestao_total_pos_${tenantId}_cart`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_deliveryForm`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_dineInName`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_selectedCustomer`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_showCheckout`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_paymentMethod`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_appliedCoupon`);
            localStorage.removeItem(`gestao_total_pos_${tenantId}_receivedAmountStr`);
        }
    };

    useEffect(() => {
        if (!selectedUnit) return;
        // Settings are now loaded in fetchTenantData
    }, [selectedUnit]);

    // Save effects for localStorage removed for a true transparent migration to the cloud.

    // --- Core Actions ---

    // Cash Flow Handlers
    const activeSession = cashSessions.find(s => s.status === 'OPEN') || null;

    const handleOpenCash = async (initialAmount: number) => {
        if (!selectedUnit) return;

        // Double check for any open sessions in the database before proceeding
        const { data: openCheck } = await supabase.from('caixas')
            .select('id')
            .eq('tenant_id', selectedUnit.id)
            .eq('status', 'aberto')
            .limit(1);

        if (openCheck && openCheck.length > 0) {
            alert('Já existe um caixa aberto no banco de dados. Atualize a página.');
            return;
        }

        if (activeSession) {
            alert('Já existe um caixa aberto!');
            return;
        }
        try {
            const { data, error } = await supabase.from('caixas').insert([{
                valor_inicial: initialAmount,
                status: 'aberto',
                operador_id: user?.id,
                aberto_em: new Date().toISOString(),
                tenant_id: selectedUnit.id
            }]).select().single();

            if (error) throw error;
            if (data) {
                setCashSessions(prev => [{
                    id: data.id,
                    openedAt: new Date(data.aberto_em).getTime(),
                    initialAmount: data.valor_inicial,
                    status: 'OPEN',
                    transactions: []
                } as any, ...prev]);
                alert('Caixa aberto com sucesso!');
            }
        } catch (err: any) {
            console.error('Error opening cash:', err);
            alert('Erro ao abrir caixa: ' + (err.message || 'Erro desconhecido'));
        }
    };

    const handleCloseDay = async () => {
        if (!selectedUnit) return;
        if (!activeSession) {
            alert('Abra e feche o caixa antes de encerrar o dia de forma administrativa.');
            return;
        }

        if (!window.confirm('TEM CERTEZA QUE DESEJA ENCERRAR O EXPEDIENTE? Isso irá arquivar as vendas de hoje e salvar o relatório no banco de dados.')) {
            return;
        }

        try {
            // 1. Prepare Daily Snapshot
            const now = new Date();
            const snapshotDate = new Date();
            if (now.getHours() < 6) {
                snapshotDate.setDate(snapshotDate.getDate() - 1);
            }
            const today = snapshotDate.toLocaleDateString('pt-BR').split('/').reverse().join('-');

            // V17: Inclusive metrics - count ALL business volume, not just paid cash. 
            // This ensures Dashboard 'Total Sales' matches the actual items sold.
            const validOrders = orders.filter(o => o.status !== 'CANCELLED');

            const totalSales = validOrders.reduce((acc, o) => acc + o.total, 0);
            const totalOrders = validOrders.length;
            const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

            const paymentMethods: PaymentMethod[] = ['CREDIT', 'DEBIT', 'CASH', 'PIX'];
            const paymentMethodsMap = paymentMethods.reduce((acc, method) => {
                acc[method] = validOrders.filter(o => o.paymentMethod === method).reduce((sum, o) => sum + o.total, 0);
                return acc;
            }, {} as Record<PaymentMethod, number>);

            const historyData: Partial<DailyHistory> = {
                date: today,
                orders: orders, // Full snapshot of today's orders
                metrics: {
                    totalSales,
                    totalOrders,
                    averageTicket,
                    paymentMethods: paymentMethodsMap
                },
                cashSessions: cashSessions.filter(s => s.status === 'OPEN'),
                drivers: drivers.map(d => ({ ...d })),
                closedAt: Date.now(),
                closedBy: user?.email || 'Unknown'
            };

            // 2. Save Snapshot to Supabase
            // Removing the non-existent 'data' column and fixing types for timestamptz columns
            const { error: histError } = await supabase.from('daily_history').insert([{
                tenant_id: selectedUnit.id,
                reference_date: new Date(today + 'T00:00:00Z').toISOString(),
                closed_at: new Date(historyData.closedAt!).toISOString(),
                closed_by: historyData.closedBy,
                orders: historyData.orders,
                metrics: historyData.metrics,
                cash_sessions: historyData.cashSessions,
                drivers: historyData.drivers
            }]);

            if (histError) throw histError;

            // 3. Archive all orders in DB
            const { error: archiveError } = await supabase
                .from('orders')
                .update({ status: 'ARCHIVED' })
                .eq('tenant_id', selectedUnit.id)
                .neq('status', 'ARCHIVED');

            if (archiveError) throw archiveError;

            setOrders([]);
            setOrderSequence(1);
            setDailyHistory(prev => [{ id: today, date: today, ...historyData }, ...prev]);
            setCashSessions(prev => prev.map(s => s.status === 'OPEN' ? { ...s, status: 'CLOSED' } : s));
            setWasteLogs([]);

            alert('EXPEDIENTE ENCERRADO COM SUCESSO! Relatório salvo e pedidos arquivados.');
        } catch (err: any) {
            console.error('Error closing day:', err);
            alert('Erro ao encerrar expediente: ' + err.message);
        }
    };

    const handleCloseCash = async (finalAmount: number, notes: string) => {
        if (!activeSession) return;
        try {
            const openedAtTime = new Date(activeSession.openedAt).getTime();

            // V17: Robust Last Closure Detection - find the most recent closure BEFORE this session opened
            const lastClosure = [...cashSessions]
                .filter(h => h.status === 'CLOSED' && h.closedAt && h.closedAt < (openedAtTime - 1000))
                .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0))[0];

            const lastClosureTime = lastClosure && lastClosure.closedAt ? lastClosure.closedAt : 0;
            const effectiveStart = Math.max(openedAtTime - (12 * 60 * 60 * 1000), lastClosureTime);
            const buffer = 5 * 60 * 1000;

            const combinedOrders = [...orders, ...(dailyHistory.flatMap(h => h.orders || []))];
            const deduplicated = new Map();
            combinedOrders.forEach(o => { if (o && o.id) deduplicated.set(o.id, o); });

            const sessionOrders = Array.from(deduplicated.values()).filter((o: any) => {
                const orderTime = new Date(o.createdAt).getTime();
                return orderTime >= effectiveStart &&
                    orderTime <= (new Date().getTime() + buffer) &&
                    o.status !== 'CANCELLED';
            });

            const totalSales = sessionOrders.reduce((sum, o) => sum + o.total, 0);
            const salesByMethod = sessionOrders.reduce((acc, o) => {
                acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
                return acc;
            }, {} as Record<PaymentMethod, number>);

            // Fetch transactions from DB or use local state if synchronized
            const { data: txs } = await supabase.from('movimentacoes_caixa').select('*').eq('caixa_id', activeSession.id);
            const totalSupply = txs?.filter(t => t.type === 'SUPPLY').reduce((sum, t) => sum + t.amount, 0) || 0;
            const totalBleed = txs?.filter(t => t.type === 'BLEED').reduce((sum, t) => sum + t.amount, 0) || 0;

            const calculatedAmount = activeSession.initialAmount + totalSupply - totalBleed + (salesByMethod['CASH'] || 0);

            const { error } = await supabase.from('caixas').update({
                status: 'fechado',
                fechado_em: new Date().toISOString(),
                valor_final: finalAmount,
                calculated_amount: calculatedAmount,
                observacoes: notes,
                total_sales: totalSales,
                total_money: salesByMethod['CASH'] || 0,
                total_card_credit: salesByMethod['CREDIT'] || 0,
                total_card_debit: salesByMethod['DEBIT'] || 0,
                total_pix: salesByMethod['PIX'] || 0
            }).eq('id', activeSession.id);

            if (error) throw error;

            setCashSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, status: 'CLOSED', finalAmount, calculatedAmount } as any : s));
            alert('Caixa fechado com sucesso!');
        } catch (err: any) {
            console.error('Error closing cash:', err);
            alert('Erro ao fechar caixa: ' + (err.message || 'Erro desconhecido'));
        }
    };

    const handleAddTransaction = async (type: 'SUPPLY' | 'BLEED', amount: number, description: string) => {
        if (!activeSession || !selectedUnit) return;
        try {
            const mappedTipo = type === 'BLEED' ? 'Sangria' : 'Suprimento';
            const { data, error } = await supabase.from('movimentacoes_caixa').insert([{
                caixa_id: activeSession.id,
                tipo: mappedTipo,
                valor: amount,
                descricao: description,
                data_hora: new Date().toISOString(),
                responsavel: user?.email || 'Unknown',
                tenant_id: selectedUnit.id
            }]).select().single();

            if (error) throw error;
            if (data) {
                setCashSessions(prev => prev.map(s => s.id === activeSession.id ? {
                    ...s,
                    transactions: [...(s.transactions || []), {
                        id: data.id,
                        type: data.tipo === 'Sangria' ? 'BLEED' : 'SUPPLY',
                        amount: data.valor,
                        description: data.descricao,
                        timestamp: new Date(data.data_hora).getTime(),
                        userId: data.responsavel
                    } as any]
                } : s));
                alert('Movimentação registrada!');
            }
        } catch (err: any) {
            console.error('Error adding transaction:', err);
            alert('Erro ao registrar movimentação: ' + (err.message || 'Erro desconhecido'));
        }
    };

    const handlePlaceOrder = async (items: CartItem[], type: OrderType, paymentMethod: PaymentMethod, deliveryDetails?: DeliveryDetails, dineInName?: string, tableName?: string, sendToKitchenOnly?: boolean, receivedAmount?: number, changeAmount?: number, discount: number = 0, deliveryFee: number = 0, editingOrderId?: string | null) => {
        if (!selectedUnit || isPlacingOrder) return;
        if (!activeSession) {
            alert('O caixa está FECHADO. Abra o caixa antes de realizar vendas.');
            return;
        }

        setIsPlacingOrder(true);
        try {
            let currentId = 0;
            let orderIdStr = editingOrderId;

            if (!editingOrderId) {
                // Nova venda
                const { data: lastOrder } = await supabase.from('orders').select('display_id').order('display_id', { ascending: false }).limit(1).maybeSingle();
                currentId = (lastOrder?.display_id || 0) + 1;
                setOrderSequence(currentId + 1);
            } else {
                // Edição
                const existingOrder = orders.find(o => o.id === editingOrderId);
                if (existingOrder) currentId = existingOrder.displayId;
            }

            const subtotal = items.reduce((acc, item) => {
                const addOnsTotal = item.selectedAddOns?.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0) || 0;
                return acc + ((item.price + addOnsTotal) * item.quantity);
            }, 0);

            const orderTotal = subtotal - discount + deliveryFee;

            if (!editingOrderId) {
                // 1. Insert Order
                const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                    tenant_id: selectedUnit.id,
                    display_id: currentId,
                    type,
                    payment_method: paymentMethod,
                    delivery_details: deliveryDetails,
                    status: 'PREPARING',
                    is_paid: paymentMethod !== 'PENDING',
                    total: orderTotal,
                    discount: discount,
                    delivery_fee: deliveryFee,
                    customer_id: undefined,
                    customer_name: type === 'DELIVERY' ? deliveryDetails?.customerName : dineInName,
                    table_name: tableName,
                    kitchen_dismissed: false
                }]).select().single();

                if (orderError) throw orderError;
                orderIdStr = orderData.id;
            } else {
                // 1B. Update Order
                const { error: orderError } = await supabase.from('orders').update({
                    type,
                    payment_method: paymentMethod,
                    delivery_details: deliveryDetails,
                    is_paid: paymentMethod !== 'PENDING' ? true : false,
                    total: orderTotal,
                    discount: discount,
                    delivery_fee: deliveryFee,
                    customer_name: type === 'DELIVERY' ? deliveryDetails?.customerName : dineInName,
                    table_name: tableName,
                    // keep existing status and kitchen_dismissed
                }).eq('id', editingOrderId);

                if (orderError) throw orderError;

                // Clear old items before inserting new ones
                await supabase.from('order_items').delete().eq('order_id', editingOrderId);
            }

            // 2. Insert Items (Batch)
            const itemsToInsert = items.map(item => ({
                tenant_id: selectedUnit.id,
                order_id: orderIdStr,
                product_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price,
                notes: item.notes
            }));

            const { data: insertedItems, error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert)
                .select();

            if (itemsError) throw itemsError;

            // 3. Insert AddOns (Batch)
            const addonsToInsert: any[] = [];
            items.forEach((item, index) => {
                if (item.selectedAddOns && item.selectedAddOns.length > 0) {
                    const orderItemId = insertedItems[index].id;
                    item.selectedAddOns.forEach(addon => {
                        addonsToInsert.push({
                            tenant_id: selectedUnit.id,
                            order_item_id: orderItemId,
                            addon_id: addon.id,
                            price_at_time: addon.price,
                            quantity: addon.quantity
                        });
                    });
                }
            });

            if (addonsToInsert.length > 0) {
                const { error: addonsError } = await supabase.from('order_item_addons').insert(addonsToInsert);
                if (addonsError) throw addonsError;
            }

            // 4. Update State & Inventory
            const newOrder: Order = {
                id: orderIdStr as string,
                displayId: currentId,
                items,
                total: orderTotal,
                discount: discount,
                deliveryFee: deliveryFee,
                status: 'PREPARING',
                isPaid: paymentMethod !== 'PENDING',
                kitchenDismissed: false,
                type,
                paymentMethod,
                deliveryDetails,
                customerName: type === 'DELIVERY' ? deliveryDetails?.customerName : dineInName,
                tableName,
                createdAt: Date.now(),
                receivedAmount,
                changeAmount
            };

            // Deduplication & Upsert: Real-time might have already added this order (potentially incomplete)
            // We overwrite it with our full local data (including all items and add-ons)
            setOrders(prev => {
                const filtered = prev.filter(o => o.id !== newOrder.id);
                return [newOrder, ...filtered];
            });

            // Update Inventory logic (Optimized Stock Updates)
            const deducoesEstoque: Record<string, number> = {};
            items.forEach(item => {
                const itemQty = Number(item.quantity) || 0;
                // 1. Lanche Base
                let productRecipe = item.recipe || RECIPES[item.id];
                if (productRecipe) {
                    productRecipe.forEach(recipeItem => {
                        const currentVal = deducoesEstoque[recipeItem.ingredientId] || 0;
                        const recipeAmount = Number(recipeItem.amount) || 0;
                        deducoesEstoque[recipeItem.ingredientId] = currentVal + (recipeAmount * itemQty);
                    });
                }

                // 2. Adicionais (V18: Inventory Link)
                if (item.selectedAddOns && Array.isArray(item.selectedAddOns) && item.selectedAddOns.length > 0) {
                    item.selectedAddOns.forEach(addon => {
                        // Procurar o vínculo real. O AddOn que está no carrinho tem o ingredientId mapeado nele? 
                        const activeAddonDef = addOns.find(a => a.id === addon.id);
                        if (activeAddonDef && activeAddonDef.ingredientId) {
                            const currentVal = deducoesEstoque[activeAddonDef.ingredientId] || 0;
                            const addonQty = Number(addon.quantity) || 0;
                            // Quantidade consumida = qtd do lanche * qtd do adicional escolhido
                            deducoesEstoque[activeAddonDef.ingredientId] = currentVal + (addonQty * itemQty);
                        }
                    });
                }
            });

            for (const [ingId, amount] of Object.entries(deducoesEstoque)) {
                const ing = inventory.find(i => i.id === ingId);
                if (ing) {
                    await handleUpdateStock(ingId, ing.currentStock - amount);
                }
            }

            // Clear POS State logic
            setCart([]);
            setOrderType('DINE_IN');
            setDeliveryForm({ customerName: '', phone: '', street: '', number: '', complement: '', neighborhood: '' });
            setDineInName('');
            setSelectedCustomer(undefined);
            setAppliedCoupon(undefined);
            setShowCheckout(false);
            setPaymentMethod('PIX');
            setReceivedAmountStr('');

            // 5. Automatic Dispatch to Printer (Immediate for POS operator)
            if (newOrder.id) printedOrdersRef.current.add(newOrder.id);
            PrinterService.sendToPrinter(newOrder, printerSettings, storeSettings).catch(e => console.error('Print failure:', e));
        } catch (err: any) {
            console.error('Error placing order:', err);
            alert('Erro ao realizar pedido: ' + err.message);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handlePayOrder = async (orderId: string, paymentMethod: PaymentMethod, discount: number, receivedAmount?: number, changeAmount?: number) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;
            const newTotal = order.total - discount;
            const { error } = await supabase.from('orders').update({
                is_paid: true,
                payment_method: paymentMethod,
                discount: discount,
                total: newTotal
            }).eq('id', orderId);
            if (error) throw error;

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isPaid: true, paymentMethod, discount, total: newTotal, receivedAmount, changeAmount } : o));
        } catch (err: any) { console.error('Error paying order:', err); }
    };

    const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
            if (error) throw error;
            setOrders(prev => {
                const updatedOrders = prev.map(o => o.id === orderId ? { ...o, status } : o);

                // Dispara notificação se mudou para PREPARING
                if (status === 'PREPARING') {
                    const changedOrder = updatedOrders.find(o => o.id === orderId);
                    if (changedOrder) {
                        triggerWhatsAppNotification(changedOrder, 'PREPARING');
                    }
                }

                return updatedOrders;
            });
        } catch (err) { console.error('Error updating status:', err); }
    };

    const handleKitchenDismiss = async (orderId: string) => {
        try {
            const { error } = await supabase.from('orders').update({ kitchen_dismissed: true }).eq('id', orderId);
            if (error) throw error;
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kitchenDismissed: true } : o));
        } catch (err) { console.error('Error kitchen dismiss:', err); }
    }

    const handleBulkPrepareToReady = async () => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('orders')
                .update({ status: 'READY' })
                .eq('tenant_id', selectedUnit.id)
                .eq('status', 'PREPARING');
            if (error) throw error;
            setOrders(prev => prev.map(o => o.status === 'PREPARING' ? { ...o, status: 'READY' } : o));
        } catch (err) { console.error('Error bulk updating to ready:', err); }
    };

    const handleBulkKitchenDismiss = async () => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('orders')
                .update({ kitchen_dismissed: true })
                .eq('tenant_id', selectedUnit.id)
                .eq('status', 'READY')
                .eq('kitchen_dismissed', false);
            if (error) throw error;
            setOrders(prev => prev.map(o => (o.status === 'READY' && !o.kitchenDismissed) ? { ...o, kitchenDismissed: true } : o));
        } catch (err) { console.error('Error bulk kitchen dismiss:', err); }
    };

    // --- Category Handlers ---
    const handleAddCategory = async (name: string) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('categorias').insert([{ nome: name, tenant_id: selectedUnit.id }]).select().single();
            if (error) throw error;
            if (data) setCategorias(prev => [...prev, { id: data.id, label: data.nome }]);
        } catch (err: any) { alert('Erro ao adicionar categoria: ' + err.message); }
    };

    const handleUpdateCategory = async (id: string, newName: string) => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('categorias')
                .update({ nome: newName })
                .eq('id', id)
                .eq('tenant_id', selectedUnit.id);
            if (error) throw error;
            setCategorias(prev => prev.map(c => c.id === id ? { ...c, label: newName } : c));
        } catch (err: any) { alert('Erro ao atualizar categoria: ' + err.message); }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('categorias')
                .delete()
                .eq('id', id)
                .eq('tenant_id', selectedUnit.id);
            if (error) throw error;
            setCategorias(prev => prev.filter(c => c.id !== id));
        } catch (err: any) { alert('Erro ao excluir categoria: ' + err.message); }
    };

    const handleLogWaste = async (ingredientId: string, amount: number, reason: string) => {
        if (!selectedUnit) return;
        try {
            const ing = inventory.find(i => i.id === ingredientId);
            if (!ing) return;
            const { data, error } = await supabase.from('waste_logs').insert([{
                ingredient_name: ing.name,
                unit: ing.unit,
                amount,
                reason,
                tenant_id: selectedUnit.id
            }]).select().single();

            if (error) throw error;
            if (data) {
                setWasteLogs(prev => [{ ...data, ingredientName: data.ingredient_name, date: data.date } as any, ...prev]);
                setInventory(prev => prev.map(i => i.id === ingredientId ? { ...i, currentStock: i.currentStock - amount } : i));
                await handleUpdateStock(ingredientId, ing.currentStock - amount);
            }
        } catch (err: any) {
            console.error('Error logging waste:', err);
            alert('Erro ao registrar perda: ' + (err.message || 'Erro desconhecido'));
        }
    };

    // --- Entity Management (Moved to top) ---


    const handleAssignDriver = async (orderId: string, driverId: string) => {
        try {
            const { error } = await supabase.from('orders').update({ driver_id: driverId }).eq('id', orderId);
            if (error) throw error;
            setOrders(prev => {
                const updatedOrders = prev.map(o => o.id === orderId ? { ...o, assignedDriverId: driverId } : o);

                // Dispara notificação pois "MOTOBOY ATRIBUÍDO" = Saiu para entrega
                const changedOrder = updatedOrders.find(o => o.id === orderId);
                if (changedOrder && changedOrder.type === 'DELIVERY') {
                    triggerWhatsAppNotification(changedOrder, 'DELIVERY');
                }

                return updatedOrders;
            });
        } catch (err: any) {
            console.error('Error assigning driver:', err);
            alert('Erro ao atribuir motoboy: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleUpdateStock = async (id: string, newAmount: number) => {
        try {
            const { error } = await supabase.from('ingredients').update({ current_stock: newAmount }).eq('id', id);
            if (error) throw error;
            setInventory(prev => prev.map(item => item.id === id ? { ...item, currentStock: newAmount } : item));
        } catch (err: any) {
            console.error('Error updating stock:', err);
            alert('Erro ao atualizar estoque: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleUpdateIngredientName = async (id: string, newName: string, newUnit: string) => {
        try {
            const { error } = await supabase.from('ingredients').update({ name: newName, unit: newUnit }).eq('id', id);
            if (error) throw error;
            setInventory(prev => prev.map(item => item.id === id ? { ...item, name: newName, unit: newUnit } : item));
        } catch (err: any) {
            console.error('Error updating ingredient:', err);
        }
    };

    const handleDeliveryComplete = async (orderId: string, status: OrderStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (status === 'DELIVERED' && order && order.assignedDriverId) {
            let fee = 5.00;
            if (order.deliveryDetails) {
                const neighborhoodFee = neighborhoodFees.find(nf => order.deliveryDetails?.neighborhood.toLowerCase().includes(nf.name.toLowerCase()));
                if (neighborhoodFee) fee = neighborhoodFee.price;
            }
            const driver = drivers.find(d => d.id === order.assignedDriverId);
            if (driver) {
                const newCount = (driver.deliveriesCount || 0) + 1;
                const newTotal = (driver.commissionTotal || 0) + fee;
                const newHistory = [...(driver.history || []), order.displayId];

                await supabase.from('drivers').update({
                    deliveries_count: newCount,
                    commission_total: newTotal,
                    history: newHistory
                }).eq('id', driver.id);

                setDrivers(prev => prev.map(d => d.id === order.assignedDriverId ? { ...d, deliveriesCount: newCount, commissionTotal: newTotal, history: newHistory } : d));
            }
        }
        handleUpdateStatus(orderId, status);
    };

    const handleAddDriver = async (name: string, phone?: string) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('drivers').insert([{
                name,
                phone: phone || null,
                active: true,
                deliveries_count: 0,
                commission_total: 0,
                tenant_id: selectedUnit.id
            }]).select().single();
            if (error) throw error;
            if (data) setDrivers(prev => [...prev, { ...data, phone: data.phone, deliveriesCount: data.deliveries_count, commissionTotal: data.commission_total } as any]);
        } catch (err: any) {
            console.error('Error adding driver:', err);
            alert('Erro ao adicionar motorista: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleRemoveDriver = async (id: string) => {
        try {
            const { error } = await supabase.from('drivers').delete().eq('id', id);
            if (error) throw error;
            setDrivers(prev => prev.filter(d => d.id !== id));
        } catch (err: any) {
            console.error('Error removing driver:', err);
            alert('Erro ao remover motorista: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleUpdateFee = async (neighborhood: string, price: number) => {
        if (!selectedUnit) return;
        try {
            const exists = neighborhoodFees.find(f => f.name.toLowerCase() === neighborhood.toLowerCase());
            if (exists) {
                const { error } = await supabase.from('fees').update({ price }).eq('id', exists.id);
                if (error) throw error;
                setNeighborhoodFees(prev => prev.map(f => f.id === exists.id ? { ...f, price } : f));
            } else {
                const { data, error } = await supabase.from('fees').insert([{ name: neighborhood, price, tenant_id: selectedUnit.id }]).select().single();
                if (error) throw error;
                if (data) setNeighborhoodFees(prev => [...prev, data as any]);
            }
        } catch (err) { console.error('Error updating fee:', err); }
    };

    const handleBulkImportFees = async (newFees: { name: string, price: number }[]) => {
        if (!selectedUnit) return;
        try {
            const insertData = newFees.map(f => ({
                name: f.name,
                price: f.price,
                tenant_id: selectedUnit.id
            }));
            const { data, error } = await supabase.from('fees').insert(insertData).select();
            if (error) throw error;
            if (data) {
                setNeighborhoodFees(prev => [...prev, ...data as any]);
            }
        } catch (err: any) {
            console.error('Error bulk inserting fees:', err);
            throw err;
        }
    };

    const handleRemoveFee = async (id: string) => {
        try {
            const { error } = await supabase.from('fees').delete().eq('id', id);
            if (error) throw error;
            setNeighborhoodFees(prev => prev.filter(f => f.id !== id));
        } catch (err) { console.error('Error removing fee:', err); }
    };
    const handleAddIngredient = async (name: string, unit: string) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('ingredients').insert([{
                name,
                unit,
                current_stock: 0,
                min_threshold: 5,
                tenant_id: selectedUnit.id
            }]).select().single();
            if (error) throw error;
            if (data) setInventory(prev => [...prev, data as any]);
        } catch (err: any) {
            console.error('Error adding ingredient:', err);
            alert('Erro ao adicionar ingrediente: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleRemoveIngredient = async (id: string) => {
        try {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error) throw error;
            setInventory(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error('Error removing ingredient:', err);
        }
    };

    const handleAddProduct = async (prod: Omit<Product, 'id'>) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: prod.name,
                    price: prod.price,
                    category: prod.category,
                    description: prod.description,
                    image_url: prod.image,
                    allow_observations: prod.allowObservations,
                    recipe: prod.recipe,
                    allowed_add_ons: prod.allowedAddOns,
                    tenant_id: selectedUnit.id
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setProducts(prev => [...prev, {
                    ...data,
                    image: data.image_url,
                    allowObservations: data.allow_observations,
                    allowedAddOns: data.allowed_add_ons
                } as any]);
            }
        } catch (err: any) {
            console.error('Error adding product:', err);
            alert('Erro ao adicionar produto: ' + err.message);
        }
    };
    const handleRemoveProduct = async (id: string) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            console.error('Error removing product:', err);
        }
    };
    const handleUpdateProduct = async (id: string, updatedFields: Partial<Product>) => {
        try {
            const { error } = await supabase.from('products').update({
                name: updatedFields.name,
                price: updatedFields.price,
                category: updatedFields.category,
                description: updatedFields.description,
                image_url: updatedFields.image,
                allow_observations: updatedFields.allowObservations,
                recipe: updatedFields.recipe,
                allowed_add_ons: updatedFields.allowedAddOns,
            }).eq('id', id);
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
        } catch (err: any) {
            console.error('Error updating product:', err);
        }
    };

    const handleAddCustomer = async (c: Omit<Customer, 'id'>) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('customers').insert([{
                name: c.name,
                phone: c.phone,
                street: c.street,
                number: c.number,
                complement: c.complement,
                neighborhood: c.neighborhood,
                tenant_id: selectedUnit.id
            }]).select().single();
            if (error) throw error;
            if (data) setCustomers(prev => [...prev, { ...data, lastOrder: data.last_order_at ? new Date(data.last_order_at).getTime() : undefined } as any]);
        } catch (err: any) {
            console.error('Error adding customer:', err);
            alert('Erro ao salvar cliente: ' + (err.message || err.details || 'Erro desconhecido'));
        }
    };

    const handleUpdateCustomer = async (id: string, updatedFields: Partial<Customer>) => {
        if (!selectedUnit) return;
        try {
            const { error } = await supabase.from('customers').update({
                name: updatedFields.name,
                phone: updatedFields.phone,
                street: updatedFields.street,
                number: updatedFields.number,
                complement: updatedFields.complement,
                neighborhood: updatedFields.neighborhood
            }).eq('id', id).eq('tenant_id', selectedUnit.id);

            if (error) throw error;
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
        } catch (err: any) {
            console.error('Error updating customer:', err);
            throw err;
        }
    };

    const handleRemoveCustomer = async (id: string) => {
        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Error removing customer:', err);
            alert('Erro ao remover cliente: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleAddCoupon = async (code: string, percent: number) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('coupons').insert([{
                code,
                discount_percent: percent,
                active: true,
                tenant_id: selectedUnit.id
            }]).select().single();
            if (error) throw error;
            if (data) setCoupons(prev => [...prev, { ...data, discountPercent: data.discount_percent } as any]);
        } catch (err: any) {
            console.error('Error adding coupon:', err);
            alert('Erro ao salvar cupom: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleRemoveCoupon = async (id: string) => {
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            setCoupons(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Error removing coupon:', err);
            alert('Erro ao remover cupom: ' + (err.message || 'Erro desconhecido'));
        }
    };

    const handleAddAddOn = async (name: string, price: number, applyToAll: boolean = false, ingredientId?: string) => {
        if (!selectedUnit) return;
        try {
            const { data, error } = await supabase.from('addons').insert([{
                name,
                price,
                ingredient_id: ingredientId || null,
                tenant_id: selectedUnit.id
            }]).select().single();

            if (error) throw error;
            if (data) {
                setAddOns(prev => [...prev, data as any]);
                if (applyToAll) {
                    // 1. Filtragem Rigorosa e 2. Bloqueio de Itens
                    const validCategories = categorias.filter(c =>
                        c.label.toLowerCase().includes('hamburguer') ||
                        c.label.toLowerCase().includes('hambúrguer') ||
                        c.label.toLowerCase().includes('lanche') ||
                        c.label.toLowerCase().includes('burger')
                    ).map(c => c.id);

                    const blockedCategories = categorias.filter(c =>
                        c.label.toLowerCase().includes('bebida') ||
                        c.label.toLowerCase().includes('porção') ||
                        c.label.toLowerCase().includes('porcoes') ||
                        c.label.toLowerCase().includes('sobremesa') ||
                        c.label.toLowerCase().includes('acomp')
                    ).map(c => c.id);

                    const { data: targetProducts, error: prodErr } = await supabase
                        .from('products')
                        .select('id, allowed_add_ons, category')
                        .eq('tenant_id', selectedUnit.id)
                        .in('category', validCategories); // Filtragem Rigorosa pelo schema

                    if (prodErr) throw prodErr;

                    // 3. Mapeamento de IDs: Ignorar 100% as categorias bloqueadas
                    const filteredProducts = (targetProducts || []).filter(p => !blockedCategories.includes(p.category));

                    if (filteredProducts.length > 0) {
                        // 4. Inserção em Lote (Bulk Insert) na tabela pivot product_addons
                        const pivotInserts = filteredProducts.map(p => ({
                            product_id: p.id,
                            addon_id: data.id,
                            tenant_id: selectedUnit.id
                        }));

                        const { error: pivotErr } = await supabase.from('product_addons').insert(pivotInserts);
                        if (pivotErr) {
                            console.error('Erro no Bulk Insert da tabela pivot:', pivotErr);
                        }

                        // Também atualiza o JSONB `allowed_add_ons` na tabela products usando chamadas paralelas
                        await Promise.all(filteredProducts.map(p => {
                            const currentAddOns = Array.isArray(p.allowed_add_ons) ? p.allowed_add_ons : [];
                            return supabase.from('products').update({
                                allowed_add_ons: [...currentAddOns, data.id]
                            }).eq('id', p.id);
                        }));

                        // 5. Feedback de Sucesso e Atualização do Estado da Tela
                        const targetProductIds = filteredProducts.map(p => p.id);
                        setProducts(prev => prev.map(p => {
                            if (targetProductIds.includes(p.id)) {
                                return {
                                    ...p,
                                    allowedAddOns: [...(p.allowedAddOns || []), data.id]
                                };
                            }
                            return p;
                        }));

                        alert(`Sucesso! Adicional vinculado a ${filteredProducts.length} hambúrgueres/lanches.`);
                    } else {
                        alert('Adicional criado, mas não encontramos lanches/hambúrgueres para vinculação.');
                    }
                } else {
                    alert('Adicional criado com sucesso!');
                }
            }
        } catch (err: any) {
            console.error('Error adding addon:', err);
            alert('Erro ao adicionar adicional: ' + (err.message || 'Erro desconhecido'));
        }
    };
    const handleRemoveAddOn = async (id: string) => {
        try {
            const { error } = await supabase.from('addons').delete().eq('id', id);
            if (error) throw error;
            setAddOns(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            console.error('Error removing addon:', err);
            alert('Erro ao remover adicional: ' + (err.message || 'Erro desconhecido'));
        }
    };


    // --- Role Based Redirection ---
    const { role } = useAuth();
    useEffect(() => {
        if (role === 'caixa') {
            const restrictedTabs = ['reports', 'settings', 'motoboys', 'cashflow']; // Restricted Cash Flow too? Maybe Open/Close is allowed for manager only? 
            // User requirement: "Apenas ... Gestor podem visualizar o histórico". Cashiers might need to see Current Session.
            // Let's allow 'cashflow' for cashier but the component itself handles permissions (already verified in CashFlow.tsx).
            // Actually, keep it restricted if unsure. But typically cashiers open/close. 
            // The prompt says "Apenas usuários com cargo de 'Gestor' podem visualizar o histórico". Implicitly others can see current.
            // Re-reading prompt: "Abertura de Caixa: Implemente uma função onde o gestor define..."
            // It seems focused on Manager. But Cashier is the one executing.
            // I'll leave 'cashflow' accessible to 'caixa' in Sidebar (already done in Sidebar.tsx: roles: owner, gestor). 
            // Wait, Sidebar.tsx has 'cashflow' roles as ['owner', 'gestor']. So 'caixa' cannot access it via Sidebar.
            // So if I redirect here, it's consistent.

            const restrictedTabsForCashier = ['reports', 'settings', 'motoboys'];
            if (restrictedTabsForCashier.includes(activeTab)) {
                setActiveTab('pos');
            }
        }
    }, [role, activeTab]);

    const openTabs = orders.filter(o =>
        o.type === 'DINE_IN' &&
        !o.isPaid
    );


    // --- Cashier Management ---
    const [cashiers, setCashiers] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedUnit) return;
        const fetchCashiers = async () => {
            const { data, error } = await supabase
                .from('user_roles')
                .select('*')
                .eq('tenant_id', selectedUnit.id)
                .eq('role', 'caixa');

            if (data) setCashiers(data);
        };
        fetchCashiers();
    }, [selectedUnit]);

    const handleAddCashier = async (email: string, password: string) => {
        if (!selectedUnit) return;
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                    email,
                    password,
                    tenant_id: selectedUnit.id,
                    role: 'caixa'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Erro HTTP ${response.status}`);
            }

            // Refresh cashiers list
            const { data: newData } = await supabase
                .from('user_roles')
                .select('*')
                .eq('tenant_id', selectedUnit.id)
                .eq('role', 'caixa');

            if (newData) setCashiers(newData);
            alert('Caixa criado com sucesso!');
        } catch (err: any) {
            console.error('Error adding cashier:', err);
            alert('Erro ao criar caixa: ' + (err.message || 'Erro desconhecido'));
        }
    };


    const handleRemoveCashier = async (userId: string) => {
        if (!selectedUnit) return;
        if (!window.confirm('Tem certeza que deseja excluir esta conta de caixa? Esta ação não pode ser desfeita.')) return;

        try {
            const { error } = await supabase.functions.invoke('delete-user', {
                body: {
                    target_user_id: userId,
                    tenant_id: selectedUnit.id
                }
            });

            if (error) throw error;

            // Refresh list
            const { data: newData } = await supabase
                .from('user_roles')
                .select('*')
                .eq('tenant_id', selectedUnit.id)
                .eq('role', 'caixa');

            if (newData) setCashiers(newData);
            alert('Caixa removido com sucesso!');
        } catch (err: any) {
            console.error('Error removing cashier:', err);
            alert('Erro ao remover caixa: ' + (err.message || 'Erro desconhecido.'));
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'pos':
                return <POS
                    products={products}
                    onPlaceOrder={handlePlaceOrder}
                    onPayOrder={handlePayOrder}
                    inventory={inventory}
                    customers={customers}
                    onAddCustomer={handleAddCustomer}
                    activeOrders={openTabs}
                    coupons={coupons}
                    addOns={addOns}
                    categorias={categorias}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onUpdateFee={handleUpdateFee}
                    onRemoveFee={handleRemoveFee}
                    neighborhoodFees={neighborhoodFees}
                    cart={cart}
                    setCart={setCart}
                    orderType={orderType}
                    setOrderType={setOrderType}
                    deliveryForm={deliveryForm}
                    setDeliveryForm={setDeliveryForm}
                    dineInName={dineInName}
                    setDineInName={setDineInName}
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    appliedCoupon={appliedCoupon}
                    setAppliedCoupon={setAppliedCoupon}
                    showCheckout={showCheckout}
                    setShowCheckout={setShowCheckout}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    receivedAmountStr={receivedAmountStr}
                    setReceivedAmountStr={setReceivedAmountStr}
                    isPlacingOrder={isPlacingOrder}
                    editingOrderId={editingOrderId}
                    setEditingOrderId={setEditingOrderId}
                />;
            case 'kitchen':
                return <Kitchen orders={orders} onUpdateStatus={handleUpdateStatus} onKitchenDismiss={handleKitchenDismiss} onBulkPrepareToReady={handleBulkPrepareToReady} onBulkKitchenDismiss={handleBulkKitchenDismiss} />;
            case 'logistics':
                return <Logistics orders={orders} drivers={drivers} onAssignDriver={handleAssignDriver} onUpdateStatus={handleDeliveryComplete} />;
            case 'motoboys':
                return <Motoboys drivers={drivers} onAddDriver={handleAddDriver} onRemoveDriver={handleRemoveDriver} neighborhoodFees={neighborhoodFees} onUpdateFee={handleUpdateFee} onRemoveFee={handleRemoveFee} orders={orders} dailyHistory={dailyHistory} onFetchOrderDetails={handleFetchOrderDetails} onBulkImportFees={handleBulkImportFees} />;
            case 'inventory':
                return <Inventory inventory={inventory} onUpdateStock={handleUpdateStock} onUpdateIngredientName={handleUpdateIngredientName} onAddIngredient={handleAddIngredient} onRemoveIngredient={handleRemoveIngredient} onAddProduct={handleAddProduct} onRemoveProduct={handleRemoveProduct} onUpdateProduct={handleUpdateProduct} products={products} onLogWaste={handleLogWaste} wasteLogs={wasteLogs} addOns={addOns} onAddAddOn={handleAddAddOn} onRemoveAddOn={handleRemoveAddOn} categorias={categorias} />;
            case 'crm':
                return <CRM customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={handleUpdateCustomer} onRemoveCustomer={handleRemoveCustomer} />;
            case 'reports':
                return <Reports orders={orders} dailyHistory={dailyHistory} />;
            case 'cashflow':
                return <CashFlow currentSession={activeSession} history={cashSessions} onOpenCash={handleOpenCash} onCloseCash={handleCloseCash} onAddTransaction={handleAddTransaction} orders={orders} onEndDay={handleCloseDay} dailyHistory={dailyHistory} />;
            case 'settings':
                return <Settings settings={storeSettings} onUpdateSettings={handleUpdateSettings} coupons={coupons} onAddCoupon={handleAddCoupon} onRemoveCoupon={handleRemoveCoupon} cashiers={cashiers} onAddCashier={handleAddCashier} onRemoveCashier={handleRemoveCashier} onUpdatePrinterSettings={setPrinterSettings} printerSettings={printerSettings} />;
            default:
                return null;
        }
    };

    // --- Initialize Tenant Context & POS Persistence ---
    useEffect(() => {
        const fetchTenantData = async () => {
            if (!tenantId) return;
            setTenant(tenantId);

            try {
                const { data, error } = await supabase.from('tenants').select('name, logo_url, logo_path, theme_color').eq('id', tenantId).single();
                if (error) throw error;
                if (data) {
                    setSelectedUnit({ id: tenantId, name: data.name, logoUrl: data.logo_url || '', logoPath: data.logo_path || '', themeColor: data.theme_color || '#f97316' });

                    // Fetch Products — scoped to this tenant
                    const { data: prods } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order('name');
                    if (prods) {
                        setProducts(prods.map(p => ({
                            ...p,
                            image: p.image_url,
                            allowObservations: p.allow_observations,
                            allowedAddOns: p.allowed_add_ons
                        })) as any);
                    }

                    // Fetch Ingredients — scoped to this tenant
                    const { data: ings } = await supabase.from('ingredients').select('*').eq('tenant_id', tenantId).order('name');
                    if (ings) setInventory(ings.map(i => ({ ...i, currentStock: i.current_stock, minThreshold: i.min_threshold })) as any);

                    // Fetch Coupons — scoped to this tenant
                    const { data: coups } = await supabase.from('coupons').select('*').eq('tenant_id', tenantId);
                    if (coups) setCoupons(coups.map(c => ({ ...c, discountPercent: c.discount_percent })) as any);

                    // Fetch AddOns — scoped to this tenant
                    const { data: ads } = await supabase.from('addons').select('*').eq('tenant_id', tenantId);
                    if (ads) setAddOns(ads.map(a => ({ ...a, ingredientId: a.ingredient_id })) as any);


                    // Fetch Categories — scoped to this tenant
                    const { data: cats } = await supabase.from('categorias').select('*').eq('tenant_id', tenantId).order('nome');
                    if (cats) setCategorias(cats.map(c => ({ id: c.id, label: c.nome })));

                    // Fetch Customers — scoped to this tenant
                    const { data: custs } = await supabase.from('customers').select('*').eq('tenant_id', tenantId).order('name');
                    if (custs) setCustomers(custs.map(c => ({ ...c, lastOrder: c.last_order_at ? new Date(c.last_order_at).getTime() : undefined })) as any);

                    // Fetch Drivers — scoped to this tenant
                    const { data: drvs } = await supabase.from('drivers').select('*').eq('tenant_id', tenantId).order('name');
                    if (drvs) setDrivers(drvs.map(d => ({ ...d, deliveriesCount: d.deliveries_count, commissionTotal: d.commission_total })) as any);

                    // Fetch Fees — scoped to this tenant
                    const { data: fey } = await supabase.from('fees').select('*').eq('tenant_id', tenantId).order('name');
                    if (fey) setNeighborhoodFees(fey as any);

                    // Fetch Waste Logs — scoped to this tenant
                    const { data: wst } = await supabase.from('waste_logs').select('*').eq('tenant_id', tenantId).order('date', { ascending: false });
                    if (wst) setWasteLogs(wst.map(w => ({ ...w, ingredientName: w.ingredient_name, date: w.date })) as any);

                    await fetchOrders();

                    // Fetch Cash Sessions — scoped to this tenant
                    const { data: scs } = await supabase
                        .from('caixas')
                        .select('*, movimentacoes_caixa(*)')
                        .eq('tenant_id', tenantId)
                        .order('aberto_em', { ascending: false });

                    if (scs) {
                        setCashSessions(scs.map(s => ({
                            id: s.id,
                            openedAt: s.aberto_em ? new Date(s.aberto_em).getTime() : 0,
                            closedAt: s.fechado_em ? new Date(s.fechado_em).getTime() : undefined,
                            initialAmount: s.valor_inicial,
                            finalAmount: s.valor_final,
                            calculatedAmount: s.calculated_amount,
                            openedBy: s.operador_id || 'Unknown',
                            closedBy: s.operador_id || 'Unknown',
                            closingNotes: s.observacoes,
                            totalSales: s.total_sales,
                            totalMoney: s.total_money,
                            totalCardCredit: s.total_card_credit,
                            totalCardDebit: s.total_card_debit,
                            totalPix: s.total_pix,
                            status: s.status === 'aberto' ? 'OPEN' : 'CLOSED',
                            transactions: (s.movimentacoes_caixa || []).map((t: any) => ({
                                id: t.id,
                                type: t.tipo === 'Sangria' ? 'BLEED' : 'SUPPLY',
                                amount: t.valor,
                                description: t.descricao,
                                timestamp: t.data_hora ? new Date(t.data_hora).getTime() : 0,
                                userId: t.responsavel
                            }))
                        })) as any);
                    }

                    // Fetch Settings from Tenant
                    const { data: tenantInfo } = await supabase.from('tenants').select('settings, logo_url, logo_path, theme_color').eq('id', tenantId).single();
                    if (tenantInfo) {
                        setStoreSettings({
                            name: data.name,
                            logoUrl: tenantInfo.logo_url || tenantInfo.settings?.logoUrl || '',
                            logoPath: tenantInfo.logo_path || '',
                            themeColor: tenantInfo.theme_color || '#f97316',
                            menu: tenantInfo.settings?.menu,
                            address: tenantInfo.settings?.address,
                            googleMapsUrl: tenantInfo.settings?.googleMapsUrl,
                            operatingHours: tenantInfo.settings?.operatingHours
                        });
                    }

                    // Fetch Daily History — scoped to this tenant
                    const { data: hist } = await supabase.from('daily_history').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
                    if (hist) {
                        setDailyHistory(hist.map(h => ({
                            id: h.id,
                            date: h.reference_date,
                            orders: h.orders || [],
                            metrics: h.metrics,
                            cashSessions: h.cash_sessions || [],
                            drivers: h.drivers || []
                        })));
                    }

                }
            } catch (err) {
                console.error('Error fetching tenant:', err);
                setSelectedUnit({ id: tenantId, name: 'Meu Restaurante', logoUrl: '' });
            }
        };

        fetchTenantData();
    }, [tenantId]); // Removed setTenant because it's inside or handled by tenantId change

    if (!selectedUnit) {
        return <div className={`h-screen w-screen flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#050507]' : 'bg-slate-50'}`}><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    }

    return (
        <div className={`flex h-screen transition-colors duration-700 font-sans overflow-hidden selection:bg-blue-100 ${isDark ? 'bg-[#050507] text-white' : 'bg-[#F8FAFC] text-slate-800'}`}>
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedUnitName={selectedUnit.name}
                onChangeUnit={() => {
                    setTenant(''); // Clear RLS context
                    navigate('/?manual=true');
                }}
                settings={storeSettings}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />
            <main className="flex-1 ml-0 md:ml-16 lg:ml-64 overflow-y-auto h-screen custom-scrollbar">
                {/* Mobile hamburger header */}
                <div className={`sticky top-0 z-20 flex items-center gap-3 px-4 py-3 md:hidden border-b ${isDark ? 'bg-[#0D0D10]/90 backdrop-blur-xl border-white/5' : 'bg-white/90 backdrop-blur-xl border-slate-200'}`}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'text-white bg-white/5 hover:bg-white/10' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                    >
                        <Menu size={20} />
                    </button>
                    <span className={`font-bold text-sm truncate ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                        {storeSettings.name || 'GestãoTotal'}
                    </span>
                </div>
                <div className="p-4 md:p-6 lg:p-8 min-h-full animate-in fade-in slide-in-from-right-4 duration-500">{renderContent()}</div>

                {/* WhatsApp Notification Toast */}
                {whatsappToast && (
                    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="bg-white border text-slate-800 border-green-200 shadow-xl rounded-2xl p-4 w-80 max-w-[calc(100vw-2rem)]">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm text-green-800">Notificar {whatsappToast.customerName}?</h4>
                                <button
                                    onClick={() => setWhatsappToast(null)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <Menu className="w-4 h-4" /> {/* Close Icon Equivalent for now, or X */}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2 italic">
                                "{decodeURIComponent(whatsappToast.message)}"
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setWhatsappToast(null)}
                                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Ignorar
                                </button>
                                <button
                                    onClick={() => {
                                        window.open(`https://api.whatsapp.com/send?phone=55${whatsappToast.phone}&text=${whatsappToast.message}`, '_blank', 'noopener,noreferrer');
                                        setWhatsappToast(null);
                                    }}
                                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#1dad52] transition-colors shadow-sm shadow-green-500/30 flex items-center justify-center gap-1"
                                >
                                    📲 Enviar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

