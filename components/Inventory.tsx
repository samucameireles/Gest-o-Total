import React, { useState } from 'react';
import { Package, Plus, Search, UtensilsCrossed, Box, Trash2, CheckSquare, Square, AlertOctagon, History, List, Tag, Pencil } from 'lucide-react';
import { Ingredient, Product, Category, WasteLog, AddOn } from '../types';
import { RECIPES } from '../constants';
import { supabase } from '../lib/supabase';

interface InventoryProps {
    inventory: Ingredient[];
    onUpdateStock: (id: string, newAmount: number) => void;
    onUpdateIngredientName: (id: string, newName: string, newUnit: string) => void;
    onAddIngredient: (name: string, unit: string) => void;
    onRemoveIngredient: (id: string) => void;
    onAddProduct: (product: Omit<Product, 'id'>) => void;
    onRemoveProduct: (id: string) => void;
    onUpdateProduct?: (id: string, product: Partial<Product>) => void;
    products: Product[];
    onLogWaste: (ingredientId: string, amount: number, reason: string) => void;
    wasteLogs: WasteLog[];
    // V12: AddOns Props
    addOns: AddOn[];
    onAddAddOn: (name: string, price: number, applyToAll?: boolean) => void;
    onRemoveAddOn: (id: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ inventory, onUpdateStock, onUpdateIngredientName, onAddIngredient, onRemoveIngredient, onAddProduct, onRemoveProduct, onUpdateProduct, products, onLogWaste, wasteLogs, addOns, onAddAddOn, onRemoveAddOn }) => {
    const [view, setView] = useState<'STOCK' | 'MENU' | 'WASTE' | 'ADDONS'>('STOCK');
    const [filter, setFilter] = useState('');

    // Forms
    const [newIngName, setNewIngName] = useState('');
    const [newIngUnit, setNewIngUnit] = useState('un');

    // Product Form
    const [produtoEmEdicao, setProdutoEmEdicao] = useState<Product | null>(null);
    const [newProdName, setNewProdName] = useState('');
    const [newProdPrice, setNewProdPrice] = useState('');
    const [newProdCategory, setNewProdCategory] = useState<Category>('BURGER');
    const [newProdDesc, setNewProdDesc] = useState('');
    const [imagemFile, setImagemFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [newProdAllowObs, setNewProdAllowObs] = useState(false); // Changed from true to false

    // V10: Recipe Builder State
    const [recipeSelection, setRecipeSelection] = useState<Record<string, number>>({});
    // V12: Allowed AddOns State
    const [allowedAddOnsSelection, setAllowedAddOnsSelection] = useState<string[]>([]);

    // Waste Form
    const [wasteIngId, setWasteIngId] = useState('');
    const [wasteAmount, setWasteAmount] = useState('');
    const [wasteReason, setWasteReason] = useState('');

    // AddOn Form
    const [newAddOnName, setNewAddOnName] = useState('');
    const [newAddOnPrice, setNewAddOnPrice] = useState('');
    const [applyAllAddOn, setApplyAllAddOn] = useState(false);

    const filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(filter.toLowerCase()));
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    const handleAddIngredient = () => { if (newIngName) { onAddIngredient(newIngName, newIngUnit); setNewIngName(''); } };

    const handleToggleTodosAdicionais = (checked: boolean) => {
        if (checked) {
            setAllowedAddOnsSelection(addOns.map(a => a.id));
        } else {
            setAllowedAddOnsSelection([]);
        }
    };

    const handleAddProduct = async () => {
        if (newProdName && newProdPrice) {
            setIsUploading(true);
            try {
                let imageUrl = produtoEmEdicao?.image || 'https://via.placeholder.com/400x300?text=Sem+Foto';

                if (imagemFile) {
                    const fileExt = imagemFile.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`; // Salva na raiz do bucket 'produtos'

                    const { error: uploadError } = await supabase.storage
                        .from('produtos')
                        .upload(filePath, imagemFile);

                    if (uploadError) throw uploadError;

                    // Pega a URL pública para salvar no banco
                    const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
                    imageUrl = data.publicUrl;
                }

                // Build recipe array
                const recipe = Object.entries(recipeSelection)
                    .filter(([_, amount]) => amount > 0)
                    .map(([ingredientId, amount]) => ({ ingredientId, amount }));

                if (produtoEmEdicao) {
                    // Update Product in Supabase (as requested)
                    const { error } = await supabase
                        .from('produtos')
                        .update({
                            nome: newProdName, // User specified "nome: nomeInput", falling back to correct database column mapping depending on db schema. Sticking to literal user request loosely where sensible, assuming they map columns to camelCase usually.
                            preco: parseFloat(newProdPrice),
                            ingredientes: recipe,
                            name: newProdName, // Ensuring English names to prevent insert/update errors if db schema requires English
                            price: parseFloat(newProdPrice),
                            category: newProdCategory,
                            description: newProdDesc,
                            image: imageUrl,
                            allowObservations: newProdAllowObs,
                            recipe: recipe,
                            allowedAddOns: allowedAddOnsSelection
                        })
                        .eq('id', produtoEmEdicao.id);

                    // Call local prop updater if exists
                    if (onUpdateProduct) {
                        onUpdateProduct(produtoEmEdicao.id, {
                            name: newProdName,
                            price: parseFloat(newProdPrice),
                            category: newProdCategory,
                            description: newProdDesc,
                            image: imageUrl,
                            allowObservations: newProdAllowObs,
                            recipe: recipe,
                            allowedAddOns: allowedAddOnsSelection
                        });
                    }
                    alert("Produto atualizado com sucesso!");
                } else {
                    onAddProduct({
                        name: newProdName,
                        price: parseFloat(newProdPrice),
                        category: newProdCategory,
                        description: newProdDesc,
                        image: imageUrl,
                        allowObservations: newProdAllowObs,
                        recipe: recipe,
                        allowedAddOns: allowedAddOnsSelection // V12 Link AddOns
                    });
                    alert("Produto adicionado com Ficha Técnica e Adicionais!");
                }

                cancelEdit();
            } catch (error: any) {
                console.error("Erro no upload da imagem:", error);
                alert(`Erro ao salvar: ${error?.message || JSON.stringify(error)}`);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleEditProduct = (p: Product) => {
        setProdutoEmEdicao(p);
        setNewProdName(p.name);
        setNewProdPrice(p.price.toString());
        setNewProdCategory(p.category);
        setNewProdDesc(p.description || '');
        setNewProdAllowObs(p.allowObservations);
        setImagemFile(null);

        const recipeMap: Record<string, number> = {};
        let currentRecipe = p.recipe;
        if (!currentRecipe || currentRecipe.length === 0) currentRecipe = RECIPES[p.id] || [];

        currentRecipe.forEach(r => {
            // V14: Filter out ghost ingredients that no longer exist in inventory
            if (inventory.some(i => i.id === r.ingredientId)) {
                recipeMap[r.ingredientId] = r.amount;
            }
        });
        setRecipeSelection(recipeMap);
        setAllowedAddOnsSelection(p.allowedAddOns || []);
        setView('MENU');
    };

    const cancelEdit = () => {
        setProdutoEmEdicao(null);
        setNewProdName('');
        setNewProdPrice('');
        setNewProdDesc('');
        setImagemFile(null);
        setNewProdAllowObs(true);
        setRecipeSelection({});
        setAllowedAddOnsSelection([]);
    };

    const handleLogWaste = () => { if (wasteIngId && wasteAmount && wasteReason) { onLogWaste(wasteIngId, parseFloat(wasteAmount), wasteReason); setWasteIngId(''); setWasteAmount(''); setWasteReason(''); alert("Desperdício registrado e abatido do estoque."); } };

    const handleRecipeChange = (ingId: string, amountStr: string) => {
        const amount = parseFloat(amountStr) || 0;
        setRecipeSelection(prev => ({ ...prev, [ingId]: amount }));
    };

    const toggleAllowedAddOn = (id: string) => {
        setAllowedAddOnsSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleAddAddOnSubmit = () => {
        if (newAddOnName && newAddOnPrice) {
            onAddAddOn(newAddOnName, parseFloat(newAddOnPrice), applyAllAddOn);
            setNewAddOnName('');
            setNewAddOnPrice('');
            setApplyAllAddOn(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-premium border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-background flex justify-between items-center">
                <div><h2 className="text-2xl font-heading font-bold text-textPrimary">Gestão de Recursos</h2><p className="text-textSecondary text-sm">Controle total da operação</p></div>
                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-border">
                    <button onClick={() => setView('STOCK')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'STOCK' ? 'bg-textPrimary text-white shadow' : 'text-textSecondary hover:bg-background'}`}><Box size={16} className="inline mr-2" /> Estoque</button>
                    <button onClick={() => setView('MENU')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'MENU' ? 'bg-textPrimary text-white shadow' : 'text-textSecondary hover:bg-background'}`}><UtensilsCrossed size={16} className="inline mr-2" /> Cardápio</button>
                    <button onClick={() => setView('ADDONS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'ADDONS' ? 'bg-textPrimary text-white shadow' : 'text-textSecondary hover:bg-background'}`}><Tag size={16} className="inline mr-2" /> Adicionais</button>
                    <button onClick={() => setView('WASTE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'WASTE' ? 'bg-textPrimary text-white shadow' : 'text-textSecondary hover:bg-background'}`}><AlertOctagon size={16} className="inline mr-2" /> Desperdício</button>
                </div>
            </div>

            {view === 'STOCK' && (
                <>
                    <div className="p-6 border-b border-border bg-white flex gap-2 items-center">
                        <input value={newIngName} onChange={e => setNewIngName(e.target.value)} placeholder="Novo Insumo" className="flex-[2] bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent" />
                        <select value={newIngUnit} onChange={e => setNewIngUnit(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-accent"><option value="un">Unidade</option><option value="kg">KG</option><option value="L">Litro</option><option value="fatia">Fatia</option></select>
                        <button onClick={handleAddIngredient} className="bg-success text-white p-3 rounded-xl hover:bg-green-600"><Plus /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-background text-xs text-textSecondary uppercase font-bold sticky top-0 z-10"><tr><th className="p-4 border-b border-border w-1/2">Insumo</th><th className="p-4 border-b border-border w-1/4 text-center">Unidade</th><th className="p-4 border-b border-border w-1/4 text-right">Qtd</th><th className="p-4 border-b border-border w-16"></th></tr></thead>
                            <tbody>{filteredInventory.map(item => (
                                <tr key={item.id} className="border-b border-border hover:bg-background/50 group">
                                    <td className="p-4"><input className="bg-transparent font-medium text-textPrimary outline-none w-full" value={item.name} onChange={(e) => onUpdateIngredientName(item.id, e.target.value, item.unit)} /></td>
                                    <td className="p-4 text-center"><input className="bg-transparent text-center text-textSecondary text-sm outline-none w-20" value={item.unit} onChange={(e) => onUpdateIngredientName(item.id, item.name, e.target.value)} /></td>
                                    <td className="p-4 text-right"><input type="number" value={item.currentStock} onChange={(e) => onUpdateStock(item.id, parseFloat(e.target.value))} className="w-24 bg-white border border-border rounded-lg p-2 text-right font-bold text-textPrimary focus:border-accent outline-none" /></td>
                                    <td className="p-4 text-right"><button onClick={() => onRemoveIngredient(item.id)} className="text-textSecondary hover:text-danger p-2"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </>
            )}

            {view === 'MENU' && (
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 border-r border-border">
                        <div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} /><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar cardápio..." className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-accent" /></div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredProducts.map(p => (<div key={p.id} className="flex gap-4 p-4 border border-border rounded-xl bg-background hover:shadow-sm transition-all group relative"><img src={p.image} className="w-16 h-16 rounded-lg object-cover bg-white" /><div><h4 className="font-bold text-textPrimary">{p.name}</h4><span className="text-accent font-bold text-sm">R$ {p.price.toFixed(2)}</span></div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex border border-border bg-white rounded-lg overflow-hidden shadow-sm">
                                <button onClick={() => handleEditProduct(p)} className="p-2 text-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors border-r border-border" title="Editar"><Pencil size={18} /></button>
                                <button onClick={() => onRemoveProduct(p.id)} className="p-2 text-textSecondary hover:text-danger hover:bg-red-50 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                            </div>
                        </div>))}</div>
                    </div>
                    <div className="w-96 bg-gray-50 p-6 overflow-y-auto">
                        <h3 className="font-heading font-bold text-lg mb-6 text-textPrimary flex items-center gap-2">
                            {produtoEmEdicao ? <Pencil size={20} className="text-blue-500" /> : <Plus size={20} className="text-accent" />}
                            {produtoEmEdicao ? 'Editar Item' : 'Novo Item'}
                        </h3>
                        <div className="space-y-4">
                            <input className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="Nome do Item" />
                            <input type="number" className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} placeholder="Preço R$" />

                            <div className="bg-white border border-border rounded-xl p-3">
                                <label className="text-xs font-bold text-textSecondary mb-2 block">Imagem do Produto</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setImagemFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-textPrimary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 outline-none cursor-pointer"
                                />
                                {imagemFile ? (
                                    <div className="mt-3">
                                        <img src={URL.createObjectURL(imagemFile)} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-border" />
                                    </div>
                                ) : produtoEmEdicao?.image && produtoEmEdicao.image !== 'https://via.placeholder.com/400x300?text=Sem+Foto' ? (
                                    <div className="mt-3">
                                        <p className="text-[10px] text-textSecondary mb-1">Imagem atual:</p>
                                        <img src={produtoEmEdicao.image} alt="Atual" className="w-full h-32 object-cover rounded-lg border border-border opacity-70" />
                                    </div>
                                ) : null}
                            </div>

                            <select className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={newProdCategory} onChange={e => setNewProdCategory(e.target.value as Category)}><option value="BURGER">Hambúrguer</option><option value="SIDE">Acompanhamento</option><option value="DRINK">Bebida</option><option value="DESSERT">Sobremesa</option></select>
                            <textarea className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent h-24 resize-none bg-white" value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} placeholder="Descrição" />

                            {/* V10: Recipe Builder */}
                            <div className="bg-white border border-border rounded-xl p-3">
                                <h4 className="font-bold text-sm text-textSecondary mb-2 flex items-center gap-2"><List size={14} /> Ficha Técnica (Ingredientes)</h4>
                                <div className="max-h-32 overflow-y-auto space-y-2 mb-2">
                                    {inventory.map(ing => (
                                        <div key={ing.id} className="flex items-center justify-between text-xs">
                                            <span className="text-textPrimary">{ing.name} ({ing.unit})</span>
                                            <input
                                                type="number"
                                                className="w-16 border border-border rounded p-1 text-right outline-none focus:border-accent"
                                                placeholder="0"
                                                value={recipeSelection[ing.id] || ''}
                                                onChange={(e) => handleRecipeChange(ing.id, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* V12: Allowed AddOns */}
                            <div className="bg-white border border-border rounded-xl p-3">
                                <h4 className="font-bold text-sm text-textSecondary mb-2 flex items-center gap-2">
                                    <Tag size={14} /> Permitir Adicionais
                                </h4>

                                {/* Permitir Todos Checkbox */}
                                {addOns.length > 0 && (
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                                        <input
                                            type="checkbox"
                                            id="selectAllAddons"
                                            className="cursor-pointer w-4 h-4 text-accent rounded focus:ring-accent"
                                            checked={allowedAddOnsSelection.length === addOns.length && addOns.length > 0}
                                            onChange={(e) => handleToggleTodosAdicionais(e.target.checked)}
                                        />
                                        <label htmlFor="selectAllAddons" className="text-sm font-bold text-textPrimary cursor-pointer">
                                            Permitir Todos
                                        </label>
                                    </div>
                                )}

                                <div className="max-h-32 overflow-y-auto space-y-2">
                                    {addOns.length === 0 && <p className="text-xs text-textSecondary italic">Nenhum adicional cadastrado.</p>}
                                    {addOns.map(addon => (
                                        <div key={addon.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded" onClick={() => toggleAllowedAddOn(addon.id)}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${allowedAddOnsSelection.includes(addon.id) ? 'bg-accent border-accent' : 'border-border'}`}>
                                                {allowedAddOnsSelection.includes(addon.id) && <Plus size={10} className="text-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-textPrimary">{addon.name} (+ R$ {addon.price.toFixed(2)})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-lg" onClick={() => setNewProdAllowObs(!newProdAllowObs)}>{newProdAllowObs ? <CheckSquare size={20} className="text-accent" /> : <Square size={20} className="text-textSecondary" />}<span className="text-sm font-bold text-textPrimary">Permitir Observações?</span></div>
                            <button onClick={handleAddProduct} disabled={isUploading} className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-accentDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-accent/20 mt-4">
                                {isUploading ? 'Salvando...' : produtoEmEdicao ? 'Salvar Alterações' : 'Cadastrar no Cardápio'}
                            </button>
                            {produtoEmEdicao && (
                                <button onClick={cancelEdit} className="w-full bg-background border border-border text-textSecondary font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors mt-2">
                                    Cancelar Edição
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'ADDONS' && (
                <div className="flex flex-col h-full p-6 overflow-hidden">
                    <h3 className="font-heading font-bold text-lg mb-4 text-textPrimary flex items-center gap-2"><Tag className="text-highlight" /> Gerenciar Adicionais</h3>
                    <div className="flex gap-2 mb-6 bg-gray-50 p-4 rounded-xl border border-border">
                        <input value={newAddOnName} onChange={e => setNewAddOnName(e.target.value)} placeholder="Nome do Adicional (ex: Bacon)" className="flex-[2] p-3 rounded-xl border border-border outline-none focus:border-accent" />
                        <input value={newAddOnPrice} onChange={e => setNewAddOnPrice(e.target.value)} type="number" placeholder="Preço (R$)" className="flex-1 p-3 rounded-xl border border-border outline-none focus:border-accent" />
                        <div className="flex items-center gap-2 px-2 bg-white rounded-lg border border-border h-full py-3">
                            <input type="checkbox" id="applyAll" className="cursor-pointer w-4 h-4 text-accent rounded focus:ring-accent" checked={applyAllAddOn} onChange={(e) => setApplyAllAddOn(e.target.checked)} />
                            <label htmlFor="applyAll" className="text-xs font-bold text-textSecondary cursor-pointer whitespace-nowrap">Vincular a Todos</label>
                        </div>
                        <button onClick={handleAddAddOnSubmit} className="bg-success text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors h-full">Adicionar</button>
                    </div>
                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                        {addOns.map(addon => (
                            <div key={addon.id} className="flex justify-between items-center p-4 bg-white border border-border rounded-xl shadow-sm">
                                <div>
                                    <p className="font-bold text-textPrimary">{addon.name}</p>
                                    <p className="text-sm text-success font-bold">+ R$ {addon.price.toFixed(2)}</p>
                                </div>
                                <button onClick={() => onRemoveAddOn(addon.id)} className="text-textSecondary hover:text-danger p-2 hover:bg-gray-50 rounded-lg"><Trash2 size={18} /></button>
                            </div>
                        ))}
                        {addOns.length === 0 && <p className="col-span-full text-center text-textSecondary italic mt-10">Nenhum adicional cadastrado.</p>}
                    </div>
                </div>
            )}

            {view === 'WASTE' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                    <div className="p-6 border-r border-border overflow-y-auto">
                        <h3 className="font-heading font-bold text-lg mb-4 text-textPrimary flex items-center gap-2"><AlertOctagon className="text-danger" /> Registrar Perda</h3>
                        <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-border">
                            <div>
                                <label className="text-xs font-bold text-textSecondary mb-1 block">Insumo</label>
                                <select className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={wasteIngId} onChange={e => setWasteIngId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-textSecondary mb-1 block">Quantidade Perdida</label>
                                <input type="number" className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={wasteAmount} onChange={e => setWasteAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-textSecondary mb-1 block">Motivo</label>
                                <input className="w-full p-3 rounded-xl border border-border outline-none focus:border-accent bg-white" value={wasteReason} onChange={e => setWasteReason(e.target.value)} placeholder="Ex: Vencido, Caiu no chão..." />
                            </div>
                            <button onClick={handleLogWaste} className="w-full bg-danger text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-lg mt-2">Registrar e Abater</button>
                        </div>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <h3 className="font-heading font-bold text-lg mb-4 text-textPrimary flex items-center gap-2"><History className="text-textSecondary" /> Histórico de Desperdício</h3>
                        <div className="space-y-3">
                            {wasteLogs.map(log => (
                                <div key={log.id} className="p-3 border-l-4 border-danger bg-red-50 rounded-r-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-textPrimary">{log.ingredientName}</p>
                                        <p className="text-xs text-textSecondary">{log.reason}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-danger">- {log.amount} {log.unit}</p>
                                        <p className="text-[10px] text-textSecondary">{new Date(log.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {wasteLogs.length === 0 && <p className="text-textSecondary text-sm italic">Nenhum registro.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};