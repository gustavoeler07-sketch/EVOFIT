import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ContactMessage } from '../../types';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export const AdminContacts: React.FC = () => {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    try {
      const res = await api.admin.getContacts();
      setContacts(res.contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.admin.updateContactStatus(id, newStatus);
      fetchContacts();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
          Mensagens de Suporte
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Dúvidas, sugestões e solicitações enviadas pelos usuários do EVOFIT
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
          <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Nenhum chamado de contato aberto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{c.subject}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        c.status === 'Novo'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : c.status === 'Em atendimento'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    De: <strong className="text-zinc-200">{c.name}</strong> ({c.email}) · em {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] text-zinc-500">Mudar status:</span>
                  <select
                    value={c.status}
                    onChange={(e) => handleUpdateStatus(c.id, e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Em atendimento">Em atendimento</option>
                    <option value="Resolvido">Resolvido</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {c.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
