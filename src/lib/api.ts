import { UserProfile, Workout, WorkoutSession, WeightLog, Influencer, ContactMessage, AdminMetrics, ProgressionSuggestion, Exercise, BodyMeasurement, CardioSession, UserGoal, UserGoalProgress } from '../types';

const TOKEN_KEY = 'evofit_auth_token';
const INFLUENCER_KEY = 'evofit_influencer_ref';
const SESSION_ID_KEY = 'evofit_client_session_id';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredInfluencerRef(): string | null {
  return localStorage.getItem(INFLUENCER_KEY);
}

export function setStoredInfluencerRef(ref: string) {
  localStorage.setItem(INFLUENCER_KEY, ref);
}

export function getClientSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ocorreu um erro na requisição.');
  }

  return data as T;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; profile: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (userData: {
      name: string;
      email: string;
      password: string;
      confirmPassword?: string;
      influencerCode?: string;
      influencerUsername?: string;
    }) =>
      request<{ token: string; profile: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
      clearToken();
    },

    me: () => request<{ profile: UserProfile }>('/api/auth/me'),

    resetPassword: (email: string) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  profile: {
    saveOnboarding: (data: { goal: string; weight: number; height: number; training_days: number; target_weight?: number }) =>
      request<{ success: boolean; profile: UserProfile }>('/api/profile/onboarding', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (data: Partial<UserProfile>) =>
      request<{ success: boolean; profile: UserProfile }>('/api/profile/update', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getWeights: () => request<{ weights: WeightLog[] }>('/api/profile/weights'),

    addWeight: (weight: number, date?: string) =>
      request<{ success: boolean; weights: WeightLog[] }>('/api/profile/weights', {
        method: 'POST',
        body: JSON.stringify({ weight, date }),
      }),

    setTargetWeight: (target_weight: number) =>
      request<{ success: boolean; profile: UserProfile }>('/api/profile/target-weight', {
        method: 'POST',
        body: JSON.stringify({ target_weight }),
      }),
  },

  measurements: {
    list: () => request<{ measurements: BodyMeasurement[] }>('/api/measurements'),
    add: (data: { waist?: number; arm?: number; chest?: number; hip?: number; thigh?: number; date?: string }) =>
      request<{ success: boolean; measurements: BodyMeasurement[] }>('/api/measurements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  cardio: {
    list: () => request<{ sessions: CardioSession[] }>('/api/cardio'),
    add: (data: { type: string; duration: number; distance?: number; intensity?: string; equipment?: string; date?: string }) =>
      request<{ success: boolean; sessions: CardioSession[] }>('/api/cardio', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  checkin: {
    getToday: () => request<{ checked: boolean; trainedToday: boolean | null }>('/api/checkin/today'),
    check: (trainedToday: boolean) =>
      request<{ success: boolean; trainedToday: boolean }>('/api/checkin', {
        method: 'POST',
        body: JSON.stringify({ trainedToday }),
      }),
  },

  goals: {
    get: () => request<{ goals: UserGoal[]; progress: UserGoalProgress[] }>('/api/goals'),
    logProgress: (data: { goal_type: string; target: number; current_value: number }) =>
      request<{ success: boolean; progress: UserGoalProgress[] }>('/api/goals/progress', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  timeline: {
    getAll: () => request<{ timeline: any[] }>('/api/history/all'),
  },

  workouts: {
    list: () => request<{ workouts: Workout[] }>('/api/workouts'),
    create: (data: { name: string; description?: string; exercises: any[] }) =>
      request<{ success: boolean; id: string }>('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getExercises: (filters?: { group?: string; q?: string; equipment?: string }) => {
      const params = new URLSearchParams();
      if (filters?.group) params.set('group', filters.group);
      if (filters?.q) params.set('q', filters.q);
      if (filters?.equipment) params.set('equipment', filters.equipment);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return request<{ exercises: Exercise[] }>(`/api/exercises${queryStr}`);
    },

    generate: (data: any) =>
      request<{ success: boolean; plan: any }>('/api/workouts/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    saveGenerated: (data: { routines: any[]; replaceExisting?: boolean; goal?: string; days?: number }) =>
      request<{ success: boolean; savedCount: number }>('/api/workouts/save-generated', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  sessions: {
    finish: (data: {
      workout_id: string;
      workout_name: string;
      started_at: string;
      duration: number;
      sets: Array<{
        exercise_id: string;
        set_number: number;
        weight: number;
        repetitions: number;
        completed: boolean;
      }>;
    }) =>
      request<{ success: boolean; sessionId: string; suggestions: ProgressionSuggestion[] }>('/api/sessions/finish', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getHistory: () => request<{ sessions: WorkoutSession[] }>('/api/sessions/history'),

    getStats: () =>
      request<{
        totalWorkouts: number;
        streak: number;
        maxStreak: number;
        lastSession: WorkoutSession | null;
        weightLogs: WeightLog[];
      }>('/api/sessions/stats'),

    getExerciseProgress: (exerciseId: string) =>
      request<{ history: Array<{ date: string; max_weight: number; avg_reps: number }> }>(`/api/progress/exercise/${exerciseId}`),
  },

  influencer: {
    trackClick: (identifier: string) =>
      request<{ success: boolean; influencer: { id: string; name: string; username: string; code: string } }>('/api/influencer/track-click', {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          sessionIdentifier: getClientSessionId(),
        }),
      }),

    check: (codeOrUser: string) =>
      request<{ valid: boolean; influencer?: { id: string; name: string; username: string; code: string } }>(`/api/influencer/check/${encodeURIComponent(codeOrUser)}`),
  },

  contacts: {
    send: (data: { name: string; email: string; subject: string; message: string }) =>
      request<{ success: boolean; message: string }>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  admin: {
    getMetrics: (filter: string = 'all') => request<AdminMetrics>(`/api/admin/metrics?filter=${filter}`),

    getInfluencers: () => request<{ influencers: Influencer[] }>('/api/admin/influencers'),

    getInfluencerDetail: (id: string) =>
      request<{
        influencer: Influencer;
        clicks: number;
        signups: number;
        purchases: number;
        revenue: number;
        conversion: number;
        activeAttributed: number;
        timeline: Array<{ date: string; clicks: number; signups: number }>;
      }>(`/api/admin/influencers/${id}`),

    createInfluencer: (data: { name: string; username: string; code: string }) =>
      request<{ success: boolean; id: string }>('/api/admin/influencers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    toggleInfluencer: (id: string) =>
      request<{ success: boolean; active: number }>(`/api/admin/influencers/${id}/toggle`, {
        method: 'PUT',
      }),

    getUsers: (q?: string) => request<{ users: any[] }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),

    getPurchases: () => request<{ purchases: any[] }>('/api/admin/purchases'),

    getContacts: () => request<{ contacts: ContactMessage[] }>('/api/admin/contacts'),

    updateContactStatus: (id: string, status: string) =>
      request<{ success: boolean }>(`/api/admin/contacts/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
};
