/**
 * Maps the signals available at workout finish into community feed events.
 *
 * Pure and side-effect free so it can be unit-tested. The finish flow gathers
 * the inputs (already computed for the reward roll), calls {@link buildActivityEvents},
 * and queues the result for the emit_activity RPC. Summaries only: no raw sets,
 * no bodyweight. PRs are the one carve-out that carries an absolute weight, since
 * a PR is an earned highlight the member wants seen.
 */

export type ActivityEventType =
    | 'workout_completed'
    | 'pr'
    | 'streak_milestone'
    | 'badge_unlocked';

export interface ActivityEvent {
    type: ActivityEventType;
    payload: Record<string, unknown>;
}

export interface WorkoutSummary {
    workoutName: string;
    setCount: number;
    totalVolume: number;
    topLiftLabel: string | null;
    /** Heaviest single-set weight (kg) this workout, or null if none weighted. */
    topWeight: number | null;
}

export interface BadgeUnlock {
    id: string;
    title: string;
    icon: string;
}

export interface ActivityInput {
    summary: WorkoutSummary;
    /** Number of PR sets this session. */
    prCount: number;
    /** Heaviest PR set this session, for the card copy. */
    bestPr: { exerciseName: string; weight: number; reps: number } | null;
    /** Current streak in consecutive weeks, after this finish. */
    currentStreak: number;
    /** Badges newly unlocked by this finish. */
    newBadges: BadgeUnlock[];
    /**
     * Latest bodyweight (kg), or null if none logged. Used only to derive a
     * relative-strength ratio here; the raw bodyweight is never placed in the
     * emitted payload, so it never reaches the community feed.
     */
    bodyweightKg?: number | null;
}

/** Strength-to-bodyweight ratio for the heaviest lift, or null if not derivable. */
function relativeStrength(topWeight: number | null, bodyweightKg: number | null | undefined): number | null {
    if (!topWeight || !bodyweightKg || bodyweightKg <= 0) return null;
    return Math.round((topWeight / bodyweightKg) * 100) / 100;
}

// Streak milestones worth a feed event, in consecutive weeks. Mirrors the set in
// utils/rewardEngine.ts — keep the two in sync.
const STREAK_MILESTONES = new Set([4, 8, 12, 26, 52, 78, 104]);

/**
 * Build the ordered list of feed events for one finished workout. Always emits a
 * `workout_completed` summary; adds `pr`, `streak_milestone`, and one
 * `badge_unlocked` per new badge when those apply.
 */
export function buildActivityEvents(input: ActivityInput): ActivityEvent[] {
    const events: ActivityEvent[] = [];

    const relStrength = relativeStrength(input.summary.topWeight, input.bodyweightKg);
    events.push({
        type: 'workout_completed',
        payload: {
            workout_name: input.summary.workoutName,
            set_count: input.summary.setCount,
            total_volume: input.summary.totalVolume,
            top_lift_label: input.summary.topLiftLabel,
            // Only the derived ratio is emitted, never the bodyweight. Omitted
            // (rather than null) when it cannot be derived.
            ...(relStrength != null ? { relative_strength: relStrength } : {}),
        },
    });

    if (input.prCount > 0) {
        events.push({
            type: 'pr',
            payload: {
                pr_count: input.prCount,
                exercise_name: input.bestPr?.exerciseName ?? null,
                weight: input.bestPr?.weight ?? null,
                reps: input.bestPr?.reps ?? null,
            },
        });
    }

    if (STREAK_MILESTONES.has(input.currentStreak)) {
        events.push({
            type: 'streak_milestone',
            payload: { weeks: input.currentStreak },
        });
    }

    for (const badge of input.newBadges) {
        events.push({
            type: 'badge_unlocked',
            payload: { badge_id: badge.id, title: badge.title, icon: badge.icon },
        });
    }

    return events;
}
