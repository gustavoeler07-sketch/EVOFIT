import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { GeneratedPlanResult, GeneratedRoutine } from '../types';
import { Sparkles, ArrowRight, ArrowLeft, Check, RotateCcw, Edit3, X, Dumbbell, Clock, Flame, Zap, Target, Shield, AlertCircle } from 'lucide-react';

interface WorkoutWizardModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const WorkoutWizardModal: React.FC<WorkoutWizardModalProps> = ({ onClose, onSuccess }) => {
  // Wizard steps: 1 to 7, then 8 is 'result'
  const [step, setStep] = useState<number>(1);

  // User selections
  const [goal, setGoal] = useState<'Emagrecer' | 'Ganhar massa muscular' | 'Condicionamento' | 'Força'>('Ganhar massa muscular');
  const [days, setDays] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [focus, setFocus] = useState<'Peito' | 'Costas' | 'Ombros' | 'Braços' | 'Pernas' | 'Glúteos' | 'Corpo inteiro' | 'Equilibrado'>('Ombros');
  const [time, setTime] = useState<'30 min' | '45 min' | '60 min' | '90 min+'>('60 min');
  const [location, setLocation] = useState<'Academia completa' | 'Academia básica' | 'Casa'>('Academia completa');
  const [level, setLevel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Intermediário');
  const [avoidedRegion, setAvoidedRegion] = useState<string>('Nenhuma');

  // Generator result
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlanResult | null>(null);
  const [seedVariation, setSeedVariation] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRoutines, setEditedRoutines] = useState<GeneratedRoutine[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  const handleGenerate = async (variation: number = 0) => {
    setGenerating(true);
    try {
      const res = await api.workouts.generate({
        goal,
        days,
        focus,
        time,
        location,
        level,
        avoided_region: avoidedRegion,
        seedVariation: variation,
      });

      setGeneratedPlan(res.plan);
      setEditedRoutines(res.plan.routines);
      setStep(8); // Move to result screen
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    const nextVar = seedVariation + 1;
    setSeedVariation(nextVar);
    handleGenerate(nextVar);
  };

  const handleApplyWorkout = async () => {
    if (!generatedPlan) return;
    setSavingPlan(true);
    try {
      await api.workouts.saveGenerated({
        routines: isEditing ? editedRoutines : generatedPlan.routines,
        replaceExisting: true,
        goal: generatedPlan.goal,
        days: generatedPlan.daysCount,
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar treino gerado');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleRemoveExercise = (rIdx: number, exIdx: number) => {
    const updated = [...editedRoutines];
    updated[rIdx].exercises = updated[rIdx].exercises.filter((_, i) => i !== exIdx);
    setEditedRoutines(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-['Cabinet_Grotesk']">
                Montar Meu Treino
              </h2>
              <span className="text-[11px] text-zinc-400">
                {step <= 7 ? `Passo ${step} de 7` : 'Treino Personalizado'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar (during questions) */}
        {step <= 7 && (
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden my-3 shrink-0">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        )}

        {/* Body Steps */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* STEP 1: Objetivo */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  1. Qual é o seu objetivo principal?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Isso calibrará as repetições, descanso e sobrecarga muscular.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'Emagrecer', label: 'Emagrecer', desc: 'Densidade metabólica e alta queima', icon: Flame },
                  { id: 'Ganhar massa muscular', label: 'Ganhar massa muscular', desc: 'Hipertrofia com sobrecarga progressiva', icon: Dumbbell },
                  { id: 'Condicionamento', label: 'Condicionamento', desc: 'Resistência, fôlego e agilidade', icon: Zap },
                  { id: 'Força', label: 'Força', desc: 'Grandes cargas e tensão mecânica máxima', icon: Target },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{item.label}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Frequência Semanal */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  2. Quantos dias por semana você treina?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Estruturaremos a melhor divisão semanal (Upper/Lower, PPL, etc).
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {([2, 3, 4, 5, 6] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`py-5 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      days === d
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500 font-extrabold shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-2xl font-bold font-mono">{d}x</span>
                    <span className="text-[11px] opacity-80 font-normal">por semana</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Foco Principal */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  3. Qual seu foco principal?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Daremos ênfase a essa região sem prejudicar a harmonia do corpo.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  'Peito',
                  'Costas',
                  'Ombros',
                  'Braços',
                  'Pernas',
                  'Glúteos',
                  'Corpo inteiro',
                  'Equilibrado',
                ].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(f as any)}
                    className={`py-3.5 px-3 rounded-2xl border text-center text-xs font-bold transition-all ${
                      focus === f
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Tempo por Treino */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  4. Quanto tempo você tem por treino?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ajustaremos a quantidade de séries e densidade de exercícios.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: '30 min', desc: 'Rápido e intenso (4 exs)' },
                  { id: '45 min', desc: 'Equilíbrio ideal (5 exs)' },
                  { id: '60 min', desc: 'Treino completo (6 exs)' },
                  { id: '90 min+', desc: 'Volume máximo (7-8 exs)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTime(item.id as any)}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      time === item.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-lg font-bold font-mono text-white">{item.id}</span>
                    <span className="text-[10px] text-zinc-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Onde você treina */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  5. Onde você treina?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Selecionaremos apenas exercícios com os equipamentos disponíveis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'Academia completa', desc: 'Máquinas, cabos, barras, hack, leg press' },
                  { id: 'Academia básica', desc: 'Halteres, barras, bancos e polias simples' },
                  { id: 'Casa', desc: 'Peso corporal, halteres, elásticos e solo' },
                ].map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocation(loc.id as any)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      location === loc.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{loc.id}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">{loc.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Nível de Treinamento */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  6. Qual é o seu nível atual?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Garante seleção de movimentos segura e adequada para sua experiência.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'Iniciante', desc: 'Menos de 6 meses de treino consistente' },
                  { id: 'Intermediário', desc: '6 meses a 2 anos, técnica consolidada' },
                  { id: 'Avançado', desc: 'Mais de 2 anos, alta capacidade de trabalho' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLevel(l.id as any)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      level === l.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-white">{l.id}</div>
                    <div className="text-[11px] text-zinc-400 mt-1">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Regiões a Evitar */}
          {step === 7 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-lg font-bold text-white">
                  7. Alguma região que você quer evitar ou não pode treinar?
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Evitaremos sobrecarga em articulações ou áreas sensíveis.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  'Nenhuma',
                  'Ombros',
                  'Joelho / Pernas',
                  'Coluna / Lombar',
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvoidedRegion(opt)}
                    className={`p-3.5 rounded-2xl border text-center text-xs font-bold transition-all ${
                      avoidedRegion === opt
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 8: RESULTADO ("SEU TREINO ESTÁ PRONTO 🎉") */}
          {step === 8 && generatedPlan && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/40 rounded-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SEU TREINO ESTÁ PRONTO 🎉</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk']">
                  {generatedPlan.title}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {generatedPlan.summary}
                </p>
              </div>

              {/* Routines Preview */}
              <div className="space-y-4">
                {editedRoutines.map((routine, rIdx) => (
                  <div key={rIdx} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {routine.name}
                        </h4>
                        <span className="text-[11px] text-zinc-400">
                          {routine.focusDescription}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {routine.exercises.length} exercícios
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-900">
                      {routine.exercises.map((ex, exIdx) => (
                        <div key={ex.exercise_id || exIdx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-200 block truncate">
                              {exIdx + 1}. {ex.name}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {ex.muscle_group} · {ex.equipment}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
                            <span className="text-zinc-300">{ex.sets}×{ex.min_reps}–{ex.max_reps}</span>
                            <span className="text-zinc-500">{ex.rest_seconds}s</span>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExercise(rIdx, exIdx)}
                                className="text-red-400 hover:text-red-300 ml-1 p-1"
                                title="Remover exercício"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Requested Action Buttons */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={handleApplyWorkout}
                    disabled={savingPlan}
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>✓ Usar este treino</span>
                  </button>

                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                    <span>↻ Gerar outro</span>
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEditing ? 'Pronto' : '✏️ Personalizar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation (Next / Prev during wizard) */}
        {step <= 7 && (
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            {step < 7 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
              >
                <span>Avançar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={generating}
                onClick={() => handleGenerate(0)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
              >
                {generating ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>GERAR MEU TREINO</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
