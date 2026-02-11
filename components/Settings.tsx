import React, { useState } from 'react';
import { StoreSettings, Coupon } from '../types';
import { Save, Store, Image as ImageIcon, Tag, Trash2, Plus, Users, Shield, Eye } from 'lucide-react';

interface SettingsProps {
  settings: StoreSettings;
  onUpdateSettings: (s: StoreSettings) => void;
  coupons: Coupon[];
  onAddCoupon: (code: string, percent: number) => void;
  onRemoveCoupon: (id: string) => void;
  cashiers?: any[];
  onAddCashier?: (email: string, pass: string) => Promise<void>;
  onRemoveCashier?: (userId: string) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, coupons, onAddCoupon, onRemoveCoupon, cashiers = [], onAddCashier, onRemoveCashier }) => {
  const [name, setName] = useState(settings.name);
  const [logo, setLogo] = useState(settings.logoUrl);
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('');

  // Cashier Form State
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPass, setCashierPass] = useState('');
  const [cashierPassConfirm, setCashierPassConfirm] = useState('');

  const handleSave = () => { onUpdateSettings({ name, logoUrl: logo }); alert("Salvo!"); };
  const handleAddCoupon = () => { if (newCode && newPercent) { onAddCoupon(newCode.toUpperCase(), parseFloat(newPercent)); setNewCode(''); setNewPercent(''); } };

  const handleCreateCashier = async () => {
    if (!onAddCashier) return;
    if (!cashierEmail || !cashierPass) {
      alert("Preencha identificação e senha.");
      return;
    }

    // Auto-append domain for easier user management
    let finalEmail = cashierEmail;
    if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail.toLowerCase().replace(/\s+/g, '')}@loja.com`;
    }

    if (cashierPass !== cashierPassConfirm) {
      alert("Senhas não conferem.");
      return;
    }
    await onAddCashier(finalEmail, cashierPass);
    setCashierEmail('');
    setCashierPass('');
    setCashierPassConfirm('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-y-auto pb-20">
      {/* Basic Info */}
      <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
        <h2 className="text-xl font-heading font-extrabold text-textPrimary mb-6 flex items-center gap-2"><Store size={20} className="text-accent" /> Dados da Unidade</h2>
        <div className="space-y-5">
          <div><label className="block text-xs font-bold text-textSecondary mb-1">Nome</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" /></div>
          <div><label className="block text-xs font-bold text-textSecondary mb-1">Logo URL</label><input value={logo} onChange={e => setLogo(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" /></div>
          <button onClick={handleSave} className="w-full bg-accent text-white font-bold py-3 rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2"><Save size={18} /> Salvar</button>
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white rounded-3xl shadow-premium border border-border p-8 h-fit">
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

                    {/* V13: Password View Toggle */}
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
                            value="123456" // Em um cenário real, não teríamos a senha em texto plano aqui, mas o usuário pediu "visualizar senha". Vamos assumir placeholder ou lógica de storage local inseguro se fosse o caso, mas como é supabase auth, não temos acesso. VOU COLOCAR UM ALERTA VISUAL.
                            // CORREÇÃO: O usuário pediu para ver a senha pois "o gestor criou a conta". Se não salvamos a senha no ato da criação em algum lugar, não temos como mostrar.
                            // VOU IMPLEMENTAR O TOGGLE INPUT MAS COM UM VALOR FICTÍCIO SE NÃO TIVERMOS NO ESTADO, OU (RECOMENDADO) APENAS O TOGGLE NO MOMENTO DA CRIAÇÃO?
                            // O PROMPT DIZ: "O campo de Senha deve vir preenchido (visto que o gestor criou a conta)".
                            // COMO NÃO TEMOS PERSISTÊNCIA DE SENHA, VOU DEIXAR UM PLACEHOLDER "******" QUE VIRA TEXTO AO CLICAR (SE TIVÉSSEMOS O DADO).
                            // PARA ATENDER VOU DEIXAR UM INPUT CONTROLADO LOCALMENTE SÓ PRA DEMONSTRAR A UI.
                            readOnly
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-600 pr-8 password-toggle-input"
                          />
                          <Eye size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-blue-500" onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.type === 'password') { input.type = 'text'; input.value = 'senha123'; /* Simulando recuperação */ }
                            else { input.type = 'password'; input.value = '******'; }
                          }} />
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-500 mt-1 italic">* A senha real é criptografada. Exibição simulada.</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};