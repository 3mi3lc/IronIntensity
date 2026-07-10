import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Platform, Switch } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { createPlannedSession } from '@/repositories/communityCalendar';
import { logger } from '@/utils/logger';

export default function PlanSessionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [date, setDate] = useState(new Date());
    const [showDate, setShowDate] = useState(false);
    const [timeEnabled, setTimeEnabled] = useState(false);
    const [time, setTime] = useState(new Date());
    const [showTime, setShowTime] = useState(false);
    const [title, setTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!id) return;
        setSubmitting(true);
        try {
            await createPlannedSession(
                id,
                format(date, 'yyyy-MM-dd'),
                timeEnabled ? format(time, 'HH:mm') : null,
                title.trim() || null,
            );
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
                <Text className="text-surface_a50 text-sm mb-2 mt-4">Date</Text>
                <TouchableOpacity
                    onPress={() => setShowDate(true)}
                    className="bg-surface_a10 px-4 py-4 rounded-xl flex-row items-center justify-between"
                    activeOpacity={0.8}
                >
                    <Text className="text-white text-base">{format(date, 'EEEE, MMM d, yyyy')}</Text>
                    <AntDesign name="calendar" size={18} color="#7a7a7a" />
                </TouchableOpacity>
                {showDate && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        minimumDate={new Date()}
                        onChange={(_, selected) => {
                            setShowDate(Platform.OS === 'ios');
                            if (selected) setDate(selected);
                        }}
                    />
                )}

                {/* Time (optional) */}
                <View className="flex-row items-center justify-between mt-6">
                    <Text className="text-surface_a50 text-sm">Set a time</Text>
                    <Switch
                        value={timeEnabled}
                        onValueChange={setTimeEnabled}
                        trackColor={{ true: '#f34023', false: '#3a3a3a' }}
                        thumbColor="#fff"
                    />
                </View>
                {timeEnabled && (
                    <TouchableOpacity
                        onPress={() => setShowTime(true)}
                        className="bg-surface_a10 px-4 py-4 rounded-xl flex-row items-center justify-between mt-2"
                        activeOpacity={0.8}
                    >
                        <Text className="text-white text-base">{format(time, 'HH:mm')}</Text>
                        <AntDesign name="clock-circle" size={18} color="#7a7a7a" />
                    </TouchableOpacity>
                )}
                {showTime && timeEnabled && (
                    <DateTimePicker
                        value={time}
                        mode="time"
                        is24Hour
                        onChange={(_, selected) => {
                            setShowTime(Platform.OS === 'ios');
                            if (selected) setTime(selected);
                        }}
                    />
                )}

                {/* Title */}
                <Text className="text-surface_a50 text-sm mb-2 mt-6">Title (optional)</Text>
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
