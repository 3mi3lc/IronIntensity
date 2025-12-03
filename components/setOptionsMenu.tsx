import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface SetActionMenuProps {
    visible: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const SetOptionsMenu: React.FC<SetActionMenuProps> = ({ visible, onClose, onDelete }) => {
    const handleDelete = () => {
        onClose();
        onDelete();
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/70 justify-center items-center"
            >
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl w-[85%] overflow-hidden"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    {/* Header */}
                    <View className="bg-surface_a20 px-6 py-4 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-surface_a30 items-center justify-center">
                                <AntDesign name="setting" size={20} color="#ff7857" />
                            </View>
                            <Text className="text-white text-xl font-bold">Set Options</Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            className="w-10 h-10 rounded-full bg-surface_a30 items-center justify-center active:bg-surface_a40"
                        >
                            <AntDesign name="close" size={20} color="#8b8b8b" />
                        </Pressable>
                    </View>

                    <View className="p-6 gap-3">
                        {/* Delete Button */}
                        <Pressable
                            onPress={handleDelete}
                            className="bg-primary_a0 rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-primary_a10"
                        >
                            <AntDesign name="delete" size={20} color="white" />
                            <Text className="text-white text-base font-bold">Delete Set</Text>
                        </Pressable>

                        {/* Cancel Button */}
                        <Pressable
                            onPress={onClose}
                            className="bg-surface_a20 rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-surface_a30"
                        >
                            <AntDesign name="close-circle" size={18} color="#8b8b8b" />
                            <Text className="text-surface_a50 text-base font-bold">Cancel</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default SetOptionsMenu;