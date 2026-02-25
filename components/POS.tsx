import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, CheckCircle, ShoppingCart, X, ShoppingBag, MapPin, Store, ChefHat, UserSearch, UserPlus, Tag } from 'lucide-react';
import { Product, CartItem, Category, PaymentMethod, OrderType, Ingredient, DeliveryDetails, Customer, Order, Coupon, AddOn } from '../types';
import { RECIPES } from '../constants';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface POSProps {
  products: Product[];
  onPlaceOrder: (items: CartItem[], type: OrderType, payment: PaymentMethod, deliveryDetails?: DeliveryDetails, dineInName?: string, tableName?: string, sendToKitchenOnly?: boolean, receivedAmount?: number, changeAmount?: number) => void;
  onPayOrder: (orderId: string, payment: PaymentMethod, discount: number, receivedAmount?: number, changeAmount?: number) => void;
  inventory: Ingredient[];
  customers: Customer[];
  onAddCustomer: (c: Omit<Customer, 'id'>) => void;
  activeOrders: Order[];
  coupons: Coupon[];
  addOns: AddOn[]; // V12
}

export const POS: React.FC<POSProps> = ({ products, onPlaceOrder, onPayOrder, inventory, customers, onAddCustomer, activeOrders, coupons, addOns }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT');

  // Selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState('');
  // V12: Selected AddOns
  const [modalSelectedAddOns, setModalSelectedAddOns] = useState<AddOn[]>([]);

  // Open Tab
  const [selectedTabToPay, setSelectedTabToPay] = useState<Order | null>(null);

  // CRM
  const [customerSearch, setCustomerSearch] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Forms
  const [dineInName, setDineInName] = useState('');
  const [deliveryForm, setDeliveryForm] = useState<DeliveryDetails>({
    customerName: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: ''
  });

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [receivedAmountStr, setReceivedAmountStr] = useState<string>('');

  // Dynamic Categories V14
  const [categorias, setCategorias] = useState<{ id: string, label: string }[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase.from('categorias').select('*').order('nome');
      if (data) {
        setCategorias(data.map(c => ({ id: c.nome, label: c.nome })));
      } else {
        // Fallback for visual testing if table is empty or missing
        setCategorias([
          { id: 'BURGER', label: 'Burgers' },
          { id: 'SIDE', label: 'Acomp.' },
          { id: 'DRINK', label: 'Bebidas' },
          { id: 'DESSERT', label: 'Doces' },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentCategories = [{ id: 'ALL', label: 'Tudo' }, ...categorias];

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const { error } = await supabase.from('categorias').insert([{ nome: newCatName.trim() }]);
      if (error) {
        // Silently fallback to local state if table doesn't exist
        setCategorias(prev => [...prev, { id: newCatName.trim(), label: newCatName.trim() }]);
      } else {
        fetchCategorias();
      }
      setNewCatName('');
    } catch (err) { }
  };

  const handleUpdateCategory = async (oldName: string) => {
    if (!editingCatName.trim() || oldName === editingCatName.trim()) {
      setEditingCatId(null);
      return;
    }
    try {
      const { error } = await supabase.from('categorias').update({ nome: editingCatName.trim() }).eq('nome', oldName);
      if (error) {
        setCategorias(prev => prev.map(c => c.id === oldName ? { id: editingCatName.trim(), label: editingCatName.trim() } : c));
      } else {
        fetchCategorias();
      }
    } catch (err) { }
    setEditingCatId(null);
  };

  const handleDeleteCategory = async (idName: string) => {
    try {
      const { error } = await supabase.from('categorias').delete().eq('nome', idName);

      if (error) {
        alert("Não é possível excluir. Existem produtos usando esta categoria.");
        return;
      }

      setCategorias((prev) => prev.filter(c => c.id !== idName));
    } catch (err) {
      alert("Não é possível excluir. Ocorreu um erro no servidor.");
    }
  };

  // Logic to identify missing ingredients
  const checkStockStatus = (product: Product): { available: boolean, missingItem?: string } => {
    let recipe = product.recipe;
    if (!recipe || recipe.length === 0) {
      recipe = RECIPES[product.id];
    }

    if (!recipe) return { available: true };

    for (const recipeItem of recipe) {
      const ingredient = inventory.find(i => i.id === recipeItem.ingredientId);
      if (!ingredient || ingredient.currentStock < recipeItem.amount) {
        return { available: false, missingItem: ingredient?.name || 'Insumo' };
      }
    }
    return { available: true };
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openProductModal = (product: Product) => {
    if (!checkStockStatus(product).available) return;
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalNotes('');
    setModalSelectedAddOns([]); // Reset AddOns
  };

  const toggleAddOn = (addon: AddOn) => {
    setModalSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) return prev.filter(a => a.id !== addon.id);
      return [...prev, addon];
    });
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    setCart(prev => {
      // Unique Item ID logic based on Product + Notes + AddOns
      const addonsKey = modalSelectedAddOns.map(a => a.id).sort().join(',');

      const existing = prev.find(item =>
        item.id === selectedProduct.id &&
        item.notes === modalNotes &&
        (item.selectedAddOns?.map(a => a.id).sort().join(',') === addonsKey)
      );

      if (existing) {
        return prev.map(item => item.cartId === existing.cartId ? { ...item, quantity: item.quantity + modalQuantity } : item);
      }
      return [...prev, {
        ...selectedProduct,
        cartId: Math.random().toString(36).substr(2, 9),
        quantity: modalQuantity,
        notes: modalNotes,
        selectedAddOns: modalSelectedAddOns
      }];
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const cartSubtotal = cart.reduce((acc, item) => {
    const addonsTotal = item.selectedAddOns?.reduce((sum, a) => sum + a.price, 0) || 0;
    return acc + ((item.price + addonsTotal) * item.quantity);
  }, 0);

  const tabSubtotal = selectedTabToPay ? selectedTabToPay.total : 0;
  const currentTotal = selectedTabToPay ? tabSubtotal : cartSubtotal;
  const discountAmount = appliedCoupon ? (currentTotal * (appliedCoupon.discountPercent / 100)) : 0;
  const finalTotal = currentTotal - discountAmount;

  const handleApplyCoupon = () => {
    const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase() && c.active);
    if (coupon) { setAppliedCoupon(coupon); }
    else { alert("Cupom inválido ou expirado."); setAppliedCoupon(null); }
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);

    setDeliveryForm(prev => ({
      ...prev,
      customerName: c.name,
      phone: c.phone,
      street: c.street || '',
      number: c.number || '',
      neighborhood: c.neighborhood
    }));
    setDineInName(c.name);
    setIsNewCustomer(false);
  };

  const checkCartStock = (currentCart: CartItem[]): { ok: boolean, error?: string } => {
    // 1. Aggregate total ingredients needed
    const needed: Record<string, number> = {};

    for (const item of currentCart) {
      let recipe = item.recipe;
      if (!recipe || recipe.length === 0) recipe = RECIPES[item.id] || [];

      for (const r of recipe) {
        if (!needed[r.ingredientId]) needed[r.ingredientId] = 0;
        needed[r.ingredientId] += (r.amount * item.quantity);
      }
    }

    // 2. Compare against inventory
    for (const [ingId, amountNeeded] of Object.entries(needed)) {
      const ing = inventory.find(i => i.id === ingId);
      if (!ing) return { ok: false, error: `Insumo desconhecido ID: ${ingId}` };
      if (ing.currentStock < amountNeeded) {
        return { ok: false, error: `Estoque Insuficiente: ${ing.name} (Precisa: ${amountNeeded} ${ing.unit}, Tem: ${ing.currentStock} ${ing.unit})` };
      }
    }

    return { ok: true };
  };

  const handleAddNewCustomer = () => {
    if (!deliveryForm.customerName || !deliveryForm.phone) return;

    // CRM Fix: Check Duplication
    const existing = customers.find(c => c.phone.replace(/\D/g, '') === deliveryForm.phone.replace(/\D/g, ''));
    if (existing) {
      alert(`Cliente já existe: ${existing.name}`);
      handleSelectCustomer(existing);
      return;
    }

    const newC: Omit<Customer, 'id'> = {
      name: deliveryForm.customerName,
      phone: deliveryForm.phone,
      street: deliveryForm.street,
      number: deliveryForm.number,
      neighborhood: deliveryForm.neighborhood,
      lastOrder: Date.now()
    };
    onAddCustomer(newC);
  };

  const processOrder = (sendToKitchenOnly: boolean) => {
    const parsedReceived = parseFloat(receivedAmountStr) || 0;
    const changeAmount = paymentMethod === 'CASH' ? Math.max(0, parsedReceived - finalTotal) : 0;
    const isCashValid = paymentMethod !== 'CASH' || parsedReceived >= finalTotal;

    if (!sendToKitchenOnly && !isCashValid) {
      alert("Valor recebido é menor que o total do pedido!");
      return;
    }

    if (selectedTabToPay) {
      onPayOrder(selectedTabToPay.id, paymentMethod, discountAmount, paymentMethod === 'CASH' ? parsedReceived : undefined, paymentMethod === 'CASH' ? changeAmount : undefined);
      setSelectedTabToPay(null); setShowCheckout(false); setAppliedCoupon(null); setCouponCode(''); setReceivedAmountStr('');
      return;
    }
    if (cart.length === 0) return;

    // Logic Fix: Validate Stock before finalizing
    const stockCheck = checkCartStock(cart);
    if (!stockCheck.ok) {
      alert(stockCheck.error);
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!deliveryForm.customerName || !deliveryForm.street || !deliveryForm.number) {
        alert("Preencha os dados de entrega (incluindo número).");
        return;
      }
      if (isNewCustomer) handleAddNewCustomer();
    } else {
      if (!dineInName) {
        alert("Informe o Nome do cliente.");
        return;
      }
    }

    onPlaceOrder(
      cart, orderType, sendToKitchenOnly ? 'PENDING' : paymentMethod,
      orderType === 'DELIVERY' ? deliveryForm : undefined,
      orderType === 'DINE_IN' ? dineInName : undefined,
      undefined,
      sendToKitchenOnly,
      paymentMethod === 'CASH' && !sendToKitchenOnly ? parsedReceived : undefined,
      paymentMethod === 'CASH' && !sendToKitchenOnly ? changeAmount : undefined
    );

    // Reset
    setCart([]); setShowCheckout(false); setAppliedCoupon(null); setCouponCode(''); setReceivedAmountStr('');
    setDeliveryForm({ customerName: '', phone: '', street: '', number: '', neighborhood: '' });
    setDineInName(''); setSelectedCustomer(null); setCustomerSearch('');
  };

  // V12: Calculate Modal Total dynamically
  const modalTotal = selectedProduct ? (selectedProduct.price + modalSelectedAddOns.reduce((sum, a) => sum + a.price, 0)) * modalQuantity : 0;

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-heading font-bold text-textPrimary">Cardápio</h2></div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={18} />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-border pl-10 pr-4 py-2.5 rounded-xl shadow-sm outline-none focus:border-accent" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar items-center">
          {currentCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as Category | 'ALL')}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-bold transition-all ${activeCategory === cat.id
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : `border ${isDark ? 'bg-[#1E1E24] border-white/5 text-slate-300 hover:bg-white/5' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
                }`}
            >
              {cat.label}
            </button>
          ))}

          <button
            onClick={() => setShowCategoryModal(true)}
            className={`p-2 rounded-xl font-bold transition-all flex items-center justify-center min-w-[40px] border border-dashed ${isDark ? 'border-white/20 text-slate-300 hover:bg-white/5 hover:border-accent hover:text-accent' : 'border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-accent hover:text-accent'}`}
            title="Gerenciar Categorias"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto pr-2 pb-24">
          {filteredProducts.map(product => {
            const { available, missingItem } = checkStockStatus(product);
            return (
              <button key={product.id} onClick={() => openProductModal(product)} disabled={!available} className={`text-left bg-white border border-border rounded-2xl overflow-hidden hover:shadow-premium-hover transition-all duration-300 group flex flex-col h-full ${!available ? 'opacity-70 grayscale cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className="h-44 overflow-hidden relative w-full">
                  <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {!available && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg mb-2">ESGOTADO</span>
                      {/* V13: Intelligent Stock Warning */}
                      <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200 mt-1">Falta: {missingItem}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-heading font-bold text-lg text-textPrimary leading-tight">{product.name}</h3>
                    <span className="font-bold text-accent bg-accent/10 px-2 py-1 rounded text-sm">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div className="mb-4">
                    <p className="text-textSecondary text-xs leading-relaxed line-clamp-2">{product.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(product.recipe || RECIPES[product.id])?.map(r => {
                        const ing = inventory.find(i => i.id === r.ingredientId);
                        return ing ? <span key={ing.id} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{ing.name}</span> : null;
                      })}
                    </div>
                  </div>

                  <div className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors mt-auto ${available ? 'bg-background text-textPrimary group-hover:bg-accent group-hover:text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {available ? 'Adicionar' : 'Indisponível'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-96 bg-white rounded-3xl flex flex-col border border-border shadow-premium h-[calc(100vh-2rem)] sticky top-4">
        <div className="p-6 border-b border-border">
          <h3 className="font-heading font-bold text-xl text-textPrimary flex items-center gap-2"><ShoppingCart className="text-accent" size={24} /> Pedido Atual</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col">
              {activeOrders.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 pl-2">Contas Abertas</h4>
                  <div className="space-y-2">
                    {activeOrders.map(tab => (
                      <div key={tab.id} onClick={() => { setSelectedTabToPay(tab); setShowCheckout(true); }} className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center cursor-pointer hover:bg-blue-100 transition-colors">
                        <div>
                          <span className="font-bold text-textPrimary block">{tab.customerName || 'Mesa Sem Nome'}</span>
                          <span className="text-xs text-textSecondary">{tab.items.length} itens</span>
                        </div>
                        <div className="text-right">
                          <span className="text-accent font-bold block">R$ {tab.total.toFixed(2)}</span>
                          <span className="text-[10px] text-accent font-bold uppercase">Pagar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 text-textSecondary opacity-50"><ShoppingBag size={48} className="mb-2" /><p>Carrinho vazio.</p></div>
              )}
            </div>
          ) : (
            cart.map(item => {
              const itemAddonsTotal = item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0;
              return (
                <div key={item.cartId} className="bg-background p-4 rounded-xl border border-border relative">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-textPrimary text-sm block">{item.name}</span>
                      {item.notes && <span className="text-xs text-highlight font-medium italic block">Obs: {item.notes}</span>}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedAddOns.map((addon, idx) => (
                            <span key={idx} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">+ {addon.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-textPrimary font-bold text-sm">R$ {((item.price + itemAddonsTotal) * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 bg-white border border-border rounded-lg shadow-sm">
                      <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1.5 hover:bg-gray-50"><Minus size={14} /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1.5 hover:bg-gray-50"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeItem(item.cartId)} className="text-textSecondary hover:text-danger p-1.5"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-background rounded-b-3xl border-t border-border">
          {!showCheckout ? (
            <>
              <div className="flex justify-between items-center mb-6"><span className="text-textSecondary font-medium">Total</span><span className="text-3xl font-heading font-extrabold text-textPrimary">R$ {cartSubtotal.toFixed(2)}</span></div>
              <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full bg-accent hover:bg-accentDark text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 transition-all">Continuar</button>
            </>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
              {selectedTabToPay ? (
                <div className="bg-blue-100 p-3 rounded-lg text-blue-800 text-sm font-bold text-center mb-2">Pagando: {selectedTabToPay.customerName} {selectedTabToPay.tableName && `(Mesa ${selectedTabToPay.tableName})`}</div>
              ) : (
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setOrderType('DINE_IN')} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${orderType === 'DINE_IN' ? 'border-accent bg-accent/5 text-accent font-bold' : 'border-border bg-white text-textSecondary'}`}><Store size={20} className="mb-1" /><span className="text-xs">Mesa / Balcão</span></button>
                  <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${orderType === 'DELIVERY' ? 'border-accent bg-accent/5 text-accent font-bold' : 'border-border bg-white text-textSecondary'}`}><MapPin size={20} className="mb-1" /><span className="text-xs">Delivery</span></button>
                </div>
              )}

              {!selectedTabToPay && (
                <div className="space-y-2 bg-white p-3 rounded-lg border border-border">
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1 text-accent font-bold text-xs uppercase tracking-wider"><UserSearch size={12} /> Cliente (Obrigatório)</div>
                    {!isNewCustomer ? (
                      <>
                        <input className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Buscar Cliente (Nome/Tel)..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                        {customerSearch && !selectedCustomer && (
                          <div className="absolute top-full left-0 w-full bg-white border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                            {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                              <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-2 hover:bg-gray-50 cursor-pointer text-xs border-b border-gray-100 last:border-0">
                                <span className="font-bold block">{c.name}</span>
                                <span className="text-gray-500">{c.phone}</span>
                              </div>
                            ))}
                            <div onClick={() => setIsNewCustomer(true)} className="p-2 hover:bg-green-50 cursor-pointer text-xs text-green-600 font-bold flex items-center gap-2"><Plus size={12} /> Cadastrar Novo</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-bold text-green-600 bg-green-50 p-2 rounded"><span><UserPlus size={12} className="inline mr-1" /> Novo Cliente</span><button onClick={() => setIsNewCustomer(false)} className="text-red-500"><X size={12} /></button></div>
                    )}
                  </div>

                  {(isNewCustomer || orderType === 'DELIVERY') && (
                    <div className="space-y-2 animate-in fade-in">
                      <input className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Nome" value={deliveryForm.customerName || (orderType === 'DINE_IN' ? dineInName : '')} onChange={e => { setDeliveryForm(p => ({ ...p, customerName: e.target.value })); setDineInName(e.target.value); }} />
                      <input className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Tel" value={deliveryForm.phone} onChange={e => setDeliveryForm(p => ({ ...p, phone: e.target.value }))} />
                      <div className="flex gap-2">
                        <input className="w-[70%] bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Rua" value={deliveryForm.street} onChange={e => setDeliveryForm(p => ({ ...p, street: e.target.value }))} />
                        <input type="number" className="w-[30%] bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Nº" value={deliveryForm.number} onChange={e => setDeliveryForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <input className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent" placeholder="Bairro" value={deliveryForm.neighborhood} onChange={e => setDeliveryForm(p => ({ ...p, neighborhood: e.target.value }))} />
                    </div>
                  )}

                  {orderType === 'DINE_IN' && !isNewCustomer && (
                    <div className="mt-2">
                      <input className="w-full bg-background border border-border rounded p-2 text-xs outline-none focus:border-accent font-bold mb-2" placeholder="Nome do Cliente (Obrigatório)" value={dineInName} onChange={e => setDineInName(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {['CREDIT', 'DEBIT', 'CASH', 'PIX'].map((pm) => (
                  <button key={pm} onClick={() => setPaymentMethod(pm as PaymentMethod)} className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-all ${paymentMethod === pm ? 'border-accent bg-accent/5 text-accent' : 'border-border bg-white text-textSecondary'}`}>
                    {pm === 'CREDIT' ? <CreditCard size={14} /> : pm === 'DEBIT' ? <CreditCard size={14} /> : pm === 'CASH' ? <Banknote size={14} /> : <Smartphone size={14} />}
                    {pm === 'CREDIT' ? 'CRÉDITO' : pm === 'DEBIT' ? 'DÉBITO' : pm === 'CASH' ? 'DINHEIRO' : 'PIX'}
                  </button>
                ))}
              </div>

              {paymentMethod === 'CASH' && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-4 space-y-2 animate-in fade-in">
                  <label className="text-sm font-bold text-green-800 block">Valor Recebido do Cliente (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="0.00"
                    value={receivedAmountStr}
                    onChange={(e) => setReceivedAmountStr(e.target.value)}
                    className="w-full bg-white border border-green-200 rounded p-3 text-lg font-bold outline-none focus:border-green-500"
                  />
                  {receivedAmountStr && (
                    <div className="pt-2 border-t border-green-200 mt-2 flex justify-between items-center">
                      <span className="font-bold text-green-800">Troco:</span>
                      <span className="font-extrabold text-green-700 text-lg">
                        R$ {Math.max(0, (parseFloat(receivedAmountStr) || 0) - finalTotal).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input className="flex-1 bg-background border border-border rounded-lg p-2 text-xs outline-none focus:border-accent uppercase" placeholder="CUPOM" value={couponCode} onChange={e => setCouponCode(e.target.value)} disabled={!!appliedCoupon} />
                {appliedCoupon ? (
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="bg-red-100 text-red-500 p-2 rounded-lg font-bold text-xs"><X size={14} /></button>
                ) : (
                  <button onClick={handleApplyCoupon} className="bg-gray-100 text-textSecondary p-2 rounded-lg font-bold text-xs"><Tag size={14} /></button>
                )}
              </div>

              <div className="bg-background p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-xs text-textSecondary"><span>Subtotal</span><span>R$ {currentTotal.toFixed(2)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-xs text-green-600 font-bold"><span>Desconto ({appliedCoupon?.code})</span><span>- R$ {discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-lg font-extrabold text-textPrimary pt-2 border-t border-border mt-1"><span>Total</span><span>R$ {finalTotal.toFixed(2)}</span></div>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                {!selectedTabToPay ? (
                  orderType === 'DINE_IN' ? (
                    <div className="flex gap-2">
                      <button onClick={() => setShowCheckout(false)} className="flex-1 bg-white border border-border font-bold rounded-xl text-sm">Voltar</button>
                      <button onClick={() => processOrder(true)} className="flex-[3] bg-highlight hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"><ChefHat size={18} /> Enviar p/ Cozinha</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setShowCheckout(false)} className="flex-1 bg-white border border-border font-bold rounded-xl text-sm">Voltar</button>
                      <button
                        onClick={() => processOrder(false)}
                        disabled={paymentMethod === 'CASH' && (parseFloat(receivedAmountStr) || 0) < finalTotal}
                        className="flex-[3] bg-success hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={18} /> Finalizar Pedido
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setShowCheckout(false); setSelectedTabToPay(null); }} className="flex-1 bg-white border border-border font-bold rounded-xl text-sm">Voltar</button>
                    <button
                      onClick={() => processOrder(false)}
                      disabled={paymentMethod === 'CASH' && (parseFloat(receivedAmountStr) || 0) < finalTotal}
                      className="flex-[3] bg-success hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} /> Receber Pagamento
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="h-48 relative">
              <img src={selectedProduct.image} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full"><X size={20} /></button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12"><h3 className="text-white font-heading font-bold text-2xl">{selectedProduct.name}</h3></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => setModalQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-textSecondary"><Minus size={20} /></button>
                <span className="text-3xl font-bold text-textPrimary w-12 text-center">{modalQuantity}</span>
                <button onClick={() => setModalQuantity(q => q + 1)} className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-textSecondary"><Plus size={20} /></button>
              </div>

              {/* V13: Global Add-on Logic */}
              {selectedProduct.category !== 'DRINK' && (
                <div>
                  <p className="text-xs font-bold text-textSecondary uppercase mb-2">Adicionais</p>
                  <div className="flex flex-wrap gap-2">
                    {addOns
                      .filter(addon => {
                        if (selectedProduct.category === 'BURGER') return true; // Show ALL for Burgers
                        return selectedProduct.allowedAddOns?.includes(addon.id); // Fallback
                      })
                      .map(addon => {
                        const isSelected = modalSelectedAddOns.some(a => a.id === addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => toggleAddOn(addon)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${isSelected ? 'bg-accent text-white border-accent font-bold' : 'bg-white text-textPrimary border-border'}`}
                          >
                            {addon.name} (+ R$ {addon.price.toFixed(2)})
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {selectedProduct.allowObservations && <textarea value={modalNotes} onChange={(e) => setModalNotes(e.target.value)} placeholder="(Ex: Sem molho, bem passado)" className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none resize-none h-20" />}

              <button onClick={confirmAddToCart} className="w-full bg-highlight hover:bg-yellow-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95">Adicionar - R$ {modalTotal.toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}
      {/* Category Management Modal V14 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className={`${isDark ? 'bg-[#1E1E24] border border-white/10' : 'bg-white'} rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
            {/* Header */}
            <div className={`p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'} flex justify-between items-center bg-gradient-to-r ${isDark ? 'from-accent/20 to-transparent' : 'from-accent/10 to-transparent'}`}>
              <div>
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Gerenciar Categorias</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Crie e edite as categorias do cardápio</p>
              </div>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCatId(null);
                }}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors`}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

              {/* Add New Category */}
              <div className="flex gap-2 mb-8">
                <input
                  type="text"
                  placeholder="Nome da nova categoria"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className={`flex-1 px-4 py-3 rounded-xl border font-medium outline-none transition-all ${isDark
                    ? 'bg-[#2A2A35] border-white/5 text-white focus:border-accent focus:bg-[#32323E]'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-accent focus:bg-white'
                    }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="bg-accent text-white px-5 rounded-xl font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* List existing */}
              <div className="space-y-3">
                <h4 className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-4`}>
                  Categorias Existentes
                </h4>

                {categorias.map(cat => (
                  <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-[#2A2A35] border-white/5' : 'bg-white border-slate-100'}`}>
                    {editingCatId === cat.id ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-lg border font-medium outline-none ${isDark ? 'bg-[#1E1E24] border-white/10 text-white focus:border-accent' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-accent'
                            }`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(cat.id);
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                        />
                        <button
                          onClick={() => handleUpdateCategory(cat.id)}
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          <CheckCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>{cat.label}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.label);
                            }}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                            title="Editar Categoria"
                          >
                            <Tag size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300' : 'hover:bg-red-50 text-red-500 hover:text-red-600'}`}
                            title="Excluir Categoria"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categorias.length === 0 && (
                  <div className={`text-center py-6 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Nenhuma categoria personalizada criada.<br />Use o campo acima para criar a primeira!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};