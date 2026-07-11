import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';

/**
 * Report dialog with an optional reason. Cross-platform (Alert.prompt is
 * iOS-only), styled to match the app. Submitting passes the trimmed reason, or
 * null when left blank.
 */
export function ReportModal({
    visible,
    subject,
    onCancel,
    onSubmit,
}: {
    visible: boolean;
    subject: string;
    onCancel: () => void;
    onSubmit: (reason: string | null) => void;
}) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (visible) setReason('');
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable onPress={onCancel} className="flex-1 justify-center items-center bg-black/70 px-4">
                <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface_a10 rounded-2xl w-full max-w-md p-6">
                    <Text className="text-white text-xl font-bold mb-1">Report</Text>
                    <Text className="text-surface_a50 text-sm mb-4">{subject}</Text>
                    <TextInput
                        value={reason}
                        onChangeText={setReason}
                        placeholder="Add a reason (optional)"
                        placeholderTextColor="#7a7a7a"
                        multiline
                        maxLength={280}
                        className="bg-surface_a20 text-white text-base px-4 py-3 rounded-xl"
                        style={{ minHeight: 80, textAlignVertical: 'top' }}
                    />
                    <View className="flex-row gap-3 mt-5">
                        <Pressable onPress={onCancel} className="flex-1 bg-surface_a20 rounded-xl py-3 items-center active:opacity-80">
                            <Text className="text-surface_a50 font-bold">Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => onSubmit(reason.trim() || null)}
                            className="flex-1 bg-primary_a0 rounded-xl py-3 items-center active:opacity-80"
                        >
                            <Text className="text-white font-bold">Report</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
