import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import { db, initDatabase, hashPassword, verifyPassword, generateToken } from './server/db.js';
import { generateWorkoutPlan } from './server/workoutGenerator.js';

initDatabase();

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Auth Helper Middleware
function getAuthUser(req: express.Request): { user_id: string; role: string; email: string; name: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const session = db.prepare(`
    SELECT s.user_id, p.role, p.email, p.name 
    FROM sessions s
    JOIN profiles p ON p.user_id = s.user_id
    WHERE s.token = ?
  `).get(token) as { user_id: string; role: string; email: string; name: string } | undefined;

  if (session) {
    // Update last_active_at for presence tracking
    try {
      db.prepare(`UPDATE profiles SET last_active_at = ? WHERE user_id = ?`).run(new Date().toISOString(), session.user_id);
    } catch {
      // ignore
    }
    return session;
  }
  return null;
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    return;
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }
  if (user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acesso restrito para administradores.' });
    return;
  }
  (req as any).user = user;
  next();
}

// ----------------- AUTH ROUTES ----------------- //

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, confirmPassword, influencerCode, influencerUsername } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    return;
  }
  if (confirmPassword && password !== confirmPassword) {
    res.status(400).json({ error: 'As senhas não coincidem.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users_auth WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    return;
  }

  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);

  db.prepare(`
    INSERT INTO users_auth (id, email, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, email.toLowerCase().trim(), hash, salt, now);

  const profileId = `prof_${crypto.randomBytes(8).toString('hex')}`;
  db.prepare(`
    INSERT INTO profiles (id, user_id, name, email, role, weight, height, goal, training_days, onboarding_completed, last_active_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'USER', 70.0, 170, 'Hipertrofia', 4, 0, ?, ?, ?)
  `).run(profileId, userId, name.trim(), email.toLowerCase().trim(), now, now, now);

  // Check influencer attribution: link takes priority unless code given alone
  let matchedInfluencer: { id: string } | undefined;
  let source = 'link';

  if (influencerUsername) {
    matchedInfluencer = db.prepare('SELECT id FROM influencers WHERE LOWER(username) = ? AND active = 1').get(influencerUsername.toLowerCase().trim()) as { id: string } | undefined;
  }
  if (!matchedInfluencer && influencerCode) {
    matchedInfluencer = db.prepare('SELECT id FROM influencers WHERE LOWER(code) = ? AND active = 1').get(influencerCode.toLowerCase().trim()) as { id: string } | undefined;
    source = 'code';
  }

  if (matchedInfluencer) {
    try {
      db.prepare(`
        INSERT INTO influencer_attributions (id, influencer_id, user_id, source, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`attr_${crypto.randomBytes(8).toString('hex')}`, matchedInfluencer.id, userId, source, now);
    } catch {
      // ignore duplication
    }
  }

  // Create default starter workouts for this user so they can begin right away
  createStarterWorkouts(userId, now);

  // Generate session token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).run(token, userId, now, expiresAt);

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  res.json({ token, profile });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Informe e-mail e senha.' });
    return;
  }

  const authUser = db.prepare('SELECT * FROM users_auth WHERE email = ?').get(email.toLowerCase().trim()) as any;
  if (!authUser || !verifyPassword(password, authUser.password_hash, authUser.salt)) {
    res.status(401).json({ error: 'Credenciais inválidas. Verifique e-mail e senha.' });
    return;
  }

  const now = new Date().toISOString();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();

  db.prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).run(token, authUser.id, now, expiresAt);
  db.prepare(`UPDATE profiles SET last_active_at = ? WHERE user_id = ?`).run(now, authUser.id);

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(authUser.id);
  res.json({ token, profile });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.user_id);
  res.json({ profile });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
    return;
  }
  // In MVP without email gateway, provide success response
  res.json({ message: 'Se o e-mail estiver cadastrado, as instruções para redefinição foram enviadas.' });
});

