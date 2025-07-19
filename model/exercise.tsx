import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Exercise extends Model {
    static table = 'exercise' as const;

    @field('name') name!: string;
    @field('description') description!: string | null;
    @field('user_id') userId!: string; // UUID as string
}
