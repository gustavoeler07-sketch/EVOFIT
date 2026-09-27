import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Search, UserCheck, Calendar, Clock, Target } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers(q);
      setUsers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(search);
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Alunos Cadastrados
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gerenciamento de contas, objetivos de treino e origem de aquisição
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800/80">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Nome</th>
                  <th className="py-3.5 px-3 font-semibold">E-mail</th>
                  <th className="py-3.5 px-3 font-semibold">Objetivo</th>
                  <th className="py-3.5 px-3 font-semibold">Influencer de Origem</th>
                  <th className="py-3.5 px-3 font-semibold">Data Cadastro</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Último Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {users.map((u) => {
                  const isOnline = u.last_active_at && (Date.now() - new Date(u.last_active_at).getTime()) < 15 * 60 * 1000;
                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-zinc-200">
                          {u.goal || 'Não definido'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {u.influencer_name ? (
                          <div className="text-emerald-400 font-semibold text-[11px]">
                            @{u.influencer_username}
                            <span className="text-[10px] text-zinc-500 font-normal ml-1">
                              ({u.influencer_source})
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Direto / Orgânico</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400 font-mono text-[11px] tabular-nums">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] tabular-nums text-zinc-400">
                        {u.last_active_at
                          ? new Date(u.last_active_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
