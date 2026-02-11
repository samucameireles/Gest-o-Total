import React from 'react';
import { LayoutDashboard, ShoppingCart, ChefHat, Truck, Box, Settings, Store, Bike, Users, Sun, Moon, DollarSign } from 'lucide-react';
import { StoreSettings } from '../types';
import { useTheme } from '../contexts/ThemeContext';

import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedUnitName: string;
  onChangeUnit: () => void;
  settings: StoreSettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, selectedUnitName, onChangeUnit, settings }) => {
  const { theme, toggleTheme } = useTheme();
  const { role } = useAuth();
  const isDark = theme === 'dark';

  const allMenuItems = [
    { id: 'pos', label: 'Frente de Caixa', icon: ShoppingCart, roles: ['owner', 'gestor', 'caixa', 'staff'] },
    { id: 'kitchen', label: 'Cozinha (KDS)', icon: ChefHat, roles: ['owner', 'gestor', 'caixa', 'staff'] },
    { id: 'logistics', label: 'Expedição', icon: Truck, roles: ['owner', 'gestor', 'staff', 'caixa'] },
    { id: 'motoboys', label: 'Gestão Motoboys', icon: Bike, roles: ['owner', 'gestor'] },
    { id: 'inventory', label: 'Estoque e Menu', icon: Box, roles: ['owner', 'gestor', 'caixa'] },
    { id: 'crm', label: 'Clientes (CRM)', icon: Users, roles: ['owner', 'gestor', 'caixa'] },
    { id: 'reports', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'gestor'] },
    { id: 'cashflow', label: 'Fluxo de Caixa', icon: DollarSign, roles: ['owner', 'gestor', 'caixa'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['owner', 'gestor'] },
  ];

  const menuItems = allMenuItems.filter(item =>
    !role || item.roles.includes(role)
  );

  return (
    <div className={`w-64 border-r flex flex-col h-full fixed left-0 top-0 z-50 shadow-sm transition-all duration-500 ${isDark ? 'bg-[#0D0D10]/95 backdrop-blur-xl border-white/5' : 'bg-white border-slate-200'
      }`}>
      <div className={`p-8 flex flex-col items-center border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden border transition-all duration-500 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
          }`}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className={`font-heading font-bold text-2xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>GestãoTotal</span>
          )}
        </div>
        <h1 className={`font-heading font-extrabold text-lg tracking-tight text-center ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
          {settings.name || 'GestãoTotal'}
        </h1>
      </div>

      <div className="px-4 py-6">
        <button
          onClick={onChangeUnit}
          className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all border ${isDark
            ? 'bg-white/5 border-white/5 text-slate-400 hover:border-blue-500/30 hover:bg-white/[0.08]'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-white shadow-sm'
            }`}
        >
          <div className={`p-1.5 rounded-lg shadow-sm ${isDark ? 'bg-blue-600/20' : 'bg-white'}`}>
            <Store size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 text-left">
            <p className={`font-bold text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Unidade</p>
            <p className={`font-bold truncate ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{selectedUnitName}</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? (isDark ? 'bg-blue-600/10 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold')
                : (isDark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
                }`}
            >
              <item.icon size={20} className={`transition-colors ${isActive
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : (isDark ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600')
                }`} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={`p-4 mt-auto border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 mb-4 ${isDark
            ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
            : 'bg-slate-50 text-indigo-600 hover:bg-slate-100'
            }`}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="text-sm font-bold">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>

        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
            {role ? role.substring(0, 2).toUpperCase() : 'OP'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
              {role === 'owner' ? 'Dono' : role === 'gestor' ? 'Gerente' : role === 'caixa' ? 'Caixa' : 'Operador'}
            </p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Sistema Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};