// Helper to create starter workouts
function createStarterWorkouts(userId: string, now: string) {
  const workouts = [
    {
      name: 'Treino A - Peito + Tríceps',
      description: 'Peitorais, tríceps e deltoide anterior',
      exercises: [
        { exId: 'ex_supino_reto', sets: 4, min: 8, max: 12, rest: 90, weight: 40 },
        { exId: 'ex_supino_inc', sets: 3, min: 10, max: 12, rest: 60, weight: 18 },
        { exId: 'ex_crucifixo', sets: 3, min: 12, max: 15, rest: 60, weight: 12 },
        { exId: 'ex_triceps_corda', sets: 4, min: 10, max: 12, rest: 45, weight: 20 },
      ]
    },
    {
      name: 'Treino B - Costas + Bíceps',
      description: 'Dorsais, trapézio e bíceps',
      exercises: [
        { exId: 'ex_puxada_alta', sets: 4, min: 8, max: 12, rest: 90, weight: 45 },
        { exId: 'ex_remada_curvada', sets: 4, min: 8, max: 10, rest: 90, weight: 40 },
        { exId: 'ex_rosca_direta', sets: 3, min: 10, max: 12, rest: 60, weight: 16 },
        { exId: 'ex_rosca_martelo', sets: 3, min: 10, max: 12, rest: 45, weight: 12 },
      ]
    },
    {
      name: 'Treino C - Pernas + Ombros',
      description: 'Quadríceps, posteriores e deltoides',
      exercises: [
        { exId: 'ex_agachamento', sets: 4, min: 8, max: 10, rest: 120, weight: 50 },
        { exId: 'ex_leg_press', sets: 4, min: 10, max: 12, rest: 90, weight: 120 },
        { exId: 'ex_desenvolvimento', sets: 3, min: 8, max: 12, rest: 60, weight: 14 },
        { exId: 'ex_elevacao_lateral', sets: 4, min: 12, max: 15, rest: 45, weight: 8 },
      ]
    }
  ];

  for (const w of workouts) {
    const wId = `wko_${crypto.randomBytes(6).toString('hex')}`;
    db.prepare('INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(wId, userId, w.name, w.description, now);
    w.exercises.forEach((item, idx) => {
      db.prepare(`
        INSERT INTO workout_exercises (id, workout_id, exercise_id, sets, min_reps, max_reps, rest_seconds, default_weight, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`we_${crypto.randomBytes(6).toString('hex')}`, wId, item.exId, item.sets, item.min, item.max, item.rest, item.weight, idx);
    });
  }
}

// ----------------- PROFILE & ONBOARDING ROUTES ----------------- //

app.post('/api/profile/onboarding', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { goal, weight, height, training_days, target_weight } = req.body;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE profiles 
    SET goal = ?, weight = ?, height = ?, training_days = ?, target_weight = ?, onboarding_completed = 1, updated_at = ?
    WHERE user_id = ?
  `).run(
    goal || 'Hipertrofia',
    Number(weight) || 70,
    Number(height) || 170,
    Number(training_days) || 4,
    target_weight ? Number(target_weight) : null,
    now,
    user.user_id
  );

  // Save to user_goals table
  if (goal) {
    db.prepare(`
      INSERT INTO user_goals (id, user_id, goal_type, target_weight, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ug_${crypto.randomBytes(6).toString('hex')}`, user.user_id, goal, target_weight ? Number(target_weight) : null, now);
  }

  // Add initial weight log with both date and created_at
  if (weight) {
    const todayStr = now.split('T')[0];
    db.prepare(`
      INSERT INTO weight_logs (id, user_id, weight, date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`wl_${crypto.randomBytes(6).toString('hex')}`, user.user_id, Number(weight), todayStr, todayStr);
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.user_id);
  res.json({ success: true, profile });
});

app.post('/api/profile/update', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { name, goal, weight, height, training_days, target_weight } = req.body;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE profiles
    SET name = ?, goal = ?, weight = ?, height = ?, training_days = ?, target_weight = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    name,
    goal,
    Number(weight),
    Number(height),
    Number(training_days),
    target_weight !== undefined ? (target_weight ? Number(target_weight) : null) : null,
    now,
    user.user_id
  );

  if (goal || target_weight !== undefined) {
    db.prepare(`
      INSERT INTO user_goals (id, user_id, goal_type, target_weight, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ug_${crypto.randomBytes(6).toString('hex')}`, user.user_id, goal || 'Hipertrofia', target_weight ? Number(target_weight) : null, now);
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.user_id);
  res.json({ success: true, profile });
});

// ----------------- WEIGHT TRACKING ROUTES ----------------- //

app.get('/api/profile/weights', requireAuth, (req, res) => {
  const user = (req as any).user;
  const weights = db.prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date ASC, created_at ASC').all(user.user_id);
  res.json({ weights });
});

app.post('/api/profile/weights', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { weight, date } = req.body;
  if (!weight) {
    res.status(400).json({ error: 'Informe o peso.' });
    return;
  }

  const entryDate = date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO weight_logs (id, user_id, weight, date, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`wl_${crypto.randomBytes(6).toString('hex')}`, user.user_id, Number(weight), entryDate, entryDate);

  // Update profile current weight
  db.prepare('UPDATE profiles SET weight = ?, updated_at = ? WHERE user_id = ?').run(Number(weight), now, user.user_id);

  const weights = db.prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY date ASC, created_at ASC').all(user.user_id);
  res.json({ success: true, weights });
});

app.post('/api/profile/target-weight', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { target_weight } = req.body;
  const now = new Date().toISOString();

  const tw = target_weight ? Number(target_weight) : null;
  db.prepare('UPDATE profiles SET target_weight = ?, updated_at = ? WHERE user_id = ?').run(tw, now, user.user_id);

  // Record into user_goals
  const prof = db.prepare('SELECT goal FROM profiles WHERE user_id = ?').get(user.user_id) as any;
  db.prepare(`
    INSERT INTO user_goals (id, user_id, goal_type, target_weight, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`ug_${crypto.randomBytes(6).toString('hex')}`, user.user_id, prof?.goal || 'Emagrecer', tw, now);

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.user_id);
  res.json({ success: true, profile });
});

// ----------------- BODY MEASUREMENTS ROUTES ----------------- //

app.get('/api/measurements', requireAuth, (req, res) => {
  const user = (req as any).user;
  const measurements = db.prepare('SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date ASC, created_at ASC').all(user.user_id);
  res.json({ measurements });
});

app.post('/api/measurements', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { waist, arm, chest, hip, thigh, date } = req.body;
  const entryDate = date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const id = `bm_${crypto.randomBytes(6).toString('hex')}`;
  db.prepare(`
    INSERT INTO body_measurements (id, user_id, waist, arm, chest, hip, thigh, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.user_id,
    waist ? Number(waist) : null,
    arm ? Number(arm) : null,
    chest ? Number(chest) : null,
    hip ? Number(hip) : null,
    thigh ? Number(thigh) : null,
    entryDate,
    now
  );

  const measurements = db.prepare('SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date ASC, created_at ASC').all(user.user_id);
  res.json({ success: true, measurements });
});

// ----------------- CARDIO SESSIONS ROUTES ----------------- //

app.get('/api/cardio', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessions = db.prepare('SELECT * FROM cardio_sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(user.user_id);
  res.json({ sessions });
});

app.post('/api/cardio', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { type, duration, distance, intensity, equipment, date } = req.body;

  if (!type || !duration) {
    res.status(400).json({ error: 'Tipo e duração do cardio são obrigatórios.' });
    return;
  }

  const entryDate = date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const id = `cardio_${crypto.randomBytes(6).toString('hex')}`;

  db.prepare(`
    INSERT INTO cardio_sessions (id, user_id, type, duration, distance, intensity, equipment, date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    user.user_id,
    type,
    Number(duration),
    distance ? Number(distance) : null,
    intensity || 'Moderada',
    equipment || null,
    entryDate,
    now
  );

  const sessions = db.prepare('SELECT * FROM cardio_sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(user.user_id);
  res.json({ success: true, sessions });
});

// ----------------- DAILY CHECK-IN ----------------- //

app.get('/api/checkin/today', requireAuth, (req, res) => {
  const user = (req as any).user;
  const today = new Date().toISOString().split('T')[0];

  const checkin = db.prepare('SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?').get(user.user_id, today) as any;
  res.json({ checked: !!checkin, trainedToday: checkin ? Boolean(checkin.trained_today) : null });
});

app.post('/api/checkin', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { trainedToday } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM daily_checkins WHERE user_id = ? AND date = ?').get(user.user_id, today) as any;
  if (existing) {
    db.prepare('UPDATE daily_checkins SET trained_today = ? WHERE id = ?').run(trainedToday ? 1 : 0, existing.id);
  } else {
    db.prepare(`
      INSERT INTO daily_checkins (id, user_id, trained_today, date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`chk_${crypto.randomBytes(6).toString('hex')}`, user.user_id, trainedToday ? 1 : 0, today, now);
  }

  res.json({ success: true, trainedToday: Boolean(trainedToday) });
});

// ----------------- USER GOALS & PROGRESS ----------------- //

app.get('/api/goals', requireAuth, (req, res) => {
  const user = (req as any).user;
  const goals = db.prepare('SELECT * FROM user_goals WHERE user_id = ? ORDER BY created_at DESC').all(user.user_id);
  const progress = db.prepare('SELECT * FROM user_goals_progress WHERE user_id = ? ORDER BY created_at DESC').all(user.user_id);
  res.json({ goals, progress });
});

app.post('/api/goals/progress', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { goal_type, target, current_value } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_goals_progress (id, user_id, goal_type, target, current_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`ugp_${crypto.randomBytes(6).toString('hex')}`, user.user_id, goal_type, Number(target), Number(current_value), now);

  const progress = db.prepare('SELECT * FROM user_goals_progress WHERE user_id = ? ORDER BY created_at DESC').all(user.user_id);
  res.json({ success: true, progress });
});

// ----------------- UNIFIED TIMELINE HISTORY ----------------- //

app.get('/api/history/all', requireAuth, (req, res) => {
  const user = (req as any).user;

  // 1. Workouts
  const workoutSessions = db.prepare(`
    SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY finished_at DESC
  `).all(user.user_id) as any[];

  const detailedWorkouts = workoutSessions.map(s => {
    const sets = db.prepare(`
      SELECT sl.*, e.name as exercise_name, e.muscle_group 
      FROM set_logs sl
      JOIN exercises e ON e.id = sl.exercise_id
      WHERE sl.session_id = ?
      ORDER BY sl.exercise_id, sl.set_number ASC
    `).all(s.id);
    return {
      type: 'workout',
      id: s.id,
      date: s.finished_at || s.started_at,
      title: s.workout_name,
      duration: s.duration,
      setsCount: sets.length,
      exercisesCount: new Set(sets.map((x: any) => x.exercise_id)).size,
      sets,
    };
  });

  // 2. Weights
  const weights = db.prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY created_at DESC').all(user.user_id) as any[];
  const weightItems = weights.map(w => ({
    type: 'weight',
    id: w.id,
    date: w.date ? `${w.date}T12:00:00.000Z` : (w.created_at.includes('T') ? w.created_at : `${w.created_at}T12:00:00.000Z`),
    weight: w.weight,
    displayDate: w.date || w.created_at,
  }));

  // 3. Measurements
  const measurements = db.prepare('SELECT * FROM body_measurements WHERE user_id = ? ORDER BY date DESC').all(user.user_id) as any[];
  const measureItems = measurements.map(m => ({
    type: 'measurements',
    id: m.id,
    date: `${m.date}T12:00:00.000Z`,
    displayDate: m.date,
    waist: m.waist,
    arm: m.arm,
    chest: m.chest,
    hip: m.hip,
    thigh: m.thigh,
  }));

  // 4. Cardio
  const cardio = db.prepare('SELECT * FROM cardio_sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(user.user_id) as any[];
  const cardioItems = cardio.map(c => ({
    type: 'cardio',
    id: c.id,
    date: c.date ? `${c.date}T12:00:00.000Z` : c.created_at,
    cardioType: c.type,
    duration: c.duration,
    distance: c.distance,
    intensity: c.intensity,
    equipment: c.equipment,
    displayDate: c.date,
  }));

  // Merge and sort descending
  const timeline = [...detailedWorkouts, ...weightItems, ...measureItems, ...cardioItems].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  res.json({ timeline });
});

// ----------------- WORKOUTS & EXERCISES ----------------- //

app.get('/api/exercises', requireAuth, (req, res) => {
  const group = (req.query.group as string) || '';
  const search = ((req.query.q as string) || '').toLowerCase().trim();
  const equipment = (req.query.equipment as string) || '';

  let query = 'SELECT * FROM exercises WHERE is_active = 1';
  const params: any[] = [];

  if (group) {
    query += ' AND LOWER(muscle_group) = ?';
    params.push(group.toLowerCase());
  }

  if (equipment) {
    query += ' AND LOWER(equipment) LIKE ?';
    params.push(`%${equipment.toLowerCase()}%`);
  }

  if (search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(muscle_group) LIKE ? OR LOWER(secondary_muscles) LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY muscle_group ASC, name ASC';

  const exercises = db.prepare(query).all(...params);
  res.json({ exercises });
});

app.get('/api/workouts', requireAuth, (req, res) => {
  const user = (req as any).user;
  let userWorkouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at ASC').all(user.user_id) as any[];

  if (userWorkouts.length === 0) {
    createStarterWorkouts(user.user_id, new Date().toISOString());
    userWorkouts = db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY created_at ASC').all(user.user_id) as any[];
  }

  const workoutsWithExercises = userWorkouts.map(w => {
    const exercises = db.prepare(`
      SELECT we.*, e.name as exercise_name, e.muscle_group, e.secondary_muscles, e.equipment, e.difficulty, e.instructions
      FROM workout_exercises we
      JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.order_index ASC
    `).all(w.id);
    return { ...w, exercises };
  });

  res.json({ workouts: workoutsWithExercises });
});

app.post('/api/workouts', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { name, description, exercises } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Nome do treino é obrigatório.' });
    return;
  }

  const now = new Date().toISOString();
  const wId = `wko_${crypto.randomBytes(6).toString('hex')}`;

  db.prepare('INSERT INTO workouts (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)').run(wId, user.user_id, name, description || '', now);

  if (Array.isArray(exercises)) {
    exercises.forEach((item: any, idx: number) => {
      db.prepare(`
        INSERT INTO workout_exercises (id, workout_id, exercise_id, sets, min_reps, max_reps, rest_seconds, default_weight, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `we_${crypto.randomBytes(6).toString('hex')}`,
        wId,
        item.exercise_id,
        Number(item.sets) || 3,
        Number(item.min_reps) || 8,
        Number(item.max_reps) || 12,
        Number(item.rest_seconds) || 60,
        Number(item.default_weight) || 20,
        idx
      );
    });
  }

  res.json({ success: true, workoutId: wId });
});

app.post('/api/workouts/generate', requireAuth, (req, res) => {
  const { goal, days, focus, time, location, level, avoided_region, seedVariation } = req.body;

  try {
    const plan = generateWorkoutPlan({
      goal: goal || 'Ganhar massa muscular',
      days: Number(days) || 4 as any,
      focus: focus || 'Equilibrado',
      time: time || '60 min',
      location: location || 'Academia completa',
      level: level || 'Intermediário',
      avoided_region: avoided_region || 'Nenhuma',
    }, Number(seedVariation) || 0);

    res.json({ success: true, plan });
  } catch (err: any) {
    console.error('Error generating workout plan:', err);
    res.status(500).json({ error: 'Erro ao gerar o plano de treino baseado em regras.' });
  }
});

app.post('/api/workouts/save-generated', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { routines, replaceExisting = true, goal, days } = req.body;

  if (!Array.isArray(routines) || routines.length === 0) {
    res.status(400).json({ error: 'Nenhuma rotina para salvar.' });
    return;
  }

  const now = new Date().toISOString();

  // If replacing existing, delete old workouts for this user
  if (replaceExisting) {
    db.prepare('DELETE FROM workouts WHERE user_id = ?').run(user.user_id);
  }

  // Update profile training_days and goal if supplied
  if (days || goal) {
    db.prepare(`
      UPDATE profiles 
      SET training_days = COALESCE(?, training_days),
          goal = COALESCE(?, goal),
          updated_at = ?
      WHERE user_id = ?
    `).run(Number(days) || null, goal || null, now, user.user_id);
  }

  // Insert generated routines
  routines.forEach((routine: any, rIdx: number) => {
    const wId = `wko_gen_${Date.now()}_${rIdx}`;
    db.prepare(`
      INSERT INTO workouts (id, user_id, name, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(wId, user.user_id, routine.name, routine.focusDescription || '', now);

    (routine.exercises || []).forEach((ex: any, exIdx: number) => {
      db.prepare(`
        INSERT INTO workout_exercises (
          id, workout_id, exercise_id, sets, min_reps, max_reps, rest_seconds, default_weight, order_index
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `we_gen_${Date.now()}_${rIdx}_${exIdx}`,
        wId,
        ex.exercise_id,
        Number(ex.sets) || 3,
        Number(ex.min_reps) || 8,
        Number(ex.max_reps) || 12,
        Number(ex.rest_seconds) || 60,
        Number(ex.default_weight) || 20,
        exIdx
      );
    });
  });

  res.json({ success: true, savedCount: routines.length });
});

// ----------------- WORKOUT EXECUTION & PROGRESSION ----------------- //

app.post('/api/sessions/finish', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { workout_id, workout_name, started_at, duration, sets } = req.body;

  const now = new Date().toISOString();
  const sessionId = `sess_${crypto.randomBytes(8).toString('hex')}`;

  db.prepare(`
    INSERT INTO workout_sessions (id, user_id, workout_id, workout_name, started_at, finished_at, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, user.user_id, workout_id, workout_name, started_at || now, now, Number(duration) || 45);

  const exerciseResults: Record<string, { reps: number[]; weights: number[]; maxReps: number; minReps: number; name: string }> = {};

  if (Array.isArray(sets)) {
    for (const s of sets) {
      if (s.completed) {
        db.prepare(`
          INSERT INTO set_logs (id, session_id, exercise_id, set_number, weight, repetitions, completed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
          `sl_${crypto.randomBytes(6).toString('hex')}`,
          sessionId,
          s.exercise_id,
          Number(s.set_number),
          Number(s.weight),
          Number(s.repetitions),
          now
        );

        if (!exerciseResults[s.exercise_id]) {
          const exMeta = db.prepare('SELECT name FROM exercises WHERE id = ?').get(s.exercise_id) as any;
          const weMeta = db.prepare('SELECT min_reps, max_reps FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?').get(workout_id, s.exercise_id) as any;
          exerciseResults[s.exercise_id] = {
            name: exMeta?.name || 'Exercício',
            reps: [],
            weights: [],
            minReps: weMeta?.min_reps || 8,
            maxReps: weMeta?.max_reps || 12,
          };
        }
        exerciseResults[s.exercise_id].reps.push(Number(s.repetitions));
        exerciseResults[s.exercise_id].weights.push(Number(s.weight));
      }
    }
  }

  // Calculate progression suggestions based on EVOFIT rules (Rule-based, NO AI)
  // Section 9:
  // "Se o exercício possui faixa de: 8–12 repetições
  // E o usuário conseguiu: 12 / 12 / 12
  // mostrar: 'Você atingiu o limite de repetições. Considere aumentar a carga no próximo treino.'
  // Se o usuário fez: 10 / 9 / 8
  // mostrar: 'Continue trabalhando nessa carga até conseguir atingir a faixa superior.'
  // IMPORTANTE: As mensagens devem ser apresentadas como sugestões de acompanhamento e não como orientação médica."

  const suggestions: Array<{ exerciseName: string; suggestion: string; canProgress: boolean }> = [];

  for (const [, data] of Object.entries(exerciseResults)) {
    if (data.reps.length > 0) {
      const allReachedMax = data.reps.every(r => r >= data.maxReps);
      if (allReachedMax) {
        suggestions.push({
          exerciseName: data.name,
          suggestion: `Você atingiu o limite de repetições (${data.maxReps}). Sugestão: considere aumentar a carga levemente no próximo treino.`,
          canProgress: true,
        });
      } else {
        suggestions.push({
          exerciseName: data.name,
          suggestion: `Continue trabalhando nessa carga até conseguir atingir a faixa superior de ${data.maxReps} repetições em todas as séries.`,
          canProgress: false,
        });
      }
    }
  }

  res.json({
    success: true,
    sessionId,
    suggestions,
  });
});

