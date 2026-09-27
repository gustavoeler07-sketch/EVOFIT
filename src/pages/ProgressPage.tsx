import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WeightLog, WorkoutSession } from '../types';
import { Scale, TrendingUp, Flame, Plus, Trophy, ChevronRight, Dumbbell } from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [stats, setStats] = useState<{
    totalWorkouts: number;
    streak: number;
    maxStreak: number;
    lastSession: WorkoutSession | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // New weight entry modal
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingWeight, setSavingWeight] = useState(false);

  // Exercise progression
  const [exercises, setExercises] = useState<Array<{ id: string; name: string; muscle_group: string }>>([]);
  const [selectedExId, setSelectedExId] = useState<string>('');
  const [exerciseHistory, setExerciseHistory] = useState<Array<{ date: string; max_weight: number; avg_reps: number }>>([]);
  const [loadingExHistory, setLoadingExHistory] = useState(false);

  const loadData = async () => {
    try {
      const [weightsRes, statsRes, exRes] = await Promise.all([
        api.profile.getWeights(),
        api.sessions.getStats(),
        api.workouts.getExercises(),
      ]);
      setWeights(weightsRes.weights);
      setStats(statsRes);
      setExercises(exRes.exercises);

      if (exRes.exercises.length > 0) {
        const defaultEx = exRes.exercises[0].id;
        setSelectedExId(defaultEx);
        loadExerciseProgression(defaultEx);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadExerciseProgression = async (exerciseId: string) => {
    setLoadingExHistory(true);
    try {
      const res = await api.sessions.getExerciseProgress(exerciseId);
      setExerciseHistory(res.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExerciseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedExId(id);
    loadExerciseProgression(id);
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    setSavingWeight(true);
    try {
      const res = await api.profile.addWeight(parseFloat(newWeight), weightDate);
      setWeights(res.weights);
      setShowAddWeight(false);
      setNewWeight('');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar peso');
    } finally {
      setSavingWeight(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
  const initialWeight = weights.length > 0 ? weights[0].weight : null;
  const weightDiff = latestWeight && initialWeight ? (latestWeight - initialWeight).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
          Meu Progresso
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Evolução física, consistência de treinos e progressão de cargas
        </p>
      </div>

      {/* 1. Sequência e Consistência (Section 13) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Sequência Atual</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums flex items-baseline gap-1">
            <span>{stats?.streak || 0}</span>
            <span className="text-xs font-normal text-zinc-400">dias</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats?.streak && stats.streak > 0 ? 'Mantenha o ritmo!' : 'Treine hoje para iniciar!'}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs font-medium">Maior Sequência</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums flex items-baseline gap-1">
            <span>{stats?.maxStreak || 0}</span>
            <span className="text-xs font-normal text-zinc-400">dias</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Seu recorde de consistência
          </p>
        </div>
      </div>

      {/* 2. Peso Corporal e Gráfico de Evolução (Section 11 & 12) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Peso Corporal
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {latestWeight ? `${latestWeight.toFixed(1)} kg` : '--'}
              </span>
              {weights.length >= 2 && (
                <span className={`text-xs font-semibold tabular-nums ${parseFloat(weightDiff) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {parseFloat(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg no período
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAddWeight(true)}
            className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Peso</span>
          </button>
        </div>

        {/* Clean SVG Weight Chart */}
        {weights.length >= 2 ? (
          <div className="pt-2">
            <div className="h-32 w-full relative">
              {(() => {
                const values = weights.map((l) => l.weight);
                const min = Math.min(...values) - 0.5;
                const max = Math.max(...values) + 0.5;
                const range = max - min || 1;
                const width = 500;
                const height = 110;

                const points = weights.map((l, i) => {
                  const x = (i / (weights.length - 1)) * width;
                  const y = height - ((l.weight - min) / range) * (height - 20) - 10;
                  return `${x},${y}`;
                });

                const pathD = `M ${points.join(' L ')}`;
                const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="weightPageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#weightPageGrad)" />
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {weights.map((l, i) => {
                      const x = (i / (weights.length - 1)) * width;
                      const y = height - ((l.weight - min) / range) * (height - 20) - 10;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r={4}
                          className="fill-emerald-400 stroke-zinc-950 stroke-2"
                        />
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            <div className="flex justify-between text-[11px] text-zinc-500 mt-2 font-mono tabular-nums">
              <span>{weights[0].created_at}</span>
              <span>{weights[weights.length - 1].created_at}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-4 text-center">
            Adicione pelo menos 2 registros de peso para visualizar a linha de evolução.
          </p>
        )}

        {/* Recent weights list */}
        {weights.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Últimas Pesagens
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {[...weights].reverse().slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-950/50">
                  <span className="text-zinc-400">{w.created_at}</span>
                  <span className="font-mono font-bold text-white tabular-nums">{w.weight.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Evolução de Cargas por Exercício (Section 11) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 space-y-4">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Progressão de Carga por Exercício
          </span>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe a sobrecarga progressiva ao longo das sessões
          </p>
        </div>

        {/* Exercise Selector */}
        <div>
          <select
            value={selectedExId}
            onChange={handleExerciseChange}
            className="w-full bg-zinc-950 border border-zinc-800 text-xs font-medium text-white rounded-xl p-3 focus:outline-none focus:border-emerald-500"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.muscle_group})
              </option>
            ))}
          </select>
        </div>

        {/* Progression Steps / Chain */}
        {loadingExHistory ? (
          <div className="py-8 text-center">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : exerciseHistory.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {exerciseHistory.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center shrink-0 min-w-[90px]">
                    <div className="text-[10px] text-zinc-500">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-base font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                      {item.max_weight} kg
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      ~{Math.round(item.avg_reps)} reps
                    </div>
                  </div>
                  {idx < exerciseHistory.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 flex items-center justify-between">
              <span>Carga inicial: <strong className="text-white font-mono">{exerciseHistory[0].max_weight} kg</strong></span>
              <span aria-hidden="true" className="text-zinc-700">→</span>
              <span>Carga atual: <strong className="text-emerald-400 font-mono">{exerciseHistory[exerciseHistory.length - 1].max_weight} kg</strong></span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-500">
            Nenhum histórico registrado para este exercício ainda. Complete treinos que incluam este movimento!
          </div>
        )}
      </div>

      {/* Add Weight Modal */}
      {showAddWeight && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Registrar Peso Corporal
            </h3>

            <form onSubmit={handleAddWeight} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Ex: 75.4"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={weightDate}
                  onChange={(e) => setWeightDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWeight(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWeight}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
                >
                  {savingWeight ? 'Salvando...' : 'Salvar Peso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
