import { View, Text, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * In-app time picker matching the app design (no native dialog). Hours wrap
 * 0..23, minutes step by 5. Operates on a Date so callers can format with
 * date-fns; only the hour/minute fields are touched.
 */
export function TimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const hour = value.getHours();
    const minute = value.getMinutes();

    const setHM = (h: number, m: number) => {
        const d = new Date(value);
        d.setHours((h + 24) % 24);
        d.setMinutes((m + 60) % 60);
        d.setSeconds(0, 0);
        onChange(d);
    };

    const Stepper = ({ display, onUp, onDown }: { display: string; onUp: () => void; onDown: () => void }) => (
        <View className="items-center">
            <TouchableOpacity onPress={onUp} className="w-14 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                <AntDesign name="up" size={16} color="#eb0202" />
            </TouchableOpacity>
            <Text className="text-white text-4xl font-bold my-2">{display}</Text>
            <TouchableOpacity onPress={onDown} className="w-14 h-9 items-center justify-center bg-surface_a20 rounded-lg" activeOpacity={0.7}>
                <AntDesign name="down" size={16} color="#eb0202" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="bg-surface_a10 rounded-xl py-4 flex-row items-center justify-center gap-4">
            <Stepper display={pad(hour)} onUp={() => setHM(hour + 1, minute)} onDown={() => setHM(hour - 1, minute)} />
            <Text className="text-white text-4xl font-bold">:</Text>
            <Stepper display={pad(minute)} onUp={() => setHM(hour, minute + 5)} onDown={() => setHM(hour, minute - 5)} />
        </View>
    );
}
