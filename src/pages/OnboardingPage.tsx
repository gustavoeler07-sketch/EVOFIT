import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { Target, Dumbbell, ArrowRight } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState<'Emagrecer' | 'Ganhar massa muscular' | 'Ganhar força' | 'Melhorar condicionamento' | 'Manter o peso'>('Ganhar massa muscular');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '75');
  const [targetWeight, setTargetWeight] = useState(user?.target_weight ? String(user.target_weight) : '');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '175');
  const [trainingDays, setTrainingDays] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (name.trim() && name !== user?.name) {
        await api.profile.update({ name: name.trim() });
      }

      await api.profile.saveOnboarding({
        goal,
        weight: parseFloat(weight) || 70,
        height: parseFloat(height) || 170,
        training_days: trainingDays,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
      });

      await refreshProfile();
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configuração.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-['Cabinet_Grotesk']">
            Configuração Inicial
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Apenas algumas perguntas rápidas para calibrar sua evolução no EVOFIT.
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Nome */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                1. Como gostaria de ser chamado?
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* 2. Objetivo */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                2. Qual o seu objetivo principal?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    { id: 'Emagrecer', label: '🔥 Emagrecer' },
                    { id: 'Ganhar massa muscular', label: '💪 Ganhar massa muscular' },
                    { id: 'Ganhar força', label: '🏋️ Ganhar força' },
                    { id: 'Melhorar condicionamento', label: '⚡ Melhorar condicionamento' },
                    { id: 'Manter o peso', label: '⚖️ Manter o peso' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoal(item.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                      goal === item.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    {goal === item.id && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 & 4. Peso e Altura */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  3. Peso atual (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-zinc-500 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  4. Altura (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    max="250"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-zinc-500 pointer-events-none">
                    cm
                  </span>
                </div>
              </div>
            </div>

            {/* Meta de peso opcional (especialmente para Emagrecer) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                5. Meta de peso desejada (kg) <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  placeholder="Ex: 80.0"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-zinc-500 pointer-events-none">
                  kg
                </span>
              </div>
            </div>

            {/* 5. Dias por semana */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                5. Quantos dias por semana pretende treinar?
              </label>
              <div className="flex gap-2 justify-between">
                {[2, 3, 4, 5, 6].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTrainingDays(days)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      trainingDays === days
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Concluir e Ir para o Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
