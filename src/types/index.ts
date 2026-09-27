export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  weight: number;
  height: number;
  goal: string;
  training_days: number;
  target_weight?: number;
  onboarding_completed: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  exercise_type?: string;
  difficulty?: 'Iniciante' | 'Intermediário' | 'Avançado';
  description?: string;
  instructions?: string;
  default_sets?: number;
  default_min_reps?: number;
  default_max_reps?: number;
  default_rest_seconds?: number;
  is_active?: number;
  created_at?: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  difficulty?: string;
  instructions?: string;
  sets: number;
  min_reps: number;
  max_reps: number;
  rest_seconds: number;
  default_weight: number;
  order_index: number;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  exercises: WorkoutExercise[];
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name?: string;
  muscle_group?: string;
  set_number: number;
  weight: number;
  repetitions: number;
  completed: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  started_at: string;
  finished_at: string;
  duration: number;
  sets?: SetLog[];
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  date?: string;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  waist?: number | null;
  arm?: number | null;
  chest?: number | null;
  hip?: number | null;
  thigh?: number | null;
  date: string;
  created_at: string;
}

export interface CardioSession {
  id: string;
  user_id: string;
  type: string;
  duration: number;
  distance?: number | null;
  intensity: 'Leve' | 'Moderada' | 'Alta' | 'Intensa' | string;
  equipment?: string | null;
  date: string;
  created_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: string;
  target_weight?: number | null;
  created_at: string;
}

export interface UserGoalProgress {
  id: string;
  user_id: string;
  goal_type: string;
  target: number;
  current_value: number;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  trained_today: number;
  date: string;
  created_at: string;
}

export interface Influencer {
  id: string;
  name: string;
  username: string;
  code: string;
  active: number;
  created_at: string;
  clicks?: number;
  signups?: number;
  purchases?: number;
  revenue?: number;
  conversion?: number;
}

export interface ContactMessage {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'Novo' | 'Em atendimento' | 'Resolvido';
  created_at: string;
}

export interface AdminMetrics {
  totalUsers: number;
  onlineUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  clicks: number;
  signups: number;
  purchasesCount: number;
  totalRevenue: number;
  conversionRate: number;
}

export interface ProgressionSuggestion {
  exerciseName: string;
  suggestion: string;
  canProgress: boolean;
}

export interface WorkoutGeneratorInput {
  goal: 'Emagrecer' | 'Ganhar massa muscular' | 'Condicionamento' | 'Força';
  days: 2 | 3 | 4 | 5 | 6;
  focus: 'Peito' | 'Costas' | 'Ombros' | 'Braços' | 'Pernas' | 'Glúteos' | 'Corpo inteiro' | 'Equilibrado';
  time: '30 min' | '45 min' | '60 min' | '90 min+';
  location: 'Academia completa' | 'Academia básica' | 'Casa';
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  avoided_region?: string;
  seedVariation?: number;
}

export interface GeneratedRoutine {
  name: string;
  focusDescription: string;
  exercises: Array<{
    exercise_id: string;
    name: string;
    muscle_group: string;
    secondary_muscles: string;
    equipment: string;
    difficulty: string;
    instructions: string;
    sets: number;
    min_reps: number;
    max_reps: number;
    rest_seconds: number;
    default_weight: number;
  }>;
}

export interface GeneratedPlanResult {
  title: string;
  summary: string;
  estimatedDuration: number;
  daysCount: number;
  focus: string;
  goal: string;
  routines: GeneratedRoutine[];
}

