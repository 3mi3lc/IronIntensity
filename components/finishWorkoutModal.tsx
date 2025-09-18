import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

interface FinishWorkoutModalProps {
    visible: boolean;
    onClose: () => void;
    workoutNameInput: string;
    setWorkoutNameInput: (text: string) => void;
    workoutDate: Date;
    setWorkoutDate: (date: Date) => void;
    finishWorkoutWithData: () => void;
}

const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({
                                                                   visible,
                                                                   onClose,
                                                                   workoutNameInput,
                                                                   setWorkoutNameInput,
                                                                   workoutDate,
                                                                   setWorkoutDate,
                                                                   finishWorkoutWithData,
                                                               }) => {
    const [selected, setSelected] = React.useState(
        workoutDate.toISOString().split('T')[0]
    );

    const onDayPress = (day: { dateString: string }) => {
        setSelected(day.dateString);
        setWorkoutDate(new Date(day.dateString));
    };

    const markedDates = {
        [selected]: {
            selected: true,
            selectedColor: '#eb0202',
            dots: [],
        },
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-8">
                <View className="bg-surface_a20 rounded-xl p-6 w-full max-w-md">
                    <Text className="text-primary_a0 font-bold text-xl mb-4">Name your workout</Text>

                    <TextInput
                        value={workoutNameInput}
                        onChangeText={setWorkoutNameInput}
                        placeholder="Workout name"
                        placeholderTextColor="#aaa"
                        className="bg-white rounded p-3 mb-6 text-black"
                    />

                    <Text className="text-primary_a10 font-bold mb-2">Date of workout</Text>

                    <Calendar
                        firstDay={1}
                        onDayPress={onDayPress}
                        hideExtraDays={false}
                        markedDates={markedDates}
                        markingType="multi-dot"
                        theme={{
                            calendarBackground: '#282828',
                            dayTextColor: '#ffffff',
                            monthTextColor: '#ffffff',
                            arrowColor: '#ffffff',
                            selectedDayBackgroundColor: '#f95e3d',
                            todayTextColor: '#f95e3d',
                            textMonthFontSize: 20,
                            textMonthFontWeight: 'bold',
                        }}
                        style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', gap: 16, marginTop: 16 }}>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-primary_a0 px-8 py-2 rounded"
                        >
                            <Text className="text-white font-bold">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                onClose();
                                finishWorkoutWithData();
                            }}
                            className="bg-primary_a0 px-8 py-2 rounded"
                        >
                            <Text className="text-white font-bold">Finish</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default FinishWorkoutModal;
