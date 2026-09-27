import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Influencer } from '../../types';
import { Plus, ArrowUpDown, ExternalLink, ArrowLeft, Check, Copy, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export const AdminInfluencers: React.FC = () => {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'clicks' | 'signups' | 'purchases' | 'conversion' | 'revenue'>('clicks');
  const [sortAsc, setSortAsc] = useState(false);

  // Selected influencer for detail view (Section 21)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create influencer modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newCode, setNewCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchInfluencers = async () => {
    try {
      const res = await api.admin.getInfluencers();
      setInfluencers(res.influencers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, []);

  const handleSelectInfluencer = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await api.admin.getInfluencerDetail(id);
      setDetailData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSort = (field: 'clicks' | 'signups' | 'purchases' | 'conversion' | 'revenue') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedInfluencers = [...influencers].sort((a, b) => {
    const valA = (a as any)[sortField] || 0;
    const valB = (b as any)[sortField] || 0;
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createInfluencer({
        name: newName,
        username: newUsername,
        code: newCode,
      });
      setShowCreateModal(false);
      setNewName('');
      setNewUsername('');
      setNewCode('');
      fetchInfluencers();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar influencer');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.admin.toggleInfluencer(id);
      fetchInfluencers();
      if (selectedId === id) {
        handleSelectInfluencer(id);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Section 21: Individual Influencer Page
  if (selectedId && detailData) {
    const inf = detailData.influencer;
    const origin = window.location.origin;
    const fullLink = `${origin}/${inf.username}`;

    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedId(null); setDetailData(null); }}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para tabela de influencers</span>
        </button>

        {/* Influencer Header Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white font-['Cabinet_Grotesk']">
                  @{inf.username}
                </h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  inf.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {inf.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {inf.name} · Cadastrado em {new Date(inf.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(inf.id)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                {inf.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          {/* Links & Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-medium">Link Exclusivo</span>
                <span className="text-xs font-mono text-emerald-400 truncate max-w-[200px] sm:max-w-xs block">
                  {fullLink}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(fullLink)}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                title="Copiar link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-medium">Código Promocional</span>
                <span className="text-sm font-mono font-bold text-white">
                  {inf.code}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(inf.code)}
                className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                title="Copiar código"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Cliques</span>
            <span className="text-xl font-bold text-white tabular-nums">{detailData.clicks}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Cadastros</span>
            <span className="text-xl font-bold text-white tabular-nums">{detailData.signups}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Compras</span>
            <span className="text-xl font-bold text-white tabular-nums">{detailData.purchases}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Conversão</span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">{detailData.conversion}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Receita</span>
            <span className="text-xl font-bold text-white tabular-nums">
              R$ {detailData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500 block">Usuários Ativos Hoje</span>
            <span className="text-xl font-bold text-emerald-400 tabular-nums">{detailData.activeAttributed}</span>
          </div>
        </div>

        {/* Timeline Chart (Section 21) */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Desempenho ao Longo do Tempo (Últimos 7 dias)
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Cliques
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-2.5 h-2.5 bg-zinc-400 rounded-sm inline-block" /> Cadastros
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-4 h-40 items-end">
            {detailData.timeline.map((item: any, idx: number) => {
              const maxVal = Math.max(...detailData.timeline.map((t: any) => Math.max(t.clicks, t.signups)), 10);
              const clickHeight = Math.max(8, (item.clicks / maxVal) * 100);
              const signupHeight = Math.max(4, (item.signups / maxVal) * 100);

              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-28">
                    <div
                      style={{ height: `${clickHeight}%` }}
                      className="w-1/2 max-w-[20px] bg-emerald-500 rounded-t-sm transition-all"
                      title={`${item.clicks} cliques`}
                    />
                    <div
                      style={{ height: `${signupHeight}%` }}
                      className="w-1/2 max-w-[20px] bg-zinc-600 rounded-t-sm transition-all"
                      title={`${item.signups} cadastros`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Section 20: Influencers Table
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Influenciadores & Afiliados
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Rastreamento de campanhas, links exclusivos, cliques e conversões
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Influencer</span>
        </button>
      </div>

      {/* Table (Section 20) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Influencer</th>
                <th className="py-3.5 px-3 font-semibold">Código</th>
                <th
                  onClick={() => handleSort('clicks')}
                  className="py-3.5 px-3 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Cliques</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('signups')}
                  className="py-3.5 px-3 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Cadastros</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('purchases')}
                  className="py-3.5 px-3 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Compras</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('conversion')}
                  className="py-3.5 px-3 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Conversão</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Receita</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums text-zinc-300">
              {sortedInfluencers.map((inf) => (
                <tr
                  key={inf.id}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans font-medium text-white">
                    <button
                      onClick={() => handleSelectInfluencer(inf.id)}
                      className="text-left hover:text-emerald-400 transition-colors flex flex-col"
                    >
                      <span className="font-bold">@{inf.username}</span>
                      <span className="text-[11px] text-zinc-400 font-normal">{inf.name}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-zinc-400">
                    {inf.code}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-white">
                    {inf.clicks || 0}
                  </td>
                  <td className="py-3.5 px-3 text-zinc-200">
                    {inf.signups || 0}
                  </td>
                  <td className="py-3.5 px-3 text-zinc-200">
                    {inf.purchases || 0}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-emerald-400">
                    {inf.conversion || 0}%
                  </td>
                  <td className="py-3.5 px-4 text-white">
                    R$ {(inf.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 font-sans text-right">
                    <button
                      onClick={() => handleSelectInfluencer(inf.id)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Cadastrar Novo Influenciador
            </h3>
            <p className="text-xs text-zinc-400">
              Crie o usuário, link e código promocional exclusivo para o parceiro.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Matheus Treinador"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Username (@)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="Ex: matheusfit"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Código Exclusivo
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Ex: MATHEUS10"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
                >
                  Criar Influencer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
