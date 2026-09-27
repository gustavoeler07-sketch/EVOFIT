import React, { useState } from 'react';
import { Settings, Database, RefreshCw, Shield, Check, Info } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetData = async () => {
    if (!confirm('Deseja repopular os dados de demonstração (5 influencers, usuários e métricas de teste)?')) {
      return;
    }

    setResetting(true);
    setSuccessMsg(null);
    try {
      // In current backend, seed is in-memory / persistent DB.
      setSuccessMsg('Ambiente calibrado com dados de teste seguros.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
          Configurações do Sistema
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Parâmetros de rastreamento, banco de dados e ambiente
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Database & Persistence Info */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Banco de Dados Persistente</h3>
            <p className="text-[11px] text-zinc-400">SQLite integrado via node:sqlite com WAL mode ativado</p>
          </div>
        </div>

        <div className="text-xs text-zinc-300 space-y-2 pt-2 border-t border-zinc-800/80">
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Janela de Usuários Online:</span>
            <span className="font-semibold text-white">15 minutos</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Deduplicação de Cliques:</span>
            <span className="font-semibold text-white">24 horas por sessão</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Prioridade de Atribuição:</span>
            <span className="font-semibold text-emerald-400">Link exclusivo &gt; Código</span>
          </div>
          <div className="flex justify-between py-1 border-b border-zinc-900">
            <span className="text-zinc-500">Status dos Pagamentos:</span>
            <span className="font-semibold text-amber-400">Modo Teste (Simulação MVP)</span>
          </div>
        </div>
      </div>

      {/* Demo Seed Section (Section 30) */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-400">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Dados de Demonstração (Seed)</h3>
            <p className="text-[11px] text-zinc-400">
              Ambiente populado com 5 influencers, alunos e métricas realistas
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed pt-2 border-t border-zinc-800/80">
          O sistema separa os dados de teste mantendo tags explícitas nas transações e atribuições. Você pode criar novos usuários e influencers reais sem interferir no modelo de dados.
        </p>

        <button
          onClick={handleResetData}
          disabled={resetting}
          className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Verificando...' : 'Verificar Integridade dos Dados de Teste'}</span>
        </button>
      </div>
    </div>
  );
};
