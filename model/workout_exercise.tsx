import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class WorkoutExercise extends Model {
    static table = 'workout_exercise' as const;

    @field('workout_id') workoutId!: string | null; // nullable uuid foreign key
    @field('exercise_id') exerciseId!: string | null; // nullable uuid foreign key
    @field('order_index') orderIndex!: number | null;
    @date('created_at') createdAt!: Date;
}