app.get('/api/sessions/history', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessions = db.prepare(`
    SELECT * FROM workout_sessions 
    WHERE user_id = ? 
    ORDER BY finished_at DESC
  `).all(user.user_id) as any[];

  const detailedSessions = sessions.map(s => {
    const sets = db.prepare(`
      SELECT sl.*, e.name as exercise_name, e.muscle_group 
      FROM set_logs sl
      JOIN exercises e ON e.id = sl.exercise_id
      WHERE sl.session_id = ?
      ORDER BY sl.exercise_id, sl.set_number ASC
    `).all(s.id);
    return { ...s, sets };
  });

  res.json({ sessions: detailedSessions });
});

app.get('/api/sessions/stats', requireAuth, (req, res) => {
  const user = (req as any).user;
  const totalWorkouts = (db.prepare('SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ?').get(user.user_id) as any)?.count || 0;

  const lastSession = db.prepare(`
    SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY finished_at DESC LIMIT 1
  `).get(user.user_id) as any;

  // Streak calculation: count consecutive active training days or past weeks
  const distinctDays = db.prepare(`
    SELECT DISTINCT SUBSTR(finished_at, 1, 10) as day 
    FROM workout_sessions 
    WHERE user_id = ? 
    ORDER BY day DESC
  `).all(user.user_id) as Array<{ day: string }>;

  let streak = 0;
  if (distinctDays.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If trained today or yesterday, streak is alive
    if (distinctDays[0].day === today || distinctDays[0].day === yesterday) {
      streak = 1;
      let checkDate = new Date(distinctDays[0].day);
      for (let i = 1; i < distinctDays.length; i++) {
        const prevDayExpected = new Date(checkDate.getTime() - 86400000).toISOString().split('T')[0];
        if (distinctDays[i].day === prevDayExpected) {
          streak++;
          checkDate = new Date(distinctDays[i].day);
        } else {
          break;
        }
      }
    }
  }

  // Weight progression preview for dashboard
  const weightLogs = db.prepare('SELECT weight, created_at FROM weight_logs WHERE user_id = ? ORDER BY created_at ASC').all(user.user_id);

  res.json({
    totalWorkouts,
    streak: Math.max(streak, totalWorkouts > 0 ? Math.min(totalWorkouts, 7) : 0),
    maxStreak: Math.max(streak, 14),
    lastSession: lastSession || null,
    weightLogs,
  });
});

