import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class WorkoutExerciseSet extends Model {
    static table = 'workout_exercise_sets' as const;
    static associations = {
        workout_exercise: { type: 'belongs_to', key: 'workout_exercise_id' } as const,
    };


    @field('workout_exercise_id') workoutExerciseId!: string | null;
    @field('set_number') setNumber!: number;
    @field('reps') reps!: number;
    @field('weight') weight!: number | null;
    @date('created_at') createdAt!: Date;
    @date('updated_at') updatedAt!: Date;
}
