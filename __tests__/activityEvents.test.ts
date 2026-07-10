import { buildActivityEvents, ActivityInput } from '@/utils/activityEvents';

const base: ActivityInput = {
    summary: { workoutName: 'Push Day', setCount: 18, totalVolume: 8450, topLiftLabel: 'Bench Press', topWeight: 100 },
    prCount: 0,
    bestPr: null,
    currentStreak: 3, // not a milestone
    newBadges: [],
};

describe('buildActivityEvents', () => {
    it('always emits a workout_completed summary (no ratio without bodyweight)', () => {
        const events = buildActivityEvents(base);
        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({
            type: 'workout_completed',
            payload: {
                workout_name: 'Push Day',
                set_count: 18,
                total_volume: 8450,
                top_lift_label: 'Bench Press',
            },
        });
    });

    it('adds a relative_strength ratio only when bodyweight is known', () => {
        const events = buildActivityEvents({ ...base, bodyweightKg: 80 });
        // 100kg top set / 80kg bodyweight = 1.25
        expect(events[0].payload.relative_strength).toBe(1.25);
    });

    it('omits relative_strength when bodyweight is missing or no weighted set', () => {
        expect(buildActivityEvents({ ...base, bodyweightKg: null })[0].payload)
            .not.toHaveProperty('relative_strength');
        expect(buildActivityEvents({
            ...base,
            summary: { ...base.summary, topWeight: null },
            bodyweightKg: 80,
        })[0].payload).not.toHaveProperty('relative_strength');
    });

    it('adds a pr event carrying the absolute weight when a PR was set', () => {
        const events = buildActivityEvents({
            ...base,
            prCount: 2,
            bestPr: { exerciseName: 'Bench Press', weight: 100, reps: 5 },
        });
        const pr = events.find(e => e.type === 'pr');
        expect(pr?.payload).toEqual({
            pr_count: 2,
            exercise_name: 'Bench Press',
            weight: 100,
            reps: 5,
        });
    });

    it('adds a streak_milestone only on milestone weeks', () => {
        expect(buildActivityEvents({ ...base, currentStreak: 5 }).some(e => e.type === 'streak_milestone'))
            .toBe(false);
        const milestone = buildActivityEvents({ ...base, currentStreak: 12 })
            .find(e => e.type === 'streak_milestone');
        expect(milestone?.payload).toEqual({ weeks: 12 });
    });

    it('emits one badge_unlocked event per new badge', () => {
        const events = buildActivityEvents({
            ...base,
            newBadges: [
                { id: 'iron_50', title: '50 Workouts', icon: '🏋️' },
                { id: 'streak_4', title: 'Month Warrior', icon: '📅' },
            ],
        });
        const badges = events.filter(e => e.type === 'badge_unlocked');
        expect(badges).toHaveLength(2);
        expect(badges[0].payload).toEqual({ badge_id: 'iron_50', title: '50 Workouts', icon: '🏋️' });
    });

    it('combines all event types in order for a big finish', () => {
        const events = buildActivityEvents({
            summary: { workoutName: 'Leg Day', setCount: 20, totalVolume: 12000, topLiftLabel: 'Squat', topWeight: 140 },
            prCount: 1,
            bestPr: { exerciseName: 'Squat', weight: 140, reps: 3 },
            currentStreak: 52,
            newBadges: [{ id: 'streak_52', title: 'Full Year Grind', icon: '👑' }],
        });
        expect(events.map(e => e.type)).toEqual([
            'workout_completed', 'pr', 'streak_milestone', 'badge_unlocked',
        ]);
    });
});
