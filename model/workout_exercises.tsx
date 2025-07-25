import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class WorkoutExercise extends Model {
    static table = 'workout_exercises' as const;
    static associations = {
        workout: { type: 'belongs_to', key: 'workout_id' } as const,
        exercise: { type: 'belongs_to', key: 'exercise_id' } as const,
        workout_exercise_set: { type: 'has_many', foreignKey: 'workout_exercise_id' } as const,
    };


    @field('workout_id') workoutId!: string | null; // nullable uuid foreign key
    @field('exercise_id') exerciseId!: string | null; // nullable uuid foreign key
    @field('order_index') orderIndex!: number | null;
    @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
}
