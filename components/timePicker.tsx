import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

const pad = (n: number) => n.toString().padStart(2, '0');
const toInt = (s: string) => {
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
};

/**
 * In-app time picker matching the app design (no native dialog). The fields are
 * typeable for an exact time, and the chevrons nudge — hours by 1, minutes
 * snapped to the nearest 5 — both wrapping around. Operates on a Date; only the
 * hour/minute fields are touched.
 */
export function TimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    // Text is the source of truth while editing; seeded once from `value`.
    const [hourText, setHourText] = useState(pad(value.getHours()));
    const [minuteText, setMinuteText] = useState(pad(value.getMinutes()));

    const commit = (h: number, m: number) => {
        const d = new Date(value);
        d.setHours((h + 24) % 24);
        d.setMinutes((m + 60) % 60);
        d.setSeconds(0, 0);
        onChange(d);
    };

    const onHourText = (t: string) => {
        const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
        setHourText(digits);
        const n = toInt(digits);
        if (n <= 23) commit(n, toInt(minuteText));
    };
    const onMinuteText = (t: string) => {
        const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
        setMinuteText(digits);
        const n = toInt(digits);
        if (n <= 59) commit(toInt(hourText), n);
    };

    const blurHour = () => {
        const n = Math.min(23, toInt(hourText));
        setHourText(pad(n));
        commit(n, toInt(minuteText));
    };
    const blurMinute = () => {
        const n = Math.min(59, toInt(minuteText));
        setMinuteText(pad(n));
        commit(toInt(hourText), n);
    };

    const nudgeHour = (dir: number) => {
        const h = (toInt(hourText) + dir + 24) % 24;
        setHourText(pad(h));
        commit(h, toInt(minuteText));
    };
    const nudgeMinute = (dir: number) => {
        const m = toInt(minuteText);
        const snapped = dir > 0 ? (Math.floor(m / 5) + 1) * 5 : (Math.ceil(m / 5) - 1) * 5;
        const next = (snapped + 60) % 60;
        setMinuteText(pad(next));
        commit(toInt(hourText), next);
    };

    return (
        <View className="bg-surface_a10 rounded-xl py-4 flex-row items-center justify-center gap-3">
            {/* Hours */}
            <View className="items-center">
                <TouchableOpacity onPress={() => nudgeHour(1)} className="w-16 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                    <AntDesign name="up" size={16} color="#eb0202" />
                </TouchableOpacity>
                <TextInput
                    value={hourText}
                    onChangeText={onHourText}
                    onBlur={blurHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    className="text-white text-4xl font-bold my-2 text-center"
                    style={{ minWidth: 64 }}
                />
                <TouchableOpacity onPress={() => nudgeHour(-1)} className="w-16 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                    <AntDesign name="down" size={16} color="#eb0202" />
                </TouchableOpacity>
            </View>

            <Text className="text-white text-4xl font-bold">:</Text>

            {/* Minutes */}
            <View className="items-center">
                <TouchableOpacity onPress={() => nudgeMinute(1)} className="w-16 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                    <AntDesign name="up" size={16} color="#eb0202" />
                </TouchableOpacity>
                <TextInput
                    value={minuteText}
                    onChangeText={onMinuteText}
                    onBlur={blurMinute}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    className="text-white text-4xl font-bold my-2 text-center"
                    style={{ minWidth: 64 }}
                />
                <TouchableOpacity onPress={() => nudgeMinute(-1)} className="w-16 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                    <AntDesign name="down" size={16} color="#eb0202" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
