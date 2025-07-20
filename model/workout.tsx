import { Model } from '@nozbe/watermelondb';
import {field, date, relation} from '@nozbe/watermelondb/decorators';
import User from "@/model/user";

export default class Workout extends Model {
    static table = 'workout' as const;

    @field('name') name!: string;
    @date('created_at') createdAt!: Date;
    @field('user_id') userId!: string; // UUID as string
    @date('updated_at') updatedAt!: Date

    @relation('user', 'user_id') user!: User;
}
