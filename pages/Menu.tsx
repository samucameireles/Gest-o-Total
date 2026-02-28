import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase, setTenant as setActiveScopeTenant } from "../lib/supabase";
import { RECIPES } from "../constants";
import {
  ShoppingCart,
  MapPin,
  Phone,
  User,
  X,
  Plus,
  Minus,
  ChefHat,
  CheckCircle,
  Loader2,
  Search,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Search as SearchIcon,
  Share2,
  Home,
  Receipt,
  Gift,
  Copy,
  LayoutGrid,
  Store,
  Sun,
  ChevronRight,
} from "lucide-react";
import { AddOn } from "../types";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  image_url?: string;
  category: string;
  allowObservations?: boolean;
  recipe?: { ingredientId: string; amount: number }[];
  allowedAddOns?: string[];
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
  notes?: string;
  selectedAddOns?: AddOn[];
}

interface TenantInfo {
  id: string;
  name: string;
  logo_url?: string;
  logo_path?: string;
  settings: {
    logoUrl?: string;
    menu?: {
      openingTime: string;
      closingTime: string;
      forceClose?: boolean;
      minimumOrder: number;
      estimatedDeliveryTime: string;
      allowedOrderTypes?: "DELIVERY" | "PICKUP" | "BOTH" | "VIEW_ONLY";
    };
    address?: string;
    googleMapsUrl?: string;
    operatingHours?: {
      monday: string;
      tuesday: string;
      wednesday: string;
      thursday: string;
      friday: string;
      saturday: string;
      sunday: string;
    };
  };
  online_menu_enabled: boolean;
  theme_color?: string;
}

interface NeighborhoodFee {
  id: string;
  name: string;
  price: number;
}

