import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { parse, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { TimePicker } from '@/components/timePicker';
import { getNotifPrefs, setNotifPrefs, NotifPrefs } from '@/utils/notificationPrefs';
import { refreshWorkoutReminder, refreshStreakReminder } from '@/utils/localReminders';
import { ensureNotificationPermissions, getExpoPushToken } from '@/utils/notifications';
import { registerPushToken, clearPushTokens } from '@/repositories/pushTokens';
import { logger } from '@/utils/logger';

function Row({ title, subtitle, value, onValueChange }: {
    title: string; subtitle: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
    return (
        <View className="flex-row items-center justify-between py-4 border-b border-surface_a20">
            <View className="flex-1 mr-3">
                <Text className="text-white font-semibold">{title}</Text>
                <Text className="text-surface_a50 text-xs mt-0.5">{subtitle}</Text>
            </View>
            <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#f34023', false: '#3a3a3a' }} thumbColor="#fff" />
        </View>
    );
}

export default function NotificationSettingsScreen() {
    const { user } = useAuth();
    const [prefs, setPrefs] = useState<NotifPrefs | null>(null);

    useEffect(() => { getNotifPrefs().then(setPrefs); }, []);

    const update = async (patch: Partial<NotifPrefs>) => {
        setPrefs(prev => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            (async () => {
                try {
                    await setNotifPrefs(next);
                    await refreshWorkoutReminder(next);
                    if (user?.id) await refreshStreakReminder(user.id, next);
                    if (patch.push !== undefined) {
                        if (patch.push) {
                            const granted = await ensureNotificationPermissions();
                            if (granted) {
                                const t = await getExpoPushToken();
                                if (t) await registerPushToken(t);
                            }
                        } else if (user?.id) {
                            await clearPushTokens(user.id);
                        }
                    }
                } catch (e) {
                    logger.warn('Failed to apply notification prefs', e);
                }
            })();
            return next;
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface_a10 rounded-xl" activeOpacity={0.7}>
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Notifications</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {!prefs ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#f34023" />
                </View>
            ) : (
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
                    <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mt-4 mb-1">Social</Text>
                    <View className="bg-surface_a10 rounded-xl px-4">
                        <Row
                            title="Push notifications"
                            subtitle="Kudos, RSVPs to your sessions, and reports"
                            value={prefs.push}
                            onValueChange={v => update({ push: v })}
                        />
                        <View className="flex-row items-center justify-between py-4">
                            <View className="flex-1 mr-3">
                                <Text className="text-white font-semibold">Session reminders</Text>
                                <Text className="text-surface_a50 text-xs mt-0.5">A nudge an hour before a planned session</Text>
                            </View>
                            <Switch value={prefs.sessionReminders} onValueChange={v => update({ sessionReminders: v })} trackColor={{ true: '#f34023', false: '#3a3a3a' }} thumbColor="#fff" />
                        </View>
                    </View>

                    <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mt-6 mb-1">Training</Text>
                    <View className="bg-surface_a10 rounded-xl px-4">
                        <Row
                            title="Daily workout reminder"
                            subtitle="A daily nudge to train"
                            value={prefs.workoutReminder}
                            onValueChange={v => update({ workoutReminder: v })}
                        />
                        {prefs.workoutReminder && (
                            <View className="py-4 border-b border-surface_a20">
                                <Text className="text-surface_a50 text-xs mb-2">Reminder time</Text>
                                <TimePicker
                                    value={parse(prefs.workoutReminderTime, 'HH:mm', new Date())}
                                    onChange={d => update({ workoutReminderTime: format(d, 'HH:mm') })}
                                />
                            </View>
                        )}
                        <View className="flex-row items-center justify-between py-4">
                            <View className="flex-1 mr-3">
                                <Text className="text-white font-semibold">Streak at risk</Text>
                                <Text className="text-surface_a50 text-xs mt-0.5">Warn me before a weekly streak lapses</Text>
                            </View>
                            <Switch value={prefs.streakReminder} onValueChange={v => update({ streakReminder: v })} trackColor={{ true: '#f34023', false: '#3a3a3a' }} thumbColor="#fff" />
                        </View>
                    </View>

                    <Text className="text-surface_a50 text-xs text-center mt-6">
                        Push needs notification permission and a rebuild that includes the notifications module.
                    </Text>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
