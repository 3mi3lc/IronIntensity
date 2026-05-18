// hooks/useStreak.ts
import { useState, useEffect } from 'react';
import { getWorkoutStreak } from '@/repositories/statistics';

export function useStreak(userId: string | undefined, refreshTrigger?: any) {
    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        getWorkoutStreak(userId)
            .then(({ current, longest }) => {
                setCurrentStreak(current);
                setLongestStreak(longest);
            })
            .catch(err => console.error('Failed to load streak:', err))
            .finally(() => setLoading(false));
    }, [userId, refreshTrigger]);

    return { currentStreak, longestStreak, loading };
}