interface OrderForm {
  customerName: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  notes: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

const normalizeText = (text: string | null | undefined) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<
    { id: string; currentStock: number }[]
  >([]);
  const [categorias, setCategorias] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [neighborhoodFees, setNeighborhoodFees] = useState<NeighborhoodFee[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "PIX" | "CASH" | "CREDIT" | "DEBIT"
  >("PIX");
  const [deliveryType, setDeliveryType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [showNeighborhoodSuggestions, setShowNeighborhoodSuggestions] =
    useState(false);

  const [form, setForm] = useState<OrderForm>({
    customerName: "",
    phone: "",
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    notes: "",
  });

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState("");
  const [modalSelectedAddOns, setModalSelectedAddOns] = useState<AddOn[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: tenantData, error: te } = await supabase
          .from("tenants")
          .select("id, name, settings, online_menu_enabled, logo_url, logo_path, theme_color")
          .eq("slug", slug)
          .single();

        if (te || !tenantData) {
          setError("Cardápio não encontrado. Verifique o link.");
          setLoading(false);
          return;
        }

        if (!tenantData.online_menu_enabled) {
          setError("Este cardápio está temporariamente indisponível.");
          setLoading(false);
          return;
        }

        setTenant(tenantData);

        if (tenantData.settings?.menu?.allowedOrderTypes === "PICKUP") {
          setDeliveryType("PICKUP");
        } else if (tenantData.settings?.menu?.allowedOrderTypes === "DELIVERY") {
          setDeliveryType("DELIVERY");
        } else {
          setDeliveryType("DELIVERY"); // Default to Delivery if BOTH or undefined for better UX initially
        }

        const tenantId = tenantData.id;
        setActiveScopeTenant(tenantId);

        // Fetch products
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");
        if (prods) {
          setProducts(
            prods.map((p: any) => ({
              ...p,
              image: p.image_url,
              allowObservations: p.allow_observations,
              allowedAddOns: Array.isArray(p.allowed_add_ons)
                ? p.allowed_add_ons
                : p.allowed_add_ons
                  ? JSON.parse(p.allowed_add_ons)
                  : [],
            })),
          );
        }

        // Fetch AddOns
        const { data: ads } = await supabase
          .from("addons")
          .select("*")
          .eq("tenant_id", tenantId)

          .order("name");
        if (ads) {
          console.log('Fetched addons count:', ads.length);
          setAddOns(ads as any);
        }

        // Fetch Inventory for Stock Deduction
        const { data: invData } = await supabase
          .from("ingredients")
          .select("id, current_stock")
          .eq("tenant_id", tenantId);
        if (invData)
          setInventory(
            invData.map((i) => ({
              id: i.id,
              currentStock: i.current_stock,
            })) as any,
          );

        // Fetch categories
        const { data: cats } = await supabase
          .from("categorias")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("nome");

        if (cats)
          setCategorias(cats.map((c: any) => ({ id: c.id, label: c.nome })));

        // Fetch neighborhood fees
        const { data: fees } = await supabase
          .from("fees")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name");
        if (fees) setNeighborhoodFees(fees);

        // Fetch Coupons
        const { data: coups } = await supabase
          .from("coupons")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("active", true);
        if (coups) {
          setCoupons(
            coups.map((c: any) => ({
              ...c,
              discountPercent: c.discount_percent,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar o cardápio.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("customer_name");
    const savedPhone = localStorage.getItem("customer_phone");
    if (savedName || savedPhone) {
      setForm((p) => ({
        ...p,
        customerName: savedName || p.customerName,
        phone: savedPhone || p.phone,
      }));
    }
  }, []);

  // Customer Look-up Effect
  useEffect(() => {
    if (!tenant || !form.phone || form.phone.length < 3) return;

    const lookupCustomer = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("phone", form.phone)
        .maybeSingle();

      if (data && !error) {
        setForm((p) => ({
          ...p,
          customerName: p.customerName || data.name,
          street: p.street || data.street,
          number: p.number || data.number,
          neighborhood: p.neighborhood || data.neighborhood,
          complement: p.complement || data.complement,
        }));
      }
    };

    const timer = setTimeout(lookupCustomer, 1000);
    return () => clearTimeout(timer);
  }, [form.phone, tenant?.id]);

  const getStockStatus = (product: Product) => {
    const recipe = product.recipe || RECIPES[product.id];
    if (!recipe || recipe.length === 0) return { available: true };

    const cartQty = cart
      .filter((i) => i.id === product.id)
      .reduce((s, i) => s + i.quantity, 0);

    for (const item of recipe) {
      const invItem = inventory.find((i) => i.id === item.ingredientId);
      if (!invItem || invItem.currentStock < item.amount * (cartQty + 1)) {
        return {
          available: false,
          missingItem: invItem ? (invItem as any).name || 'Insumo' : 'Insumo'
        };
      }
    }
    return { available: true };
  };

  const isAvailable = (product: Product) => getStockStatus(product).available;

  const handleProductClick = (product: Product) => {
    if (!isAvailable(product)) return;
    console.log('Product clicked', product.name, 'allowedAddOns', product.allowedAddOns);
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalNotes("");
    setModalSelectedAddOns([]);
  };

  const handleToggleAddOn = (addon: AddOn) => {
    setModalSelectedAddOns((prev) => {
      if (prev.find((a) => a.id === addon.id)) {
        return prev.filter((a) => a.id !== addon.id);
      }
      return [...prev, addon];
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    setCart((prev) => {
      const existingSameNotesAndAddons = prev.find(
        (i) =>
          i.id === selectedProduct.id &&
          i.notes === modalNotes &&
          JSON.stringify(i.selectedAddOns?.map((a) => a.id).sort()) ===
          JSON.stringify(modalSelectedAddOns.map((a) => a.id).sort()),
      );

      if (existingSameNotesAndAddons) {
        return prev.map((i) =>
          i.cartId === existingSameNotesAndAddons.cartId
            ? { ...i, quantity: i.quantity + modalQuantity }
            : i,
        );
      }

      return [
        ...prev,
        {
          ...selectedProduct,
          cartId: Math.random().toString(36).substr(2, 9),
          quantity: modalQuantity,
          notes: modalNotes,
          selectedAddOns: modalSelectedAddOns,
        },
      ];
    });

    setSelectedProduct(null);
  };

  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((i) =>
        i.cartId === cartId ? { ...i, quantity: i.quantity + delta } : i,
      );
      return updated.filter((i) => i.quantity > 0);
    });
  };

  const handleApplyCoupon = () => {
    const coupon = coupons.find(
      (c) => (c.code?.toLowerCase() || "") === couponCode.toLowerCase() && c.active,
    );
    if (coupon) {
      setAppliedCoupon(coupon);
    } else {
      alert("Cupom inválido ou expirado.");
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const cartTotal = cart.reduce((s, i) => {
    const addonsTotal =
      i.selectedAddOns?.reduce((sum, a) => sum + a.price, 0) || 0;
    return s + (i.price + addonsTotal) * i.quantity;
  }, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const activeFee = neighborhoodFees.find((f) => f.name === form.neighborhood);
  const deliveryFee = deliveryType === "PICKUP" ? 0 : (activeFee ? activeFee.price : 0);
  const discountAmount = appliedCoupon
    ? cartTotal * (appliedCoupon.discountPercent / 100)
    : 0;
  const finalTotal = cartTotal - discountAmount + deliveryFee;

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !searchQuery || (p.name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // Group products by category
  const productsByCategory = categorias
    .map((cat) => ({
      ...cat,
      products: filteredProducts.filter((p) => p.category === cat.id),
    }))
    .filter((cat) => cat.products.length > 0);

  const handleSubmitOrder = async () => {
    if (!tenant) return;
    if (!form.customerName || !form.phone) {
      alert("Preencha Nome e WhatsApp.");
      return;
    }
    if (deliveryType === "DELIVERY") {
      if (!form.street || !form.number || !form.neighborhood) {
        alert("Preencha os dados do endereço de entrega.");
        return;
      }
      const isNeighborhoodValid = neighborhoodFees.some(
        (f) => f.name.toLowerCase() === form.neighborhood.toLowerCase()
      );
      if (!isNeighborhoodValid) {
        alert("Entrega não disponível para o bairro informado.");
        return;
      }
    }
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      // 1. Sync Customer with CRM and get customer_id
      let customerId: string | undefined;
      try {
        const { data: existingCust } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("phone", form.phone)
          .maybeSingle();

        if (existingCust) {
          customerId = existingCust.id;
          await supabase
            .from("customers")
            .update({
              name: form.customerName,
              street: form.street,
              number: form.number,
              neighborhood: form.neighborhood,
              complement: form.complement,
              last_order_at: new Date().toISOString(),
            })
            .eq("id", existingCust.id);
        } else {
          const { data: newCust, error: custErr } = await supabase
            .from("customers")
            .insert({
              tenant_id: tenant.id,
              name: form.customerName,
              phone: form.phone,
              street: form.street,
              number: form.number,
              neighborhood: form.neighborhood,
              complement: form.complement,
              last_order_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (!custErr && newCust) {
            customerId = newCust.id;
          }
        }
      } catch (crmErr) {
        console.error("Error syncing with CRM:", crmErr);
      }

      // 2. Insert Order linking to customerId
      const { data: order, error: oe } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenant.id,
          customer_id: customerId, // Linked to CRM
          status: "PREPARING",
          type: deliveryType,
          total: finalTotal,
          discount: discountAmount,
          is_paid: false,
          display_id: Math.floor(Math.random() * 9000) + 1000,
          customer_name: form.customerName,
          delivery_details: deliveryType === "DELIVERY" ? {
            customerName: form.customerName,
            phone: form.phone,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
          } : {
            customerName: form.customerName,
            phone: form.phone,
            pickup: true
          },
          delivery_notes: form.notes,
          delivery_fee: deliveryFee,
          payment_method: paymentMethod,
          kitchen_dismissed: false,
        })
        .select()
        .single();

      if (oe || !order) {
        console.error("Supabase raw error creating order:", oe);
        throw new Error(oe?.message || "Erro ao criar pedido");
      }

      for (const item of cart) {
        const { data: itemData, error: itemError } = await supabase
          .from("order_items")
          .insert([
            {
              tenant_id: tenant.id,
              order_id: order.id,
              product_id: item.id,
              quantity: item.quantity,
              price_at_time: item.price,
              notes: item.notes || "",
            },
          ])
          .select()
          .single();

        if (itemError) throw itemError;

        if (item.selectedAddOns && item.selectedAddOns.length > 0) {
          await supabase.from("order_item_addons").insert(
            item.selectedAddOns.map((a) => ({
              tenant_id: tenant.id,
              order_item_id: itemData.id,
              addon_id: a.id,
              price_at_time: a.price,
            })),
          );
        }
      }

      for (const item of cart) {
        let productRecipe = item.recipe || RECIPES[item.id];
        if (productRecipe && productRecipe.length > 0) {
          for (const recipeItem of productRecipe) {
            const { data: latestIng } = await supabase
              .from("ingredients")
              .select("current_stock")
              .eq("id", recipeItem.ingredientId)
              .single();

            if (latestIng) {
              const newStock =
                latestIng.current_stock - recipeItem.amount * item.quantity;
              await supabase
                .from("ingredients")
                .update({ current_stock: newStock })
                .eq("id", recipeItem.ingredientId);
            }
          }
        }
      }

      setOrderSuccess(true);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);

      // Save to localStorage for browser persistence
      localStorage.setItem("customer_name", form.customerName);
      localStorage.setItem("customer_phone", form.phone);
    } catch (err: any) {
      alert("Erro ao enviar pedido: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="animate-spin text-orange-500 mx-auto mb-3"
            size={40}
          />
          <p className="text-slate-500 font-medium">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-bold text-slate-700 mb-2">
            Cardápio não encontrado
          </h2>
          <p className="text-slate-500">
            {error || "Verifique o link e tente novamente."}
          </p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="text-center max-w-sm relative z-10 w-full">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100/50">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-3">
            Pedido Recebido! 🎉
          </h2>
          <p className="text-slate-500 mb-8 font-medium">
            Seu pedido foi enviado para a cozinha. Em breve entraremos em
            contato com informações do motoboy e tempo de entrega estimado.
          </p>

          <div className="space-y-3 px-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors shadow-lg active:scale-95"
            >
              <Receipt size={18} /> Ver Meus Pedidos
            </button>
            <button
              onClick={() => setOrderSuccess(false)}
              className="w-full bg-orange-50 text-orange-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors border-2 border-orange-100 active:scale-95"
            >
              Fazer Novo Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  const menuConfig = tenant.settings?.menu || null;
  const logoUrl = tenant.logo_url || tenant.settings?.logoUrl;

  let isStoreOpen = true;
  let storeStatusMessage = "";
  const isViewOnly = tenant.settings?.menu?.allowedOrderTypes === 'VIEW_ONLY';

  if (menuConfig) {
    if (menuConfig.forceClose) {
      isStoreOpen = false;
      storeStatusMessage = "Loja temporariamente fechada.";
    } else if (menuConfig.openingTime && menuConfig.closingTime) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

      const openTime = menuConfig.openingTime;
      const closeTime = menuConfig.closingTime;

      if (openTime <= closeTime) {
        isStoreOpen = currentTimeStr >= openTime && currentTimeStr <= closeTime;
      } else {
        isStoreOpen = currentTimeStr >= openTime || currentTimeStr <= closeTime;
      }

      if (!isStoreOpen) {
        storeStatusMessage = `Loja fechada, abriremos às ${menuConfig.openingTime}.`;
      }
    }
  }

  const minimumOrder = menuConfig?.minimumOrder || 0;
  const estimatedDeliveryTime = menuConfig?.estimatedDeliveryTime || '40-50 min';

  const themeColor = tenant.theme_color || '#f97316';

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900">
      <style>{`
        :root {
          --theme-color: ${themeColor};
          --theme-color-hover: ${themeColor}dd;
          --theme-color-light: ${themeColor}15;
        }
        .bg-theme { background-color: var(--theme-color) !important; }
        .text-theme { color: var(--theme-color) !important; }
        .border-theme { border-color: var(--theme-color) !important; }
        .hover\\:bg-theme:hover { background-color: var(--theme-color-hover) !important; }
        .bg-theme-light { background-color: var(--theme-color-light) !important; }
      `}</style>
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenant.name}
                className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl shadow-sm border border-orange-200">
                {tenant.name.substring(0, 1)}
              </div>
            )}
            <div>
              <div className={`flex items-center gap-2 text-lg font-bold ${isStoreOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isStoreOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {tenant.name || 'NOME VAZIO'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <SearchIcon size={20} />
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header */}
      <div className="bg-slate-800 text-white border-b border-slate-700 py-2">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            {isViewOnly ? (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Cardápio apenas para visualização
              </span>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                {menuConfig?.openingTime ? `Abre às ${menuConfig.openingTime}` : ''} {minimumOrder > 0 ? `• Mínimo R$ ${minimumOrder.toFixed(2).replace('.', ',')}` : '• Sem mínimo'} • {estimatedDeliveryTime}
              </>
            )}
          </div>
          <button
            onClick={() => setShowProfileModal(true)}
            className="text-xs text-slate-300 hover:text-white transition-colors"
          >
            Horários/Localização
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!isStoreOpen && (
        <div className="bg-orange-500 text-white text-center py-2 text-xs font-bold shadow-sm">
          {storeStatusMessage}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {showSearch && (
          <div className="px-4 py-4 bg-slate-50">
            <div className="relative">
              <Search
                className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                autoFocus
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] placeholder-slate-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="bg-slate-50 mb-2 px-4 flex items-center gap-2">
          <div className="flex-1 overflow-x-auto py-5 no-scrollbar flex gap-2.5">
            <button
              onClick={() => {
                setActiveCategory("ALL");
                setShowAllCategories(false);
              }}
              className={`px-5 py-2.5 whitespace-nowrap text-sm font-semibold rounded-2xl transition-all shadow-sm ${activeCategory === "ALL"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setShowAllCategories(false);
                }}
                className={`px-5 py-2.5 whitespace-nowrap text-sm font-semibold rounded-2xl transition-all shadow-sm ${activeCategory === cat.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-2xl transition-all shadow-sm border ${showAllCategories ? 'bg-theme text-white border-theme' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-theme'}`}
            title="Ver todas as categorias"
          >
            <LayoutGrid size={20} />
          </button>
        </div>

        {/* Expanded Categories Grid */}
        {showAllCategories && (
          <div className="px-4 pb-6 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <button
                onClick={() => {
                  setActiveCategory("ALL");
                  setShowAllCategories(false);
                }}
                className={`p-4 rounded-2xl border text-center transition-all ${activeCategory === "ALL" ? 'border-theme bg-theme-light text-theme' : 'border-slate-100 bg-white text-slate-600 hover:border-theme'}`}
              >
                <p className="font-bold text-sm">Todos</p>
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setShowAllCategories(false);
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all ${activeCategory === cat.id ? 'border-theme bg-theme-light text-theme' : 'border-slate-100 bg-white text-slate-600 hover:border-theme'}`}
                >
                  <p className="font-bold text-sm">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories & Products */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ChefHat size={48} strokeWidth={1.5} className="mx-auto mb-4 opacity-50 text-slate-400" />
            <p className="font-semibold text-sm">Sem produtos</p>
          </div>
        ) : (
          <div className="pb-6 px-4 space-y-8">
            {productsByCategory
              .filter(
                (cat) => activeCategory === "ALL" || cat.id === activeCategory,
              )
              .map((category) => {
                const isHorizontal =
                  (category.label?.toLowerCase() || "").includes("mais pedidos") ||
                  (category.label?.toLowerCase() || "").includes("destaques");

                return (
                  <div key={category.id} className="pt-2">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">
                      {category.label}
                    </h2>

                    {isHorizontal ? (
                      <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar -mx-4 px-4">
                        {category.products.map((product) => {
                          const imgSrc = product.image_url || product.image;
                          const qty = cart
                            .filter((i) => i.id === product.id)
                            .reduce((s, i) => s + i.quantity, 0);
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="snap-center shrink-0 w-[160px] flex flex-col cursor-pointer active:scale-95 transition-transform bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                            >
                              <div className="w-full h-[140px] bg-slate-100 overflow-hidden relative">
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={product.name}
                                    className={`w-full h-full object-cover transition-all duration-300 ${!getStockStatus(product).available ? 'grayscale opacity-70' : ''}`}
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-slate-300 ${!getStockStatus(product).available ? 'grayscale opacity-70' : ''}`}>
                                    <ChefHat size={32} strokeWidth={1.5} />
                                  </div>
                                )}
                                {!getStockStatus(product).available && (
                                  <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center border-b border-slate-100">
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg mb-1">ESGOTADO</span>
                                    <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Falta: {getStockStatus(product).missingItem}</span>
                                  </div>
                                )}
                                {qty > 0 && (
                                  <div className="absolute top-2 right-2 bg-theme text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                    {qty}
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex flex-col flex-1">
                                <h3 className="font-bold text-slate-800 leading-tight text-sm line-clamp-2 mb-2">
                                  {product.name}
                                </h3>
                                <div className="mt-auto">
                                  <span className="text-theme font-bold text-sm">
                                    R$ {product.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.products.map((product) => {
                          const imgSrc = product.image_url || product.image;
                          const qty = cart
                            .filter((i) => i.id === product.id)
                            .reduce((s, i) => s + i.quantity, 0);
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className={`flex bg-white rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-orange-200 transition-all active:scale-[0.98] overflow-hidden`}
                            >
                              <div className="flex-1 p-4 flex flex-col justify-between">
                                <div>
                                  <h3 className="font-bold text-slate-800 text-[15px] leading-tight mb-1">
                                    {product.name}
                                  </h3>
                                  {product.description && (
                                    <p className="text-[13px] text-slate-500 leading-snug line-clamp-2 mb-3">
                                      {product.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-theme">
                                    R$ {product.price.toFixed(2)}
                                  </span>
                                  {qty > 0 && (
                                    <span className="text-theme text-[11px] font-bold px-2 py-0.5 rounded-full bg-theme-light border border-theme flex items-center gap-1">
                                      <CheckCircle size={10} /> {qty} no carrinho
                                    </span>
                                  )}
                                </div>
                              </div>
                              {imgSrc && (
                                <div className="w-[110px] shrink-0 relative bg-slate-50 p-2 pl-0">
                                  <div className="w-full h-full rounded-xl overflow-hidden shadow-sm">
                                    <img
                                      src={imgSrc}
                                      alt={product.name}
                                      className={`w-full h-full object-cover ${!getStockStatus(product).available ? 'grayscale opacity-70' : ''}`}
                                    />
                                    {!getStockStatus(product).available && (
                                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                                        <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-lg mb-1">ESGOTADO</span>
                                        <span className="text-[8px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 leading-none">Falta: {getStockStatus(product).missingItem}</span>
                                      </div>
                                    )}
                                  </div>
                                  {qty > 0 && (
                                    <div className="absolute top-1 right-1 bg-theme text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">
                                      {qty}
                                    </div>
                                  )}
                                </div>
                              )}
                              {!imgSrc && qty > 0 && (
                                <div className="p-4 flex items-center justify-center">
                                  <div className="bg-theme text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                    {qty}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe px-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className={`max-w-md mx-auto flex items-center ${isViewOnly ? 'justify-center' : 'justify-around'} pb-3 pt-3`}>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-theme transition-colors active:scale-95"
          >
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">Início</span>
          </button>

          {!isViewOnly && (
            <button
              onClick={() => cartCount > 0 && setShowCart(true)}
              className={`flex flex-col items-center gap-1 relative transition-all active:scale-95 ${cartCount > 0 ? "text-theme" : "text-slate-400 hover:text-theme"}`}
            >
              <ShoppingCart size={22} strokeWidth={2.5} />
              <span
                className={`text-[10px] font-bold text-center`}
              >
                {cartCount > 0 ? `R$ ${cartTotal.toFixed(2)}` : "Carrinho"}
              </span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-theme text-white px-1.5 py-0.5 text-[10px] font-bold rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Compartilhar Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowShareModal(false)}
          ></div>
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Compartilhar Cardápio</h3>
                <p className="text-sm text-slate-500">{tenant.name}</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-center text-slate-600 font-medium mb-4">
                Como você quer compartilhar nossa loja?
              </p>

              <button
                onClick={() => {
                  const url = window.location.href;
                  const text = `Confira o cardápio de ${tenant.name} e faça seu pedido online!`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n' + url)}`, '_blank');
                  setShowShareModal(false);
                }}
                className="w-full bg-[#25D366] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#20bd5a] transition-colors active:scale-95"
              >
                Compartilhar no WhatsApp
              </button>

              <button
                onClick={() => {
                  const url = window.location.href;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                  setShowShareModal(false);
                }}
                className="w-full bg-[#1877F2] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#166fe5] transition-colors active:scale-95"
              >
                Compartilhar no Facebook
              </button>

              <button
                onClick={() => {
                  const url = window.location.href;
                  const text = `Confira o cardápio de ${tenant.name}!`;
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  setShowShareModal(false);
                }}
                className="w-full bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-900 transition-colors active:scale-95"
              >
                Compartilhar no X (Twitter)
              </button>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Link copiado para a área de transferência!");
                    setShowShareModal(false);
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors active:scale-95"
                >
                  <Copy size={18} /> Copiar Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* ── PRODUCT MODAL ── */}
      {
        selectedProduct && (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedProduct(null)}
            />
            <div className="relative bg-slate-50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-w-md mx-auto w-full shadow-2xl">
              {/* Modal Header/Image */}
              <div className="relative h-[30vh] bg-slate-100 flex-shrink-0">
                {selectedProduct.image_url || selectedProduct.image ? (
                  <img
                    src={selectedProduct.image_url || selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ChefHat size={64} strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent"></div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-8 bg-slate-50">
                <div className="px-6 pt-6 pb-6 bg-white">
                  <h3 className="font-bold text-2xl text-slate-800 mb-2 leading-tight">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.description && (
                    <p className="text-[15px] text-slate-500 leading-relaxed mb-4">
                      {selectedProduct.description}
                    </p>
                  )}
                  <div className="flex items-center">
                    <span className="text-theme font-bold text-xl">
                      R$ {selectedProduct.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Add-ons */}
                {!isViewOnly && selectedProduct.allowedAddOns &&
                  selectedProduct.allowedAddOns.length > 0 && (
                    <div className="px-6 py-6 mt-2 bg-white border-t border-slate-100">
                      <div className="mb-4">
                        <h4 className="font-bold text-slate-800 text-lg">
                          Adicionais
                        </h4>
                        <p className="text-sm text-slate-500">
                          Escolha as opções que preferir
                        </p>
                      </div>
                      <div className="space-y-3">
                        {addOns
                          .filter((a) =>
                            selectedProduct.allowedAddOns?.includes(a.id),
                          )
                          .map((addon) => {
                            const isSelected = modalSelectedAddOns.find(
                              (a) => a.id === addon.id,
                            );
                            return (
                              <div
                                key={addon.id}
                                onClick={() => handleToggleAddOn(addon)}
                                className={`flex items-center justify-between p-4 cursor-pointer rounded-2xl border transition-all active:scale-[0.98] ${isSelected ? "border-orange-500 bg-orange-50/50" : "border-slate-200 bg-white hover:border-orange-200"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-5 h-5 flex items-center justify-center rounded-full border transition-colors ${isSelected ? "bg-theme border-theme" : "bg-white border-slate-300"}`}
                                  >
                                    {isSelected && (
                                      <CheckCircle
                                        size={14}
                                        className="text-white"
                                        strokeWidth={3}
                                      />
                                    )}
                                  </div>
                                  <span
                                    className={`font-semibold text-[15px] ${isSelected ? "text-slate-900" : "text-slate-700"}`}
                                  >
                                    {addon.name}
                                  </span>
                                </div>
                                <span
                                  className={`text-sm font-bold ${isSelected ? "text-theme" : "text-slate-500"}`}
                                >
                                  + R$ {addon.price.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* Notes */}
                {!isViewOnly && selectedProduct.allowObservations !== false && (
                  <div className="px-6 py-6 mt-2 bg-white border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-lg mb-1">
                      Alguma observação?
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                      Ex: Tirar cebola, ponto da carne, etc.
                    </p>
                    <textarea
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Digite aqui..."
                      className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light text-[15px] bg-slate-50 resize-none h-28 placeholder-slate-400 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-4 flex-shrink-0 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
                {!isViewOnly && (
                  <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                    <button
                      onClick={() =>
                        setModalQuantity(Math.max(1, modalQuantity - 1))
                      }
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-orange-500 hover:shadow-sm transition-all"
                    >
                      <Minus size={20} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold text-slate-800 w-6 text-center text-lg">
                      {modalQuantity}
                    </span>
                    <button
                      onClick={() => setModalQuantity(modalQuantity + 1)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white hover:text-orange-500 hover:shadow-sm transition-all"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                <button
                  onClick={isViewOnly ? undefined : handleAddToCart}
                  disabled={isViewOnly}
                  className={`flex-1 rounded-2xl font-bold py-4 shadow-lg transition-transform flex items-center justify-center px-6 active:scale-95 text-base ${isViewOnly ? 'bg-slate-100 text-slate-400 shadow-none cursor-default' : 'bg-theme text-white shadow-theme-light'}`}
                >
                  {isViewOnly ? (
                    <span>Apenas Visualização</span>
                  ) : (
                    <>
                      <span>Adicionar</span>
                      <span className="font-bold ml-auto">
                        R${" "}
                        {(
                          (selectedProduct.price +
                            modalSelectedAddOns.reduce((s, a) => s + a.price, 0)) *
                          modalQuantity
                        ).toFixed(2)}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ── CART BOTTOM SHEET ── */}
      {
        showCart && (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setShowCart(false)}
            />
            <div className="relative bg-slate-50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-w-md mx-auto w-full shadow-2xl">
              <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                <h3 className="font-bold text-2xl text-slate-800">
                  Carrinho
                </h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 no-scrollbar">
                {cart.map((item) => {
                  const addonsTotal =
                    item.selectedAddOns?.reduce((sum, a) => sum + a.price, 0) ||
                    0;
                  const itemTotal = (item.price + addonsTotal) * item.quantity;
                  return (
                    <div
                      key={item.cartId}
                      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-[15px] leading-tight mb-1">
                            {item.name}
                          </p>
                          {item.selectedAddOns &&
                            item.selectedAddOns.length > 0 && (
                              <div className="flex flex-col gap-1 mt-2">
                                {item.selectedAddOns.map((addon) => (
                                  <span
                                    key={addon.id}
                                    className="text-[13px] text-slate-500 flex items-center gap-1.5"
                                  >
                                    <span className="text-orange-500 font-bold">+</span> {addon.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          {item.notes && (
                            <p className="text-[13px] text-slate-500 italic mt-2 bg-slate-50 p-2 rounded-xl">
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                        <p className="text-orange-600 font-bold text-[15px] whitespace-nowrap">
                          R$ {itemTotal.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
                        <button
                          onClick={() => updateQty(item.cartId, -item.quantity)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Remover
                        </button>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button
                            onClick={() => updateQty(item.cartId, -1)}
                            className="p-1.5 text-slate-500 hover:text-orange-500 hover:bg-white rounded-lg transition-colors"
                          >
                            <Minus size={16} strokeWidth={2.5} />
                          </button>
                          <span className="font-bold text-slate-800 w-5 text-center text-[15px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.cartId, 1)}
                            className="p-1.5 text-slate-500 hover:text-theme hover:bg-white rounded-lg transition-colors"
                          >
                            <Plus size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0 z-10 relative pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="space-y-3 mb-5 text-[15px]">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-800">
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="flex items-center gap-1">
                        <Gift size={14} /> Desconto ({appliedCoupon.discountPercent}%)
                      </span>
                      <span className="font-medium">
                        - R$ {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                    <span className="font-bold text-lg text-slate-800">
                      Total
                    </span>
                    <span className="text-xl font-bold text-orange-600">
                      R$ {(cartTotal - discountAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCart(false);
                    setShowCheckout(true);
                  }}
                  className="w-full bg-theme text-white rounded-2xl font-bold py-4 shadow-lg shadow-theme-light transition-transform flex items-center justify-center gap-2 active:scale-95 text-base"
                >
                  Continuar para Entrega →
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ── CHECKOUT FORM ── */}
      {
        showCheckout && (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center p-0 sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setShowCheckout(false)}
            />
            <div className="relative bg-slate-50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-w-md mx-auto w-full shadow-2xl">
              <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
                <h3 className="font-bold text-2xl text-slate-800">
                  Finalizar Pedido
                </h3>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto w-full p-4 space-y-4 bg-slate-50 no-scrollbar">
                {/* Personal Details */}
                <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-theme-light flex items-center justify-center text-theme">
                      <User size={16} strokeWidth={2.5} />
                    </div>
                    Seus Dados
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                        Nome Completo
                      </label>
                      <input
                        value={form.customerName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, customerName: e.target.value }))
                        }
                        placeholder="ex: João Silva"
                        className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="(DD) 99999-9999"
                        className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </section>

                {/* Delivery OR Pickup Type */}
                {tenant?.settings?.menu?.allowedOrderTypes !== "DELIVERY" && tenant?.settings?.menu?.allowedOrderTypes !== "PICKUP" && (
                  <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-full bg-theme-light flex items-center justify-center text-theme">
                        <Home size={16} strokeWidth={2.5} />
                      </div>
                      Tipo de Pedido
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryType("DELIVERY")}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${deliveryType === "DELIVERY" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                      >
                        <span className="font-semibold text-sm">🚚 Entrega</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType("PICKUP")}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${deliveryType === "PICKUP" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                      >
                        <span className="font-semibold text-sm">🚶 Retirada</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Display selected type if restricted */}
                {(tenant?.settings?.menu?.allowedOrderTypes === "DELIVERY" || tenant?.settings?.menu?.allowedOrderTypes === "PICKUP") && (
                  <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-2 text-slate-600">
                    {tenant?.settings?.menu?.allowedOrderTypes === "DELIVERY" ? (
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-theme animate-pulse" />
                        Disponível apenas para Entrega
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-theme animate-pulse" />
                        Disponível apenas para Retirada no Balcão
                      </span>
                    )}
                  </section>
                )}

                {/* Delivery Address */}
                {deliveryType === "DELIVERY" && (
                  <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-full bg-theme-light flex items-center justify-center text-theme">
                        <MapPin size={16} strokeWidth={2.5} />
                      </div>
                      Endereço de Entrega
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-[2]">
                          <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                            Rua / Avenida
                          </label>
                          <input
                            value={form.street}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, street: e.target.value }))
                            }
                            placeholder="Nome da rua"
                            className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                            Nº
                          </label>
                          <input
                            type="text"
                            value={form.number}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, number: e.target.value }))
                            }
                            placeholder="Ex: 123"
                            className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                          Complemento (Apto, Bloco, etc)
                        </label>
                        <input
                          value={form.complement}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, complement: e.target.value }))
                          }
                          placeholder="Ex: Apto 101, Bloco 2"
                          className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5 ml-1">
                          Bairro
                        </label>
                        <input
                          value={form.neighborhood}
                          onChange={(e) => {
                            setForm((p) => ({
                              ...p,
                              neighborhood: e.target.value,
                            }));
                            setShowNeighborhoodSuggestions(true);
                          }}
                          onFocus={() => setShowNeighborhoodSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowNeighborhoodSuggestions(false),
                              200,
                            )
                          }
                          placeholder="Selecione ou digite seu bairro"
                          className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400"
                        />
                        {showNeighborhoodSuggestions && (
                          <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-60 overflow-y-auto ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                            {neighborhoodFees.filter((f) =>
                              normalizeText(f.name).includes(
                                normalizeText(form.neighborhood),
                              ),
                            ).length > 0 ? (
                              neighborhoodFees
                                .filter((f) =>
                                  normalizeText(f.name).includes(
                                    normalizeText(form.neighborhood),
                                  ),
                                )
                                .map((fee) => (
                                  <button
                                    key={fee.id}
                                    type="button"
                                    className="w-full text-left p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors group"
                                    onMouseDown={(e) => {
                                      // Use onMouseDown to trigger before onBlur
                                      e.preventDefault();
                                      setForm((p) => ({
                                        ...p,
                                        neighborhood: fee.name,
                                      }));
                                      setShowNeighborhoodSuggestions(false);
                                    }}
                                  >
                                    <div>
                                      <span className="font-bold text-slate-700 block text-[15px]">
                                        {fee.name}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        Entrega selecionada
                                      </span>
                                    </div>
                                    <span className="font-bold text-theme bg-theme-light px-3 py-1.5 rounded-xl text-sm group-hover:bg-theme group-hover:text-white transition-colors">
                                      + R$ {fee.price.toFixed(2)}
                                    </span>
                                  </button>
                                ))
                            ) : (
                              <div className="p-8 text-center">
                                <MapPin
                                  className="mx-auto text-slate-300 mb-2"
                                  size={24}
                                />
                                <p className="text-sm text-red-500 font-bold">
                                  Entrega não disponível para este bairro
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Infelizmente não atendemos esta região.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Coupon Code */}
                <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-theme-light flex items-center justify-center text-theme">
                      <Gift size={16} strokeWidth={2.5} />
                    </div>
                    Cupom de Desconto
                  </h4>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Digite seu cupom"
                        disabled={!!appliedCoupon}
                        className="w-full border border-slate-200 rounded-xl p-3.5 outline-none focus:border-theme focus:ring-4 focus:ring-theme-light transition-all text-[15px] bg-slate-50 placeholder-slate-400 disabled:opacity-50"
                      />
                      {appliedCoupon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                          <CheckCircle size={20} />
                        </div>
                      )}
                    </div>
                    {appliedCoupon ? (
                      <button
                        onClick={handleRemoveCoupon}
                        className="bg-red-50 text-red-500 px-4 rounded-xl font-bold hover:bg-red-100 transition-colors active:scale-95"
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-slate-800 text-white px-6 rounded-xl font-bold hover:bg-slate-900 transition-colors active:scale-95"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="mt-2 text-xs text-green-600 font-bold ml-1">
                      Cupom "{appliedCoupon.code}" aplicado! {appliedCoupon.discountPercent}% de desconto.
                    </p>
                  )}
                </section>

                {/* Payment Method */}
                <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-theme-light flex items-center justify-center text-theme">
                      <CreditCard size={16} strokeWidth={2.5} />
                    </div>
                    Forma de Pagamento
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("PIX")}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === "PIX" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                    >
                      <Smartphone size={24} strokeWidth={2} />
                      <span className="font-semibold text-sm">PIX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CASH")}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === "CASH" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                    >
                      <Banknote size={24} strokeWidth={2} />
                      <span className="font-semibold text-sm">Dinheiro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CREDIT")}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === "CREDIT" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                    >
                      <CreditCard size={24} strokeWidth={2} />
                      <span className="font-semibold text-sm">Crédito</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("DEBIT")}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === "DEBIT" ? "border-theme bg-theme-light text-theme" : "border-slate-200 bg-white text-slate-500 hover:border-theme hover:bg-theme-light"}`}
                    >
                      <Wallet size={24} strokeWidth={2} />
                      <span className="font-semibold text-sm">Débito</span>
                    </button>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0 relative z-10 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="space-y-3 mb-5 text-[15px]">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-800">
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Taxa de Entrega</span>
                    {deliveryType === "PICKUP" ? (
                      <span className="font-semibold text-green-600 bg-green-50 px-2 py-0.5 border border-green-200 rounded-md text-xs">
                        Grátis (Retirada)
                      </span>
                    ) : !form.neighborhood ? (
                      <span className="font-semibold text-theme bg-theme-light px-2 py-0.5 border border-theme rounded-md text-xs">
                        Informe o Bairro
                      </span>
                    ) : !activeFee ? (
                      <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 border border-red-200 rounded-md text-xs">
                        Entrega Indisponível
                      </span>
                    ) : (
                      <span className="font-medium text-slate-800">
                        R$ {deliveryFee.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-3">
                    <span className="font-bold text-lg text-slate-800">
                      Total a Pagar
                    </span>
                    <span className="text-xl font-bold text-theme">
                      R$ {finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting || cart.length === 0 || !isStoreOpen || finalTotal < minimumOrder}
                  className="w-full bg-theme hover:bg-theme-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold py-4 shadow-lg shadow-theme-light disabled:shadow-none transition-all flex items-center justify-center gap-3 active:scale-95 text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> Processando...
                    </>
                  ) : !isStoreOpen ? (
                    storeStatusMessage
                  ) : finalTotal < minimumOrder ? (
                    `Pedido Mínimo R$ ${minimumOrder.toFixed(2).replace('.', ',')}`
                  ) : (
                    "Concluir Pedido"
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Profile Modal */}
      {
        showProfileModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Store size={20} className="text-theme" /> {tenant.name}
                </h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Operating Hours */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Sun size={16} className="text-orange-500" /> Horário de Funcionamento
                  </h3>

                  {tenant.settings?.operatingHours ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl divide-y divide-slate-100">
                      {[
                        { key: 'monday', label: 'Segunda-feira' },
                        { key: 'tuesday', label: 'Terça-feira' },
                        { key: 'wednesday', label: 'Quarta-feira' },
                        { key: 'thursday', label: 'Quinta-feira' },
                        { key: 'friday', label: 'Sexta-feira' },
                        { key: 'saturday', label: 'Sábado' },
                        { key: 'sunday', label: 'Domingo' }
                      ].map(day => {
                        const value = (tenant.settings?.operatingHours as any)?.[day.key];
                        if (!value) return null;
                        return (
                          <div key={day.key} className="flex justify-between items-center p-3 text-sm">
                            <span className="text-slate-500 font-medium">{day.label}</span>
                            <span className="text-slate-800 font-bold">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    tenant.settings?.menu?.openingTime && tenant.settings?.menu?.closingTime && (
                      <p className="text-slate-600 text-sm font-medium">
                        Todos os dias: {tenant.settings.menu.openingTime} às {tenant.settings.menu.closingTime}
                      </p>
                    )
                  )}
                </div>

                {/* Address */}
                {tenant.settings?.address && (
                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                      <MapPin size={16} className="text-emerald-500" /> Endereço
                    </h3>

                    <div
                      className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-4 group transition-colors hover:bg-slate-100"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer w-full"
                        onClick={() => tenant.settings?.address && window.open(`https://maps.google.com/?q=${encodeURIComponent(tenant.settings.address)}`, '_blank')}
                      >
                        <p className="text-slate-600 text-sm leading-relaxed pr-4 font-medium">
                          {tenant.settings.address}
                        </p>
                        <ChevronRight size={18} className="text-slate-400 group-hover:text-theme transition-colors flex-shrink-0" />
                      </div>

                      {/* Google Maps Embed via Datamap iframe */}
                      <div className="w-full rounded-xl overflow-hidden shadow-sm">
                        <iframe
                          width="100%"
                          height="200"
                          frameBorder="0"
                          scrolling="no"
                          marginHeight={0}
                          marginWidth={0}
                          src={`https://maps.google.com/maps?width=100%25&height=200&hl=pt-BR&q=${encodeURIComponent(tenant.settings.address)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`}
                        ></iframe>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Added style to hide scrollbar for horizontal lists */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none; /* IE and Edge */
                    scrollbar-width: none; /* Firefox */
                }
                /* Optional tailwind style for padding bottom iOS safe area */
                @supports (padding-bottom: env(safe-area-inset-bottom)) {
                    .pb-safe {
                        padding-bottom: env(safe-area-inset-bottom);
                    }
                }
            `,
        }}
      />
    </div >
  );
}
