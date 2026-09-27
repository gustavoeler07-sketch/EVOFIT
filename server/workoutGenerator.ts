import { db } from './db.js';

export interface WorkoutGeneratorInput {
  goal: 'Emagrecer' | 'Ganhar massa muscular' | 'Condicionamento' | 'Força';
  days: 2 | 3 | 4 | 5 | 6;
  focus: 'Peito' | 'Costas' | 'Ombros' | 'Braços' | 'Pernas' | 'Glúteos' | 'Corpo inteiro' | 'Equilibrado';
  time: '30 min' | '45 min' | '60 min' | '90 min+';
  location: 'Academia completa' | 'Academia básica' | 'Casa';
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  avoided_region?: string;
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

export function generateWorkoutPlan(input: WorkoutGeneratorInput, seedVariation: number = 0): GeneratedPlanResult {
  // 1. Determine number of exercises per routine
  let exerciseCount = 5;
  let estimatedDuration = 50;

  if (input.time === '30 min') {
    exerciseCount = 4;
    estimatedDuration = 30;
  } else if (input.time === '45 min') {
    exerciseCount = 5;
    estimatedDuration = 45;
  } else if (input.time === '60 min') {
    exerciseCount = 6;
    estimatedDuration = 60;
  } else if (input.time === '90 min+') {
    exerciseCount = 7;
    estimatedDuration = 80;
  }

  // 2. Fetch candidate exercises from database with filters
  let query = 'SELECT * FROM exercises WHERE is_active = 1';
  const params: any[] = [];

  if (input.location === 'Casa') {
    query += ' AND home_available = 1';
  } else if (input.location === 'Academia básica') {
    // Avoid hack, specialized machines, air bike
    query += " AND equipment NOT LIKE '%Hack%' AND equipment NOT LIKE '%Air Bike%' AND equipment NOT LIKE '%Articulada%'";
  }

  if (input.level === 'Iniciante') {
    query += " AND difficulty != 'Avançado'";
  }

  if (input.avoided_region && input.avoided_region !== 'Nenhuma') {
    const avoid = input.avoided_region.toLowerCase();
    if (avoid.includes('ombro')) {
      query += " AND LOWER(muscle_group) != 'ombros' AND (secondary_muscles IS NULL OR LOWER(secondary_muscles) NOT LIKE '%ombro%')";
    } else if (avoid.includes('joelho') || avoid.includes('perna')) {
      query += " AND LOWER(muscle_group) NOT IN ('quadríceps', 'panturrilha')";
    } else if (avoid.includes('lombar')) {
      query += " AND (secondary_muscles IS NULL OR LOWER(secondary_muscles) NOT LIKE '%lombar%')";
    }
  }

  const allFilteredExercises = db.prepare(query).all(...params) as any[];

  // Fallback if filters were too tight
  const exercisesPool = allFilteredExercises.length >= 20
    ? allFilteredExercises
    : (db.prepare('SELECT * FROM exercises WHERE is_active = 1').all() as any[]);

  // 3. Helper to pick an exercise from muscle group with rotation
  const usedExerciseIds = new Set<string>();

  function pickExercise(muscle: string, preferCompound = false): any {
    let pool = exercisesPool.filter(e => {
      const matchMuscle = e.muscle_group.toLowerCase() === muscle.toLowerCase();
      const notUsed = !usedExerciseIds.has(e.id);
      return matchMuscle && notUsed;
    });

    if (pool.length === 0) {
      pool = exercisesPool.filter(e => e.muscle_group.toLowerCase() === muscle.toLowerCase());
    }

    if (pool.length === 0) {
      // Pick any related exercise
      pool = exercisesPool.filter(e => !usedExerciseIds.has(e.id));
    }

    // Pseudo-random selection based on variation seed
    const idx = (Math.abs(seedVariation * 3 + Math.floor(Math.random() * pool.length))) % pool.length;
    const selected = pool[idx] || pool[0];
    if (selected) {
      usedExerciseIds.add(selected.id);
    }
    return selected;
  }

  // 4. Reps, Sets, Rest tuning based on Goal
  function tuneExercise(ex: any, isPrimaryFocus: boolean) {
    let sets = ex.default_sets || 3;
    let minReps = ex.default_min_reps || 8;
    let maxReps = ex.default_max_reps || 12;
    let rest = ex.default_rest_seconds || 60;
    let weight = 20;

    if (input.goal === 'Força') {
      minReps = Math.max(4, minReps - 3);
      maxReps = Math.max(6, maxReps - 4);
      rest = Math.max(90, rest + 30);
      sets = 4;
      weight = 35;
    } else if (input.goal === 'Emagrecer') {
      minReps = Math.max(10, minReps + 2);
      maxReps = Math.max(14, maxReps + 2);
      rest = Math.min(45, rest);
      weight = 15;
    } else if (input.goal === 'Condicionamento') {
      minReps = Math.max(12, minReps + 4);
      maxReps = Math.max(15, maxReps + 4);
      rest = Math.min(40, rest);
      weight = 12;
    }

    if (isPrimaryFocus) {
      sets = Math.min(5, sets + 1);
    }

    return {
      exercise_id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group,
      secondary_muscles: ex.secondary_muscles || '',
      equipment: ex.equipment || 'Livre',
      difficulty: ex.difficulty || 'Iniciante',
      instructions: ex.instructions || '',
      sets,
      min_reps: minReps,
      max_reps: maxReps,
      rest_seconds: rest,
      default_weight: weight,
    };
  }

  // 5. Build Routines based on Days & Focus
  const routines: GeneratedRoutine[] = [];

  if (input.days === 2) {
    // 2 Days: Full Body A & Full Body B
    const rA_muscles = ['Peito', 'Costas', 'Quadríceps', 'Bíceps', 'Abdômen'];
    const rB_muscles = ['Ombros', 'Posterior de coxa', 'Glúteos', 'Tríceps', 'Panturrilha'];

    if (input.focus === 'Peito' || input.focus === 'Braços') {
      rA_muscles.unshift(input.focus === 'Braços' ? 'Bíceps' : 'Peito');
    } else if (input.focus === 'Ombros' || input.focus === 'Glúteos') {
      rB_muscles.unshift(input.focus);
    }

    const exListA = rA_muscles.slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === input.focus));
    const exListB = rB_muscles.slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === input.focus));

    routines.push({
      name: 'Treino A — Corpo Inteiro (Força & Base)',
      focusDescription: 'Peito, Costas, Quadríceps e Braços',
      exercises: exListA,
    });
    routines.push({
      name: 'Treino B — Corpo Inteiro (Estabilidade & Posterior)',
      focusDescription: 'Ombros, Cadeia Posterior, Tríceps e Panturrilha',
      exercises: exListB,
    });
  } else if (input.days === 3) {
    // 3 Days: Push / Pull / Legs
    const push = ['Peito', 'Peito', 'Ombros', 'Tríceps'];
    const pull = ['Costas', 'Costas', 'Trapézio', 'Bíceps', 'Antebraço'];
    const legs = ['Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha', 'Abdômen'];

    if (input.focus === 'Peito') push.unshift('Peito');
    if (input.focus === 'Ombros') push.splice(1, 0, 'Ombros');
    if (input.focus === 'Costas') pull.unshift('Costas');
    if (input.focus === 'Braços') {
      push.push('Tríceps');
      pull.push('Bíceps');
    }
    if (input.focus === 'Glúteos') legs.unshift('Glúteos');

    routines.push({
      name: 'Treino A — Empurrar (Peito + Ombros + Tríceps)',
      focusDescription: 'Cadeia anterior e empurrada',
      exercises: push.slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === input.focus)),
    });
    routines.push({
      name: 'Treino B — Puxar (Costas + Bíceps + Trapézio)',
      focusDescription: 'Dorsais, espessura e flexores de cotovelo',
      exercises: pull.slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === input.focus)),
    });
    routines.push({
      name: 'Treino C — Pernas & Core (Membros Inferiores)',
      focusDescription: 'Quadríceps, posteriores, glúteos e abdômen',
      exercises: legs.slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === input.focus)),
    });
  } else if (input.days === 4) {
    // 4 Days: Customized according to user example!
    if (input.focus === 'Ombros') {
      routines.push({
        name: 'Treino A — Ombros + Tríceps (Foco Primário)',
        focusDescription: 'Desenvolvimento, elevação lateral, face pull e tríceps',
        exercises: ['Ombros', 'Ombros', 'Ombros', 'Tríceps', 'Tríceps', 'Trapézio'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), true)),
      });
      routines.push({
        name: 'Treino B — Pernas Completo',
        focusDescription: 'Quadríceps, posterior, glúteos e panturrilha',
        exercises: ['Quadríceps', 'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino C — Costas + Bíceps',
        focusDescription: 'Puxadas, remadas, bíceps e abdômen',
        exercises: ['Costas', 'Costas', 'Costas', 'Bíceps', 'Bíceps', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino D — Peito + Deltoides (Ênfase Lateral/Posterior)',
        focusDescription: 'Peitorais e finalização de ombros para volume balanceado',
        exercises: ['Peito', 'Peito', 'Ombros', 'Ombros', 'Tríceps', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === 'Ombros')),
      });
    } else if (input.focus === 'Peito') {
      routines.push({
        name: 'Treino A — Peito + Tríceps (Ênfase)',
        focusDescription: 'Cargas compostas e miolo peitoral',
        exercises: ['Peito', 'Peito', 'Peito', 'Tríceps', 'Tríceps', 'Ombros'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === 'Peito')),
      });
      routines.push({
        name: 'Treino B — Costas + Bíceps',
        focusDescription: 'Largura e espessura de dorsais',
        exercises: ['Costas', 'Costas', 'Bíceps', 'Bíceps', 'Trapézio'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino C — Pernas Completo',
        focusDescription: 'Quadríceps, isquiotibiais e panturrilha',
        exercises: ['Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino D — Peito Superior + Ombros',
        focusDescription: 'Porção clavicular e deltoides',
        exercises: ['Peito', 'Peito', 'Ombros', 'Ombros', 'Tríceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), m === 'Peito')),
      });
    } else if (input.focus === 'Glúteos' || input.focus === 'Pernas') {
      routines.push({
        name: 'Treino A — Quadríceps + Glúteos',
        focusDescription: 'Agachamentos, leg press e elevações',
        exercises: ['Quadríceps', 'Quadríceps', 'Glúteos', 'Glúteos', 'Panturrilha'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), true)),
      });
      routines.push({
        name: 'Treino B — Superiores Completo (Peito + Costas + Ombros)',
        focusDescription: 'Manutenção harmônica de tronco e postura',
        exercises: ['Costas', 'Peito', 'Ombros', 'Bíceps', 'Tríceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino C — Posterior de Coxa + Glúteos',
        focusDescription: 'Stiff, flexoras e coice/abdução',
        exercises: ['Posterior de coxa', 'Posterior de coxa', 'Glúteos', 'Glúteos', 'Panturrilha'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), true)),
      });
      routines.push({
        name: 'Treino D — Braços + Abdômen & Cardio',
        focusDescription: 'Braços, estabilidade de core e queima calórica',
        exercises: ['Bíceps', 'Tríceps', 'Abdômen', 'Abdômen', 'Cardio / condicionamento'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
    } else {
      // Balanced 4-day Upper/Lower or Classic Split
      routines.push({
        name: 'Treino A — Peito + Tríceps',
        focusDescription: 'Peitorais, tríceps e deltoide anterior',
        exercises: ['Peito', 'Peito', 'Peito', 'Tríceps', 'Tríceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino B — Costas + Bíceps',
        focusDescription: 'Dorsais, trapézio e bíceps',
        exercises: ['Costas', 'Costas', 'Costas', 'Bíceps', 'Bíceps', 'Antebraço'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino C — Pernas & Glúteos',
        focusDescription: 'Quadríceps, posteriores, glúteos e panturrilha',
        exercises: ['Quadríceps', 'Quadríceps', 'Posterior de coxa', 'Glúteos', 'Panturrilha'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
      routines.push({
        name: 'Treino D — Ombros + Abdômen',
        focusDescription: 'Deltoides completo, trapézio e core',
        exercises: ['Ombros', 'Ombros', 'Ombros', 'Trapézio', 'Abdômen', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
      });
    }
  } else if (input.days === 5) {
    // 5 Days Split
    routines.push({
      name: 'Treino A — Peito',
      focusDescription: 'Força e densidade peitoral',
      exercises: ['Peito', 'Peito', 'Peito', 'Peito', 'Tríceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), input.focus === 'Peito')),
    });
    routines.push({
      name: 'Treino B — Costas',
      focusDescription: 'Largura de dorsais e espessura',
      exercises: ['Costas', 'Costas', 'Costas', 'Costas', 'Bíceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), input.focus === 'Costas')),
    });
    routines.push({
      name: 'Treino C — Pernas (Quadríceps + Panturrilha)',
      focusDescription: 'Cadeia anterior de membros inferiores',
      exercises: ['Quadríceps', 'Quadríceps', 'Quadríceps', 'Panturrilha', 'Panturrilha'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), input.focus === 'Pernas')),
    });
    routines.push({
      name: 'Treino D — Ombros + Trapézio',
      focusDescription: 'Deltoides anterior, lateral, posterior e trapézio',
      exercises: ['Ombros', 'Ombros', 'Ombros', 'Trapézio', 'Trapézio', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), input.focus === 'Ombros')),
    });
    routines.push({
      name: 'Treino E — Braços (Bíceps + Tríceps) ou Foco Especial',
      focusDescription: 'Braços completos e posterior de coxa/glúteos',
      exercises: ['Bíceps', 'Bíceps', 'Tríceps', 'Tríceps', 'Posterior de coxa', 'Glúteos'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), input.focus === 'Braços')),
    });
  } else {
    // 6 Days: Push / Pull / Legs 2x
    routines.push({
      name: 'Treino A — Push 1 (Peito + Tríceps)',
      focusDescription: 'Peitoral pesado e tríceps',
      exercises: ['Peito', 'Peito', 'Peito', 'Tríceps', 'Ombros'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
    });
    routines.push({
      name: 'Treino B — Pull 1 (Costas + Bíceps)',
      focusDescription: 'Puxadas pesadas e bíceps',
      exercises: ['Costas', 'Costas', 'Costas', 'Bíceps', 'Trapézio'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
    });
    routines.push({
      name: 'Treino C — Legs 1 (Quadríceps + Glúteos)',
      focusDescription: 'Agachamentos e quadríceps',
      exercises: ['Quadríceps', 'Quadríceps', 'Glúteos', 'Panturrilha', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
    });
    routines.push({
      name: 'Treino D — Push 2 (Ombros + Peito)',
      focusDescription: 'Ênfase em deltoides e peito superior',
      exercises: ['Ombros', 'Ombros', 'Peito', 'Peito', 'Tríceps'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), true)),
    });
    routines.push({
      name: 'Treino E — Pull 2 (Remadas + Bíceps)',
      focusDescription: 'Espessura de costas e braços',
      exercises: ['Costas', 'Costas', 'Bíceps', 'Bíceps', 'Antebraço'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
    });
    routines.push({
      name: 'Treino F — Legs 2 (Posteriores + Glúteos)',
      focusDescription: 'Isquiotibiais, glúteo e panturrilha',
      exercises: ['Posterior de coxa', 'Posterior de coxa', 'Glúteos', 'Panturrilha', 'Abdômen'].slice(0, exerciseCount).map(m => tuneExercise(pickExercise(m), false)),
    });
  }

  // If goal is 'Emagrecer' and cardio wasn't included, add 1 optional cardio finisher to end of first routine
  if (input.goal === 'Emagrecer') {
    const cardioEx = pickExercise('Cardio / condicionamento');
    if (cardioEx && routines[0].exercises.length < 8) {
      routines[0].exercises.push(tuneExercise(cardioEx, false));
    }
  }

  const focusLabel = input.focus === 'Equilibrado' || input.focus === 'Corpo inteiro'
    ? 'Distribuição Equilibrada'
    : `${input.focus} em foco`;

  return {
    title: `Divisão ${input.days}x — ${focusLabel}`,
    summary: `${input.days} dias • ${focusLabel} • ~${estimatedDuration} min • ${input.location}`,
    estimatedDuration,
    daysCount: input.days,
    focus: input.focus,
    goal: input.goal,
    routines,
  };
}
