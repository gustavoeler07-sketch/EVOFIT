import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { Shield, LayoutDashboard, Users, UserCheck, DollarSign, MessageSquare, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsers } from './AdminUsers';
import { AdminInfluencers } from './AdminInfluencers';
import { AdminSales } from './AdminSales';
import { AdminContacts } from './AdminContacts';
import { AdminSettings } from './AdminSettings';

interface AdminLayoutProps {
  onBackToApp: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToApp }) => {
  const { user, logout } = useAuth();
  const [currentAdminTab, setCurrentAdminTab] = useState<'dashboard' | 'users' | 'influencers' | 'sales' | 'contacts' | 'settings'>('dashboard');

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-center">
        <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-md space-y-4">
          <Shield className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acesso Negado</h2>
          <p className="text-xs text-zinc-400">
            Você não possui permissão de administrador para visualizar esta área. A autorização é validada pelo servidor.
          </p>
          <button
            onClick={onBackToApp}
            className="w-full py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700"
          >
            Voltar ao Aplicativo
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'influencers', label: 'Influencers', icon: UserCheck },
    { id: 'sales', label: 'Vendas', icon: DollarSign },
    { id: 'contacts', label: 'Contatos', icon: MessageSquare },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
              title="Voltar ao modo atleta"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver App</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-['Cabinet_Grotesk']">
                EVOFIT
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                ADMIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Logado como <strong className="text-zinc-200">{user.email}</strong>
            </span>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 p-2 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none border-t border-zinc-900">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentAdminTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {currentAdminTab === 'dashboard' && <AdminDashboard onNavigateTab={(tab) => setCurrentAdminTab(tab as any)} />}
        {currentAdminTab === 'users' && <AdminUsers />}
        {currentAdminTab === 'influencers' && <AdminInfluencers />}
        {currentAdminTab === 'sales' && <AdminSales />}
        {currentAdminTab === 'contacts' && <AdminContacts />}
        {currentAdminTab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
};
