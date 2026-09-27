import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { User, LogOut, Shield, MessageSquare, Check, Edit2, Scale, Ruler, Target, Calendar } from 'lucide-react';

interface ProfilePageProps {
  onOpenContact: () => void;
  onNavigateToAdmin?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenContact, onNavigateToAdmin }) => {
  const { user, logout, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState(user?.goal || 'Ganhar massa muscular');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '70');
  const [targetWeight, setTargetWeight] = useState(user?.target_weight ? String(user.target_weight) : '');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '170');
  const [trainingDays, setTrainingDays] = useState(user?.training_days || 4);

  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.profile.update({
        name: name.trim(),
        goal,
        weight: parseFloat(weight) || 70,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
        height: parseFloat(height) || 170,
        training_days: trainingDays,
      });
      await refreshProfile();
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
          Meu Perfil
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Suas informações cadastrais e preferências de treino
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Informações atualizadas com sucesso!</span>
        </div>
      )}

      {/* User Info Card */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {user?.name}
              </h2>
              <p className="text-xs text-zinc-400">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Peso Atual (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Meta de Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 80.0"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                required
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Objetivo Principal
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Emagrecer">🔥 Emagrecer</option>
                <option value="Ganhar massa muscular">💪 Ganhar massa muscular</option>
                <option value="Ganhar força">🏋️ Ganhar força</option>
                <option value="Melhorar condicionamento">⚡ Melhorar condicionamento</option>
                <option value="Manter o peso">⚖️ Manter o peso</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Dias de Treino por Semana
              </label>
              <select
                value={trainingDays}
                onChange={(e) => setTrainingDays(parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {[2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {d} dias por semana
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1">
                <Target className="w-3.5 h-3.5 text-zinc-400" />
                Objetivo
              </span>
              <span className="font-bold text-white text-xs sm:text-sm">
                {user?.goal || 'Ganhar massa muscular'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1">
                <Scale className="w-3.5 h-3.5 text-zinc-400" />
                Peso Atual
              </span>
              <span className="font-bold text-white text-sm tabular-nums">
                {user?.weight ? `${user.weight} kg` : '--'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Meta de Peso
              </span>
              <span className="font-bold text-emerald-400 text-sm tabular-nums">
                {user?.target_weight ? `${user.target_weight} kg` : 'Não definida'}
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Frequência
              </span>
              <span className="font-bold text-white text-sm">
                {user?.training_days || 4} dias / sem
              </span>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1">
                <Ruler className="w-3.5 h-3.5 text-zinc-400" />
                Altura
              </span>
              <span className="font-bold text-white text-sm tabular-nums">
                {user?.height ? `${user.height} cm` : '--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Panel Direct Shortcut if User is Admin */}
      {user?.role === 'ADMIN' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white">Privilégios de Administrador</div>
              <div className="text-[11px] text-zinc-400">Acesse métricas, vendas e influenciadores</div>
            </div>
          </div>
          <button
            onClick={onNavigateToAdmin}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
          >
            Abrir Painel
          </button>
        </div>
      )}

      {/* Support & Contact (Section 24) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Fale Conosco / Suporte</div>
            <div className="text-[11px] text-zinc-400">Dúvidas, sugestões ou suporte técnico</div>
          </div>
        </div>
        <button
          onClick={onOpenContact}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5"
        >
          Enviar mensagem →
        </button>
      </div>

      {/* Logout Button */}
      <button
        onClick={logout}
        className="w-full h-12 rounded-2xl bg-zinc-900 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4" />
        <span>Sair da Conta (Logout)</span>
      </button>
    </div>
  );
};
