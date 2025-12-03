// app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useContext } from 'react';
import { useRouter } from 'expo-router';
import { UserContext } from '@/contexts/UserContext';
import { AntDesign } from '@expo/vector-icons';

export default function Profile() {
    const router = useRouter();
    const { user, signOut } = useContext(UserContext) ?? {};

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        console.log('Profile: Logging out...');
                        if (signOut) {
                            await signOut();
                            console.log('Profile: Signed out, navigating to login...');
                            router.replace('/auth/login');
                        }
                    }
                },
            ]
        );
    };

    return (
        <View className="flex-1 bg-surface_a0 pt-16 px-6">
            <Text className="text-primary_a0 text-3xl font-bold mb-8">Profile</Text>

            <View className="bg-surface_a10 p-6 rounded-2xl mb-4">
                <Text className="text-surface_a50 text-sm mb-2">Email</Text>
                <Text className="text-white text-lg mb-4">{user?.email || 'Not logged in'}</Text>

                <Text className="text-surface_a50 text-sm mb-2">Username</Text>
                <Text className="text-white text-lg">{user?.username || 'Not logged in'}</Text>
            </View>

            <TouchableOpacity
                onPress={handleLogout}
                className="bg-primary_a0 py-4 rounded-xl flex-row items-center justify-center"
                activeOpacity={0.8}
            >
                <AntDesign name="logout" size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Logout</Text>
            </TouchableOpacity>
        </View>
    );
}