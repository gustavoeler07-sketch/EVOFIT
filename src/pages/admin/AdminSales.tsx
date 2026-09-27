import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { DollarSign, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';

export const AdminSales: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPurchases() {
      try {
        const res = await api.admin.getPurchases();
        setPurchases(res.purchases);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPurchases();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = purchases.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Vendas e Assinaturas
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Estrutura de conversões preparada para Stripe e Mercado Pago
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>DADOS DE TESTE / MVP (Sem cobrança real)</span>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Volume de Transações</span>
          <span className="text-2xl font-bold text-white tabular-nums">{purchases.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Receita Fictícia Total</span>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Ticket Médio</span>
          <span className="text-2xl font-bold text-white tabular-nums">
            R$ {(purchases.length ? totalRevenue / purchases.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">ID Transação</th>
                <th className="py-3.5 px-3 font-semibold">Aluno</th>
                <th className="py-3.5 px-3 font-semibold">Plano</th>
                <th className="py-3.5 px-3 font-semibold">Valor</th>
                <th className="py-3.5 px-3 font-semibold">Influencer Atribuído</th>
                <th className="py-3.5 px-3 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums text-zinc-300">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {p.transaction_id}
                  </td>
                  <td className="py-3.5 px-3 font-sans">
                    <div className="font-medium text-white">{p.user_name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{p.user_email}</div>
                  </td>
                  <td className="py-3.5 px-3 font-sans text-zinc-300">
                    {p.plan_name}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-emerald-400">
                    R$ {p.amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 font-sans">
                    {p.influencer_name ? (
                      <span className="text-emerald-400 font-medium text-[11px]">
                        {p.influencer_name} ({p.influencer_code})
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-[11px]">Orgânico</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Concluída</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-400 text-[11px]">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
