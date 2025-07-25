import { Model } from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import Users from "@/model/users";

export default class Workouts extends Model {
    static table = 'workouts' as const;
    static associations = {
            workout_exercise: {type: 'has_many', foreignKey: 'workout_id'} as const,
    }

    @field('name') name!: string;
    @date('created_at') createdAt!: Date;
    @field('user_id') userId!: string; // UUID as string
    @date('updated_at') updatedAt!: Date

    @relation('user', 'user_id') user!: Users;
}
