import {database} from '@/model/database'
import Workouts from "@/model/workouts";


export class WorkoutRepository{
    // Local only (WatermelonDB)
    // Reading

    // Get all workouts locally
    async getLocalAll(): Promise<Workouts[]> {
        return database.get<Workouts>('workout').query().fetch();
    }

    // Find a workout by Id
    async findLocalById(id: string): Promise<Workouts | undefined> {
        try {
            return await database.get<Workouts>('workout').find(id);
        } catch {
            return undefined;
        }
    }

    // Update a workout be Id
    async updateLocalById(id: string, data: Partial<Omit<Workouts, 'id'>>) {
        const workout = await this.findLocalById(id)
        if (!workout) throw new Error('Workouts not found locally')

        await database.write(async () => {
            await workout.update(w => {
                if (data.name !== undefined) w.name = data.name
                if (data.createdAt !== undefined) w.createdAt = data.createdAt
                w.updatedAt = new Date();
            })
        })
    }

    // Insert a workout
    async insertLocal(data: Partial<Omit<Workouts, 'id'>>): Promise<Workouts> {
        let created: Workouts | null = null
        await database.write(async () => {
            created = await database.get<Workouts>('workout').create(w => {
                w.name = data.name!
                w.createdAt = data.createdAt ?? new Date();
                w.userId = data.userId!
                w.updatedAt = new Date();
            })
        })
        if (!created) throw new Error('Failed to create workout locally')
        return created
    }

    // Delete a workout by Id
    async deleteLocalById(id: string): Promise<void> {
        const workout = await this.findLocalById(id)
        if(!workout) throw new Error('Workouts not found locally')

        await database.write(async () => {
            await workout.markAsDeleted();
        });
    }

    // Remote only (Supabase)

}