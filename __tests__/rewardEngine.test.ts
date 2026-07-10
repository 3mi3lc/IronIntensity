import { pickFinishReward, FinishRewardInput } from '@/utils/rewardEngine';

const base: FinishRewardInput = {
    prCount: 0,
    bestPr: null,
    newBadgeCount: 0,
    currentStreak: 3,
    totalWorkouts: 12,
    isBestVolumeMonth: false,
    prevFinishHadConfetti: false,
    random: () => 0.99, // high roll => no random payout by default
};

describe('pickFinishReward', () => {
    it('returns null on an ordinary finish with a high roll', () => {
        expect(pickFinishReward(base)).toBeNull();
    });

    it('defers to badges: returns null when a badge unlocked', () => {
        expect(pickFinishReward({ ...base, newBadgeCount: 1, prCount: 3, totalWorkouts: 10 }))
            .toBeNull();
    });

    it('summarises a single session PR', () => {
        const r = pickFinishReward({
            ...base,
            prCount: 1,
            bestPr: { exerciseName: 'Bench Press', weight: 100, reps: 5 },
        });
        expect(r?.kind).toBe('pr');
        expect(r?.toastType).toBe('pr');
        expect(r?.text2).toBe('Bench Press: 100kg x 5');
        expect(r?.confetti).toBe(false); // single PR: no confetti
    });

    it('fires confetti for multiple session PRs', () => {
        const r = pickFinishReward({ ...base, prCount: 3 });
        expect(r?.kind).toBe('pr');
        expect(r?.confetti).toBe(true);
    });

    it('suppresses confetti when the previous finish already fired it', () => {
        const r = pickFinishReward({ ...base, prCount: 3, prevFinishHadConfetti: true });
        expect(r?.confetti).toBe(false);
    });

    it('celebrates a workout-count milestone with confetti', () => {
        const r = pickFinishReward({ ...base, totalWorkouts: 50 });
        expect(r?.kind).toBe('milestone');
        expect(r?.confetti).toBe(true);
        expect(r?.text1).toContain('50');
    });

    it('celebrates a week-based streak milestone', () => {
        const r = pickFinishReward({ ...base, currentStreak: 12 });
        expect(r?.kind).toBe('milestone');
        expect(r?.text1).toContain('12-week');
    });

    it('does not treat a non-milestone week count as a streak milestone', () => {
        // 30 was a day-based milestone; it must not fire under week-based streaks.
        const r = pickFinishReward({ ...base, currentStreak: 30 });
        expect(r).toBeNull();
    });

    it('PRs take precedence over milestones', () => {
        const r = pickFinishReward({ ...base, prCount: 1, totalWorkouts: 50 });
        expect(r?.kind).toBe('pr');
    });

    it('surfaces best-month when true and the roll passes', () => {
        const r = pickFinishReward({ ...base, isBestVolumeMonth: true, random: () => 0.1 });
        expect(r?.kind).toBe('bestMonth');
        expect(r?.confetti).toBe(false);
    });

    it('does not surface best-month when the roll fails', () => {
        const r = pickFinishReward({ ...base, isBestVolumeMonth: true, random: () => 0.9 });
        expect(r).toBeNull();
    });

    it('shows an encouraging line on a low ordinary roll', () => {
        const r = pickFinishReward({ ...base, random: () => 0.05 });
        expect(r?.kind).toBe('celebration');
        expect(r?.toastType).toBe('celebration');
        expect(typeof r?.text1).toBe('string');
    });
});
