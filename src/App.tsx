import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContactPage } from './pages/ContactPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Workout } from './types';
import { Dumbbell } from 'lucide-react';

function AppContent() {
  const { user, loading, refreshProfile } = useAuth();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'workouts' | 'progress' | 'profile' | 'history' | 'contact'>('dashboard');
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [isAdminView, setIsAdminView] = useState<boolean>(false);

  // 1. Splash / Loading Screen (Section 32 Screen 1)
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
          <Dumbbell className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white font-['Cabinet_Grotesk']">
          EVOFIT
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Carregando seu treino e evolução...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Login, Cadastro & Recuperação (Screens 2, 3, 4)
  if (!user) {
    return <AuthPage onSuccess={refreshProfile} />;
  }

  // 3. First time User: Onboarding (Screen 5)
  if (user.role === 'USER' && user.onboarding_completed === 0) {
    return <OnboardingPage onComplete={refreshProfile} />;
  }

  // 4. Admin Mode (Screens 12 - 19)
  // If user has role ADMIN, they default to admin view or can toggle between them
  if (user.role === 'ADMIN' && (isAdminView || currentTab === 'dashboard' && !window.location.search.includes('mode=app'))) {
    return <AdminLayout onBackToApp={() => setIsAdminView(false)} />;
  }

  // 5. Active Workout Execution Flow (Screen 8)
  if (activeWorkout) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
        <ActiveWorkoutPage
          workout={activeWorkout}
          onFinish={() => {
            setActiveWorkout(null);
            setCurrentTab('dashboard');
          }}
          onCancel={() => setActiveWorkout(null)}
        />
      </div>
    );
  }

  // 6. Regular Athlete Views with Header & BottomNav
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans']">
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as any)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onStartWorkout={(workout) => setActiveWorkout(workout)}
            onNavigate={(tab) => setCurrentTab(tab as any)}
          />
        )}

        {currentTab === 'workouts' && (
          <WorkoutsPage
            onStartWorkout={(workout) => setActiveWorkout(workout)}
          />
        )}

        {currentTab === 'progress' && <ProgressPage />}

        {currentTab === 'history' && <HistoryPage />}

        {currentTab === 'profile' && (
          <ProfilePage
            onOpenContact={() => setCurrentTab('contact')}
            onNavigateToAdmin={() => setIsAdminView(true)}
          />
        )}

        {currentTab === 'contact' && (
          <ContactPage onBack={() => setCurrentTab('profile')} />
        )}
      </main>

      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab as any)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