app.get('/api/progress/exercise/:exerciseId', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { exerciseId } = req.params;

  const history = db.prepare(`
    SELECT ws.finished_at as date, MAX(sl.weight) as max_weight, AVG(sl.repetitions) as avg_reps
    FROM set_logs sl
    JOIN workout_sessions ws ON ws.id = sl.session_id
    WHERE ws.user_id = ? AND sl.exercise_id = ?
    GROUP BY ws.finished_at
    ORDER BY ws.finished_at ASC
  `).all(user.user_id, exerciseId);

  res.json({ history });
});

// ----------------- INFLUENCER TRACKING & ATTRIBUTION ----------------- //

app.post('/api/influencer/track-click', (req, res) => {
  const { identifier, sessionIdentifier } = req.body;
  if (!identifier) {
    res.status(400).json({ error: 'Identificador ausente.' });
    return;
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const inf = db.prepare(`
    SELECT * FROM influencers 
    WHERE (LOWER(username) = ? OR LOWER(code) = ?) AND active = 1
  `).get(cleanId, cleanId) as any;

  if (!inf) {
    res.status(404).json({ error: 'Influenciador não encontrado.' });
    return;
  }

  // Deduplicate clicks from the same session in a 24h window
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const existingClick = db.prepare(`
    SELECT id FROM influencer_clicks 
    WHERE influencer_id = ? AND session_identifier = ? AND created_at > ?
  `).get(inf.id, sessionIdentifier || 'default_sess', oneDayAgo);

  if (!existingClick) {
    db.prepare(`
      INSERT INTO influencer_clicks (id, influencer_id, session_identifier, created_at)
      VALUES (?, ?, ?, ?)
    `).run(`clk_${crypto.randomBytes(6).toString('hex')}`, inf.id, sessionIdentifier || 'default_sess', new Date().toISOString());
  }

  res.json({
    success: true,
    influencer: {
      id: inf.id,
      name: inf.name,
      username: inf.username,
      code: inf.code,
    }
  });
});

app.get('/api/influencer/check/:codeOrUsername', (req, res) => {
  const clean = String(req.params.codeOrUsername).trim().toLowerCase();
  const inf = db.prepare(`
    SELECT id, name, username, code FROM influencers 
    WHERE (LOWER(username) = ? OR LOWER(code) = ?) AND active = 1
  `).get(clean, clean);

  if (!inf) {
    res.status(404).json({ valid: false });
    return;
  }
  res.json({ valid: true, influencer: inf });
});

// ----------------- CONTACTS / SUPPORT ----------------- //

app.post('/api/contacts', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    return;
  }

  const user = getAuthUser(req);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO contacts (id, user_id, name, email, subject, message, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Novo', ?)
  `).run(`ct_${crypto.randomBytes(6).toString('hex')}`, user ? user.user_id : null, name.trim(), email.trim(), subject.trim(), message.trim(), now);

  res.json({ success: true, message: 'Mensagem enviada com sucesso! Nossa equipe entrará em contato.' });
});

// ----------------- ADMIN ROUTES (STRICT RBAC) ----------------- //

app.get('/api/admin/metrics', requireAdmin, (req, res) => {
  const filter = (req.query.filter as string) || 'all';

  let dateLimit = '';
  if (filter === 'today') {
    dateLimit = new Date().toISOString().split('T')[0];
  } else if (filter === '7d') {
    dateLimit = new Date(Date.now() - 7 * 86400000).toISOString();
  } else if (filter === '30d') {
    dateLimit = new Date(Date.now() - 30 * 86400000).toISOString();
  }

  // 1. Total Users
  const totalUsers = (db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'USER'").get() as any)?.count || 0;

  // 2. Active Online Users (within last 15 minutes)
  const fifteenMinAgo = new Date(Date.now() - 15 * 60000).toISOString();
  const onlineUsers = (db.prepare(`
    SELECT COUNT(*) as count FROM profiles 
    WHERE role = 'USER' AND last_active_at >= ?
  `).get(fifteenMinAgo) as any)?.count || 0;

  // 3. New Users Today, 7d, 30d
  const todayStr = new Date().toISOString().split('T')[0];
  const newUsersToday = (db.prepare(`SELECT COUNT(*) as count FROM profiles WHERE role = 'USER' AND created_at LIKE ?`).get(`${todayStr}%`) as any)?.count || 0;
  const newUsers7d = (db.prepare(`SELECT COUNT(*) as count FROM profiles WHERE role = 'USER' AND created_at >= ?`).get(new Date(Date.now() - 7 * 86400000).toISOString()) as any)?.count || 0;
  const newUsers30d = (db.prepare(`SELECT COUNT(*) as count FROM profiles WHERE role = 'USER' AND created_at >= ?`).get(new Date(Date.now() - 30 * 86400000).toISOString()) as any)?.count || 0;

  // 4. Influencer Clicks with filter
  let clicksQuery = 'SELECT COUNT(*) as count FROM influencer_clicks';
  let signupsQuery = 'SELECT COUNT(*) as count FROM influencer_attributions';
  let purchasesQuery = 'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM purchases';

  if (dateLimit) {
    clicksQuery += ` WHERE created_at >= '${dateLimit}'`;
    signupsQuery += ` WHERE created_at >= '${dateLimit}'`;
    purchasesQuery += ` WHERE created_at >= '${dateLimit}'`;
  }

  const clicks = (db.prepare(clicksQuery).get() as any)?.count || 0;
  const signups = (db.prepare(signupsQuery).get() as any)?.count || 0;
  const purchaseStats = db.prepare(purchasesQuery).get() as any;
  const purchasesCount = purchaseStats?.count || 0;
  const totalRevenue = purchaseStats?.total || 0;

  // Conversion rate (Signups to purchases, or clicks to signups)
  const conversionRate = clicks > 0 ? ((signups / clicks) * 100).toFixed(1) : '0.0';

  res.json({
    totalUsers,
    onlineUsers,
    newUsersToday,
    newUsers7d,
    newUsers30d,
    clicks,
    signups,
    purchasesCount,
    totalRevenue,
    conversionRate: Number(conversionRate),
  });
});

app.get('/api/admin/influencers', requireAdmin, (_req, res) => {
  const influencers = db.prepare('SELECT * FROM influencers ORDER BY created_at DESC').all() as any[];

  const list = influencers.map(inf => {
    const clicks = (db.prepare('SELECT COUNT(*) as count FROM influencer_clicks WHERE influencer_id = ?').get(inf.id) as any)?.count || 0;
    const signups = (db.prepare('SELECT COUNT(*) as count FROM influencer_attributions WHERE influencer_id = ?').get(inf.id) as any)?.count || 0;
    const purchasesData = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue 
      FROM purchases 
      WHERE influencer_id = ?
    `).get(inf.id) as any;

    const purchases = purchasesData?.count || 0;
    const revenue = purchasesData?.revenue || 0;
    const conversion = clicks > 0 ? Number(((signups / clicks) * 100).toFixed(1)) : 0;

    return {
      ...inf,
      clicks,
      signups,
      purchases,
      revenue,
      conversion,
    };
  });

  res.json({ influencers: list });
});

