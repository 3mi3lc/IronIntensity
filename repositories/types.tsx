// src/repositories/types.ts
import {
    users,
    exercises,
    workouts,
    workout_exercises,
    workout_exercise_sets, body_parts, exercise_body_parts,
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

export type BodyPart = typeof body_parts.$inferSelect;

export type ExerciseBodyPart = typeof exercise_body_parts.$inferSelect;
export type NewExerciseBodyPart = typeof exercise_body_parts.$inferInsert;

export type ExerciseWithSets = {
    workoutExerciseId: string;
    orderIndex: number | null;
    exercise: {
        id: string;
        name: string;
        description?: string | null;
        order_index: number;
    };
    sets: {
        id: string;
        setNumber: number;
        reps: number;
        weight: number | null;
    }[];
};

