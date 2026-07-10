import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createCommunity } from '@/repositories/communities';
import { logger } from '@/utils/logger';

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            Alert.alert('Name required', 'Give your community a name.');
            return;
        }
        setSubmitting(true);
        try {
            const community = await createCommunity(trimmed);
            // Replace so Back returns to the list, not this form.
            router.replace({ pathname: '/communities/[id]', params: { id: community.id, name: community.name, code: community.invite_code } });
        } catch (e) {
            logger.error('Failed to create community:', e);
            Alert.alert('Could not create', 'Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            <View className="px-4 pt-4 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 bg-surface_a10 rounded-xl"
                    activeOpacity={0.7}
                >
                    <AntDesign name="arrow-left" size={24} color="#eb0202" />
                </TouchableOpacity>
                <View className="flex-1 mx-4">
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Create</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 px-4"
            >
                <Text className="text-surface_a50 text-sm mb-2 mt-4">Community name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Iron Crew, Monday Squad"
                    placeholderTextColor="#7a7a7a"
                    className="bg-surface_a10 text-white text-base px-4 py-4 rounded-xl"
                    maxLength={40}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                />
                <Text className="text-surface_a50 text-xs mt-3">
                    You&apos;ll get an invite code to share once it&apos;s created. Private until then.
                </Text>

                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={submitting}
                    className={`py-4 rounded-xl flex-row items-center justify-center mt-6 ${submitting ? 'bg-surface_a20' : 'bg-primary_a0'}`}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base">
                        {submitting ? 'Creating...' : 'Create community'}
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
