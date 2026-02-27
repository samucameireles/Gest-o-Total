import React from 'react';
import { LayoutDashboard, ShoppingCart, ChefHat, Truck, Box, Settings, Store, Bike, Users, Sun, Moon, DollarSign, X, Menu } from 'lucide-react';
import { StoreSettings } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedUnitName: string;
  onChangeUnit: () => void;
  settings: StoreSettings;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, selectedUnitName, onChangeUnit, settings, isOpen, setIsOpen
}) => {
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

  const menuItems = allMenuItems.filter(item => !role || item.roles.includes(role));

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setIsOpen(false); // Close mobile sidebar on navigation
  };

  const sidebarContent = (expanded: boolean) => (
    <>
      {/* Header */}
      <div className={`flex flex-col items-center border-b ${expanded ? 'p-6' : 'p-3 py-5'} ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <div className={`rounded-2xl flex items-center justify-center overflow-hidden border transition-all duration-300 ${expanded ? 'w-16 h-16 mb-3' : 'w-10 h-10'
          } ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <span className={`font-bold ${expanded ? 'text-lg' : 'text-xs'} ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>GT</span>
          )}
        </div>
        {expanded && (
          <h1 className={`font-extrabold text-base tracking-tight text-center ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
            {settings.name || 'GestãoTotal'}
          </h1>
        )}
      </div>

      {/* Unit Selector */}
      {expanded && (
        <div className="px-3 py-4">
          <button
            onClick={() => { onChangeUnit(); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all border ${isDark
              ? 'bg-white/5 border-white/5 text-slate-400 hover:border-blue-500/30 hover:bg-white/[0.08]'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-white shadow-sm'}`}
          >
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-600/20' : 'bg-white'}`}>
              <Store size={15} className="text-blue-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className={`font-bold text-[10px] uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Unidade</p>
              <p className={`font-bold truncate ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{selectedUnitName}</p>
            </div>
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav className={`flex-1 overflow-y-auto custom-scrollbar ${expanded ? 'px-3 space-y-1' : 'px-2 space-y-1 py-2'}`}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              title={!expanded ? item.label : undefined}
              className={`w-full flex items-center transition-all duration-200 group rounded-xl ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'
                } ${isActive
                  ? (isDark ? 'bg-blue-600/10 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold')
                  : (isDark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
                }`}
            >
              <item.icon size={20} className={`flex-shrink-0 transition-colors ${isActive
                ? (isDark ? 'text-blue-400' : 'text-blue-600')
                : (isDark ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600')
                }`} />
              {expanded && <span className="text-sm truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`mt-auto border-t ${expanded ? 'p-3' : 'p-2'} ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <button
          onClick={toggleTheme}
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
          className={`w-full flex items-center transition-all duration-300 rounded-xl ${expanded ? 'gap-3 px-3 py-2.5 mb-3' : 'justify-center p-2.5 mb-2'
            } ${isDark
              ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
              : 'bg-slate-50 text-indigo-600 hover:bg-slate-100'}`}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {expanded && <span className="text-sm font-bold">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </button>

        {expanded && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg flex-shrink-0">
              {role ? role.substring(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                {role === 'owner' ? 'Dono' : role === 'gestor' ? 'Gerente' : role === 'caixa' ? 'Caixa' : 'Operador'}
              </p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Online</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── MOBILE OVERLAY ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── MOBILE: Full sidebar sliding in ── */}
      <div className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72 ${isDark ? 'bg-[#0D0D10] border-r border-white/5' : 'bg-white border-r border-slate-200'} shadow-2xl`}>
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className={`absolute top-4 right-4 p-2 rounded-xl z-10 ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <X size={18} />
        </button>
        {sidebarContent(true)}
      </div>

      {/* ── TABLET: Slim sidebar (icons only) ── */}
      <div className={`hidden lg:hidden md:flex flex-col fixed left-0 top-0 h-full z-30 w-16 border-r transition-all duration-300 ${isDark ? 'bg-[#0D0D10]/95 backdrop-blur-xl border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
        {sidebarContent(false)}
      </div>

      {/* ── DESKTOP: Full sidebar ── */}
      <div className={`hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 w-64 border-r transition-all duration-300 ${isDark ? 'bg-[#0D0D10]/95 backdrop-blur-xl border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
        {sidebarContent(true)}
      </div>
    </>
  );
};