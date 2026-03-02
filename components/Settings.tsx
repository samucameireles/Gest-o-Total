import React, { useState, useEffect } from 'react';
import { StoreSettings, Coupon, PrinterSettings } from '../types';
import { Save, Store, Image as ImageIcon, Tag, Trash2, Plus, Users, Shield, Eye, Link2, Copy, Check, Globe, ToggleLeft, ToggleRight, Sun, Printer, Wifi, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useParams } from 'react-router-dom';
import { LogoUploader } from './LogoUploader';
import { PrinterService } from '../services/PrinterService';

interface SettingsProps {
  settings: StoreSettings;
  onUpdateSettings: (s: StoreSettings) => void;
  coupons: Coupon[];
  onAddCoupon: (code: string, percent: number) => void;
  onRemoveCoupon: (id: string) => void;
  cashiers?: any[];
  onAddCashier?: (email: string, pass: string) => Promise<void>;
  onRemoveCashier?: (userId: string) => Promise<void>;
  onUpdatePrinterSettings: (ps: PrinterSettings) => void;
  printerSettings: PrinterSettings | null;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, coupons, onAddCoupon, onRemoveCoupon, cashiers = [], onAddCashier, onRemoveCashier, onUpdatePrinterSettings, printerSettings: initialPrinterSettings }) => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [name, setName] = useState(settings.name);
  const [logo, setLogo] = useState(settings.logoUrl);
  const [themeColor, setThemeColor] = useState(settings.themeColor || '#f97316');
  const [address, setAddress] = useState(settings.address || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(settings.googleMapsUrl || '');
  const [operatingHours, setOperatingHours] = useState(settings.operatingHours || {
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: ''
  });
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('');

  // Online menu state
  const [openingTime, setOpeningTime] = useState(settings.menu?.openingTime || '18:00');
  const [closingTime, setClosingTime] = useState(settings.menu?.closingTime || '23:59');
  const [forceClose, setForceClose] = useState(settings.menu?.forceClose || false);
  const [minimumOrder, setMinimumOrder] = useState(settings.menu?.minimumOrder || 0);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(settings.menu?.estimatedDeliveryTime || '40-50 min');
  const [allowedOrderTypes, setAllowedOrderTypes] = useState<'DELIVERY' | 'PICKUP' | 'BOTH' | 'VIEW_ONLY'>(settings.menu?.allowedOrderTypes || 'BOTH');

  const [slug, setSlug] = useState('');
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const [slugError, setSlugError] = useState('');

  // Cashier Form State
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPass, setCashierPass] = useState('');
  const [cashierPassConfirm, setCashierPassConfirm] = useState('');

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'system' | 'menu' | 'printer'>('system');

  // Printer Settings State
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(initialPrinterSettings);
  const [printerLoading, setPrinterLoading] = useState(!initialPrinterSettings);
  const [localPrinters, setLocalPrinters] = useState<{ Name: string }[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  // Load slug on mount
  useEffect(() => {
    if (!tenantId) return;

    // Fetch Online Menu Settings
    supabase.from('tenants').select('slug, online_menu_enabled').eq('id', tenantId).single().then(({ data }) => {
      if (data) {
        setSlug(data.slug || '');
        setMenuEnabled(data.online_menu_enabled ?? true);
      }
    });
  }, [tenantId]);


  useEffect(() => {
    if (!tenantId) return;

    const fetchPrinterSettings = async () => {
      if (initialPrinterSettings) {
        setPrinterSettings(initialPrinterSettings);
        setPrinterLoading(false);
      } else {
        const { data } = await supabase.from('printer_settings').select('*').eq('tenant_id', tenantId).single();
        if (data) {
          setPrinterSettings(data as PrinterSettings);
          onUpdatePrinterSettings(data as PrinterSettings);
        } else {
          const defaultSettings: PrinterSettings = {
            connection_type: 'TCP_IP',
            ip_address: '127.0.0.1',
            port: 9100,
            paper_size: '80mm',
            print_counter_sales: true,
            print_delivery_sales: true
          };
          setPrinterSettings(defaultSettings);
        }
        setPrinterLoading(false);
      }
    };
    fetchPrinterSettings();
    fetchLocalPrinters();
  }, [tenantId, initialPrinterSettings]);

  const handleSaveSlug = async () => {
    if (!tenantId) return;
    if (!slug.trim()) { setSlugError('Digite um slug.'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setSlugError('Use apenas letras minúsculas, números e hífens.'); return; }
    setSlugError('');
    setSlugSaving(true);
    const { error } = await supabase.from('tenants').update({ slug: slug.trim(), online_menu_enabled: menuEnabled }).eq('id', tenantId);
    setSlugSaving(false);
    if (error) {
      if (error.code === '23505') setSlugError('Este link já está em uso. Escolha outro.');
      else setSlugError('Erro ao salvar: ' + error.message);
    } else {
      alert('Link do cardápio salvo!');
    }
  };

  const menuLink = slug ? `${window.location.origin}/menu/${slug}` : '';

  const handleCopyLink = () => {
    if (!menuLink) return;
    navigator.clipboard.writeText(menuLink);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  };

  const handleSave = () => { onUpdateSettings({ name, logoUrl: logo, themeColor, address, googleMapsUrl, operatingHours, menu: { openingTime, closingTime, forceClose, minimumOrder, estimatedDeliveryTime, allowedOrderTypes } }); alert('Salvo!'); };
  const handleAddCoupon = () => { if (newCode && newPercent) { onAddCoupon(newCode.toUpperCase(), parseFloat(newPercent)); setNewCode(''); setNewPercent(''); } };

  const handleSavePrinter = async () => {
    if (!tenantId || !printerSettings) return;
    const { error } = await supabase.from('printer_settings').upsert({
      ...printerSettings,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    });
    if (error) {
      alert('Erro ao salvar impressora: ' + error.message);
    } else {
      onUpdatePrinterSettings(printerSettings);
      alert('Configurações de impressão salvas!');
    }
  };

  const handleTestPrint = async () => {
    console.log('[Settings] Button Test Print Clicked');
    if (!printerSettings) {
      console.warn('[Settings] No printer settings found');
      alert('Configurações de impressora não encontradas.');
      return;
    }
    try {
      console.log('[Settings] Calling PrinterService.testConnection', printerSettings);
      await PrinterService.testConnection(printerSettings);
      alert('Comando de teste enviado!');
    } catch (e: any) {
      console.error('[Settings] Test Print Error:', e);
      alert('Erro ao testar impressão: ' + e.message);
    }
  };

  const fetchLocalPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const bridgeUrl = `http://${printerSettings?.ip_address || 'localhost'}:${printerSettings?.port || 3005}/printers`;
      const resp = await fetch(bridgeUrl);
      if (!resp.ok) throw new Error('Não foi possível conectar na ponte.');
      const data = await resp.json();
      console.log('[Settings] Impressoras encontradas:', data);

      const list = Array.isArray(data) ? data : (data ? [data] : []);
      setLocalPrinters(list);

      if (list.length === 0) alert('Nenhuma impressora encontrada no Windows.');
    } catch (e: any) {
      console.error('Error fetching printers:', e);
      alert('Erro ao buscar impressoras: Certifique-se que o terminal com "npm run dev" está aberto.');
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleCreateCashier = async () => {
    if (!onAddCashier) return;
    if (!cashierEmail || !cashierPass) { alert('Preencha identificação e senha.'); return; }
    let finalEmail = cashierEmail;
    if (!finalEmail.includes('@')) finalEmail = `${finalEmail.toLowerCase().replace(/\s+/g, '')}@loja.com`;
    if (cashierPass !== cashierPassConfirm) { alert('Senhas não conferem.'); return; }
    await onAddCashier(finalEmail, cashierPass);
    setCashierEmail('');
    setCashierPass('');
    setCashierPassConfirm('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-white border-b border-border px-8 pt-4 gap-6 sticky top-0 z-10 w-full mb-6">
        <button
          onClick={() => setActiveTab('system')}
          className={`pb-4 px-2 font-bold text-sm border-b-2 transition-all ${activeTab === 'system' ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
        >
          Configurações do Sistema
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-4 px-2 font-bold text-sm border-b-2 transition-all ${activeTab === 'menu' ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
        >
          Cardápio & Delivery Online
        </button>
        <button
          onClick={() => setActiveTab('printer')}
          className={`pb-4 px-2 font-bold text-sm border-b-2 transition-all ${activeTab === 'printer' ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
        >
          Impressão
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto pb-20 px-8">
        {activeTab === 'system' && (
          <>
            {/* Basic Info */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-6 flex items-center gap-2"><Store size={20} className="text-accent" /> Dados da Unidade</h2>
              <div className="space-y-5">
                <div><label className="block text-xs font-bold text-textSecondary mb-1">Nome</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" /></div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary mb-2">Horários de Funcionamento</label>
                  <div className="space-y-2">
                    {[
                      { key: 'monday', label: 'Segunda-feira' },
                      { key: 'tuesday', label: 'Terça-feira' },
                      { key: 'wednesday', label: 'Quarta-feira' },
                      { key: 'thursday', label: 'Quinta-feira' },
                      { key: 'friday', label: 'Sexta-feira' },
                      { key: 'saturday', label: 'Sábado' },
                      { key: 'sunday', label: 'Domingo' }
                    ].map(day => (
                      <div key={day.key} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-24">{day.label}</span>
                        <input
                          placeholder="Ex: 18:00 às 23:00 ou Fechado"
                          value={(operatingHours as any)[day.key]}
                          onChange={e => setOperatingHours({ ...operatingHours, [day.key]: e.target.value })}
                          className="flex-1 bg-background border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div><label className="block text-xs font-bold text-textSecondary mb-1">Endereço Completo</label><input placeholder="Ex: Rua das Flores, 123 - Centro" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" /></div>
                <div>
                  <LogoUploader
                    tenantId={tenantId || ''}
                    currentLogoUrl={logo}
                    onSuccess={(url) => setLogo(url)}
                  />
                </div>
                <button onClick={handleSave} className="w-full bg-accent text-white font-bold py-3 rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2"><Save size={18} /> Salvar</button>
              </div>
            </div>

            {/* Coupons */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit lg:col-span-2">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-6 flex items-center gap-2"><Tag size={20} className="text-highlight" /> Cupons de Desconto</h2>
              <div className="flex gap-2 mb-6 bg-background p-4 rounded-xl border border-border">
                <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="CÓDIGO" className="flex-[2] bg-white border border-border rounded-lg p-2 outline-none uppercase font-bold" />
                <input value={newPercent} onChange={e => setNewPercent(e.target.value)} placeholder="%" type="number" className="flex-1 bg-white border border-border rounded-lg p-2 outline-none" />
                <button onClick={handleAddCoupon} className="bg-success text-white p-2 rounded-lg"><Plus size={20} /></button>
              </div>
              <div className="space-y-3">
                {coupons.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border border-dashed border-border rounded-xl hover:bg-gray-50">
                    <div><span className="font-bold text-textPrimary block">{c.code}</span><span className="text-xs text-success font-bold">{c.discountPercent}% OFF</span></div>
                    <button onClick={() => onRemoveCoupon(c.id)} className="text-gray-400 hover:text-danger"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cashier Accounts */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit lg:col-span-2">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-6 flex items-center gap-2"><Users size={20} className="text-blue-600" /> Contas de Caixa Agregadas</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Adicionar Novo Caixa</h3>
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Nome de Usuário ou Email</label>
                      <input value={cashierEmail} onChange={e => setCashierEmail(e.target.value)} type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" placeholder="Ex: joao" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Senha</label>
                        <input value={cashierPass} onChange={e => setCashierPass(e.target.value)} type="password" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" placeholder="******" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Confirmar Senha</label>
                        <input value={cashierPassConfirm} onChange={e => setCashierPassConfirm(e.target.value)} type="password" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors" placeholder="******" />
                      </div>
                    </div>
                    <button onClick={handleCreateCashier} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      <Shield size={18} /> Salvar Caixa
                    </button>
                    <p className="text-xs text-slate-400 text-center">O usuário será criado com a permissão 'Caixa' vinculada a esta unidade.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Funcionários Cadastrados</h3>
                  <div className="space-y-3">
                    {cashiers.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Nenhum caixa cadastrado.</div>
                    ) : (
                      cashiers.map((c: any) => (
                        <div key={c.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {c.email ? c.email.substring(0, 2).toUpperCase() : 'CX'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-700 block text-sm">{c.email || 'Usuário sem email'}</span>
                                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">ATIVO</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="text-xs text-slate-400 font-mono">
                                {c.role ? c.role.toUpperCase() : 'CAIXA'}
                              </div>
                              {onRemoveCashier && (
                                <button
                                  onClick={() => onRemoveCashier(c.user_id)}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                  title="Excluir conta de caixa"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Credenciais de Acesso</label>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input
                                  type="text"
                                  value={c.email || ''}
                                  readOnly
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-600"
                                />
                              </div>
                              <div className="flex-1 relative group">
                                <input
                                  type="password"
                                  value="******"
                                  readOnly
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-600 pr-8"
                                />
                                <Eye size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-blue-500" onClick={(e) => {
                                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  if (input.type === 'password') { input.type = 'text'; input.value = 'senha123'; }
                                  else { input.type = 'password'; input.value = '******'; }
                                }} />
                              </div>
                            </div>
                            <p className="text-[10px] text-amber-500 mt-1 italic">* A senha real é criptografada.</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'menu' && (
          <>
            {/* Online Menu Link */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-1 flex items-center gap-2">
                <Globe size={20} className="text-emerald-500" /> Cardápio Online
              </h2>
              <p className="text-xs text-textSecondary mb-5">Link público para clientes fazerem pedidos de delivery.</p>

              <button
                type="button"
                onClick={() => setMenuEnabled(e => !e)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border mb-5 transition-all ${menuEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <p className={`font-bold text-sm ${menuEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {menuEnabled ? '✅ Cardápio ativo' : '⏸️ Cardápio desativado'}
                </p>
                {menuEnabled ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-slate-400" />}
              </button>

              <div className="mb-4">
                <label className="block text-xs font-bold text-textSecondary mb-2">Link personalizado</label>
                <div className="flex items-center border border-border rounded-xl overflow-hidden bg-background">
                  <span className="text-xs text-slate-400 px-3 py-3 bg-slate-50 border-r border-border whitespace-nowrap">/menu/</span>
                  <input
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="minha-lanchonete"
                    className="flex-1 px-3 py-3 outline-none text-sm bg-background"
                  />
                </div>
                {slugError && <p className="text-xs text-red-500 font-bold mt-1">{slugError}</p>}
              </div>

              {slug && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 mb-4 overflow-hidden">
                  <span className="flex-1 text-xs text-slate-600 font-mono truncate">{window.location.origin}/menu/{slug}</span>
                  <button onClick={handleCopyLink} title="Copiar link"
                    className={`p-1.5 rounded-lg transition-all ${slugCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-accent'}`}>
                    {slugCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}

              <button onClick={handleSaveSlug} disabled={slugSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                <Save size={16} /> {slugSaving ? 'Salvando...' : 'Salvar Link'}
              </button>
            </div>

            {/* Theme Selection */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-1 flex items-center gap-2">
                <Sun size={20} className="text-amber-500" /> Identidade Visual
              </h2>
              <div className="grid grid-cols-4 gap-4 mb-8 mt-4">
                {[
                  '#f97316', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#06b6d4', '#475569'
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setThemeColor(color)}
                    className={`h-12 rounded-2xl transition-all ${themeColor === color ? 'ring-4 ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  >
                    {themeColor === color && <Check size={20} className="text-white mx-auto" />}
                  </button>
                ))}
              </div>
              <button onClick={handleSave} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 shadow-sm">Aplicar Cor</button>
            </div>

            {/* Delivery Rules */}
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit lg:col-span-2">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-6 flex items-center gap-2">
                <Globe size={20} className="text-accent" /> Regras do Delivery
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-700">Forçar Loja Fechada</p>
                    <p className="text-xs text-slate-500">Impede pedidos agora</p>
                  </div>
                  <button
                    onClick={() => setForceClose(!forceClose)}
                    className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${forceClose ? 'bg-red-500 justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Abre às</label>
                    <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-accent font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Fecha às</label>
                    <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-accent font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pedido Mínimo (R$)</label>
                  <input type="number" step="0.01" value={minimumOrder} onChange={e => setMinimumOrder(parseFloat(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-accent" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tempo Estimado</label>
                  <input type="text" placeholder="Ex: 40-50 min" value={estimatedDeliveryTime} onChange={e => setEstimatedDeliveryTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-accent" />
                </div>
              </div>

              <button onClick={handleSave} className="w-full md:w-auto px-8 bg-accent text-white font-bold py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-colors">
                Salvar Regras
              </button>
            </div>
          </>
        )}

        {/* --- PRINTER SETTINGS TAB --- */}
        {activeTab === 'printer' && (
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
              <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-1 flex items-center gap-2">
                <Printer size={20} className="text-accent" /> Configurações de Impressão Térmica
              </h2>
              <p className="text-xs text-textSecondary mb-8">Configure sua impressora térmica ESC/POS para automação de despacho.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Conexão */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Wifi size={16} className="text-blue-500" /> Comunicação
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary mb-1">Tipo de Conexão</label>
                    <select
                      value={printerSettings?.connection_type || 'TCP_IP'}
                      onChange={e => setPrinterSettings(s => s ? { ...s, connection_type: e.target.value as any } : null)}
                      className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent font-bold"
                    >
                      <option value="TCP_IP">Rede / IP (Porta 9100)</option>
                      <option value="LOCAL">Impressora do Sistema (Windows)</option>
                      <option value="USB">USB (via Bridge)</option>
                      <option value="SERIAL">Serial / COM</option>
                    </select>
                  </div>

                  {printerSettings?.connection_type === 'LOCAL' && (
                    <div className="space-y-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl animate-in zoom-in-95 duration-200">
                      <div>
                        <label className="block text-xs font-bold text-orange-700 mb-2">Selecione a Impressora</label>
                        <div className="flex gap-2">
                          <select
                            value={printerSettings?.local_printer_name || ''}
                            onChange={e => setPrinterSettings(s => s ? { ...s, local_printer_name: e.target.value } : null)}
                            className="flex-1 bg-white border border-orange-200 rounded-xl p-3 outline-none focus:border-accent font-bold text-sm"
                          >
                            <option value="">Selecione...</option>
                            {/* Garante que o nome salvo apareça mesmo se a lista não carregou ainda */}
                            {printerSettings?.local_printer_name && !localPrinters.find(p => p.Name === printerSettings.local_printer_name) && (
                              <option value={printerSettings.local_printer_name}>{printerSettings.local_printer_name} (Salva)</option>
                            )}
                            {localPrinters.map(p => (
                              <option key={p.Name} value={p.Name}>{p.Name}</option>
                            ))}
                          </select>
                          <button
                            onClick={fetchLocalPrinters}
                            disabled={loadingPrinters}
                            className="bg-white border border-orange-200 text-accent px-4 rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-50"
                          >
                            {loadingPrinters ? '...' : <Plus size={18} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-orange-600 mt-2 font-medium">Clique no botão lateral para listar as impressoras do Windows.</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-textSecondary mb-1">IP da Impressora</label>
                      <input
                        value={printerSettings?.ip_address || ''}
                        onChange={e => setPrinterSettings(s => s ? { ...s, ip_address: e.target.value } : null)}
                        placeholder="127.0.0.1"
                        className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-textSecondary mb-1">Porta</label>
                      <input
                        type="number"
                        value={printerSettings?.port || 9100}
                        onChange={e => setPrinterSettings(s => s ? { ...s, port: parseInt(e.target.value) } : null)}
                        className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferências */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-accent" /> Regras de Automação
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-textSecondary mb-2">Tamanho do Papel</label>
                    <div className="flex gap-2">
                      {['58mm', '80mm'].map(size => (
                        <button
                          key={size}
                          onClick={() => setPrinterSettings(s => s ? { ...s, paper_size: size as any } : null)}
                          className={`flex-1 py-3 rounded-xl border-2 font-black transition-all ${printerSettings?.paper_size === size ? 'border-accent bg-orange-50 text-accent' : 'border-slate-50 bg-slate-50 text-slate-400'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-700">Vendas de Balcão</p>
                        <p className="text-[10px] text-slate-400">Imprimir automaticamente</p>
                      </div>
                      <button
                        onClick={() => setPrinterSettings(s => s ? { ...s, print_counter_sales: !s.print_counter_sales } : null)}
                        className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${printerSettings?.print_counter_sales ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-700">Pedidos de Delivery</p>
                        <p className="text-[10px] text-slate-400">Imprimir automaticamente</p>
                      </div>
                      <button
                        onClick={() => setPrinterSettings(s => s ? { ...s, print_delivery_sales: !s.print_delivery_sales } : null)}
                        className={`w-12 h-7 rounded-full transition-all flex items-center px-1 ${printerSettings?.print_delivery_sales ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-10">
                <button
                  onClick={handleTestPrint}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  <Printer size={18} /> Testar Impressão
                </button>
                <button
                  onClick={handleSavePrinter}
                  className="flex-[2] py-4 bg-accent text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Save size={18} /> Salvar Configurações
                </button>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border border-blue-100 bg-blue-50/50 flex gap-4 items-start`}>
              <div className="p-2 bg-blue-500 rounded-lg text-white"><Shield size={18} /></div>
              <div>
                <p className="text-sm font-bold text-blue-900">Nota técnica sobre o TCP/IP</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  Devido às restrições de segurança do navegador, a impressão direta em rede requer um <b>Bridge Local</b> (como o <i>escpos_emulator</i> ou um proxy HTTP/WebSocket) rodando na mesma rede que a impressora.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};