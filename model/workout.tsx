import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Workout extends Model {
    static table = 'workout' as const;

    @field('name') name!: string;
    @date('created_at') createdAt!: Date;
    @field('user_id') userId!: string; // UUID as string
}