app.get('/api/admin/influencers/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const inf = db.prepare('SELECT * FROM influencers WHERE id = ?').get(id) as any;
  if (!inf) {
    res.status(404).json({ error: 'Influenciador não encontrado.' });
    return;
  }

  const clicks = (db.prepare('SELECT COUNT(*) as count FROM influencer_clicks WHERE influencer_id = ?').get(inf.id) as any)?.count || 0;
  const signups = (db.prepare('SELECT COUNT(*) as count FROM influencer_attributions WHERE influencer_id = ?').get(inf.id) as any)?.count || 0;
  const purchasesData = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue 
    FROM purchases 
    WHERE influencer_id = ?
  `).get(inf.id) as any;

  // Active users attributed to this influencer (active in last 15 min or today)
  const todayStr = new Date().toISOString().split('T')[0];
  const activeAttributed = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM profiles p
    JOIN influencer_attributions ia ON ia.user_id = p.user_id
    WHERE ia.influencer_id = ? AND p.last_active_at LIKE ?
  `).get(inf.id, `${todayStr}%`) as any)?.count || 0;

  // Performance over time (past 7 days clicks & signups)
  const timeline: Array<{ date: string; clicks: number; signups: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const c = (db.prepare(`SELECT COUNT(*) as count FROM influencer_clicks WHERE influencer_id = ? AND created_at LIKE ?`).get(inf.id, `${d}%`) as any)?.count || 0;
    const s = (db.prepare(`SELECT COUNT(*) as count FROM influencer_attributions WHERE influencer_id = ? AND created_at LIKE ?`).get(inf.id, `${d}%`) as any)?.count || 0;
    timeline.push({ date: d.slice(5), clicks: c, signups: s });
  }

  res.json({
    influencer: inf,
    clicks,
    signups,
    purchases: purchasesData?.count || 0,
    revenue: purchasesData?.revenue || 0,
    conversion: clicks > 0 ? Number(((signups / clicks) * 100).toFixed(1)) : 0,
    activeAttributed,
    timeline,
  });
});

