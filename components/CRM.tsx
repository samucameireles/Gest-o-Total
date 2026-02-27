import React, { useState } from 'react';
import { Users, Search, Plus, MapPin, Phone, Trash2 } from 'lucide-react';
import { Customer } from '../types';

interface CRMProps {
  customers: Customer[];
  onAddCustomer: (c: Omit<Customer, 'id'>) => void;
  onRemoveCustomer: (id: string) => void;
}

export const CRM: React.FC<CRMProps> = ({ customers, onAddCustomer, onRemoveCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleAdd = () => {
    if (newName && newPhone) {
      onAddCustomer({
        name: newName,
        phone: newPhone,
        street: newStreet,
        number: newNumber,
        neighborhood: newNeighborhood
      });
      setNewName('');
      setNewPhone('');
      setNewStreet('');
      setNewNumber('');
      setNewNeighborhood('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* List */}
      <div className="lg:col-span-2 bg-white rounded-3xl shadow-premium border border-border flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border bg-background flex justify-between items-center gap-3 flex-wrap">
          <h2 className="text-xl font-heading font-extrabold text-textPrimary flex items-center gap-2">
            <Users className="text-accent" /> Base de Clientes
          </h2>
          <div className="relative w-full max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-white border border-border rounded-xl pl-10 pr-4 py-2 outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-background border border-border p-4 rounded-xl flex justify-between items-center hover:shadow-sm transition-shadow">
              <div>
                <h3 className="font-bold text-textPrimary text-lg">{c.name}</h3>
                <div className="flex items-center gap-3 text-sm text-textSecondary mt-1">
                  <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {c.street}, {c.number} - {c.neighborhood}</span>
                </div>
              </div>
              <button
                onClick={() => onRemoveCustomer(c.id)}
                className="p-2 text-textSecondary hover:text-danger hover:bg-white rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-textSecondary opacity-60">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl shadow-premium border border-border p-6 h-fit">
        <h3 className="font-heading font-bold text-lg mb-4 text-textPrimary flex items-center gap-2">
          <Plus size={20} className="text-success" /> Novo Cliente
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-textSecondary mb-1 block">Nome Completo</label>
            <input className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Ana Silva" />
          </div>
          <div>
            <label className="text-xs font-bold text-textSecondary mb-1 block">Telefone (Whatsapp)</label>
            <input className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ex: 11999999999" />
          </div>
          <div className="flex gap-2">
            <div className="w-[70%]">
              <label className="text-xs font-bold text-textSecondary mb-1 block">Rua</label>
              <input className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" value={newStreet} onChange={e => setNewStreet(e.target.value)} placeholder="Rua das Flores" />
            </div>
            <div className="w-[30%]">
              <label className="text-xs font-bold text-textSecondary mb-1 block">Número</label>
              <input type="number" className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="123" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-textSecondary mb-1 block">Bairro</label>
            <input className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-accent" value={newNeighborhood} onChange={e => setNewNeighborhood(e.target.value)} placeholder="Ex: Centro" />
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-success text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors shadow-lg mt-2"
          >
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
};