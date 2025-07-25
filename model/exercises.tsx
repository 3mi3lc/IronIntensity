import { Model } from '@nozbe/watermelondb';
import {date, field, relation} from '@nozbe/watermelondb/decorators';
import Users from "@/model/users";

export default class Exercises extends Model {
    static table = 'exercises' as const;
    static associations = {
        workout_exercise: { type: 'has_many', foreignKey: 'exercise_id' } as const,
    };

    @field('name') name!: string;
    @field('description') description!: string | null;
    @field('user_id') userId!: string; // UUID as string
    @date('updated_at') updatedAt!: Date;

    @relation('user', 'user_id') user!: Users;
}
