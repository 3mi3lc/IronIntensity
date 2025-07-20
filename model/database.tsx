import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import {schema} from "@/model/schema";
import migrations from "@/model/migrations";
import {Database} from "@nozbe/watermelondb";
import Exercise from "@/model/exercise";
import Workout from "@/model/workout";
import WorkoutExercise from "@/model/workout_exercise";
import WorkoutExerciseSet from "@/model/workout_exercise_set";

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
    modelClasses: [Exercise, Workout, WorkoutExercise, WorkoutExerciseSet],
})