import {database} from '@/model/database'
import {supabase} from "@/utils/supabase";
import Workout from "@/model/workout";


export class WorkoutRepository{
    // Local only
    // Reading

    // Get all workouts locally
    async getLocalAll(): Promise<Workout[]> {
        return database.get<Workout>('workout').query().fetch();
    }

    // Find a workout by Id
    async findLocalById(id: string): Promise<Workout | undefined> {
        try {
            return await database.get<Workout>('workout').find(id);
        } catch {
            return undefined;
        }
    }

    // Update a workout be Id
    async updateLocalById(id: string, data: Partial<Omit<Workout, 'id'>>) {
        const workout = await this.findLocalById(id)
        if (!workout) throw new Error('Workout not found locally')

        await database.write(async () => {
            await workout.update(w => {
                if (data.name !== undefined) w.name = data.name
                if (data.createdAt !== undefined) w.createdAt = data.createdAt
                w.updatedAt = new Date(Date.now());
            })
        })
    }

    // Insert a workout
    async insertLocal(data: Partial<Omit<Workout, 'id'>>): Promise<Workout> {
        let created: Workout | null = null
        await database.write(async () => {
            created = await database.get<Workout>('workout').create(w => {
                w.name = data.name!
                w.createdAt = data.createdAt ?? new Date(Date.now());
                w.userId = data.userId!
                w.updatedAt = new Date(Date.now());
            })
        })
        if (!created) throw new Error('Failed to create workout locally')
        return created
    }

    // Delete a workout
    async deleteLocalById(id: string): Promise<void> {
        const workout = await this.findLocalById(id)
        if(!workout) throw new Error('Workout not found locally')

        await database.write(async () => {
            await workout.markAsDeleted();
        });
    }

    // Remote only


    // Mixed

}






