/**
 * Variable-reward engine for the workout finish moment.
 *
 * The finish flow calls {@link pickFinishReward} once per completed workout. Most
 * ordinary finishes return `null` (plain confirmation, no fanfare). The point is
 * a variable-ratio schedule: earned events (PRs, milestones) always pay out,
 * while an ordinary finish only occasionally surfaces a small celebration. The
 * unpredictability is what keeps the moment from going stale.
 *
 * This module is intentionally pure — all randomness and "now" are injected — so
 * the probability logic can be unit-tested deterministically.
 */

export interface FinishRewardInput {
    /** Number of sets flagged as PRs in this workout (session summary, not per-set). */
    prCount: number;
    /** The heaviest PR set this session, for copy. */
    bestPr?: { exerciseName: string; weight: number; reps: number } | null;
    /** Badges unlocked by this finish. When > 0 we defer to the badge toasts. */
    newBadgeCount: number;
    /** Current workout streak in consecutive weeks, after this finish. */
    currentStreak: number;
    /** Lifetime completed workout count, including this one. */
    totalWorkouts: number;
    /** True when this calendar month's volume is the highest of any month so far. */
    isBestVolumeMonth: boolean;
    /** Whether the immediately previous finish already fired confetti (cooldown). */
    prevFinishHadConfetti: boolean;
    /** Injected RNG in [0, 1). Defaults to Math.random. */
    random?: () => number;
}

export type FinishRewardKind = 'pr' | 'milestone' | 'bestMonth' | 'celebration';

export interface FinishReward {
    kind: FinishRewardKind;
    /** Toast variant to render. */
    toastType: 'pr' | 'achievement' | 'celebration';
    text1: string;
    text2?: string;
    confetti: boolean;
}

// Probability an ordinary finish (no earned event) surfaces an encouraging line.
const ORDINARY_LINE_CHANCE = 0.18;
// Of those lines, the share that also gets confetti (=> ~5% of ordinary finishes).
const ORDINARY_CONFETTI_SHARE = 0.28;
// Probability a genuine "best month" fact gets surfaced when it's true.
const BEST_MONTH_CHANCE = 0.5;

// Lifetime workout-count milestones worth a confetti moment.
const WORKOUT_MILESTONES = new Set([1, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500]);
// Streak milestones, in consecutive weeks, worth a confetti moment.
// (4 weeks ~ 1 month, 26 ~ 6 months, 52 ~ 1 year, 104 ~ 2 years.)
const STREAK_MILESTONES = new Set([4, 8, 12, 26, 52, 78, 104]);

const ENCOURAGING_LINES = [
    'That is how it is done.',
    'Iron does not lie. You showed up.',
    'Another one in the books.',
    'Consistency is a superpower.',
    'Showed up again. That is the whole game.',
    'Your future self says thanks.',
    'Small sessions, big results.',
    'Progress is quiet. Keep stacking it.',
    'Strong work today.',
    'You versus yesterday. You won.',
    'Reps in the bank.',
    'This is what discipline looks like.',
    'One more brick in the wall.',
    'No zero days. Nicely done.',
    'The work is working.',
    'Earned that post-workout feeling.',
];

const CELEBRATION_EMOJIS = ['💪', '🔥', '⚡', '🙌', '👏', '💥', '🏋️'];

function pick<T>(arr: readonly T[], random: () => number): T {
    return arr[Math.floor(random() * arr.length)];
}

/**
 * Decide what (if anything) to celebrate for a completed workout.
 * Returns `null` for a plain confirmation with no extra fanfare.
 *
 * Precedence: badge unlocks (handled elsewhere) > session PRs > count/streak
 * milestones > true "best month" > occasional random line. Only one reward ever
 * fires per finish.
 */
export function pickFinishReward(input: FinishRewardInput): FinishReward | null {
    const random = input.random ?? Math.random;

    // Earned badges get their own dedicated toasts in the finish flow. Suppress
    // our roll so the finish moment is not a pile-up of overlapping toasts.
    if (input.newBadgeCount > 0) {
        return null;
    }

    // Confetti cooldown: never two confetti finishes back to back.
    const allowConfetti = !input.prevFinishHadConfetti;

    // 1. Session PRs — a summary of the whole workout, distinct from the
    //    per-set PR toasts shown live during the session.
    if (input.prCount > 0) {
        const text2 = input.bestPr
            ? `${input.bestPr.exerciseName}: ${input.bestPr.weight}kg x ${input.bestPr.reps}`
            : undefined;
        const text1 =
            input.prCount === 1
                ? 'New personal record this session! 🏆'
                : `${input.prCount} personal records this session! 🏆`;
        return {
            kind: 'pr',
            toastType: 'pr',
            text1,
            text2,
            confetti: allowConfetti && input.prCount >= 2,
        };
    }

    // 2. Milestones — deterministic, always celebrated.
    if (WORKOUT_MILESTONES.has(input.totalWorkouts)) {
        return {
            kind: 'milestone',
            toastType: 'celebration',
            text1:
                input.totalWorkouts === 1
                    ? 'First workout logged. It begins.'
                    : `${input.totalWorkouts} workouts logged. Milestone!`,
            text2: '🎉',
            confetti: allowConfetti,
        };
    }
    if (STREAK_MILESTONES.has(input.currentStreak)) {
        return {
            kind: 'milestone',
            toastType: 'celebration',
            text1: `${input.currentStreak}-week streak. On fire!`,
            text2: '🔥',
            confetti: allowConfetti,
        };
    }

    // 3. A genuine "best month so far" — only when actually true, surfaced
    //    occasionally so it stays special.
    if (input.isBestVolumeMonth && random() < BEST_MONTH_CHANCE) {
        return {
            kind: 'bestMonth',
            toastType: 'pr',
            text1: 'Biggest lifting month yet 💪',
            text2: 'Most total volume of any month so far.',
            confetti: false,
        };
    }

    // 4. Ordinary finish — occasional encouraging line, rarely with confetti.
    if (random() < ORDINARY_LINE_CHANCE) {
        const withConfetti = allowConfetti && random() < ORDINARY_CONFETTI_SHARE;
        return {
            kind: 'celebration',
            toastType: 'celebration',
            text1: pick(ENCOURAGING_LINES, random),
            text2: pick(CELEBRATION_EMOJIS, random),
            confetti: withConfetti,
        };
    }

    // Most finishes: no extra fanfare.
    return null;
}
