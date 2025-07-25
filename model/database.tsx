import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import {schema} from "@/model/schema";
import migrations from "@/model/migrations";
import {Database} from "@nozbe/watermelondb";
import Exercises from "@/model/exercises";
import Workouts from "@/model/workouts";
import WorkoutExercises from "@/model/workout_exercises";
import WorkoutExerciseSets from "@/model/workout_exercise_sets";

const adapter = new SQLiteAdapter({
    schema,
    migrations,
    jsi: true,
    onSetUpError: error => {
        console.error("Database setup error:", error)
    }
})

// Watermelon database
export const database = new Database({
    adapter,
    modelClasses: [Exercises, Workouts, WorkoutExercises, WorkoutExerciseSets],
})