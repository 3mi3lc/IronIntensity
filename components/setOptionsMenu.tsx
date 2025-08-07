import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

interface SetActionMenuProps {
    visible: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const SetOptionsMenu: React.FC<SetActionMenuProps> = ({ visible, onClose, onDelete }) => {
    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/50 justify-center items-center"
            >
                <View className="bg-surface_a30 w-4/5 p-6 rounded-lg">
                    {/* Title */}
                    <Text className="text-white text-lg font-semibold mb-4 text-center">
                        Set Options
                    </Text>

                    {/* Delete Button */}
                    <Pressable
                        onPress={() => {
                            onClose();
                            onDelete();
                        }}
                        className="py-3 px-4 bg-primary_a0 rounded-md"
                    >
                        <Text className="text-white text-base text-center font-medium">Delete Set</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

export default SetOptionsMenu;
