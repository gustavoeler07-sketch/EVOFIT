import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WorkoutSession } from '../types';
import { Calendar, Clock, ChevronRight, Dumbbell, X, Trophy } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.sessions.getHistory();
        setSessions(res.sessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
          Histórico de Treinos
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Registro completo de todas as sessões e cargas executadas
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center space-y-2">
          <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">Nenhum treino no histórico</h3>
          <p className="text-xs text-zinc-400">
            Conclua seu primeiro treino no Dashboard para começar seu histórico!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const dateObj = new Date(sess.finished_at || sess.started_at);
            const dateStr = dateObj.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Group sets by exercise
            const exerciseCount = new Set(sess.sets?.map((s) => s.exercise_id)).size;

            return (
              <div
                key={sess.id}
                onClick={() => setSelectedSession(sess)}
                className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-zinc-700 transition-all select-none shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {sess.workout_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {dateStr} às {timeStr}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {sess.duration} min
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{exerciseCount} exercícios</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-zinc-400">
                  <span className="text-xs font-medium text-emerald-400 hidden sm:inline">
                    Detalhes
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Detalhes do Treino
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedSession.workout_name}
                </h3>
                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                  <span>
                    {new Date(selectedSession.finished_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedSession.duration} min de treino</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Exercises & Sets performed */}
            <div className="space-y-4 pt-2">
              {(() => {
                // Group sets by exercise
                const grouped: Record<string, { name: string; muscle: string; sets: any[] }> = {};
                (selectedSession.sets || []).forEach((set) => {
                  if (!grouped[set.exercise_id]) {
                    grouped[set.exercise_id] = {
                      name: set.exercise_name || 'Exercício',
                      muscle: set.muscle_group || 'Geral',
                      sets: [],
                    };
                  }
                  grouped[set.exercise_id].sets.push(set);
                });

                return Object.entries(grouped).map(([exId, group]) => (
                  <div key={exId} className="bg-zinc-950 rounded-xl p-3.5 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {group.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase">
                        {group.muscle}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {group.sets.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/80 text-center font-mono tabular-nums text-xs"
                        >
                          <div className="text-[10px] text-zinc-500 font-sans">
                            Série {s.set_number}
                          </div>
                          <div className="font-bold text-emerald-400 mt-0.5">
                            {s.weight} kg
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {s.repetitions} reps
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <button
              onClick={() => setSelectedSession(null)}
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
