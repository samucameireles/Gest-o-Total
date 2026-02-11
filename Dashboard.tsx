import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { setTenant, supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
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
import { Order, CartItem, OrderType, PaymentMethod, Ingredient, OrderStatus, Driver, Product, NeighborhoodFee, DeliveryDetails, StoreSettings, Unit, Customer, Coupon, WasteLog, AddOn, CashRegisterSession, CashTransaction } from './types';
import { INITIAL_INVENTORY, RECIPES, DRIVERS, PRODUCTS, INITIAL_ADDONS } from './constants';

import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

export default function Dashboard() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { user } = useAuth(); // Needed for ID
    const [activeTab, setActiveTab] = useState('pos');
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

    const isDark = theme === 'dark';

    // --- Initialize Tenant Context ---
    useEffect(() => {
        const fetchTenantData = async () => {
            if (!tenantId) return;
            setTenant(tenantId);

            try {
                const { data, error } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
                if (error) throw error;
                if (data) {
                    setSelectedUnit({ id: tenantId, name: data.name, logoUrl: '' });
                }
            } catch (err) {
                console.error('Error fetching tenant:', err);
                setSelectedUnit({ id: tenantId, name: 'Meu Restaurante', logoUrl: '' });
            }
        };

        fetchTenantData();
    }, [tenantId]);


    // --- Unit-Scoped State (Legacy LocalStorage for now) ---
    const [orders, setOrders] = useState<Order[]>([]);
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

    // --- Persistence Helpers ---
    const load = (key: string, def: any) => {
        if (!selectedUnit) return def;
        const prefix = `se_${selectedUnit.id}_`;
        const s = localStorage.getItem(prefix + key);
        return s ? JSON.parse(s) : def;
    };

    const save = (key: string, data: any) => {
        if (selectedUnit) {
            localStorage.setItem(`se_${selectedUnit.id}_${key}`, JSON.stringify(data));
        }
    };

    // Cash Flow State
    const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);

    // --- Persistence ---
    useEffect(() => {
        if (!selectedUnit) return;

        setOrders(load('orders', []));
        setOrderSequence(parseInt(load('order_seq', '1'))); // Adjusted to use load or direct access if needed, but load wrapper handles prefix. Actually load expects JSON parse.
        // Wait, load wrapper does JSON.parse. '1' is valid JSON.

        // However, existing code for order_seq was: parseInt(localStorage.getItem(prefix + 'order_seq') || '1')
        // Let's stick to using load for consistency if possible, or just direct access if it's not JSON.
        // But wait, 'order_seq' is simple string/number. JSON.parse('1') is 1. 
        // So load('order_seq', 1) should work.

        setInventory(load('inventory', INITIAL_INVENTORY));

        const loadedProducts = load('products', PRODUCTS);
        setProducts(loadedProducts.map((p: any) => ({
            ...p,
            allowObservations: p.allowObservations ?? true,
            recipe: p.recipe || [],
            allowedAddOns: p.allowedAddOns || []
        })));

        setDrivers(load('drivers', DRIVERS));
        setNeighborhoodFees(load('fees', [{ id: '1', name: 'Centro', price: 5.00 }]));
        setStoreSettings(load('settings', { name: selectedUnit.name, logoUrl: selectedUnit.logoUrl }));
        setCustomers(load('customers', []));
        setCoupons(load('coupons', []));
        setWasteLogs(load('wasteLogs', []));
        setAddOns(load('addOns', INITIAL_ADDONS));
        setCashSessions(load('cashSessions', []));
    }, [selectedUnit]);

    // Save effects use the component-level save function now.

    useEffect(() => save('orders', orders), [orders, selectedUnit]);
    useEffect(() => { if (selectedUnit) localStorage.setItem(`se_${selectedUnit.id}_order_seq`, orderSequence.toString()) }, [orderSequence, selectedUnit]);
    useEffect(() => save('inventory', inventory), [inventory, selectedUnit]);
    useEffect(() => save('products', products), [products, selectedUnit]);
    useEffect(() => save('drivers', drivers), [drivers, selectedUnit]);
    useEffect(() => save('fees', neighborhoodFees), [neighborhoodFees, selectedUnit]);
    useEffect(() => save('settings', storeSettings), [storeSettings, selectedUnit]);
    useEffect(() => save('customers', customers), [customers, selectedUnit]);
    useEffect(() => save('coupons', coupons), [coupons, selectedUnit]);
    useEffect(() => save('wasteLogs', wasteLogs), [wasteLogs, selectedUnit]);
    useEffect(() => save('addOns', addOns), [addOns, selectedUnit]);
    useEffect(() => save('cashSessions', cashSessions), [cashSessions, selectedUnit]);

    // Daily History State (Zero-Fill)
    const [dailyHistory, setDailyHistory] = useState<any[]>([]);
    useEffect(() => setDailyHistory(load('dailyHistory', [])), [selectedUnit]);
    useEffect(() => save('dailyHistory', dailyHistory), [dailyHistory, selectedUnit]);

    // --- Core Actions ---

    // Cash Flow Handlers
    const activeSession = cashSessions.find(s => s.status === 'OPEN') || null;

    const handleOpenCash = (initialAmount: number) => {
        if (activeSession) {
            alert('Já existe um caixa aberto!');
            return;
        }
        const newSession: CashRegisterSession = {
            id: Math.random().toString(36).substr(2, 9),
            openedAt: Date.now(),
            initialAmount,
            transactions: [],
            status: 'OPEN',
            openedBy: user?.email || 'Unknown',
            closedBy: undefined // Explicitly undefined
        };
        setCashSessions(prev => [newSession, ...prev]);
        alert('Caixa aberto com sucesso!');
    };

    const handleCloseDay = () => {
        if (!activeSession) {
            alert('Abra e feche o caixa antes de encerrar o dia de forma administrativa, ou garanta que todas as sessões estejam fechadas.');
            // Allow closing even if no session is active, just to reset.
        }

        if (!window.confirm('TEM CERTEZA QUE DESEJA ENCERRAR O EXPEDIENTE?\n\nIsso irá:\n1. Arquivar todas as vendas e movimentações de hoje.\n2. Zerar o painel de vendas.\n3. Limpar pedidos de motoboys.\n\nEssa ação não pode ser desfeita.')) {
            return;
        }

        // 1. Snapshot Metrics
        const paidOrders = orders.filter(o => o.isPaid || o.status === 'ARCHIVED');
        const sessionOrders = orders.filter(o => o.status !== 'CANCELLED'); // All valid orders
        const totalSales = paidOrders.reduce((acc, o) => acc + o.total, 0);

        const paymentMethods = paidOrders.reduce((acc, o) => {
            acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
            return acc;
        }, {} as Record<PaymentMethod, number>);

        // 2. Create History Object
        const today = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
        const historyEntry = {
            id: today,
            date: today,
            orders: orders, // Save ALL orders, including cancelled/open
            cashSessions: cashSessions,
            metrics: {
                totalSales,
                totalOrders: paidOrders.length,
                averageTicket: paidOrders.length > 0 ? totalSales / paidOrders.length : 0,
                paymentMethods
            },
            drivers: drivers, // Snapshot current drivers state which contains commission and count
            closedAt: Date.now(),
            closedBy: user?.email || 'System'
        };

        // 3. Archive
        setDailyHistory(prev => {
            // Overwrite if same day exists to avoid duplicates if closed multiple times/accidental
            const exists = prev.findIndex(h => h.id === today);
            if (exists > -1) {
                const newHist = [...prev];
                newHist[exists] = historyEntry;
                return newHist;
            }
            return [historyEntry, ...prev];
        });

        // 4. Reset States (Zero-Fill)
        setOrders([]);
        setOrderSequence(1);
        setCashSessions([]);
        setWasteLogs([]); // Reset waste logs for the day too? Usually yes.
        // Drivers: reset metrics but keep drivers list
        setDrivers(prev => prev.map(d => ({
            ...d,
            deliveriesCount: 0,
            commissionTotal: 0,
            history: [] // Clear today's history
        })));

        alert('EXPEDIENTE ENCERRADO COM SUCESSO!\nSistema pronto para o próximo dia.');
    };

    const handleCloseCash = (finalAmount: number, notes: string) => {
        if (!activeSession) return;

        // Calculate Totals Snapshot
        const sessionOrders = orders.filter(o =>
            o.createdAt >= activeSession.openedAt &&
            o.status !== 'CANCELLED' &&
            o.status !== 'ARCHIVED'
        );

        const totalSales = sessionOrders.reduce((sum, o) => sum + o.total, 0);
        const totalSupply = activeSession.transactions.filter(t => t.type === 'SUPPLY').reduce((sum, t) => sum + t.amount, 0);
        const totalBleed = activeSession.transactions.filter(t => t.type === 'BLEED').reduce((sum, t) => sum + t.amount, 0);

        // Breakdown
        const salesByMethod = sessionOrders.reduce((acc, o) => {
            acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
            return acc;
        }, {} as Record<PaymentMethod, number>);

        const calculatedAmount = activeSession.initialAmount + totalSupply - totalBleed + (salesByMethod['CASH'] || 0);

        const closedSession: CashRegisterSession = {
            ...activeSession,
            status: 'CLOSED',
            closedAt: Date.now(),
            finalAmount,
            calculatedAmount,
            closingNotes: notes,
            closedBy: user?.email || 'Unknown',

            // Snapshots
            totalSales,
            totalMoney: salesByMethod['CASH'] || 0,
            totalCardCredit: salesByMethod['CREDIT'] || 0,
            totalCardDebit: salesByMethod['DEBIT'] || 0,
            totalPix: salesByMethod['PIX'] || 0
        };

        setCashSessions(prev => prev.map(s => s.id === activeSession.id ? closedSession : s));
        alert(finalAmount !== calculatedAmount
            ? `Caixa fechado com DIVERGÊNCIA!\nEsperado: R$${calculatedAmount.toFixed(2)}\nInformado: R$${finalAmount.toFixed(2)}`
            : 'Caixa fechado com sucesso!'
        );
    };

    const handleAddTransaction = (type: 'SUPPLY' | 'BLEED', amount: number, description: string) => {
        if (!activeSession) return;
        const newTransaction: CashTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            amount,
            description,
            timestamp: Date.now(),
            userId: user?.email || 'Unknown'
        };

        setCashSessions(prev => prev.map(s => {
            if (s.id === activeSession.id) {
                return {
                    ...s,
                    transactions: [newTransaction, ...s.transactions]
                };
            }
            return s;
        }));
    };

    const handlePlaceOrder = (items: CartItem[], type: OrderType, paymentMethod: PaymentMethod, deliveryDetails?: DeliveryDetails, dineInName?: string, tableName?: string) => {
        // Block if cash is closed
        if (!activeSession) {
            alert('Ocaixa está FECHADO. Abra o caixa antes de realizar vendas.');
            return;
        }

        const currentId = orderSequence;
        setOrderSequence(prev => prev + 1);

        const orderTotal = items.reduce((acc, item) => {
            const addOnsTotal = item.selectedAddOns?.reduce((sum, addon) => sum + addon.price, 0) || 0;
            return acc + ((item.price + addOnsTotal) * item.quantity);
        }, 0);

        const newOrder: Order = {
            id: Math.random().toString(36).substr(2, 9),
            displayId: currentId,
            items,
            total: orderTotal,
            discount: 0,

            status: 'PREPARING',
            isPaid: paymentMethod !== 'PENDING',
            kitchenDismissed: false,

            type,
            paymentMethod,
            deliveryDetails,
            customerName: type === 'DELIVERY' ? deliveryDetails?.customerName : dineInName,
            tableName,
            createdAt: Date.now()
        };

        setOrders(prev => [newOrder, ...prev]);

        const newInventory = [...inventory];
        items.forEach(item => {
            let productRecipe = item.recipe;
            if (!productRecipe || productRecipe.length === 0) {
                productRecipe = RECIPES[item.id];
            }
            if (productRecipe) {
                productRecipe.forEach(recipeItem => {
                    const ingredientIndex = newInventory.findIndex(ing => ing.id === recipeItem.ingredientId);
                    if (ingredientIndex > -1) {
                        newInventory[ingredientIndex].currentStock -= (recipeItem.amount * item.quantity);
                    }
                });
            }
        });
        setInventory(newInventory);

        // CRM
        if (deliveryDetails) {
            const exists = customers.find(c => c.phone === deliveryDetails.phone);
            if (!exists) {
                handleAddCustomer({
                    name: deliveryDetails.customerName,
                    phone: deliveryDetails.phone,
                    street: deliveryDetails.street,
                    number: deliveryDetails.number,
                    neighborhood: deliveryDetails.neighborhood,
                    lastOrder: Date.now()
                });
            }
        }
    };

    const handlePayOrder = (orderId: string, paymentMethod: PaymentMethod, discount: number) => {
        if (!activeSession) {
            alert('O caixa está FECHADO. Abra o caixa para receber pagamentos.');
            return;
        }
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    isPaid: true,
                    paymentMethod,
                    discount,
                    total: o.total - discount
                };
            }
            return o;
        }));
    };

    const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    };

    const handleKitchenDismiss = (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kitchenDismissed: true } : o));
    }

    const handleLogWaste = (ingredientId: string, amount: number, reason: string) => {
        const ing = inventory.find(i => i.id === ingredientId);
        if (!ing) return;
        const log: WasteLog = {
            id: Math.random().toString(),
            ingredientName: ing.name,
            unit: ing.unit,
            amount,
            reason,
            date: Date.now()
        };
        setWasteLogs(prev => [log, ...prev]);
        setInventory(prev => prev.map(i => i.id === ingredientId ? { ...i, currentStock: i.currentStock - amount } : i));
    };

    // --- Entity Management ---
    const handleAssignDriver = (orderId: string, driverId: string) => setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignedDriverId: driverId } : o));
    const handleUpdateStock = (id: string, newAmount: number) => setInventory(prev => prev.map(item => item.id === id ? { ...item, currentStock: newAmount } : item));
    const handleUpdateIngredientName = (id: string, newName: string, newUnit: string) => setInventory(prev => prev.map(item => item.id === id ? { ...item, name: newName, unit: newUnit } : item));

    const handleDeliveryComplete = (orderId: string, status: OrderStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (status === 'DELIVERED' && order && order.assignedDriverId) {
            let fee = 5.00;
            if (order.deliveryDetails) {
                const neighborhoodFee = neighborhoodFees.find(nf => order.deliveryDetails?.neighborhood.toLowerCase().includes(nf.name.toLowerCase()));
                if (neighborhoodFee) fee = neighborhoodFee.price;
            }
            setDrivers(prev => prev.map(d => d.id === order.assignedDriverId ? { ...d, deliveriesCount: d.deliveriesCount + 1, commissionTotal: d.commissionTotal + fee, history: [...(d.history || []), order.displayId] } : d));
        }
        handleUpdateStatus(orderId, status);
    };

    const handleAddDriver = (name: string) => setDrivers(prev => [...prev, { id: Math.random().toString(36), name, deliveriesCount: 0, commissionTotal: 0, active: true, history: [] }]);
    const handleRemoveDriver = (id: string) => setDrivers(prev => prev.filter(d => d.id !== id));
    const handleUpdateFee = (neighborhood: string, price: number) => {
        const exists = neighborhoodFees.find(f => f.name.toLowerCase() === neighborhood.toLowerCase());
        if (exists) { setNeighborhoodFees(prev => prev.map(f => f.name.toLowerCase() === neighborhood.toLowerCase() ? { ...f, price } : f)); }
        else { setNeighborhoodFees(prev => [...prev, { id: Math.random().toString(), name: neighborhood, price }]); }
    };
    const handleRemoveFee = (id: string) => setNeighborhoodFees(prev => prev.filter(f => f.id !== id));
    const handleAddIngredient = (name: string, unit: string) => setInventory(prev => [...prev, { id: Math.random().toString(), name, unit, currentStock: 0, minThreshold: 5 }]);
    const handleRemoveIngredient = (id: string) => setInventory(prev => prev.filter(i => i.id !== id));

    const handleAddProduct = (prod: Omit<Product, 'id'>) => setProducts(prev => [...prev, { ...prod, id: Math.random().toString() }]);
    const handleRemoveProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

    const handleAddCustomer = (c: Omit<Customer, 'id'>) => setCustomers(prev => [...prev, { ...c, id: Math.random().toString() }]);
    const handleRemoveCustomer = (id: string) => setCustomers(prev => prev.filter(c => c.id !== id));
    const handleAddCoupon = (code: string, percent: number) => setCoupons(prev => [...prev, { id: Math.random().toString(), code, discountPercent: percent, active: true }]);
    const handleRemoveCoupon = (id: string) => setCoupons(prev => prev.filter(c => c.id !== id));

    const handleAddAddOn = (name: string, price: number, applyToAll: boolean = false) => {
        const newAddOn = { id: Math.random().toString(), name, price };
        setAddOns(prev => [...prev, newAddOn]);

        if (applyToAll) {
            setProducts(prev => prev.map(p => ({
                ...p,
                allowedAddOns: [...(p.allowedAddOns || []), newAddOn.id]
            })));
            alert(`Adicional "${name}" criado e vinculado a ${products.length} produtos!`);
        }
    };
    const handleRemoveAddOn = (id: string) => setAddOns(prev => prev.filter(a => a.id !== id));


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
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email,
                    password,
                    tenant_id: selectedUnit.id,
                    role: 'caixa'
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
            alert('Caixa criado com sucesso!');
        } catch (err: any) {
            console.error('Error adding cashier:', err);
            alert('Erro ao criar caixa: ' + (err.message || 'Verifique se você implantou a Edge Function "create-user".'));
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
                return <POS products={products} onPlaceOrder={handlePlaceOrder} onPayOrder={handlePayOrder} inventory={inventory} customers={customers} onAddCustomer={handleAddCustomer} activeOrders={openTabs} coupons={coupons} addOns={addOns} />;
            case 'kitchen':
                return <Kitchen orders={orders} onUpdateStatus={handleUpdateStatus} onKitchenDismiss={handleKitchenDismiss} />;
            case 'logistics':
                return <Logistics orders={orders} drivers={drivers} onAssignDriver={handleAssignDriver} onUpdateStatus={handleDeliveryComplete} />;
            case 'motoboys':
                return <Motoboys drivers={drivers} onAddDriver={handleAddDriver} onRemoveDriver={handleRemoveDriver} neighborhoodFees={neighborhoodFees} onUpdateFee={handleUpdateFee} onRemoveFee={handleRemoveFee} orders={orders} dailyHistory={dailyHistory} />;
            case 'inventory':
                return <Inventory inventory={inventory} onUpdateStock={handleUpdateStock} onUpdateIngredientName={handleUpdateIngredientName} onAddIngredient={handleAddIngredient} onRemoveIngredient={handleRemoveIngredient} onAddProduct={handleAddProduct} onRemoveProduct={handleRemoveProduct} products={products} onLogWaste={handleLogWaste} wasteLogs={wasteLogs} addOns={addOns} onAddAddOn={handleAddAddOn} onRemoveAddOn={handleRemoveAddOn} />;
            case 'crm':
                return <CRM customers={customers} onAddCustomer={handleAddCustomer} onRemoveCustomer={handleRemoveCustomer} />;
            case 'reports':
                return <Reports orders={orders} dailyHistory={dailyHistory} />;
            case 'cashflow':
                return <CashFlow currentSession={activeSession} history={cashSessions} onOpenCash={handleOpenCash} onCloseCash={handleCloseCash} onAddTransaction={handleAddTransaction} orders={orders} onEndDay={handleCloseDay} dailyHistory={dailyHistory} />;
            case 'settings':
                return <Settings settings={storeSettings} onUpdateSettings={setStoreSettings} coupons={coupons} onAddCoupon={handleAddCoupon} onRemoveCoupon={handleRemoveCoupon} cashiers={cashiers} onAddCashier={handleAddCashier} onRemoveCashier={handleRemoveCashier} />;
            default:
                return null;
        }
    };

    if (!selectedUnit) {
        return <div className={`h-screen w-screen flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#050507]' : 'bg-slate-50'}`}><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
    }

    return (
        <div className={`flex h-screen transition-colors duration-700 font-sans overflow-hidden selection:bg-blue-100 ${isDark ? 'bg-[#050507] text-white' : 'bg-[#F8FAFC] text-slate-800'}`}>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} selectedUnitName={selectedUnit.name} onChangeUnit={() => navigate('/')} settings={storeSettings} />
            <main className="flex-1 ml-64 p-8 overflow-hidden h-screen relative">
                <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">{renderContent()}</div>
            </main>
        </div>
    );
}

