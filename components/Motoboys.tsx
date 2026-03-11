import React, { useState, useMemo } from 'react';
import { Bike, Plus, Trash2, Map, Save, X, Phone, User, DollarSign, Package, Calendar, Loader2, Check, Pencil, Printer } from 'lucide-react';
import { Driver, NeighborhoodFee, Order, DailyHistory } from '../types';

import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface MotoboysProps {
  drivers: Driver[];
  onAddDriver: (name: string, phone?: string) => void;
  onRemoveDriver: (id: string) => void;
  neighborhoodFees: NeighborhoodFee[];
  onUpdateFee: (neighborhood: string, price: number) => void;
  onRemoveFee: (id: string) => void;
  orders: Order[]; // Received from Dashboard (Active Orders)
  dailyHistory: DailyHistory[];
  onFetchOrderDetails?: (displayId: number) => Promise<Order | null>;
  onBulkImportFees?: (fees: { name: string, price: number }[]) => Promise<void>;
}

export const Motoboys: React.FC<MotoboysProps> = ({ drivers, onAddDriver, onRemoveDriver, neighborhoodFees, onUpdateFee, onRemoveFee, orders, dailyHistory, onFetchOrderDetails, onBulkImportFees }) => {
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');

  const formatPhoneNumber = (value: string) => {
    let v = value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    return v.substring(0, 15);
  };

  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newFeePrice, setNewFeePrice] = useState('');
  const [defaultFeeValue, setDefaultFeeValue] = useState('5.00');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editingFeePrice, setEditingFeePrice] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-')); // YYYY-MM-DD
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // V19: Painel de Acerto Financeiro
  const [settlementDriverId, setSettlementDriverId] = useState<string>('');
  const [feeType, setFeeType] = useState<'DELIVERY_FEE' | 'FIXED'>('DELIVERY_FEE');
  const [fixedFeeValue, setFixedFeeValue] = useState<string>('');
  const [dailyRate, setDailyRate] = useState<string>('');
  const [advances, setAdvances] = useState<string>('');

  React.useEffect(() => {
    if (viewMode !== 'HISTORY' || !selectedDate) return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
        const endOfDay = new Date(`${selectedDate}T23:59:59.999`).toISOString();

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('type', 'DELIVERY')
          .in('status', ['DELIVERED', 'ARCHIVED', 'CONCLUIDO'])
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        if (error) throw error;

        const mappedOrders: Order[] = (data || []).map(o => {
          let delDet = o.delivery_details;
          if (typeof delDet === 'string') {
            try { delDet = JSON.parse(delDet); } catch (e) { }
          }
          let cName = o.customer_name;
          if (!cName && o.type === 'DELIVERY' && delDet?.customerName) {
            cName = delDet.customerName;
          }

          return {
            id: o.id,
            displayId: o.display_id,
            total: o.total,
            discount: o.discount,
            status: o.status,
            type: o.type,
            isPaid: o.is_paid,
            kitchenDismissed: o.kitchen_dismissed,
            deliveryDetails: delDet,
            paymentMethod: o.payment_method,
            createdAt: new Date(o.created_at).getTime(),
            assignedDriverId: o.driver_id,
            customerName: cName,
            tableName: o.table_name,
            receivedAmount: o.received_amount,
            changeAmount: o.change_amount,
            deliveryFee: o.delivery_fee || 0,
            items: [] // Intencionalmente vazio para acionar o fetch on-demand no modal
          };
        });
        setHistoryOrders(mappedOrders);
      } catch (err) {
        console.error("Erro ao buscar histórico de entregas:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedDate, viewMode]);

  const displayedOrders = viewMode === 'HISTORY' ? historyOrders : orders;
  let displayedDrivers = drivers;

  if (viewMode === 'HISTORY') {
    const driverMap = new globalThis.Map<string, any>();
    historyOrders.forEach(o => {
      if (o.assignedDriverId) {
        if (!driverMap.has(o.assignedDriverId)) {
          const baseDriver = drivers.find(d => d.id === o.assignedDriverId);
          driverMap.set(o.assignedDriverId, {
            id: o.assignedDriverId,
            name: baseDriver ? baseDriver.name : 'Motoboy Removido',
            deliveriesCount: 0,
            commissionTotal: 0,
            history: [],
            active: true
          });
        }
        const d = driverMap.get(o.assignedDriverId);
        d.deliveriesCount += 1;
        d.commissionTotal += (o.deliveryFee || 0);
        d.history.push(o.displayId);
      }
    });
    displayedDrivers = Array.from(driverMap.values());
  }

  const totalEntregas = historyOrders.length;
  const totalTaxas = historyOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // --- Motor de Cálculo do Acerto Financeiro ---
  const settlementData = React.useMemo(() => {
    if (!settlementDriverId) return null;

    // Filtra apenas pedidos DO MOTOBOY selecionado
    const driverOrders = historyOrders.filter(o => o.assignedDriverId === settlementDriverId);

    // dinheiroRecolhido = soma total de todos os pedidos onde o método é 'CASH'
    const dinheiroRecolhido = driverOrders.reduce((sum, o) => o.paymentMethod === 'CASH' ? sum + o.total : sum, 0);

    // ganhoCorridas
    let ganhoCorridas = 0;
    if (feeType === 'DELIVERY_FEE') {
      ganhoCorridas = driverOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    } else {
      const fixed = parseFloat(fixedFeeValue) || 0;
      ganhoCorridas = driverOrders.length * fixed;
    }

    const diaria = parseFloat(dailyRate) || 0;
    const vales = parseFloat(advances) || 0;

    const ganhoLiquido = ganhoCorridas + diaria - vales;
    const acertoFinal = dinheiroRecolhido - ganhoLiquido;

    return {
      dinheiroRecolhido,
      ganhoCorridas,
      ganhoLiquido,
      acertoFinal,
      deliveriesCount: driverOrders.length
    };
  }, [settlementDriverId, historyOrders, feeType, fixedFeeValue, dailyRate, advances]);

  const handleAddDriverHandler = () => {
    if (newDriverName.trim()) {
      onAddDriver(newDriverName, newDriverPhone);
      setNewDriverName('');
      setNewDriverPhone('');
    }
  };

  const handleAddFeeHandler = () => {
    if (newNeighborhood.trim() && newFeePrice) {
      onUpdateFee(newNeighborhood, parseFloat(newFeePrice));
      setNewNeighborhood('');
      setNewFeePrice('');
    }
  };

  const CITIES_DB: Record<string, string[]> = {
    "Caçapava": [
      "Centro", "Vila Santos", "Vila Resende", "Vila Antônio Augusto", "Vera Cruz",
      "Jardim Maria Elmira", "Jardim Rafael", "Jardim Amália", "Parque Residencial Eldorado",
      "Jardim Shangri-lá", "Vila Galvão", "Piedade", "Caçapava Velha", "Santa Luzia",
      "Vila Menino Jesus", "Vila Santa Isabel", "Jardim São José", "Parque Alvorada",
      "Residencial Esperança", "Nova Caçapava", "Vila Pantaleão", "Jardim Panorama",
      "Jardim Primavera", "Jardim Julieta", "Pinus do Iriguassu", "Aldeias da Serra",
      "Germana", "Guadalupe", "Marambaia", "Tijuco Preto", "Vila André Martins",
      "Vila N. Sra. das Graças", "Vila Paraíso", "Vila Periquito", "Vila Rica",
      "Vila São João", "Village das Flores", "Borda da Mata", "Tataúba", "Jardim Caçapava",
      "Vila Prudente", "Sapé", "Jardim Vitória"
    ],
    "São José dos Campos": [
      "Jardim Aquarius", "Vila Adyana", "Vila Ema", "Urbanova", "Jardim Satélite",
      "Jardim das Indústrias", "Jardim América", "Jardim Paulista", "Jardim Oriente",
      "Bosque dos Eucaliptos", "Parque Industrial", "Vila Industrial", "Centro",
      "Jardim Esplanada", "Vila Betânia", "Jardim São Dimas", "Nova Esperança",
      "Jardim Morumbi", "Jardim Colinas", "Jardim Alvorada"
    ],
    "Taubaté": [
      "Centro", "Independência", "Jardim das Nações", "Quiririm", "Vila São José",
      "Estiva", "Belém", "Jardim Gurilândia", "Vila Costa", "Jardim Maria Augusta",
      "Jardim Mourisco", "Parque São Luís", "Vila Aparecida", "Vila Edmundo",
      "Jardim Ouro da Mina", "Parque Três Marias", "Jardim Ana Emília", "Jardim Baronesa"
    ]
  };

  const handleFastLoad = async () => {
    if (!onBulkImportFees) {
      alert("Operação não suportada nesta versão.");
      return;
    }
    const importCity = selectedCity === 'Todas' ? 'Caçapava' : selectedCity; // default caçapava if Todas selected
    setIsImporting(true);
    try {
      const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      const cityList = CITIES_DB[importCity] || [];
      const existingNames = neighborhoodFees.map(f => normalizeText(f.name));
      const newNeighborhoods = cityList.filter(bairro => !existingNames.includes(normalizeText(bairro)));

      if (newNeighborhoods.length === 0) {
        alert(`Todos os bairros de ${importCity} já estão cadastrados!`);
        setIsImporting(false);
        return;
      }

      const defaultPrice = parseFloat(defaultFeeValue) || 0;
      const insertData = newNeighborhoods.map(name => ({ name, price: defaultPrice }));

      await onBulkImportFees(insertData);

      alert(`⚡ Sucesso! ${newNeighborhoods.length} novos bairros de ${importCity} importados.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao importar bairros.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveInlineFee = (id: string, name: string) => {
    const newPrice = parseFloat(editingFeePrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdateFee(name, newPrice);
      setEditingFeeId(null);
    }
  };

  const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const displayedFees = useMemo(() => {
    if (selectedCity === 'Todas') return neighborhoodFees;

    // Filtro por cidade
    const cityListNames = (CITIES_DB[selectedCity] || []).map(normalizeText);
    return neighborhoodFees.filter(fee => cityListNames.includes(normalizeText(fee.name)));
  }, [neighborhoodFees, selectedCity]);

  const handleOpenOrder = async (displayId: number) => {
    // Search in displayedOrders
    const order = displayedOrders.find(o => o.displayId === displayId);

    if (order) {
      setSelectedOrder(order);
    } else if (onFetchOrderDetails) {
      const fetchedOrder = await onFetchOrderDetails(displayId);
      if (fetchedOrder) {
        setSelectedOrder(fetchedOrder);
      } else {
        alert(`Pedido #${displayId} não encontrado no banco de dados.`);
      }
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
            <div className="flex flex-col gap-4 pb-4 border-b border-border border-dashed">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none w-full"
                />
              </div>

              {/* V17: Metrics Panel */}
              <div className="flex gap-4">
                <div className="flex-1 bg-blue-50 border border-blue-100 p-3 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider mb-1">Qtd Entregas</span>
                  <span className="text-xl font-black text-blue-900">{totalEntregas}</span>
                </div>
                <div className="flex-1 bg-green-50 border border-green-100 p-3 rounded-xl flex flex-col justify-center items-center">
                  <span className="text-[9px] text-green-600 font-bold uppercase tracking-wider mb-1">Total Taxas</span>
                  <span className="text-xl font-black text-green-900">R$ {totalTaxas.toFixed(2)}</span>
                </div>
              </div>

              {/* PAINEL DE ACERTO FINANCEIRO MOTOBOY */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><DollarSign size={18} className="text-green-600" /> Acerto Financeiro</h3>

                <div className="flex gap-3 mb-4">
                  <select className="flex-[2] bg-white border text-sm font-bold text-slate-700 border-slate-200 rounded-lg p-3 outline-none focus:border-accent" value={settlementDriverId} onChange={e => setSettlementDriverId(e.target.value)}>
                    <option value="">Selecione um Motoboy...</option>
                    {displayedDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>

                  <select className="flex-1 bg-white border text-sm font-bold text-slate-700 border-slate-200 rounded-lg p-3 outline-none focus:border-accent" value={feeType} onChange={e => setFeeType(e.target.value as any)}>
                    <option value="DELIVERY_FEE">Taxa do Pedido</option>
                    <option value="FIXED">Taxa Fixa</option>
                  </select>
                </div>

                {settlementDriverId && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {feeType === 'FIXED' && (
                        <div>
                          <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Valor Fixo (R$)</label>
                          <input type="number" step="0.50" value={fixedFeeValue} onChange={e => setFixedFeeValue(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold bg-white outline-none focus:border-accent" placeholder="Ex: 5.00" />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Diária (R$)</label>
                        <input type="number" step="1.00" value={dailyRate} onChange={e => setDailyRate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold bg-white outline-none focus:border-accent" placeholder="Ex: 50.00" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1 block">Vales/Adiant. (R$)</label>
                        <input type="number" step="1.00" value={advances} onChange={e => setAdvances(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold bg-white outline-none focus:border-accent" placeholder="Ex: 20.00" />
                      </div>
                    </div>

                    {/* CARDS RESUMO */}
                    {settlementData && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Ganhos do Motoboy</span>
                          <span className="block text-2xl font-black text-slate-800">R$ {settlementData.ganhoLiquido.toFixed(2)}</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Dinheiro no Caixa</span>
                          <span className="block text-2xl font-black text-slate-800">R$ {settlementData.dinheiroRecolhido.toFixed(2)}</span>
                        </div>
                        {/* ACERTO DESTAQUE */}
                        <div className={`p-4 rounded-xl shadow-sm border ${settlementData.acertoFinal > 0 ? 'bg-red-50 border-red-200' : settlementData.acertoFinal < 0 ? 'bg-green-50 border-green-200' : 'bg-slate-100 border-slate-300'}`}>
                          <span className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-slate-600">O Acerto Final</span>
                          {settlementData.acertoFinal > 0 && (
                            <span className="block text-sm font-bold text-red-700 leading-tight">Moto devolve ao Caixa:<br /><span className="text-2xl font-black tracking-tight">R$ {settlementData.acertoFinal.toFixed(2)}</span></span>
                          )}
                          {settlementData.acertoFinal < 0 && (
                            <span className="block text-sm font-bold text-green-700 leading-tight">Caixa paga ao Moto:<br /><span className="text-2xl font-black tracking-tight">R$ {Math.abs(settlementData.acertoFinal).toFixed(2)}</span></span>
                          )}
                          {settlementData.acertoFinal === 0 && (
                            <span className="block text-sm font-bold text-slate-700 leading-tight">Acerto Zerado<br /><span className="text-2xl font-black tracking-tight">R$ 0.00</span></span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WHATSAPP BUTTON */}
                    {settlementData && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const driverBase = drivers.find(d => d.id === settlementDriverId);
                          const driverName = driverBase?.name || displayedDrivers.find(d => d.id === settlementDriverId)?.name || 'Motoboy';

                          const totalGanhos = settlementData.ganhoCorridas + parseFloat(dailyRate || '0');
                          const valesRetirados = parseFloat(advances) || 0;

                          let statusAcerto = '';
                          if (settlementData.acertoFinal > 0) {
                            statusAcerto = `Motoboy devolve R$ ${settlementData.acertoFinal.toFixed(2).replace('.', ',')}`;
                          } else if (settlementData.acertoFinal < 0) {
                            statusAcerto = `Caixa paga R$ ${Math.abs(settlementData.acertoFinal).toFixed(2).replace('.', ',')}`;
                          } else {
                            statusAcerto = 'Acerto Zerado';
                          }

                          const msgLines = `\uD83D\uDEF5 *Resumo do Dia | ${driverName}*
\uD83D\uDCC5 Data: ${selectedDate.split('-').reverse().join('/')}

\uD83D\uDCE6 Entregas Realizadas: *${settlementData.deliveriesCount}*
\uD83D\uDCB8 Ganhos (Corridas + Di\u00E1ria): *R$ ${totalGanhos.toFixed(2).replace('.', ',')}*${valesRetirados > 0 ? `\n\uD83D\uDCC9 Vales Retirados: *- R$ ${valesRetirados.toFixed(2).replace('.', ',')}*` : ''}
\uD83D\uDCB0 Ganho L\u00EDquido Final: *R$ ${settlementData.ganhoLiquido.toFixed(2).replace('.', ',')}*

\uD83D\uDCB5 Dinheiro Recolhido: *R$ ${settlementData.dinheiroRecolhido.toFixed(2).replace('.', ',')}*

\u26A0\uFE0F *ACERTO FINAL:*
*${statusAcerto}*`;

                          const textoCodificado = encodeURIComponent(msgLines);

                          if (driverBase?.phone) {
                            const numeroLimpo = driverBase.phone.replace(/\D/g, '');
                            window.open(`https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${textoCodificado}`, '_blank', 'noopener,noreferrer');
                          } else {
                            alert("Cadastre o WhatsApp deste motoboy para enviar a mensagem diretamente!");
                            window.open(`https://api.whatsapp.com/send?text=${textoCodificado}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        type="button"
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 text-sm rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-500/20">
                        <Phone size={18} /> Enviar Resumo (WhatsApp)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-textSecondary">
            {viewMode === 'ACTIVE' ? 'Gerencie os motoboys e visualize métricas em tempo real' : 'Visualize o desempenho da equipe em datas passadas'}
          </p>
        </div>

        {viewMode === 'ACTIVE' && (
          <div className="p-6 border-b border-border bg-white flex flex-col sm:flex-row gap-2">
            <input
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              placeholder="Nome do Motoboy"
              className="flex-[2] bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
            />
            <input
              value={newDriverPhone}
              onChange={(e) => setNewDriverPhone(formatPhoneNumber(e.target.value))}
              placeholder="WhatsApp (Ex: 11 99999-9999)"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
            />
            <button
              onClick={handleAddDriverHandler}
              className="bg-accent hover:bg-accentDark text-white px-6 rounded-xl font-bold flex items-center justify-center gap-2 py-3"
            >
              <Plus size={18} /> Adicionar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingHistory && viewMode === 'HISTORY' && (
            <div className="p-10 flex items-center justify-center">
              <Loader2 size={32} className="text-accent animate-spin" />
            </div>
          )}
          {(!isLoadingHistory && displayedDrivers.length === 0 && viewMode === 'HISTORY') && (
            <div className="p-8 text-center bg-slate-50 text-slate-500 font-bold text-sm rounded-2xl border border-dashed border-slate-200">
              Nenhuma entrega registrada nesta data.
            </div>
          )}
          {(!isLoadingHistory) && displayedDrivers.map(driver => (
            <div key={driver.id} className="p-5 bg-background border border-border rounded-2xl hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-border shadow-sm">
                    <Bike size={24} className="text-textSecondary" />
                  </div>
                  <div>
                    <p className="font-bold text-textPrimary text-lg flex items-center gap-2">{driver.name}</p>
                    <p className="text-xs text-textSecondary flex items-center gap-2">
                      {driver.deliveriesCount} entregas | <span className="text-success font-bold">R$ {driver.commissionTotal.toFixed(2)}</span>
                      {driver.phone && (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap"><Phone size={10} /> {driver.phone}</span>
                      )}
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
          <div className="p-6 border-b border-border bg-white flex flex-col gap-4">
            {/* Top Selector and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex flex-col flex-1">
                <label className="text-xs font-bold text-textSecondary uppercase mb-1">Cidade</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent font-medium text-textPrimary"
                >
                  <option value="Todas">Todas as Cidades</option>
                  <option value="Caçapava">Caçapava</option>
                  <option value="São José dos Campos">São José dos Campos</option>
                  <option value="Taubaté">Taubaté</option>
                </select>
              </div>
            </div>

            {/* Quick Load Callout */}
            {selectedCity !== 'Todas' && (
              <div className="flex bg-blue-50 border border-blue-100 rounded-xl p-4 justify-between items-center">
                <div>
                  <h3 className="text-blue-900 font-bold text-sm flex items-center gap-2">
                    ⚡ Carga Rápida de Bairros
                  </h3>
                  <p className="text-xs text-blue-700 mt-1">Importe bairros de {selectedCity} em lote.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-start bg-white border border-blue-200 rounded-lg px-2 py-1">
                    <label className="text-[9px] font-bold text-blue-600 uppercase">Taxa Inicial (R$)</label>
                    <input
                      type="number"
                      value={defaultFeeValue}
                      onChange={(e) => setDefaultFeeValue(e.target.value)}
                      className="w-16 outline-none text-sm font-bold text-slate-800"
                    />
                  </div>
                  <button
                    onClick={handleFastLoad}
                    disabled={isImporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span className="hidden sm:inline">Importar {selectedCity}</span>
                    <span className="sm:hidden">Importar</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newNeighborhood}
                onChange={(e) => setNewNeighborhood(e.target.value)}
                placeholder="Nome do Bairro"
                className="flex-[2] bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
              />
              <input
                value={newFeePrice}
                onChange={(e) => setNewFeePrice(e.target.value)}
                placeholder="R$ (Taxa)"
                type="number"
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"
              />
              <button
                onClick={handleAddFeeHandler}
                className="bg-highlight hover:bg-yellow-600 text-white px-4 rounded-xl font-bold flex items-center gap-2 transition-colors"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs text-textSecondary uppercase bg-background font-bold">
              <tr>
                <th className="p-4 rounded-tl-xl text-left">Bairro</th>
                <th className="p-4 text-center">Valor (R$)</th>
                <th className="p-4 text-center rounded-tr-xl">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayedFees.map(fee => (
                <tr key={fee.id} className={`border-b border-border transition-colors ${editingFeeId === fee.id ? 'bg-orange-50/50' : 'hover:bg-background/50'}`}>
                  <td className="p-4 font-medium text-textPrimary text-left">{fee.name}</td>
                  <td className="p-4 text-center">
                    {editingFeeId === fee.id ? (
                      <input
                        type="number"
                        value={editingFeePrice}
                        onChange={(e) => setEditingFeePrice(e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-accent rounded-lg text-center font-bold text-accent outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineFee(fee.id, fee.name)}
                      />
                    ) : (
                      <span className="font-bold text-textPrimary">R$ {fee.price.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {viewMode === 'ACTIVE' && (
                      <div className="flex items-center justify-center gap-1">
                        {editingFeeId === fee.id ? (
                          <>
                            <button
                              title="Salvar Taxa"
                              onClick={() => handleSaveInlineFee(fee.id, fee.name)}
                              className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              title="Cancelar"
                              onClick={() => { setEditingFeeId(null); setEditingFeePrice(''); }}
                              className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              title="Editar Taxa"
                              onClick={() => { setEditingFeeId(fee.id); setEditingFeePrice(fee.price.toString()); }}
                              className="text-textSecondary hover:text-accent p-2 hover:bg-white rounded-lg transition-colors"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              title="Excluir Bairro"
                              onClick={() => onRemoveFee(fee.id)}
                              className="text-textSecondary hover:text-danger p-2 hover:bg-white rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {displayedFees.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400 text-sm italic">
                    Nenhum bairro encontrado para esta seleção.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                        href={`https://api.whatsapp.com/send?phone=55${selectedOrder.deliveryDetails.phone.replace(/\D/g, '')}`}
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

            <div className="p-4 border-t border-border bg-background flex gap-2">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                Fechar Detalhes
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('printOrder', { detail: { order: selectedOrder } }))}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                title="Imprimir Cupom"
              >
                <Printer size={18} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};