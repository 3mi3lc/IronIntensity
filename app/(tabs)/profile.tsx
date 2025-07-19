import { View, Text, Pressable, Alert } from 'react-native';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';

function Profile() {
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert('Logout failed', error.message);
        } else {
            router.replace('/auth/login');
        }
    };

    return (
        <View className="flex-1 items-center justify-center bg-surface_a10">
            <Text className="text-white font-bold text-xl mb-6">Profile</Text>

            <Pressable
                onPress={handleLogout}
                className="bg-primary_a0 px-6 py-3 rounded-md"
            >
                <Text className="text-white font-bold text-lg">Log Out</Text>
            </Pressable>
        </View>
    );
}

export default Profile;
