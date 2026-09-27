import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AdminMetrics } from '../../types';
import { Users, UserPlus, MousePointerClick, DollarSign, Percent, ArrowUpRight, TrendingUp, RefreshCw } from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [filter, setFilter] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getMetrics(filter);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto refresh active metrics every 30s
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Dashboard Administrativo
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Visão consolidada de audiência, influenciadores e conversões
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl self-start sm:self-auto">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7d', label: '7 dias' },
            { id: '30d', label: '30 dias' },
            { id: 'all', label: 'Período Completo' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === item.id
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Online Users Live Pill (Section 23) */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{metrics?.onlineUsers || 1} usuários ativos agora</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Usuários com atividade registrada nos últimos 15 minutos
            </p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 transition-colors"
          title="Atualizar métricas"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Primary Metrics Grid (Section 19) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total de Usuários</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {metrics?.totalUsers || 0}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1 pt-1">
            <span>Hoje: +{metrics?.newUsersToday || 0}</span>
            <span aria-hidden="true">·</span>
            <span>7d: +{metrics?.newUsers7d || 0}</span>
          </div>
        </div>

        {/* Clicks */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Cliques em Links</span>
            <MousePointerClick className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {metrics?.clicks || 0}
          </div>
          <div className="text-[11px] text-zinc-500 pt-1">
            Atribuídos a influenciadores
          </div>
        </div>

        {/* Signups from Influencers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Cadastros via Ref</span>
            <UserPlus className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {metrics?.signups || 0}
          </div>
          <div className="text-[11px] text-emerald-400/80 pt-1">
            Convertidos de campanhas
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Taxa de Conversão</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">
            {metrics?.conversionRate || 0}%
          </div>
          <div className="text-[11px] text-zinc-500 pt-1">
            Cliques → Cadastros
          </div>
        </div>

        {/* Purchases */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Compras (MVP Teste)</span>
            <DollarSign className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {metrics?.purchasesCount || 0}
          </div>
          <div className="text-[11px] text-amber-400/90 pt-1">
            Transações registradas
          </div>
        </div>

        {/* Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Receita Total</span>
            <TrendingUp className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            R$ {(metrics?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 pt-1">
            Dados de simulação / MVP
          </div>
        </div>

        {/* Shortcut to Influencers */}
        <div
          onClick={() => onNavigateTab('influencers')}
          className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/40 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Tabela de Influencers</span>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Ver métricas detalhadas, links e códigos de cada parceiro.
          </p>
        </div>

        {/* Shortcut to Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:border-emerald-500/40 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span>Gestão de Usuários</span>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Buscar alunos, visualizar datas e influenciadores de origem.
          </p>
        </div>
      </div>
    </div>
  );
};
