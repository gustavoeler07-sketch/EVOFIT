import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Dumbbell, ArrowRight, Shield, CheckCircle2, Tag } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onSuccess }) => {
  const { login, register, detectedInfluencer } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [influencerCode, setInfluencerCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
        onSuccess?.();
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        await register({
          name,
          email,
          password,
          confirmPassword,
          influencerCode: influencerCode.trim() || undefined,
        });
        onSuccess?.();
      } else if (mode === 'forgot') {
        setInfoMessage('Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.');
        setTimeout(() => setMode('login'), 3500);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to fill demo accounts
  const handleQuickLogin = async (type: 'demo' | 'admin') => {
    setError(null);
    setLoading(true);
    try {
      if (type === 'admin') {
        await login({ email: 'admin@evofit.app', password: 'admin123' });
      } else {
        await login({ email: 'usuario@evofit.app', password: 'user123' });
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-zinc-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
          <Dumbbell className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-['Cabinet_Grotesk']">
          EVOFIT
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Seu treino. Sua evolução.
        </p>

        {detectedInfluencer && (
          <div className="mt-4 p-3 bg-zinc-900 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-xs text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Convite especial de <strong className="text-white">@{detectedInfluencer.username}</strong> ({detectedInfluencer.name})
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900/90 border border-zinc-800/80 py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          
          {/* Tabs for Login / Cadastro */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-zinc-800 mb-6 pb-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 pb-2 text-sm font-semibold text-center transition-colors border-b-2 -mb-2.5 ${
                  mode === 'login' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 pb-2 text-sm font-semibold text-center transition-colors border-b-2 -mb-2.5 ${
                  mode === 'register' ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Cadastrar
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs leading-relaxed">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-zinc-300">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
                    <span>Código de Influenciador (opcional)</span>
                    <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  </label>
                  <input
                    type="text"
                    value={influencerCode}
                    onChange={(e) => setInfluencerCode(e.target.value.toUpperCase())}
                    placeholder="Ex: JOAO10"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-11 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-all disabled:opacity-50 select-none shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>Entrar no EVOFIT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>Criar Minha Conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>Enviar Instruções</span>
              )}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ← Voltar para o login
              </button>
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-6 border-t border-zinc-800/80">
            <p className="text-xs text-zinc-400 text-center mb-3">
              Acesso rápido para demonstração e testes:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('demo')}
                className="py-2 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entrar Aluno</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-2 px-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Entrar Admin</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
