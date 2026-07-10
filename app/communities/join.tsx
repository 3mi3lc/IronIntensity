import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { joinCommunity } from '@/repositories/communities';
import { logger } from '@/utils/logger';

export default function JoinCommunityScreen() {
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleJoin = async () => {
        const trimmed = code.trim();
        if (trimmed.length === 0) {
            Alert.alert('Code required', 'Enter the invite code a friend shared with you.');
            return;
        }
        setSubmitting(true);
        try {
            const community = await joinCommunity(trimmed);
            router.replace({ pathname: '/communities/[id]', params: { id: community.id, name: community.name, code: community.invite_code } });
        } catch (e: any) {
            logger.error('Failed to join community:', e);
            const invalid = typeof e?.message === 'string' && e.message.toLowerCase().includes('invalid');
            Alert.alert(
                invalid ? 'Invalid code' : 'Could not join',
                invalid ? 'No community matches that invite code.' : 'Please check your connection and try again.'
            );
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
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Join</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 px-4"
            >
                <Text className="text-surface_a50 text-sm mb-2 mt-4">Invite code</Text>
                <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="e.g. A3F9K2"
                    placeholderTextColor="#7a7a7a"
                    className="bg-surface_a10 text-white text-2xl tracking-widest text-center px-4 py-4 rounded-xl"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleJoin}
                />

                <TouchableOpacity
                    onPress={handleJoin}
                    disabled={submitting}
                    className={`py-4 rounded-xl flex-row items-center justify-center mt-6 ${submitting ? 'bg-surface_a20' : 'bg-primary_a0'}`}
                    activeOpacity={0.85}
                >
                    <Text className="text-white font-bold text-base">
                        {submitting ? 'Joining...' : 'Join community'}
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
