import React from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AntDesign } from '@expo/vector-icons';

interface FinishWorkoutModalProps {
    visible: boolean;
    onClose: () => void;
    workoutNameInput: string;
    setWorkoutNameInput: (text: string) => void;
    workoutDate: Date;
    setWorkoutDate: (date: Date) => void;
    finishWorkoutWithData: () => void;
    title?: string; // Optional custom title
    buttonText?: string; // Optional custom button text
}

const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({
                                                                   visible,
                                                                   onClose,
                                                                   workoutNameInput,
                                                                   setWorkoutNameInput,
                                                                   workoutDate,
                                                                   setWorkoutDate,
                                                                   finishWorkoutWithData,
                                                                   title = 'Finish Workout', // Default value
                                                                   buttonText = 'Complete Workout', // Default value
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

    const handleFinish = () => {
        if (!workoutNameInput.trim()) {
            // Show an error or just return
            return;
        }
        onClose();
        finishWorkoutWithData();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 justify-center items-center bg-black/70 px-4"
            >
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl w-full max-w-md overflow-hidden"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    {/* Header */}
                    <View className="bg-primary_a10 px-6 py-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                                <AntDesign name="check-circle" size={20} color="white" />
                            </View>
                            <Text className="text-white text-xl font-bold">{title}</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                        >
                            <AntDesign name="close" size={20} color="white" />
                        </Pressable>
                    </View>

                    <View className="p-6">
                        {/* Workout Name Input */}
                        <View className="mb-6">
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3">
                                WORKOUT NAME
                            </Text>
                            <View className="flex-row items-center bg-surface_a20 rounded-xl px-4 py-3">
                                <AntDesign name="edit" size={18} color="#ff7857" style={{ marginRight: 12 }} />
                                <TextInput
                                    value={workoutNameInput}
                                    onChangeText={setWorkoutNameInput}
                                    placeholder="Enter workout name"
                                    placeholderTextColor="#8b8b8b"
                                    className="flex-1 text-white text-base"
                                />
                            </View>
                        </View>

                        {/* Date Selection */}
                        <View className="mb-6">
                            <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3">
                                WORKOUT DATE
                            </Text>
                            <View className="bg-surface_a20 rounded-xl overflow-hidden">
                                <Calendar
                                    firstDay={1}
                                    onDayPress={onDayPress}
                                    hideExtraDays={false}
                                    markedDates={markedDates}
                                    markingType="multi-dot"
                                    theme={{
                                        calendarBackground: '#3f3f3f',
                                        dayTextColor: '#ffffff',
                                        monthTextColor: '#ffffff',
                                        arrowColor: '#ffffff',
                                        selectedDayBackgroundColor: '#eb0202',
                                        todayTextColor: '#ff7857',
                                        textMonthFontSize: 18,
                                        textMonthFontWeight: 'bold',
                                    }}
                                />
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="gap-3">
                            {/* Finish Button */}
                            <Pressable
                                onPress={handleFinish}
                                disabled={!workoutNameInput.trim()}
                                className={`rounded-xl py-4 flex-row items-center justify-center gap-2 ${
                                    !workoutNameInput.trim()
                                        ? 'bg-surface_a30'
                                        : 'bg-primary_a10 active:bg-primary_a0'
                                }`}
                            >
                                <AntDesign name="check" size={20} color="white" />
                                <Text className="text-white text-base font-bold">{buttonText}</Text>
                            </Pressable>

                            {/* Cancel Button */}
                            <Pressable
                                onPress={onClose}
                                className="bg-surface_a20 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-surface_a30"
                            >
                                <AntDesign name="close-circle" size={18} color="#8b8b8b" />
                                <Text className="text-surface_a50 text-base font-bold">Cancel</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default FinishWorkoutModal;