import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Workout, WorkoutExercise, ProgressionSuggestion } from '../types';
import { api } from '../lib/api';
import { playChime } from '../lib/sound';
import { Check, Clock, Plus, Minus, ArrowLeft, Trophy, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

interface ActiveWorkoutPageProps {
  workout: Workout;
  onFinish: () => void;
  onCancel: () => void;
}

interface ActiveSet {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export const ActiveWorkoutPage: React.FC<ActiveWorkoutPageProps> = ({ workout, onFinish, onCancel }) => {
  const [startTime] = useState<Date>(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Initialize active sets for each exercise
  const [exerciseSets, setExerciseSets] = useState<Record<string, ActiveSet[]>>(() => {
    const initial: Record<string, ActiveSet[]> = {};
    workout.exercises.forEach((ex) => {
      const sets: ActiveSet[] = [];
      for (let s = 1; s <= ex.sets; s++) {
        sets.push({
          exerciseId: ex.exercise_id,
          setNumber: s,
          weight: ex.default_weight || 20,
          reps: ex.max_reps || 12,
          completed: false,
        });
      }
      initial[ex.exercise_id] = sets;
    });
    return initial;
  });

  // Current active exercise tab/index for focused flow
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);

  // Rest Timer State
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState<number>(60);

  // Completion modal / suggestions
  const [finishing, setFinishing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    duration: number;
    suggestions: ProgressionSuggestion[];
  } | null>(null);

  // Elapsed workout timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest countdown timer
  useEffect(() => {
    if (restTimeLeft === null) return;
    if (restTimeLeft <= 0) {
      playChime();
      setRestTimeLeft(null);
      return;
    }
    const timer = setTimeout(() => {
      setRestTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [restTimeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateWeight = (exId: string, setIdx: number, delta: number) => {
    setExerciseSets((prev) => {
      const list = [...prev[exId]];
      const current = list[setIdx];
      const newWeight = Math.max(0, parseFloat((current.weight + delta).toFixed(1)));
      list[setIdx] = { ...current, weight: newWeight };
      return { ...prev, [exId]: list };
    });
  };

  const handleUpdateReps = (exId: string, setIdx: number, delta: number) => {
    setExerciseSets((prev) => {
      const list = [...prev[exId]];
      const current = list[setIdx];
      const newReps = Math.max(1, current.reps + delta);
      list[setIdx] = { ...current, reps: newReps };
      return { ...prev, [exId]: list };
    });
  };

  const handleToggleSet = (exId: string, setIdx: number, restSeconds: number) => {
    setExerciseSets((prev) => {
      const list = [...prev[exId]];
      const isNowCompleted = !list[setIdx].completed;
      list[setIdx] = { ...list[setIdx], completed: isNowCompleted };

      if (isNowCompleted) {
        // Trigger rest countdown
        setRestTotal(restSeconds);
        setRestTimeLeft(restSeconds);
      }
      return { ...prev, [exId]: list };
    });
  };

  const handleFinishWorkout = async () => {
    setFinishing(true);
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    // Flatten all sets
    const allSets: any[] = [];
    Object.values(exerciseSets).forEach((sets) => {
      sets.forEach((s) => {
        allSets.push({
          exercise_id: s.exerciseId,
          set_number: s.setNumber,
          weight: s.weight,
          repetitions: s.reps,
          completed: s.completed,
        });
      });
    });

    try {
      const res = await api.sessions.finish({
        workout_id: workout.id,
        workout_name: workout.name,
        started_at: startTime.toISOString(),
        duration: durationMinutes,
        sets: allSets,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setCompletedSummary({
        duration: durationMinutes,
        suggestions: res.suggestions,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar treino.');
      setFinishing(false);
    }
  };

  const currentExercise = workout.exercises[activeExerciseIdx];
  const currentSets = currentExercise ? exerciseSets[currentExercise.exercise_id] || [] : [];
  const completedSetsCount = Object.values(exerciseSets).flat().filter((s) => s.completed).length;
  const totalSetsCount = Object.values(exerciseSets).flat().length;

  return (
    <div className="pb-24 max-w-2xl mx-auto space-y-4">
      {/* Top Bar for Workout Session */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl">
        <button
          onClick={onCancel}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancelar</span>
        </button>

        <div className="flex items-center gap-2 font-mono text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <button
          onClick={handleFinishWorkout}
          disabled={finishing}
          className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
        >
          {finishing ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Finalizar</span>
            </>
          )}
        </button>
      </div>

      {/* Progress pill & exercise tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>{workout.name}</span>
          <span className="font-mono tabular-nums text-emerald-400 font-semibold">
            {completedSetsCount} / {totalSetsCount} séries
          </span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(completedSetsCount / (totalSetsCount || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Horizontal Exercise Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {workout.exercises.map((ex, idx) => {
          const sets = exerciseSets[ex.exercise_id] || [];
          const allDone = sets.length > 0 && sets.every((s) => s.completed);
          const isSelected = activeExerciseIdx === idx;

          return (
            <button
              key={ex.exercise_id}
              onClick={() => setActiveExerciseIdx(idx)}
              className={`h-11 px-3.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-zinc-800 border-emerald-500/80 text-white shadow-sm'
                  : allDone
                  ? 'bg-zinc-900 border-zinc-800 text-emerald-400/80'
                  : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {allDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{idx + 1}. {ex.exercise_name}</span>
            </button>
          );
        })}
      </div>

      {/* Rest Countdown Timer Bar (floating if active) */}
      {restTimeLeft !== null && (
        <div className="p-3 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-emerald-500/40 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/5 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs tabular-nums">
              {restTimeLeft}s
            </div>
            <div>
              <div className="text-xs font-bold text-white">Tempo de Descanso</div>
              <div className="text-[11px] text-zinc-400">Respire e prepare a próxima série</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRestTimeLeft((prev) => (prev !== null ? prev + 15 : null))}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-300 rounded-lg transition-colors"
            >
              +15s
            </button>
            <button
              onClick={() => setRestTimeLeft(null)}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold rounded-lg transition-colors"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Current Exercise Detail & Sets List */}
      {currentExercise && (
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                {currentExercise.muscle_group}
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {currentExercise.exercise_name}
              </h2>
              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <span>Alvo: {currentExercise.min_reps}–{currentExercise.max_reps} repetições</span>
                <span aria-hidden="true">·</span>
                <span>Descanso: {currentExercise.rest_seconds}s</span>
              </div>
            </div>
          </div>

          {/* Sets Table / Rows */}
          <div className="space-y-2.5">
            {currentSets.map((set, setIdx) => (
              <div
                key={setIdx}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  set.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                }`}
              >
                {/* Set Number */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      set.completed
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    {set.setNumber}
                  </div>
                  <span className="text-xs font-medium text-zinc-400">Série</span>
                </div>

                {/* Weight Adjustment */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateWeight(currentExercise.exercise_id, setIdx, -2)}
                    className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-300 active:scale-95"
                    aria-label="Diminuir carga"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-[54px] text-center">
                    <span className="font-mono text-sm font-bold text-white tabular-nums">
                      {set.weight}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-0.5">kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateWeight(currentExercise.exercise_id, setIdx, 2)}
                    className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-300 active:scale-95"
                    aria-label="Aumentar carga"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reps Adjustment */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateReps(currentExercise.exercise_id, setIdx, -1)}
                    className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-300 active:scale-95"
                    aria-label="Diminuir repetições"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-[46px] text-center">
                    <span className="font-mono text-sm font-bold text-white tabular-nums">
                      {set.reps}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-0.5">reps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateReps(currentExercise.exercise_id, setIdx, 1)}
                    className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-300 active:scale-95"
                    aria-label="Aumentar repetições"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Concluir Série Checkbox Button */}
                <button
                  type="button"
                  onClick={() => handleToggleSet(currentExercise.exercise_id, setIdx, currentExercise.rest_seconds)}
                  className={`min-h-[44px] px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                    set.completed
                      ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
                  }`}
                >
                  <Check className={`w-4 h-4 ${set.completed ? 'stroke-[3]' : 'text-zinc-500'}`} />
                  <span className="hidden sm:inline">{set.completed ? 'Feito' : 'Concluir'}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Navigation between exercises */}
          <div className="pt-2 flex justify-between items-center text-xs">
            <button
              disabled={activeExerciseIdx === 0}
              onClick={() => setActiveExerciseIdx((i) => i - 1)}
              className="py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-zinc-500">
              {activeExerciseIdx + 1} de {workout.exercises.length}
            </span>
            <button
              disabled={activeExerciseIdx === workout.exercises.length - 1}
              onClick={() => setActiveExerciseIdx((i) => i + 1)}
              className="py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
            >
              <span>Próximo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Completion & Rule-Based Progression Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white font-['Cabinet_Grotesk']">
                Treino Finalizado!
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Duração total: <strong className="text-emerald-400 font-mono">{completedSummary.duration} minutos</strong>.
                Mais um passo na sua evolução.
              </p>
            </div>

            {/* Rule-Based Progression System */}
            {completedSummary.suggestions && completedSummary.suggestions.length > 0 && (
              <div className="text-left bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sugestões de Progressão (EVOFIT)</span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {completedSummary.suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                        item.canProgress
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">
                        {item.exerciseName}
                      </div>
                      <p>{item.suggestion}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-1.5 text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
                  <AlertCircle className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                  <span>
                    Aviso: As mensagens são sugestões de acompanhamento baseadas nas repetições registradas e não substituem prescrição profissional.
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onFinish}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
