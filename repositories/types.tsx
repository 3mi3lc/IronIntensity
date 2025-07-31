// src/repositories/types.ts
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets,
} from '@/db/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;

export type WorkoutExercise = typeof workout_exercises.$inferSelect;
export type NewWorkoutExercise = typeof workout_exercises.$inferInsert;

export type WorkoutExerciseSet = typeof workout_exercise_sets.$inferSelect;
export type NewWorkoutExerciseSet = typeof workout_exercise_sets.$inferInsert;
