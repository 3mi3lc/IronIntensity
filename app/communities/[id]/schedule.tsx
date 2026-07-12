import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Alert } from '@/utils/themedAlert';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { parse, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { getRecurringSchedules, setRecurringSchedule } from '@/repositories/communityCalendar';
import { TimePicker } from '@/components/timePicker';
import { logger } from '@/utils/logger';

// ISO weekdays: 1 = Mon .. 7 = Sun
const DAYS: { iso: number; label: string }[] = [
    { iso: 1, label: 'Mon' },
    { iso: 2, label: 'Tue' },
    { iso: 3, label: 'Wed' },
    { iso: 4, label: 'Thu' },
    { iso: 5, label: 'Fri' },
    { iso: 6, label: 'Sat' },
    { iso: 7, label: 'Sun' },
];

export default function ScheduleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [timeEnabled, setTimeEnabled] = useState(false);
    const [time, setTime] = useState(new Date());
    const [title, setTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Prefill from the caller's existing schedule.
    useEffect(() => {
        if (!id || !user?.id) return;
        let active = true;
        (async () => {
            try {
                const { data } = await getRecurringSchedules(id);
                const mine = data.find(r => r.user_id === user.id);
                if (active && mine) {
                    setSelected(new Set(mine.weekdays));
                    setTitle(mine.title ?? '');
                    if (mine.scheduled_time) {
                        setTimeEnabled(true);
                        setTime(parse(mine.scheduled_time, 'HH:mm', new Date()));
                    }
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [id, user?.id]);

    const toggleDay = (iso: number) =>
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(iso)) next.delete(iso); else next.add(iso);
            return next;
        });

    const handleSave = async () => {
        if (!id) return;
        if (selected.size === 0) {
            Alert.alert('Pick a day', 'Select at least one training day.');
            return;
        }
        setSubmitting(true);
        try {
            await setRecurringSchedule(
                id,
                [...selected].sort((a, b) => a - b),
                timeEnabled ? format(time, 'HH:mm') : null,
                title.trim() || null,
            );
            router.back();
        } catch (e) {
            logger.error('Failed to save schedule:', e);
            Alert.alert('Could not save', 'Check your connection and try again.');
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
                    <Text className="text-primary_a0 font-bold text-2xl text-center">My schedule</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {loading ? (
                    <View className="mt-16 items-center">
                        <ActivityIndicator size="large" color="#f34023" />
                    </View>
                ) : (
                  <>
                <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3 mt-4">Training days</Text>
                <View className="flex-row flex-wrap gap-2">
                    {DAYS.map(d => (
                        <TouchableOpacity
                            key={d.iso}
                            onPress={() => toggleDay(d.iso)}
                            className={`px-4 py-3 rounded-xl ${selected.has(d.iso) ? 'bg-primary_a0' : 'bg-surface_a10'}`}
                            activeOpacity={0.85}
                        >
                            <Text className={`font-bold ${selected.has(d.iso) ? 'text-white' : 'text-surface_a50'}`}>{d.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="flex-row items-center justify-between mt-8">
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

                <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-6">Title (optional)</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Push/Pull/Legs"
                    placeholderTextColor="#7a7a7a"
                    className="bg-surface_a10 text-white text-base px-4 py-4 rounded-xl"
                    maxLength={40}
                />

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={submitting}
                    className={`py-4 rounded-xl flex-row items-center justify-center mt-8 ${submitting ? 'bg-surface_a20' : 'bg-primary_a0'}`}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base">{submitting ? 'Saving...' : 'Save schedule'}</Text>
                </TouchableOpacity>
                  </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
