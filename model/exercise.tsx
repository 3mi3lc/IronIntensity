import { Model } from '@nozbe/watermelondb';
import {date, field, relation} from '@nozbe/watermelondb/decorators';
import User from "@/model/user";

export default class Exercise extends Model {
    static table = 'exercise' as const;

    @field('name') name!: string;
    @field('description') description!: string | null;
    @field('user_id') userId!: string; // UUID as string
    @date('updated_at') updatedAt!: Date;

    @relation('user', 'user_id') user!: User;
}
