import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Users extends Model {
    static table = 'users' as const;
    static associations = {
        workout: { type: 'has_many', foreignKey: 'user_id' } as const,
        exercise: { type: 'has_many', foreignKey: 'user_id' } as const,
    }


    @field('email') email!: string;
    @field('name') name!: string;
    @field('avatar_url') avatarUrl!: string | null;

}
