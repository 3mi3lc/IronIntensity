import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import {  useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import {useSync} from "@/hooks/useSync";
import {useAuth} from "@/hooks/useAuth";

export default function Profile() {
    const { pushData, pullData } = useSync();
    const { user, signOut } = useAuth();

    const [isSyncing, setIsSyncing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const handleSync = async () => {
        if (!pushData) return;

        setIsSyncing(true);
        try {
            const success = await pushData();
            Alert.alert(success ? "Success" : "Failed",
                success ? "Data synced successfully!" : "Failed to sync. Try again.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePull = async () => {
        if (!pullData) return;

        Alert.alert(
            "Restore Data",
            "This will overwrite local data with your cloud backup. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Restore",
                    style: "destructive",
                    onPress: async () => {
                        setIsPulling(true);
                        try {
                            const ok = await pullData();
                            Alert.alert(
                                ok ? "Restored" : "Restore Failed",
                                ok ? "Cloud data has been restored locally." :
                                    "An error occurred while restoring."
                            );
                        } finally {
                            setIsPulling(false);
                        }
                    }
                }
            ]
        );
    };

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
                        if (signOut) await signOut();
                    }
                },
            ]
        );
    };

    return (
        <View className="flex-1 bg-surface_a0 pt-16 px-6">
            <Text className="text-white text-3xl font-bold mb-8">Profile</Text>

            <View className="bg-surface_a10 p-6 rounded-2xl mb-4">
                <Text className="text-surface_a50 text-sm mb-2">Email</Text>
                <Text className="text-white text-lg mb-4">{user?.email || 'Not logged in'}</Text>

                <Text className="text-surface_a50 text-sm mb-2">Username</Text>
                <Text className="text-white text-lg">{user?.username || 'Not logged in'}</Text>
            </View>

            {/* Sync Button */}
            <TouchableOpacity
                onPress={handleSync}
                disabled={isSyncing}
                className={`py-4 rounded-xl flex-row items-center justify-center mb-3 ${
                    isSyncing ? 'bg-surface_a30' : 'bg-primary_a10'
                }`}
                activeOpacity={0.8}
            >
                {isSyncing ? (
                    <>
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-white font-bold text-lg ml-2">Syncing...</Text>
                    </>
                ) : (
                    <>
                        <AntDesign name="upload" size={20} color="white" />
                        <Text className="text-white font-bold text-lg ml-2">Sync (Upload Data)</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Pull Button */}
            <TouchableOpacity
                onPress={handlePull}
                disabled={isPulling}
                className={`py-4 rounded-xl flex-row items-center justify-center mb-4 ${
                    isPulling ? 'bg-surface_a30' : 'bg-primary_a10'
                }`}
                activeOpacity={0.8}
            >
                {isPulling ? (
                    <>
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-white font-bold text-lg ml-2">Restoring...</Text>
                    </>
                ) : (
                    <>
                        <AntDesign name="download" size={20} color="white" />
                        <Text className="text-white font-bold text-lg ml-2">Pull (Restore Backup)</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Logout Button */}
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
