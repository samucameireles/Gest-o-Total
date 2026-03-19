import React, { useState, useEffect } from 'react';
import { Save, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PrintSettingsTabProps {
    tenantId?: string;
}

export const PrintSettingsTab: React.FC<PrintSettingsTabProps> = ({ tenantId }) => {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        phone: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: 'SP',
    });

    // 1 e 2. Lógica de Carregamento Visual Rápido (Read) filtrando pelo auth.uid()
    useEffect(() => {
        let isMounted = true;
        const fetchSettings = async () => {
            setInitialLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();

                // Assegurando rigorosamente o ID do token ativo na sessao!
                const currentTenantId = user?.id || tenantId;

                if (!currentTenantId) {
                    if (isMounted) setInitialLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('configuracoes_impressao')
                    .select('*')
                    .eq('tenant_id', currentTenantId)
                    .maybeSingle();

                if (data && !error && isMounted) {
                    // Preenche os inputs para nao ficarem vazios caso o restaurante ja tenha salvo antes.
                    setFormData({
                        name: data.nome_estabelecimento || '',
                        cnpj: data.cnpj || '',
                        phone: data.telefone || '',
                        street: data.logradouro || '',
                        number: data.numero || '',
                        neighborhood: data.bairro || '',
                        city: data.cidade || '',
                        state: data.estado || 'SP',
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar configuracoes de impressao:', err);
            } finally {
                if (isMounted) setInitialLoading(false);
            }
        };

        fetchSettings();
        return () => { isMounted = false; };
    }, [tenantId]);

    // Mantendo Mascarimento
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        // CNPJ Mask
        if (name === 'cnpj') {
            finalValue = value.replace(/\D/g, '')
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .slice(0, 18);
        }

        // Phone/WhatsApp Mask
        if (name === 'phone') {
            const cleaned = value.replace(/\D/g, '').slice(0, 11);
            if (cleaned.length > 10) {
                finalValue = cleaned.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (cleaned.length > 2) {
                finalValue = cleaned.replace(/^(\d{2})(\d{4})/, '($1) $2');
            } else {
                finalValue = cleaned;
            }
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    // 3. Salvamento: Garante q CNPJ e Telefone estao no payload e usa o UID pra desativar RLS reject.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Puxa token da sessao pro momento do clique pra blindar contra bugs
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            const currentTenantId = user?.id || tenantId;

            if (authError || !currentTenantId) {
                alert('Erro de seguranca: Usuário/Tenant ID não detectado. Salvar cancelado.');
                setLoading(false);
                return;
            }

            const payload = {
                tenant_id: currentTenantId,
                nome_estabelecimento: formData.name,
                cnpj: formData.cnpj, // Mapeado pra coluna 'cnpj' perfeitamente
                telefone: formData.phone, // Mapeado pra coluna 'telefone' perfeitamente
                logradouro: formData.street,
                numero: formData.number,
                bairro: formData.neighborhood,
                cidade: formData.city,
                estado: formData.state,
            };

            const { error } = await supabase
                .from('configuracoes_impressao')
                .upsert(payload, { onConflict: 'tenant_id' });

            if (error) {
                throw error;
            }

            alert('Configurações salvas com sucesso!');

        } catch (err: any) {
            console.error('Erro ao salvar as configurações:', err);
            alert(`Erro ao salvar: ${err?.message || 'Erro desconhecido.'}`);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <span className="text-slate-500 font-extrabold text-sm uppercase tracking-wider">Carregando seus dados salvos...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col xl:flex-row gap-8 animate-fade-in w-full max-w-7xl mx-auto py-4">
            {/* Formulário */}
            <div className="flex-1">
                <div className="mb-6 px-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurações de Impressão</h2>
                    <p className="text-slate-500 mt-1 text-sm">Personalize as informações que serão impressas no cabeçalho dos cupons e comandas (Bobina térmica).</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 h-fit">
                    <h3 className="font-bold text-lg border-b border-slate-100 pb-3 mb-6 flex items-center gap-2 text-slate-700">
                        <Printer className="w-5 h-5" />
                        Dados do Cabeçalho da Nota
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Estabelecimento *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                                placeholder="Ex: Lanchonete do Zé"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CNPJ</label>
                            <input
                                type="text"
                                name="cnpj"
                                value={formData.cnpj}
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-mono text-slate-700"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-mono text-slate-700"
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Endereço (Rua / Avenida) *</label>
                            <input
                                type="text"
                                name="street"
                                value={formData.street}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                                placeholder="Rua das Flores"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Número *</label>
                            <input
                                type="text"
                                name="number"
                                value={formData.number}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                                placeholder="123"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bairro *</label>
                            <input
                                type="text"
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                                placeholder="Centro"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cidade *</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                                placeholder="São Paulo"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Estado *</label>
                            <div className="relative">
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-bold text-slate-700 appearance-none cursor-pointer"
                                >
                                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                        <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-blue-600 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Salvar Configurações de Impressão
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Preview Simulator */}
            <div className="w-full xl:w-[450px] shrink-0">
                <div className="sticky top-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center shadow-sm">
                        <div className="w-full flex justify-between items-center mb-6 text-slate-500 font-bold text-sm uppercase px-2 tracking-wider">
                            <span>Preview Visual</span>
                            <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs">Bobina 80mm</span>
                        </div>

                        {/* Receipt Preview Container */}
                        <div className="bg-white w-[80mm] min-h-[140mm] shadow-md border border-slate-200 pt-8 px-5 pb-12 overflow-hidden mx-auto font-mono text-black relative">
                            {/* Torn paper effect at bottom */}
                            <div className="absolute bottom-0 left-0 w-full h-[6px] bg-[radial-gradient(circle_at_4px_4px,_transparent_4px,_#f8fafc_0)] bg-[length:12px_12px] -mb-[4px]"></div>

                            <div className="text-center w-full">
                                <h1 className="font-bold text-[18px] leading-tight uppercase mb-2">
                                    {formData.name || 'NOME DO ESTAB.'}
                                </h1>

                                {formData.cnpj && (
                                    <p className="text-[14px] leading-snug">CNPJ: {formData.cnpj}</p>
                                )}

                                {formData.phone && (
                                    <p className="text-[14px] leading-snug mt-1">Tel: {formData.phone}</p>
                                )}

                                {(formData.street || formData.number || formData.neighborhood || formData.city || formData.state) && (
                                    <div className="mt-2 text-[14px] leading-tight">
                                        <p>{formData.street || 'Rua / Av.'}{formData.number ? `, ${formData.number}` : ''}</p>
                                        <p>{formData.neighborhood || 'Bairro'}</p>
                                        <p>{formData.city || 'Cidade'} - {formData.state}</p>
                                    </div>
                                )}

                                <div className="border-b-2 border-black border-dashed my-4 w-full"></div>

                                <h2 className="font-bold text-[16px] uppercase">PEDIDO DE EXEMPLO</h2>

                                <div className="border-b-2 border-black border-dashed my-4 w-full"></div>

                                <p className="text-[13px] text-center text-slate-400 mt-10">
                                    (Itens, quantidades,<br />e totais calculados<br />surgirão aqui)
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 text-[13px] text-slate-500 text-center px-4 leading-relaxed max-w-[80mm]">
                            A pré-visualização simula o alinhamento centralizado da nota usando a <strong>largura exata de 80mm</strong>.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
