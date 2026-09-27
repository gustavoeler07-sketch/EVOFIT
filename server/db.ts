import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { COMPLETE_EXERCISE_LIBRARY } from './allExercises.js';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'evofit.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);

// Password hashing utility using node:crypto scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_auth (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      weight REAL,
      height REAL,
      goal TEXT,
      training_days INTEGER DEFAULT 4,
      onboarding_completed INTEGER DEFAULT 0,
      last_active_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment TEXT,
      exercise_type TEXT,
      difficulty TEXT DEFAULT 'Iniciante',
      description TEXT,
      instructions TEXT,
      default_sets INTEGER DEFAULT 3,
      default_min_reps INTEGER DEFAULT 8,
      default_max_reps INTEGER DEFAULT 12,
      default_rest_seconds INTEGER DEFAULT 60,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 3,
      min_reps INTEGER NOT NULL DEFAULT 8,
      max_reps INTEGER NOT NULL DEFAULT 12,
      rest_seconds INTEGER NOT NULL DEFAULT 60,
      default_weight REAL NOT NULL DEFAULT 20,
      order_index INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      workout_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL NOT NULL,
      repetitions INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      weight REAL NOT NULL,
      date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal_type TEXT NOT NULL,
      target_weight REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      waist REAL,
      arm REAL,
      chest REAL,
      hip REAL,
      thigh REAL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cardio_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER NOT NULL,
      distance REAL,
      intensity TEXT NOT NULL DEFAULT 'Moderada',
      equipment TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_goals_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      goal_type TEXT NOT NULL,
      target REAL NOT NULL,
      current_value REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trained_today INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS influencers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS influencer_clicks (
      id TEXT PRIMARY KEY,
      influencer_id TEXT NOT NULL,
      session_identifier TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS influencer_attributions (
      id TEXT PRIMARY KEY,
      influencer_id TEXT NOT NULL,
      user_id TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL DEFAULT 'link',
      created_at TEXT NOT NULL,
      FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      influencer_id TEXT,
      plan_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      transaction_id TEXT NOT NULL,
      is_test INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_auth(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Novo',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  migrateExercisesTable();
  syncAllExercises();
  seedDefaultData();
}

function migrateExercisesTable() {
  const existingCols = db.prepare('PRAGMA table_info(exercises)').all() as Array<{ name: string }>;
  const colNames = new Set(existingCols.map(c => c.name));

  const columnsToAdd = [
    { name: 'secondary_muscles', def: 'TEXT' },
    { name: 'equipment', def: 'TEXT' },
    { name: 'exercise_type', def: 'TEXT' },
    { name: 'difficulty', def: "TEXT DEFAULT 'Iniciante'" },
    { name: 'description', def: 'TEXT' },
    { name: 'instructions', def: 'TEXT' },
    { name: 'default_sets', def: 'INTEGER DEFAULT 3' },
    { name: 'default_min_reps', def: 'INTEGER DEFAULT 8' },
    { name: 'default_max_reps', def: 'INTEGER DEFAULT 12' },
    { name: 'default_rest_seconds', def: 'INTEGER DEFAULT 60' },
    { name: 'is_active', def: 'INTEGER DEFAULT 1' },
    { name: 'primary_muscle', def: 'TEXT' },
    { name: 'home_available', def: 'INTEGER DEFAULT 0' },
    { name: 'gym_available', def: 'INTEGER DEFAULT 1' },
    { name: 'min_level', def: "TEXT DEFAULT 'Iniciante'" },
    { name: 'max_level', def: "TEXT DEFAULT 'Avançado'" },
  ];

  for (const col of columnsToAdd) {
    if (!colNames.has(col.name)) {
      try {
        db.exec(`ALTER TABLE exercises ADD COLUMN ${col.name} ${col.def};`);
      } catch (err) {
        console.error(`Error adding column ${col.name} to exercises:`, err);
      }
    }
  }

  // Ensure weight_logs has date column
  try {
    const wlCols = db.prepare('PRAGMA table_info(weight_logs)').all() as Array<{ name: string }>;
    if (!wlCols.some(c => c.name === 'date')) {
      db.exec('ALTER TABLE weight_logs ADD COLUMN date TEXT;');
    }
  } catch (err) {
    console.error('Error migrating weight_logs:', err);
  }

  // Ensure profiles has target_weight column
  try {
    const profCols = db.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>;
    if (!profCols.some(c => c.name === 'target_weight')) {
      db.exec('ALTER TABLE profiles ADD COLUMN target_weight REAL;');
    }
  } catch (err) {
    console.error('Error migrating profiles:', err);
  }
}

function syncAllExercises() {
  const now = new Date().toISOString();
  const upsertStmt = db.prepare(`
    INSERT INTO exercises (
      id, name, muscle_group, secondary_muscles, equipment, exercise_type,
      difficulty, description, instructions, default_sets, default_min_reps,
      default_max_reps, default_rest_seconds, is_active,
      primary_muscle, home_available, gym_available, min_level, max_level,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      muscle_group = excluded.muscle_group,
      secondary_muscles = excluded.secondary_muscles,
      equipment = excluded.equipment,
      exercise_type = excluded.exercise_type,
      difficulty = excluded.difficulty,
      description = excluded.description,
      instructions = excluded.instructions,
      default_sets = excluded.default_sets,
      default_min_reps = excluded.default_min_reps,
      default_max_reps = excluded.default_max_reps,
      default_rest_seconds = excluded.default_rest_seconds,
      is_active = excluded.is_active,
      primary_muscle = excluded.primary_muscle,
      home_available = excluded.home_available,
      gym_available = excluded.gym_available,
      min_level = excluded.min_level,
      max_level = excluded.max_level
  `);

  for (const ex of COMPLETE_EXERCISE_LIBRARY) {
    const isHome = (
      ex.equipment.includes('Peso Corporal') ||
      ex.equipment.includes('Halter') ||
      ex.equipment.includes('Elástico') ||
      ex.equipment.includes('Colchonete') ||
      ex.equipment.includes('Solo') ||
      ex.equipment.includes('Corda de Pular') ||
      ex.equipment.includes('Ar Livre')
    ) ? 1 : 0;

    upsertStmt.run(
      ex.id,
      ex.name,
      ex.muscle_group,
      ex.secondary_muscles,
      ex.equipment,
      ex.exercise_type,
      ex.difficulty,
      ex.description,
      ex.instructions,
      ex.default_sets,
      ex.default_min_reps,
      ex.default_max_reps,
      ex.default_rest_seconds,
      ex.is_active,
      ex.muscle_group, // primary_muscle
      isHome,          // home_available
      1,               // gym_available
      ex.difficulty === 'Avançado' ? 'Intermediário' : 'Iniciante', // min_level
      'Avançado',      // max_level
      now
    );
  }

  // Map legacy starter workout IDs to ensure demo workouts work seamlessly
  const legacyAliases: Record<string, string> = {
    'ex_supino_reto': 'EX_PEITO_001',
    'ex_supino_inc': 'EX_PEITO_002',
    'ex_crucifixo': 'EX_PEITO_011',
    'ex_triceps_corda': 'EX_TRI_002',
    'ex_triceps_testa': 'EX_TRI_004',
    'ex_puxada_alta': 'EX_COS_007',
    'ex_remada_curvada': 'EX_COS_013',
    'ex_remada_baixa': 'EX_COS_019',
    'ex_rosca_direta': 'EX_BIC_002',
    'ex_rosca_martelo': 'EX_BIC_006',
    'ex_agachamento': 'EX_QUA_001',
    'ex_leg_press': 'EX_QUA_007',
    'ex_extensora': 'EX_QUA_010',
    'ex_flexora': 'EX_POS_006',
    'ex_desenvolvimento': 'EX_OMB_002',
    'ex_elevacao_lateral': 'EX_OMB_006',
  };

  for (const [legacyId, targetId] of Object.entries(legacyAliases)) {
    const target = COMPLETE_EXERCISE_LIBRARY.find(e => e.id === targetId);
    if (target) {
      const isHome = (
        target.equipment.includes('Peso Corporal') ||
        target.equipment.includes('Halter') ||
        target.equipment.includes('Elástico') ||
        target.equipment.includes('Colchonete') ||
        target.equipment.includes('Solo')
      ) ? 1 : 0;

      upsertStmt.run(
        legacyId,
        target.name,
        target.muscle_group,
        target.secondary_muscles,
        target.equipment,
        target.exercise_type,
        target.difficulty,
        target.description,
        target.instructions,
        target.default_sets,
        target.default_min_reps,
        target.default_max_reps,
        target.default_rest_seconds,
        target.is_active,
        target.muscle_group, // primary_muscle
        isHome,              // home_available
        1,                   // gym_available
        target.difficulty === 'Avançado' ? 'Intermediário' : 'Iniciante', // min_level
        'Avançado',          // max_level
        now
      );
    }
  }
}

function seedDefaultData() {
  // Check if admin already exists
  const adminCheck = db.prepare('SELECT id FROM users_auth WHERE email = ?').get('admin@evofit.app');
  if (adminCheck) return;

  const now = new Date().toISOString();

  // 1. Seed Admin
  const adminId = 'usr_admin_001';
  const { hash: adminHash, salt: adminSalt } = hashPassword('admin123');
  db.prepare(`
    INSERT INTO users_auth (id, email, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin@evofit.app', adminHash, adminSalt, now);

  db.prepare(`
    INSERT INTO profiles (id, user_id, name, email, role, weight, height, goal, training_days, onboarding_completed, last_active_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('prof_admin_001', adminId, 'Administrador EVOFIT', 'admin@evofit.app', 'ADMIN', 78.5, 178, 'Condicionamento', 5, 1, now, now, now);

  // 2. Seed Default Exercises
  const standardExercises = [
    { id: 'ex_supino_reto', name: 'Supino Reto com Barra', muscle_group: 'Peito' },
    { id: 'ex_supino_inc', name: 'Supino Inclinado com Halteres', muscle_group: 'Peito' },
    { id: 'ex_crucifixo', name: 'Crucifixo na Polia', muscle_group: 'Peito' },
    { id: 'ex_triceps_corda', name: 'Tríceps Corda', muscle_group: 'Tríceps' },
    { id: 'ex_triceps_testa', name: 'Tríceps Testa', muscle_group: 'Tríceps' },
    { id: 'ex_puxada_alta', name: 'Puxada Alta Aberta', muscle_group: 'Costas' },
    { id: 'ex_remada_curvada', name: 'Remada Curvada', muscle_group: 'Costas' },
    { id: 'ex_remada_baixa', name: 'Remada Baixa Triângulo', muscle_group: 'Costas' },
    { id: 'ex_rosca_direta', name: 'Rosca Direta com Barra W', muscle_group: 'Bíceps' },
    { id: 'ex_rosca_martelo', name: 'Rosca Martelo', muscle_group: 'Bíceps' },
    { id: 'ex_agachamento', name: 'Agachamento Livre', muscle_group: 'Pernas' },
    { id: 'ex_leg_press', name: 'Leg Press 45°', muscle_group: 'Pernas' },
    { id: 'ex_extensora', name: 'Cadeira Extensora', muscle_group: 'Pernas' },
    { id: 'ex_flexora', name: 'Mesa Flexora', muscle_group: 'Pernas' },
    { id: 'ex_desenvolvimento', name: 'Desenvolvimento com Halteres', muscle_group: 'Ombros' },
    { id: 'ex_elevacao_lateral', name: 'Elevação Lateral', muscle_group: 'Ombros' },
  ];

  for (const ex of standardExercises) {
    db.prepare('INSERT OR IGNORE INTO exercises (id, name, muscle_group, created_at) VALUES (?, ?, ?, ?)').run(ex.id, ex.name, ex.muscle_group, now);
  }

  // 3. Seed Influencers
  const influencers = [
    { id: 'inf_joao', name: 'João Silva', username: 'joao', code: 'JOAO10' },
    { id: 'inf_camila', name: 'Camila Santos', username: 'camila', code: 'CAMILA' },
    { id: 'inf_rodrigo', name: 'Rodrigo Personal', username: 'rodrigo', code: 'RODRIGO' },
    { id: 'inf_larissa', name: 'Larissa Strong', username: 'larissa', code: 'LARISSA15' },
    { id: 'inf_felipe', name: 'Felipe Beast', username: 'felipe', code: 'FELIPE' },
  ];

  for (const inf of influencers) {
    db.prepare('INSERT OR IGNORE INTO influencers (id, name, username, code, active, created_at) VALUES (?, ?, ?, ?, 1, ?)').run(inf.id, inf.name, inf.username, inf.code, now);
  }

  // 4. Seed Standard Regular User (usuario@evofit.app)
  const userId = 'usr_demo_002';
  const { hash: userHash, salt: userSalt } = hashPassword('user123');
  db.prepare(`
    INSERT INTO users_auth (id, email, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'usuario@evofit.app', userHash, userSalt, now);

  db.prepare(`
    INSERT INTO profiles (id, user_id, name, email, role, weight, height, goal, training_days, onboarding_completed, last_active_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('prof_demo_002', userId, 'Lucas Ferreira', 'usuario@evofit.app', 'USER', 76.8, 175, 'Hipertrofia', 4, 1, now, now, now);

  // Attribute demo user to João
  db.prepare(`
    INSERT INTO influencer_attributions (id, influencer_id, user_id, source, created_at)
    VALUES (?, ?, ?, 'link', ?)
  `).run('attr_demo_001', 'inf_joao', userId, now);

  // Seed Workouts for Demo User
  const workouts = [
    {
      id: 'wko_a_001',
      name: 'Treino A - Peito + Tríceps',
      description: 'Foco em hipertrofia de peitorais e tríceps',
      exercises: [
        { exId: 'ex_supino_reto', sets: 4, min: 8, max: 12, rest: 90, weight: 60 },
        { exId: 'ex_supino_inc', sets: 3, min: 10, max: 12, rest: 60, weight: 22 },
        { exId: 'ex_crucifixo', sets: 3, min: 10, max: 15, rest: 60, weight: 15 },
        { exId: 'ex_triceps_corda', sets: 4, min: 10, max: 12, rest: 45, weight: 25 },
        { exId: 'ex_triceps_testa', sets: 3, min: 8, max: 12, rest: 60, weight: 18 },
      ]
    },
    {
      id: 'wko_b_001',
      name: 'Treino B - Costas + Bíceps',
      description: 'Puxadas, remadas e braços',
      exercises: [
        { exId: 'ex_puxada_alta', sets: 4, min: 8, max: 12, rest: 90, weight: 55 },
        { exId: 'ex_remada_curvada', sets: 4, min: 8, max: 10, rest: 90, weight: 50 },
        { exId: 'ex_remada_baixa', sets: 3, min: 10, max: 12, rest: 60, weight: 45 },
        { exId: 'ex_rosca_direta', sets: 3, min: 8, max: 12, rest: 60, weight: 24 },
        { exId: 'ex_rosca_martelo', sets: 3, min: 10, max: 12, rest: 45, weight: 14 },
      ]
    },
    {
      id: 'wko_c_001',
      name: 'Treino C - Pernas + Ombros',
      description: 'Agachamentos, pernas e deltoides',
      exercises: [
        { exId: 'ex_agachamento', sets: 4, min: 8, max: 10, rest: 120, weight: 70 },
        { exId: 'ex_leg_press', sets: 4, min: 10, max: 12, rest: 90, weight: 160 },
        { exId: 'ex_extensora', sets: 3, min: 12, max: 15, rest: 45, weight: 40 },
        { exId: 'ex_desenvolvimento', sets: 4, min: 8, max: 12, rest: 60, weight: 18 },
        { exId: 'ex_elevacao_lateral', sets: 4, min: 12, max: 15, rest: 45, weight: 10 },
      ]
    }
  ];

  for (const w of workouts) {
    db.prepare('INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(w.id, userId, w.name, w.description, now);
    w.exercises.forEach((item, idx) => {
      db.prepare(`
        INSERT INTO workout_exercises (id, workout_id, exercise_id, sets, min_reps, max_reps, rest_seconds, default_weight, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`we_${w.id}_${idx}`, w.id, item.exId, item.sets, item.min, item.max, item.rest, item.weight, idx);
    });
  }

  // Seed Weight logs for user evolution chart
  const weights = [
    { daysAgo: 30, w: 79.5 },
    { daysAgo: 23, w: 78.8 },
    { daysAgo: 16, w: 78.0 },
    { daysAgo: 9, w: 77.4 },
    { daysAgo: 2, w: 76.8 },
  ];
  for (const item of weights) {
    const d = new Date(Date.now() - item.daysAgo * 86400000).toISOString().split('T')[0];
    db.prepare('INSERT INTO weight_logs (id, user_id, weight, created_at) VALUES (?, ?, ?, ?)').run(`wl_${item.daysAgo}`, userId, item.w, d);
  }

  // Seed previous workout sessions (history) for user to show completed workouts and streak
  const pastSessions = [
    { daysAgo: 6, workoutId: 'wko_a_001', name: 'Treino A - Peito + Tríceps', duration: 48 },
    { daysAgo: 5, workoutId: 'wko_b_001', name: 'Treino B - Costas + Bíceps', duration: 52 },
    { daysAgo: 3, workoutId: 'wko_c_001', name: 'Treino C - Pernas + Ombros', duration: 55 },
    { daysAgo: 2, workoutId: 'wko_a_001', name: 'Treino A - Peito + Tríceps', duration: 50 },
    { daysAgo: 1, workoutId: 'wko_b_001', name: 'Treino B - Costas + Bíceps', duration: 47 },
  ];

  pastSessions.forEach((s, idx) => {
    const sessDate = new Date(Date.now() - s.daysAgo * 86400000);
    const sessId = `sess_past_${idx}`;
    db.prepare(`
      INSERT INTO workout_sessions (id, user_id, workout_id, workout_name, started_at, finished_at, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessId, userId, s.workoutId, s.name, sessDate.toISOString(), sessDate.toISOString(), s.duration);

    // Add set logs with progressive weights
    db.prepare(`
      INSERT INTO set_logs (id, session_id, exercise_id, set_number, weight, repetitions, completed, created_at)
      VALUES (?, ?, 'ex_supino_reto', 1, ?, 12, 1, ?)
    `).run(`sl_past_${idx}_1`, sessId, 50 + idx * 2.5, sessDate.toISOString());
    db.prepare(`
      INSERT INTO set_logs (id, session_id, exercise_id, set_number, weight, repetitions, completed, created_at)
      VALUES (?, ?, 'ex_supino_reto', 2, ?, 11, 1, ?)
    `).run(`sl_past_${idx}_2`, sessId, 50 + idx * 2.5, sessDate.toISOString());
    db.prepare(`
      INSERT INTO set_logs (id, session_id, exercise_id, set_number, weight, repetitions, completed, created_at)
      VALUES (?, ?, 'ex_supino_reto', 3, ?, 10, 1, ?)
    `).run(`sl_past_${idx}_3`, sessId, 50 + idx * 2.5, sessDate.toISOString());
  });

  // Seed ~18 additional demo users for realistic admin metrics
  const mockNames = [
    'Mariana Costa', 'Gabriel Almeida', 'Beatriz Lima', 'Thiago Rocha', 'Juliana Mendes',
    'Matheus Ribeiro', 'Larissa Duarte', 'Rafael Moreira', 'Ana Paula Souza', 'Lucas Silveira',
    'Fernanda Martins', 'Gustavo Henrique', 'Carolina Dias', 'Bruno Cardoso', 'Camila Pires',
    'Diego Nogueira', 'Vanessa Ramos', 'Pedro Henrique'
  ];

  const influencerIds = ['inf_joao', 'inf_camila', 'inf_rodrigo', 'inf_larissa', 'inf_felipe'];

  mockNames.forEach((name, i) => {
    const id = `usr_mock_${10 + i}`;
    const email = `aluno${i + 1}@email.com`;
    const daysAgo = Math.floor(Math.random() * 25);
    const userDate = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const isActiveRecent = i % 3 === 0; // ~6 active recently
    const lastActive = isActiveRecent ? new Date(Date.now() - Math.floor(Math.random() * 8) * 60000).toISOString() : userDate;

    db.prepare(`
      INSERT INTO users_auth (id, email, password_hash, salt, created_at)
      VALUES (?, ?, 'mockhash', 'mocksalt', ?)
    `).run(id, email, userDate);

    db.prepare(`
      INSERT INTO profiles (id, user_id, name, email, role, weight, height, goal, training_days, onboarding_completed, last_active_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'USER', ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      `prof_mock_${10 + i}`,
      id,
      name,
      email,
      60 + Math.floor(Math.random() * 30),
      160 + Math.floor(Math.random() * 30),
      i % 2 === 0 ? 'Hipertrofia' : 'Emagrecimento',
      3 + (i % 3),
      lastActive,
      userDate,
      userDate
    );

    // Attribute to influencer
    const chosenInf = influencerIds[i % influencerIds.length];
    db.prepare(`
      INSERT INTO influencer_attributions (id, influencer_id, user_id, source, created_at)
      VALUES (?, ?, ?, 'link', ?)
    `).run(`attr_mock_${i}`, chosenInf, id, userDate);

    // Some purchases
    if (i % 2 === 0) {
      db.prepare(`
        INSERT INTO purchases (id, user_id, influencer_id, plan_name, amount, status, transaction_id, is_test, created_at)
        VALUES (?, ?, ?, 'Plano Anual EVOFIT', 299.90, 'completed', ?, 1, ?)
      `).run(`purch_${i}`, id, chosenInf, `TX-${1000 + i}`, userDate);
    }
  });

  // Seed clicks for influencers
  const clickCounts = {
    inf_joao: 820,
    inf_camila: 540,
    inf_rodrigo: 410,
    inf_larissa: 290,
    inf_felipe: 180,
  };

  for (const [infId, total] of Object.entries(clickCounts)) {
    // Insert a batch of realistic sample clicks across the past 30 days
    for (let c = 0; c < 25; c++) {
      const daysAgo = Math.floor(Math.random() * 28);
      const clickTime = new Date(Date.now() - daysAgo * 86400000).toISOString();
      db.prepare(`
        INSERT INTO influencer_clicks (id, influencer_id, session_identifier, created_at)
        VALUES (?, ?, ?, ?)
      `).run(`clk_${infId}_${c}`, infId, `sess_${c}_${Math.random().toString(36).slice(2, 8)}`, clickTime);
    }
  }

  // Seed support contacts
  const sampleContacts = [
    { name: 'Gabriel Almeida', email: 'aluno2@email.com', subject: 'Dúvida sobre treino', message: 'Gostaria de saber se posso trocar o supino reto por supino com halteres.', status: 'Novo' },
    { name: 'Larissa Duarte', email: 'aluno7@email.com', subject: 'Sugestão de funcionalidade', message: 'Adoraria poder marcar tempo de descanso personalizado por exercício.', status: 'Em atendimento' },
    { name: 'Thiago Rocha', email: 'aluno4@email.com', subject: 'Problema no app', message: 'Tive uma dúvida na hora de salvar o peso corporal na tela de evolução.', status: 'Resolvido' },
  ];

  sampleContacts.forEach((ct, idx) => {
    db.prepare(`
      INSERT INTO contacts (id, name, email, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(`ct_${idx}`, ct.name, ct.email, ct.subject, ct.message, ct.status, new Date(Date.now() - idx * 86400000).toISOString());
  });

  console.log('Database initialized and seeded successfully.');
}
