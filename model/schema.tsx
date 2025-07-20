// schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'exercises',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'user_id', type: 'string' },
                { name: 'updated_at', type: 'number' }, // epoch timestamp (for sync)
                { name: 'remote_id', type: 'string', isIndexed: true }, // Supabase UUID
            ]
        }),
        tableSchema({
            name: 'workouts',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'user_id', type: 'string' },
                { name: 'updated_at', type: 'number' },
                { name: 'remote_id', type: 'string', isIndexed: true },
            ]
        }),
        tableSchema({
            name: 'workout_exercises',
            columns: [
                { name: 'workout_id', type: 'string' },
                { name: 'exercise_id', type: 'string' },
                { name: 'order_index', type: 'number' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'remote_id', type: 'string', isIndexed: true },
            ]
        }),
        tableSchema({
            name: 'workout_exercise_sets',
            columns: [
                { name: 'workout_exercise_id', type: 'string' },
                { name: 'set_number', type: 'number' },
                { name: 'reps', type: 'number' },
                { name: 'weight', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'remote_id', type: 'string', isIndexed: true },
            ]
        }),
        tableSchema({
            name: 'user',
            columns: [
                { name: 'email', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'display_name', type: 'string' },
            ],
        })
    ],
})
