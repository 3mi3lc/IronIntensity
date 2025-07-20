import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
    static table = 'user' as const;

    @field('email') email!: string;
    @field('name') name!: string;
    @field('avatar_url') avatarUrl!: string | null;

}
