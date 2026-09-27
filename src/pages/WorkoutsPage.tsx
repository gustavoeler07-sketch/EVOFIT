import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Workout, Exercise } from '../types';
import { Dumbbell, Play, Plus, ChevronDown, ChevronUp, Clock, BookOpen, Search, Info, X, Check, Sparkles } from 'lucide-react';
import { WorkoutWizardModal } from '../components/WorkoutWizardModal';

interface WorkoutsPageProps {
  onStartWorkout: (workout: Workout) => void;
}

export const WorkoutsPage: React.FC<WorkoutsPageProps> = ({ onStartWorkout }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // Exercise details popup
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);

  // Exercise Library Modal
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryFilterGroup, setLibraryFilterGroup] = useState<string>('Todos');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // New workout modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutDesc, setNewWorkoutDesc] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Array<{
    exercise_id: string;
    sets: number;
    min_reps: number;
    max_reps: number;
    rest_seconds: number;
    default_weight: number;
  }>>([]);

  const muscleGroups = [
    'Todos',
    'Peito',
    'Tríceps',
    'Costas',
    'Bíceps',
    'Quadríceps',
    'Glúteos',
    'Posterior de coxa',
    'Panturrilha',
    'Ombros',
    'Trapézio',
    'Abdômen',
    'Antebraço',
    'Cardio / condicionamento'
  ];

  const loadWorkouts = async () => {
    try {
      const res = await api.workouts.list();
      setWorkouts(res.workouts);
      if (res.workouts.length > 0 && !expandedWorkoutId) {
        setExpandedWorkoutId(res.workouts[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllExercises = async () => {
    if (allExercises.length > 0) return;
    setLoadingLibrary(true);
    try {
      const res = await api.workouts.getExercises();
      setAllExercises(res.exercises);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const openCreateModal = async () => {
    await loadAllExercises();
    if (allExercises.length > 0) {
      const first = allExercises[0];
      setSelectedExercises([
        {
          exercise_id: first.id,
          sets: first.default_sets || 4,
          min_reps: first.default_min_reps || 8,
          max_reps: first.default_max_reps || 12,
          rest_seconds: first.default_rest_seconds || 90,
          default_weight: 20
        },
      ]);
    }
    setShowCreateModal(true);
  };

  const openLibrary = async () => {
    await loadAllExercises();
    setShowLibraryModal(true);
  };

  const handleAddExerciseRow = () => {
    if (allExercises.length > 0) {
      const defaultEx = allExercises[0];
      setSelectedExercises([
        ...selectedExercises,
        {
          exercise_id: defaultEx.id,
          sets: defaultEx.default_sets || 3,
          min_reps: defaultEx.default_min_reps || 10,
          max_reps: defaultEx.default_max_reps || 12,
          rest_seconds: defaultEx.default_rest_seconds || 60,
          default_weight: 15
        },
      ]);
    }
  };

  const handleExerciseSelectionChange = (idx: number, newExId: string) => {
    const exObj = allExercises.find((e) => e.id === newExId);
    const updated = [...selectedExercises];
    updated[idx] = {
      ...updated[idx],
      exercise_id: newExId,
      sets: exObj?.default_sets || updated[idx].sets,
      min_reps: exObj?.default_min_reps || updated[idx].min_reps,
      max_reps: exObj?.default_max_reps || updated[idx].max_reps,
      rest_seconds: exObj?.default_rest_seconds || updated[idx].rest_seconds,
    };
    setSelectedExercises(updated);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;

    try {
      await api.workouts.create({
        name: newWorkoutName.trim(),
        description: newWorkoutDesc.trim(),
        exercises: selectedExercises,
      });
      setShowCreateModal(false);
      setNewWorkoutName('');
      setNewWorkoutDesc('');
      loadWorkouts();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar treino');
    }
  };

  const filteredLibraryExercises = allExercises.filter((ex) => {
    const matchesGroup = libraryFilterGroup === 'Todos' || ex.muscle_group.toLowerCase() === libraryFilterGroup.toLowerCase();
    const matchesSearch = !librarySearch.trim() || 
      ex.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (ex.secondary_muscles && ex.secondary_muscles.toLowerCase().includes(librarySearch.toLowerCase())) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(librarySearch.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Meus Treinos
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Rotinas estruturadas com catálogo completo de exercícios e sobrecarga progressiva
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowWizardModal(true)}
            className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:brightness-110 text-zinc-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/25 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 fill-zinc-950 stroke-zinc-950" />
            <span>✨ Montar Meu Treino</span>
          </button>

          <button
            onClick={openLibrary}
            className="h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Biblioteca (225)</span>
          </button>

          <button
            onClick={openCreateModal}
            className="h-10 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Manual</span>
          </button>
        </div>
      </div>

      {/* Workouts List */}
      <div className="space-y-4">
        {workouts.map((workout) => {
          const isExpanded = expandedWorkoutId === workout.id;
          return (
            <div
              key={workout.id}
              className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden transition-all shadow-sm"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                <div
                  className="flex-1 cursor-pointer select-none"
                  onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {workout.name}
                    </h2>
                  </div>
                  {workout.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                      {workout.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    <span>{workout.exercises?.length || 0} exercícios</span>
                    <span aria-hidden="true">·</span>
                    <span>Descanso & Cargas calibradas</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onStartWorkout(workout)}
                    className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>INICIAR</span>
                  </button>

                  <button
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                    className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    aria-label="Expandir detalhes"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Exercises Detail */}
              {isExpanded && (
                <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                    Exercícios desta rotina:
                  </h3>
                  <div className="divide-y divide-zinc-900">
                    {workout.exercises?.map((ex, idx) => (
                      <div key={ex.id || idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-semibold text-zinc-100 flex items-center gap-2">
                            <span>{idx + 1}. {ex.exercise_name}</span>
                            {ex.equipment && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-normal">
                                {ex.equipment}
                              </span>
                            )}
                            {ex.instructions && (
                              <button
                                onClick={() => setInspectExercise({
                                  id: ex.exercise_id,
                                  name: ex.exercise_name,
                                  muscle_group: ex.muscle_group,
                                  secondary_muscles: ex.secondary_muscles,
                                  equipment: ex.equipment,
                                  difficulty: ex.difficulty as any,
                                  instructions: ex.instructions,
                                })}
                                className="text-zinc-500 hover:text-emerald-400 transition-colors p-0.5"
                                title="Ver instruções de execução"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="text-emerald-400 font-medium">{ex.muscle_group}</span>
                            {ex.secondary_muscles && (
                              <>
                                <span aria-hidden="true" className="text-zinc-700">·</span>
                                <span>Secundários: {ex.secondary_muscles}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-zinc-300 font-mono text-[11px] tabular-nums shrink-0 self-start sm:self-auto">
                          <span className="text-zinc-400">{ex.sets} séries</span>
                          <span aria-hidden="true" className="text-zinc-700">·</span>
                          <span>{ex.min_reps}–{ex.max_reps} reps</span>
                          <span aria-hidden="true" className="text-zinc-700">·</span>
                          <span className="text-emerald-400 font-bold">{ex.default_weight} kg</span>
                          <span aria-hidden="true" className="text-zinc-700">·</span>
                          <span className="text-zinc-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {ex.rest_seconds}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exercise Instructions Popup Modal */}
      {inspectExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {inspectExercise.muscle_group} · {inspectExercise.equipment || 'Equipamento'}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {inspectExercise.name}
                </h3>
                {inspectExercise.difficulty && (
                  <span className="text-[10px] font-semibold text-zinc-400 mt-1 block">
                    Nível: <strong className="text-zinc-200">{inspectExercise.difficulty}</strong>
                  </span>
                )}
              </div>
              <button
                onClick={() => setInspectExercise(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectExercise.secondary_muscles && (
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Músculos Secundários</span>
                <span>{inspectExercise.secondary_muscles}</span>
              </div>
            )}

            {inspectExercise.description && (
              <div className="text-xs text-zinc-300 leading-relaxed">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold mb-1">Sobre o Exercício</span>
                <p>{inspectExercise.description}</p>
              </div>
            )}

            {inspectExercise.instructions && (
              <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-emerald-400 block text-[10px] uppercase font-semibold mb-1">Como Executar</span>
                <p>{inspectExercise.instructions}</p>
              </div>
            )}

            <button
              onClick={() => setInspectExercise(null)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Complete Exercise Library Modal (225 Exercises) */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    Biblioteca de Exercícios EVOFIT
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {filteredLibraryExercises.length} exercícios
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Catálogo completo categorizado por grupos musculares, equipamentos e instruções
                </p>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Muscle Filters */}
            <div className="py-3 space-y-2 border-b border-zinc-800/80">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar por exercício, músculo ou equipamento (ex: supino, barra, corda)..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Group pills horizontal scroller */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {muscleGroups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setLibraryFilterGroup(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      libraryFilterGroup === g
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercises List in Library */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 pr-1">
              {filteredLibraryExercises.map((ex) => (
                <div key={ex.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{ex.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {ex.equipment || 'Livre'}
                      </span>
                      {ex.difficulty && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          ex.difficulty === 'Iniciante'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : ex.difficulty === 'Intermediário'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {ex.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                      <strong className="text-emerald-400 font-semibold">{ex.muscle_group}</strong>
                      {ex.secondary_muscles && (
                        <>
                          <span aria-hidden="true" className="text-zinc-700">·</span>
                          <span>Secundários: {ex.secondary_muscles}</span>
                        </>
                      )}
                    </div>
                    {ex.instructions && (
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {ex.instructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-[11px] font-mono tabular-nums text-zinc-400 text-right">
                      <div>{ex.default_sets} séries × {ex.default_min_reps}–{ex.default_max_reps} reps</div>
                      <div className="text-zinc-500">{ex.default_rest_seconds}s descanso</div>
                    </div>
                    <button
                      onClick={() => setInspectExercise(ex)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
                    >
                      Instruções
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800 text-right">
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                Fechar Biblioteca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workout Modal with rich exercise selector */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">
              Criar Novo Treino
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Monte sua rotina escolhendo entre os 225 exercícios do catálogo EVOFIT.
            </p>

            <form onSubmit={handleCreateWorkout} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nome do Treino
                </label>
                <input
                  type="text"
                  required
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  placeholder="Ex: Treino D - Ombros e Abdômen"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={newWorkoutDesc}
                  onChange={(e) => setNewWorkoutDesc(e.target.value)}
                  placeholder="Ex: Foco em deltoides médios e posteriores"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-300">
                    Exercícios Selecionados ({selectedExercises.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExerciseRow}
                    className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Exercício
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedExercises.map((row, idx) => {
                    const exInfo = allExercises.find((e) => e.id === row.exercise_id);
                    return (
                      <div key={idx} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={row.exercise_id}
                            onChange={(e) => handleExerciseSelectionChange(idx, e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                          >
                            {allExercises.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.muscle_group} › {ex.name} ({ex.equipment || 'Livre'})
                              </option>
                            ))}
                          </select>
                          {selectedExercises.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExerciseRow(idx)}
                              className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                            >
                              Remover
                            </button>
                          )}
                        </div>

                        {exInfo && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2 px-1">
                            <span className="text-emerald-400 font-medium">{exInfo.muscle_group}</span>
                            {exInfo.secondary_muscles && (
                              <span>· Sec: {exInfo.secondary_muscles}</span>
                            )}
                            <span className="text-zinc-500">· {exInfo.equipment}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Séries</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={row.sets}
                              onChange={(e) => {
                                const updated = [...selectedExercises];
                                updated[idx].sets = parseInt(e.target.value) || 3;
                                setSelectedExercises(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-1.5 text-center font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Reps Max</label>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={row.max_reps}
                              onChange={(e) => {
                                const updated = [...selectedExercises];
                                updated[idx].max_reps = parseInt(e.target.value) || 12;
                                setSelectedExercises(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-1.5 text-center font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Carga (kg)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={row.default_weight}
                              onChange={(e) => {
                                const updated = [...selectedExercises];
                                updated[idx].default_weight = parseFloat(e.target.value) || 20;
                                setSelectedExercises(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-1.5 text-center font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-400 block mb-0.5">Descanso</label>
                            <input
                              type="number"
                              step="15"
                              value={row.rest_seconds}
                              onChange={(e) => {
                                const updated = [...selectedExercises];
                                updated[idx].rest_seconds = parseInt(e.target.value) || 60;
                                setSelectedExercises(updated);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg p-1.5 text-center font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  Salvar Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Montar Meu Treino Wizard Modal */}
      {showWizardModal && (
        <WorkoutWizardModal
          onClose={() => setShowWizardModal(false)}
          onSuccess={() => {
            setShowWizardModal(false);
            loadWorkouts();
          }}
        />
      )}
    </div>
  );
};
