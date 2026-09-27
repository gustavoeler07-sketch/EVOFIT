import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { Dumbbell, Shield, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div 
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white block leading-none font-['Cabinet_Grotesk']">
              EVOFIT
            </span>
          </div>
        </div>

        {/* Zone 2: Desktop clean text navigation links */}
        {user && user.role !== 'ADMIN' && onNavigate && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`transition-colors hover:text-white ${currentTab === 'dashboard' ? 'text-emerald-400 font-semibold' : ''}`}
            >
              Início
            </button>
            <button
              onClick={() => onNavigate('workouts')}
              className={`transition-colors hover:text-white ${currentTab === 'workouts' ? 'text-emerald-400 font-semibold' : ''}`}
            >
              Treinos
            </button>
            <button
              onClick={() => onNavigate('progress')}
              className={`transition-colors hover:text-white ${currentTab === 'progress' ? 'text-emerald-400 font-semibold' : ''}`}
            >
              Progresso
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`transition-colors hover:text-white ${currentTab === 'history' ? 'text-emerald-400 font-semibold' : ''}`}
            >
              Histórico
            </button>
            <button
              onClick={() => onNavigate('profile')}
              className={`transition-colors hover:text-white ${currentTab === 'profile' ? 'text-emerald-400 font-semibold' : ''}`}
            >
              Perfil
            </button>
          </nav>
        )}

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {user?.role === 'ADMIN' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Painel ADM
              </span>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate && onNavigate('profile')}
                className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
