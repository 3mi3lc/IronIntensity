import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Alert } from '@/utils/themedAlert';
import { useState, useCallback, useMemo } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { ThemedCalendar } from '@/components/themedCalendar';
import { logger } from '@/utils/logger';
import {
    getCommunityCalendar,
    getRecurringSchedules,
    rsvpSession,
    unrsvpSession,
    checkinPlannedSession,
    deletePlannedSession,
    PlannedSession,
    RecurringSchedule,
} from '@/repositories/communityCalendar';
import { getNotifPrefs } from '@/utils/notificationPrefs';
import { scheduleSessionReminder, cancelSessionReminder } from '@/utils/localReminders';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // ISO 1..7

function formatSessionWhen(s: PlannedSession): string {
    const day = format(parseISO(s.scheduled_date), 'EEE, MMM d');
    return s.scheduled_time ? `${day} · ${s.scheduled_time}` : day;
}

function formatWeekdays(days: number[]): string {
    return [...days].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d - 1]).filter(Boolean).join(' ');
}

export function CommunityCalendarTab({ communityId, onStale }: { communityId: string; onStale: (stale: boolean) => void }) {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<PlannedSession[]>([]);
    const [regulars, setRegulars] = useState<RecurringSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Dot on every day with a session, plus the selected-day highlight.
    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};
        for (const s of sessions) {
            marks[s.scheduled_date] = { ...(marks[s.scheduled_date] || {}), marked: true };
        }
        marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true };
        return marks;
    }, [sessions, selectedDate]);

    const daySessions = useMemo(
        () => sessions.filter(s => s.scheduled_date === selectedDate),
        [sessions, selectedDate]
    );

    const load = useCallback(async () => {
        const [cal, rec] = await Promise.all([
            getCommunityCalendar(communityId),
            getRecurringSchedules(communityId),
        ]);
        setSessions(cal.data);
        setRegulars(rec.data);
        onStale(cal.stale || rec.stale);
        setLoading(false);

        // Reconcile local reminders for sessions I own or RSVP'd to (idempotent).
        try {
            const prefs = await getNotifPrefs();
            for (const s of cal.data) {
                if (s.is_own || s.i_rsvped) {
                    await scheduleSessionReminder(s.id, s.scheduled_date, s.scheduled_time, s.title, prefs);
                }
            }
        } catch { /* best-effort */ }
    }, [communityId, onStale]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                await load();
                if (!active) return;
            })();
            return () => { active = false; };
        }, [load])
    );

    const toggleRsvp = useCallback(async (s: PlannedSession) => {
        if (!user?.id) return;
        const next = !s.i_rsvped;
        setSessions(prev => prev.map(x => x.id === s.id
            ? { ...x, i_rsvped: next, rsvp_count: x.rsvp_count + (next ? 1 : -1) }
            : x));
        try {
            if (next) {
                await rsvpSession(s.id, user.id);
                const prefs = await getNotifPrefs();
                await scheduleSessionReminder(s.id, s.scheduled_date, s.scheduled_time, s.title, prefs);
            } else {
                await unrsvpSession(s.id, user.id);
                await cancelSessionReminder(s.id);
            }
        } catch (e) {
            logger.error('Failed to RSVP:', e);
            setSessions(prev => prev.map(x => x.id === s.id
                ? { ...x, i_rsvped: s.i_rsvped, rsvp_count: s.rsvp_count }
                : x));
            Alert.alert('Could not update', 'Check your connection and try again.');
        }
    }, [user?.id]);

    const checkIn = useCallback(async (s: PlannedSession) => {
        setSessions(prev => prev.map(x => x.id === s.id ? { ...x, checked_in: true } : x));
        try {
            await checkinPlannedSession(s.id);
        } catch (e) {
            logger.error('Failed to check in:', e);
            setSessions(prev => prev.map(x => x.id === s.id ? { ...x, checked_in: false } : x));
            Alert.alert('Could not check in', 'Check your connection and try again.');
        }
    }, []);

    const remove = useCallback((s: PlannedSession) => {
        Alert.alert('Delete session', 'Remove this planned session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setSessions(prev => prev.filter(x => x.id !== s.id));
                    cancelSessionReminder(s.id);
                    try {
                        await deletePlannedSession(s.id);
                    } catch (e) {
                        logger.error('Failed to delete session:', e);
                        Alert.alert('Could not delete', 'Check your connection and try again.');
                        load();
                    }
                },
            },
        ]);
    }, [load]);

    const renderSession = (s: PlannedSession) => (
        <View key={s.id} className="bg-surface_a10 p-4 rounded-xl mb-2">
            <View className="flex-row items-center">
                <TouchableOpacity
                    className="flex-1"
                    activeOpacity={0.7}
                    onPress={() => router.push({
                        pathname: '/communities/[id]/session',
                        params: { id: communityId, sid: s.id, title: s.title || 'Planned session', when: formatSessionWhen(s) },
                    })}
                >
                    <Text className="text-white font-semibold">
                        {s.is_own ? 'You' : s.username}
                        {s.title ? ` · ${s.title}` : ''}
                        {'  ›'}
                    </Text>
                    <Text className="text-surface_a50 text-sm mt-0.5">{formatSessionWhen(s)}</Text>
                </TouchableOpacity>
                {s.checked_in && (
                    <View className="flex-row items-center">
                        <AntDesign name="check-circle" size={14} color="#4ade80" />
                        <Text className="text-surface_a50 text-xs ml-1">Showed up</Text>
                    </View>
                )}
            </View>

            <View className="flex-row items-center mt-3">
                {!s.is_own ? (
                    <TouchableOpacity
                        onPress={() => toggleRsvp(s)}
                        className={`px-3 py-1.5 rounded-full flex-row items-center ${s.i_rsvped ? 'bg-primary_a0' : 'bg-surface_a20'}`}
                        activeOpacity={0.8}
                    >
                        <AntDesign name={s.i_rsvped ? 'check' : 'plus'} size={12} color={s.i_rsvped ? 'white' : '#9ca3af'} />
                        <Text className={`text-xs font-bold ml-1 ${s.i_rsvped ? 'text-white' : 'text-surface_a50'}`}>
                            {s.i_rsvped ? "I'm in" : 'Join'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View className="flex-row gap-2">
                        {!s.checked_in && (
                            <TouchableOpacity
                                onPress={() => checkIn(s)}
                                className="px-3 py-1.5 rounded-full bg-surface_a20 flex-row items-center"
                                activeOpacity={0.8}
                            >
                                <AntDesign name="check" size={12} color="#9ca3af" />
                                <Text className="text-surface_a50 text-xs font-bold ml-1">I showed up</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => remove(s)}
                            className="px-3 py-1.5 rounded-full bg-surface_a20 flex-row items-center"
                            activeOpacity={0.8}
                        >
                            <AntDesign name="delete" size={12} color="#9ca3af" />
                            <Text className="text-surface_a50 text-xs font-bold ml-1">Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <Text className="text-surface_a50 text-xs ml-auto">{s.rsvp_count} in</Text>
            </View>
        </View>
    );

    return (
        <>
            {/* Actions */}
            <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/communities/[id]/plan', params: { id: communityId } })}
                    className="flex-1 bg-primary_a0 py-3 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.85}
                >
                    <AntDesign name="plus" size={16} color="white" />
                    <Text className="text-white font-bold text-sm ml-2">Plan a session</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/communities/[id]/schedule', params: { id: communityId } })}
                    className="flex-1 bg-surface_a10 py-3 rounded-xl flex-row items-center justify-center"
                    activeOpacity={0.85}
                >
                    <AntDesign name="sync" size={16} color="#eb0202" />
                    <Text className="text-white font-bold text-sm ml-2">My schedule</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="mt-12 items-center">
                    <ActivityIndicator size="large" color="#f34023" />
                </View>
            ) : (
                <>
                    {/* Month calendar with a dot on days that have sessions */}
                    <View className="bg-surface_a10 rounded-2xl mb-4 px-2 py-1 overflow-hidden">
                        <ThemedCalendar
                            markedDates={markedDates}
                            onDayPress={(day) => setSelectedDate(day.dateString)}
                        />
                    </View>

                    {/* Sessions on the selected day */}
                    <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2">
                        {format(parseISO(selectedDate), 'EEEE, MMM d')}
                    </Text>
                    {daySessions.length === 0 ? (
                        <Text className="text-surface_a50 text-center my-6">
                            Nothing planned this day.
                        </Text>
                    ) : (
                        daySessions.map(renderSession)
                    )}

                    {regulars.length > 0 && (
                        <>
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-2 mt-6">Weekly regulars</Text>
                            {regulars.map(r => (
                                <View key={r.user_id} className="bg-surface_a10 px-4 py-3 rounded-xl mb-2">
                                    <Text className="text-white font-semibold">
                                        {r.user_id === user?.id ? 'You' : r.username}
                                        {r.title ? ` · ${r.title}` : ''}
                                    </Text>
                                    <Text className="text-surface_a50 text-sm mt-0.5">
                                        {formatWeekdays(r.weekdays)}{r.scheduled_time ? ` · ${r.scheduled_time}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                </>
            )}
        </>
    );
}