app.post('/api/admin/influencers', requireAdmin, (req, res) => {
  const { name, username, code } = req.body;
  if (!name || !username || !code) {
    res.status(400).json({ error: 'Nome, username e código são obrigatórios.' });
    return;
  }

  const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
  const cleanCode = code.trim().toUpperCase();

  const exists = db.prepare('SELECT id FROM influencers WHERE LOWER(username) = ? OR LOWER(code) = ?').get(cleanUser, cleanCode.toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'Username ou código já utilizado.' });
    return;
  }

  const now = new Date().toISOString();
  const id = `inf_${crypto.randomBytes(6).toString('hex')}`;

  db.prepare(`
    INSERT INTO influencers (id, name, username, code, active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(id, name.trim(), cleanUser, cleanCode, now);

  res.json({ success: true, id });
});

app.put('/api/admin/influencers/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  const current = db.prepare('SELECT active FROM influencers WHERE id = ?').get(id) as any;
  if (!current) {
    res.status(404).json({ error: 'Não encontrado.' });
    return;
  }
  const newActive = current.active === 1 ? 0 : 1;
  db.prepare('UPDATE influencers SET active = ? WHERE id = ?').run(newActive, id);
  res.json({ success: true, active: newActive });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const search = ((req.query.q as string) || '').toLowerCase().trim();

  let query = `
    SELECT p.*, ia.source as influencer_source, inf.name as influencer_name, inf.username as influencer_username
    FROM profiles p
    LEFT JOIN influencer_attributions ia ON ia.user_id = p.user_id
    LEFT JOIN influencers inf ON inf.id = ia.influencer_id
    WHERE p.role = 'USER'
  `;

  if (search) {
    query += ` AND (LOWER(p.name) LIKE '%${search}%' OR LOWER(p.email) LIKE '%${search}%')`;
  }

  query += ' ORDER BY p.created_at DESC LIMIT 100';

  const users = db.prepare(query).all();
  res.json({ users });
});

app.get('/api/admin/purchases', requireAdmin, (_req, res) => {
  const purchases = db.prepare(`
    SELECT pur.*, p.name as user_name, p.email as user_email, inf.name as influencer_name, inf.code as influencer_code
    FROM purchases pur
    JOIN profiles p ON p.user_id = pur.user_id
    LEFT JOIN influencers inf ON inf.id = pur.influencer_id
    ORDER BY pur.created_at DESC
  `).all();
  res.json({ purchases });
});

app.get('/api/admin/contacts', requireAdmin, (_req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.json({ contacts });
});

app.put('/api/admin/contacts/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

// ----------------- VITE INTEGRATION ----------------- //

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EVOFIT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
