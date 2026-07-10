import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Confetti } from '@/components/confettiOverlay';
import { pickFinishReward, FinishReward } from '@/utils/rewardEngine';

/**
 * DEV-ONLY preview harness for the variable finish rewards. Fires each
 * celebration through the exact same render path as the real finish flow
 * (Toast.show + Confetti.fire) so the visuals match production, without having
 * to complete real workouts. Reachable from the Profile screen only when __DEV__.
 */

function showReward(reward: FinishReward) {
    Toast.show({
        type: reward.toastType,
        text1: reward.text1,
        text2: reward.text2,
        visibilityTime: 3000,
        position: 'top',
    });
    if (reward.confetti) {
        setTimeout(() => Confetti.fire(), 150);
    }
}

// Representative rewards, one per branch of the engine.
const SAMPLES: { label: string; hint: string; reward: FinishReward }[] = [
    {
        label: 'Single session PR',
        hint: 'pr toast, no confetti',
        reward: {
            kind: 'pr',
            toastType: 'pr',
            text1: 'New personal record this session! 🏆',
            text2: 'Bench Press: 100kg x 5',
            confetti: false,
        },
    },
    {
        label: 'Multiple PRs',
        hint: 'pr toast + confetti',
        reward: {
            kind: 'pr',
            toastType: 'pr',
            text1: '3 personal records this session! 🏆',
            text2: 'Deadlift: 180kg x 3',
            confetti: true,
        },
    },
    {
        label: 'Workout milestone',
        hint: 'celebration toast + confetti',
        reward: {
            kind: 'milestone',
            toastType: 'celebration',
            text1: '50 workouts logged. Milestone!',
            text2: '🎉',
            confetti: true,
        },
    },
    {
        label: 'Streak milestone',
        hint: 'celebration toast + confetti',
        reward: {
            kind: 'milestone',
            toastType: 'celebration',
            text1: '12-week streak. On fire!',
            text2: '🔥',
            confetti: true,
        },
    },
    {
        label: 'Best month yet',
        hint: 'pr toast, no confetti',
        reward: {
            kind: 'bestMonth',
            toastType: 'pr',
            text1: 'Biggest lifting month yet 💪',
            text2: 'Most total volume of any month so far.',
            confetti: false,
        },
    },
    {
        label: 'Encouraging line',
        hint: 'celebration toast, no confetti',
        reward: {
            kind: 'celebration',
            toastType: 'celebration',
            text1: 'That is how it is done.',
            text2: '💪',
            confetti: false,
        },
    },
    {
        label: 'Encouraging line + confetti',
        hint: 'the rare ordinary-finish payout',
        reward: {
            kind: 'celebration',
            toastType: 'celebration',
            text1: 'No zero days. Nicely done.',
            text2: '🔥',
            confetti: true,
        },
    },
];

export default function RewardPreview() {
    // Roll the real engine with neutral inputs so most rolls return null,
    // exactly like an ordinary finish. Fire whatever it decides.
    const rollRealEngine = () => {
        const reward = pickFinishReward({
            prCount: 0,
            bestPr: null,
            newBadgeCount: 0,
            currentStreak: 3,
            totalWorkouts: 12,
            isBestVolumeMonth: false,
            prevFinishHadConfetti: false,
        });
        if (reward) {
            showReward(reward);
        } else {
            Toast.show({
                type: 'celebration',
                text1: 'Plain finish (no reward rolled)',
                text2: '🙂',
                visibilityTime: 1800,
                position: 'top',
            });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="pt-4 pb-6 flex-row items-center px-6 gap-3">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-surface_a10 items-center justify-center"
                    activeOpacity={0.8}
                >
                    <AntDesign name="arrow-left" size={20} color="white" />
                </TouchableOpacity>
                <View>
                    <Text className="text-primary_a0 font-bold text-2xl">Reward Preview</Text>
                    <Text className="text-surface_a50 text-sm mt-1">Dev-only celebration harness</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {SAMPLES.map((s) => (
                    <TouchableOpacity
                        key={s.label}
                        onPress={() => showReward(s.reward)}
                        className="bg-surface_a10 p-5 rounded-2xl mb-3 flex-row items-center justify-between"
                        activeOpacity={0.85}
                    >
                        <View className="flex-1">
                            <Text className="text-white font-bold text-base">{s.label}</Text>
                            <Text className="text-surface_a50 text-xs mt-1">{s.hint}</Text>
                        </View>
                        <AntDesign name="play-circle" size={22} color="#f34023" />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    onPress={() => Confetti.fire()}
                    className="bg-surface_a10 p-5 rounded-2xl mb-3 flex-row items-center justify-between"
                    activeOpacity={0.85}
                >
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base">Confetti only</Text>
                        <Text className="text-surface_a50 text-xs mt-1">no toast, just the burst</Text>
                    </View>
                    <AntDesign name="star" size={22} color="#ffd166" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={rollRealEngine}
                    className="bg-primary_a10 p-5 rounded-2xl mb-3 flex-row items-center justify-between"
                    activeOpacity={0.85}
                >
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base">Roll the real engine</Text>
                        <Text className="text-white/70 text-xs mt-1">
                            neutral inputs, so most rolls are a plain finish
                        </Text>
                    </View>
                    <AntDesign name="reload" size={22} color="white" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
