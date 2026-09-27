import { ALL_EXERCISES, ExerciseSeed } from './exerciseData.js';
import { EXERCISES_PART_2 } from './exerciseDataPart2.js';
import { EXERCISES_PART_3 } from './exerciseDataPart3.js';
import { EXERCISES_PART_4 } from './exerciseDataPart4.js';

export const COMPLETE_EXERCISE_LIBRARY: ExerciseSeed[] = [
  ...ALL_EXERCISES,
  ...EXERCISES_PART_2,
  ...EXERCISES_PART_3,
  ...EXERCISES_PART_4,
];
