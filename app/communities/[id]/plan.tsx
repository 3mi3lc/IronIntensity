import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { Alert } from '@/utils/themedAlert';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ThemedCalendar } from '@/components/themedCalendar';
import { createPlannedSession } from '@/repositories/communityCalendar';
import { TimePicker } from '@/components/timePicker';
import { getNotifPrefs } from '@/utils/notificationPrefs';
import { scheduleSessionReminder } from '@/utils/localReminders';
import { logger } from '@/utils/logger';

export default function PlanSessionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [date, setDate] = useState(new Date());
    const [timeEnabled, setTimeEnabled] = useState(false);
    const [time, setTime] = useState(new Date());
    const [title, setTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!id) return;
        setSubmitting(true);
        try {
            const created = await createPlannedSession(
                id,
                format(date, 'yyyy-MM-dd'),
                timeEnabled ? format(time, 'HH:mm') : null,
                title.trim() || null,
            );
            const prefs = await getNotifPrefs();
            await scheduleSessionReminder(created.id, created.scheduled_date, created.scheduled_time, title.trim() || null, prefs);
            router.back();
        } catch (e) {
            logger.error('Failed to plan session:', e);
            Alert.alert('Could not plan', 'Check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface_a10 rounded-xl" activeOpacity={0.7}>
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Plan a session</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Date */}
                <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-4">Date</Text>
                <View className="bg-surface_a20 rounded-xl overflow-hidden">
                    <ThemedCalendar
                        minDate={format(new Date(), 'yyyy-MM-dd')}
                        onDayPress={(day) => setDate(parseISO(day.dateString))}
                        markedDates={{ [format(date, 'yyyy-MM-dd')]: { selected: true } }}
                    />
                </View>

                {/* Time (optional) */}
                <View className="flex-row items-center justify-between mt-6">
                    <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider">Set a time</Text>
                    <Switch
                        value={timeEnabled}
                        onValueChange={setTimeEnabled}
                        trackColor={{ true: '#f34023', false: '#3a3a3a' }}
                        thumbColor="#fff"
                    />
                </View>
                {timeEnabled && (
                    <View className="mt-3">
                        <TimePicker value={time} onChange={setTime} />
                    </View>
                )}

                {/* Title */}
                <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-6">Title (optional)</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Leg day, Morning run"
                    placeholderTextColor="#7a7a7a"
                    className="bg-surface_a10 text-white text-base px-4 py-4 rounded-xl"
                    maxLength={40}
                />

                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={submitting}
                    className={`py-4 rounded-xl flex-row items-center justify-center mt-8 ${submitting ? 'bg-surface_a20' : 'bg-primary_a0'}`}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base">{submitting ? 'Planning...' : 'Plan session'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
