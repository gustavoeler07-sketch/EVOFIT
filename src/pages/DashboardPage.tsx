import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { Workout, WorkoutSession, WeightLog } from '../types';
import { Dumbbell, Play, Flame, Scale, CheckCircle, Clock, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { WorkoutWizardModal } from '../components/WorkoutWizardModal';

interface DashboardPageProps {
  onStartWorkout: (workout: Workout) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onStartWorkout, onNavigate }) => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<{
    totalWorkouts: number;
    streak: number;
    maxStreak: number;
    lastSession: WorkoutSession | null;
    weightLogs: WeightLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [showWizardModal, setShowWizardModal] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [workoutsRes, statsRes] = await Promise.all([
        api.workouts.list(),
        api.sessions.getStats(),
      ]);
      setWorkouts(workoutsRes.workouts);
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine "today's workout" (rotate based on total workouts or select first)
  const todayWorkout = workouts.length > 0
    ? workouts[(stats?.totalWorkouts || 0) % workouts.length]
    : null;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Atleta';
  const weightLogs = stats?.weightLogs || [];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Saudação */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Olá, {firstName} 👋
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pronto para evoluir suas cargas hoje?
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-amber-400">
          <Flame className="w-4 h-4 fill-amber-500/20 text-amber-400" />
          <span>{stats?.streak || 0} dias</span>
        </div>
      </div>

      {/* 2. Treino de Hoje (Hero Card) */}
      {todayWorkout ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/30 p-5 sm:p-6 shadow-xl shadow-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                Treino de Hoje
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {todayWorkout.name}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                <span>{todayWorkout.exercises?.length || 0} exercícios</span>
                <span aria-hidden="true">·</span>
                <span>Descanso e cargas calibradas</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowWizardModal(true)}
                className="h-12 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-zinc-700/50 active:scale-[0.98]"
                title="Montar ou redefinir rotina de treino"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Montar Novo</span>
              </button>

              <button
                onClick={() => onStartWorkout(todayWorkout)}
                className="h-12 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>COMEÇAR TREINO</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center">
          <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Nenhum treino cadastrado.</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowWizardModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 text-xs font-black hover:brightness-110 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>✨ Montar Meu Treino Agora</span>
            </button>
            <button
              onClick={() => onNavigate('workouts')}
              className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Criar manualmente →
            </button>
          </div>
        </div>
      )}

      {/* Banner Montador Inteligente */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white">
                ✨ Montador Inteligente de Treino
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                Sistema de Regras
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Responda 7 perguntas rápidas para gerar sua divisão personalizada de treinos (objetivo, dias, foco, nível e local).
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowWizardModal(true)}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>MONTAR MEU TREINO</span>
        </button>
      </div>

      {/* 3. Cards Pequenos (Métricas Rápidas) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Card 1: Peso Atual */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">Peso atual</span>
            <Scale className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tabular-nums">
            {user?.weight ? `${user.weight.toFixed(1)}` : '--'}
            <span className="text-xs font-normal text-zinc-400 ml-1">kg</span>
          </div>
        </div>

        {/* Card 2: Treinos Realizados */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">Treinos feitos</span>
            <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tabular-nums">
            {stats?.totalWorkouts || 0}
          </div>
        </div>

        {/* Card 3: Sequência Atual */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">Sequência</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white tabular-nums">
            {stats?.streak || 0}
            <span className="text-xs font-normal text-zinc-400 ml-1">dias</span>
          </div>
        </div>
      </div>

      {/* 4. Evolução (Mini Visualização de Peso / Tendência) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Evolução do Peso</h3>
            <p className="text-[11px] text-zinc-400">Histórico das últimas pesagens</p>
          </div>
          <button
            onClick={() => onNavigate('progress')}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Ver detalhes</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {weightLogs.length >= 2 ? (
          <div className="mt-2">
            {/* SVG Sparkline */}
            <div className="h-24 w-full relative">
              {(() => {
                const values = weightLogs.map((l) => l.weight);
                const min = Math.min(...values) - 0.5;
                const max = Math.max(...values) + 0.5;
                const range = max - min || 1;
                const width = 400;
                const height = 80;

                const points = weightLogs.map((l, i) => {
                  const x = (i / (weightLogs.length - 1)) * width;
                  const y = height - ((l.weight - min) / range) * (height - 16) - 8;
                  return `${x},${y}`;
                });

                const pathD = `M ${points.join(' L ')}`;
                const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

                return (
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#weightGrad)" />
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {weightLogs.map((l, i) => {
                      const x = (i / (weightLogs.length - 1)) * width;
                      const y = height - ((l.weight - min) / range) * (height - 16) - 8;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r={i === weightLogs.length - 1 ? 4 : 2.5}
                          className="fill-emerald-400 stroke-zinc-950 stroke-2"
                        />
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono tabular-nums">
              <span>{weightLogs[0]?.created_at?.slice(5)}</span>
              <span>{weightLogs[weightLogs.length - 1]?.created_at?.slice(5)} ({weightLogs[weightLogs.length - 1]?.weight} kg)</span>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-400">
            <span>Cadastre seu peso regularmente para ver o gráfico de evolução.</span>
            <button
              onClick={() => onNavigate('progress')}
              className="block mx-auto mt-2 text-emerald-400 font-semibold hover:underline"
            >
              + Registrar Peso Agora
            </button>
          </div>
        )}
      </div>

      {/* 5. Último Treino Realizado */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Último Treino</h3>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            Ver histórico
          </button>
        </div>

        {stats?.lastSession ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {stats.lastSession.workout_name}
              </span>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{stats.lastSession.duration} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(stats.lastSession.finished_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-3 text-center">
            Nenhum treino realizado ainda. Dê o primeiro passo hoje!
          </p>
        )}
      </div>

      {/* Montar Meu Treino Wizard Modal */}
      {showWizardModal && (
        <WorkoutWizardModal
          onClose={() => setShowWizardModal(false)}
          onSuccess={() => {
            setShowWizardModal(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};
