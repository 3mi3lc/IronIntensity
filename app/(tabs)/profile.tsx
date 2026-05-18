import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import { useSync, SyncResult } from "@/hooks/useSync";
import { useAuth } from "@/hooks/useAuth";
import { recalculateAllPRs } from '@/repositories/workoutExerciseSets';

export default function Profile() {
    const { pushData, pullData } = useSync();
    const { user, signOut } = useAuth();

    const [isSyncing, setIsSyncing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [syncErrors, setSyncErrors] = useState<Array<{ entity: string; error: string }>>([]);

    const showSyncResult = (result: SyncResult, action: 'sync' | 'pull') => {
        if (result.success) {
            setSyncErrors([]);
            Alert.alert('Success', action === 'sync' ? 'Data synced successfully!' : 'Cloud data restored successfully.');
        } else {
            setSyncErrors(result.failures);
            const errorList = result.failures
                .map(f => `• ${f.entity}: ${f.error}`)
                .join('\n');
            Alert.alert(
                'Sync Failed',
                `The following failed:\n\n${errorList}\n\nTap sync again to retry.`
            );
        }
    };

    const handleSync = async () => {
        setSyncErrors([]);
        setIsSyncing(true);
        try {
            const result = await pushData();
            showSyncResult(result, 'sync');
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePull = async () => {
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
                            const result = await pullData();
                            showSyncResult(result, 'pull');
                        } finally {
                            setIsPulling(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRecalculatePRs = () => {
        Alert.alert(
            'Recalculate PRs',
            'This will scan all your completed workouts in order and mark personal records.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Recalculate',
                    onPress: async () => {
                        if (!user?.id) return;
                        setIsRecalculating(true);
                        try {
                            await recalculateAllPRs(user.id);
                            Alert.alert('Done', 'PRs have been recalculated across all workouts.');
                        } catch {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        } finally {
                            setIsRecalculating(false);
                        }
                    },
                },
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

            {/* Sync errors banner */}
            {syncErrors.length > 0 && (
                <View className="bg-primary_a0/20 border border-primary_a0 rounded-xl p-4 mb-4">
                    <Text className="text-primary_a0 font-bold mb-2">Last sync had errors:</Text>
                    {syncErrors.map((e, i) => (
                        <Text key={i} className="text-primary_a30 text-sm">• {e.entity}: {e.error}</Text>
                    ))}
                </View>
            )}

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

            {/* Recalculate PRs Button */}
            <TouchableOpacity
                onPress={handleRecalculatePRs}
                disabled={isRecalculating}
                className={`py-4 rounded-xl flex-row items-center justify-center mb-3 ${
                    isRecalculating ? 'bg-surface_a30' : 'bg-surface_a10'
                }`}
                activeOpacity={0.8}
            >
                {isRecalculating ? (
                    <>
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-white font-bold text-lg ml-2">Recalculating...</Text>
                    </>
                ) : (
                    <>
                        <AntDesign name="star" size={20} color="#f34023" />
                        <Text className="text-white font-bold text-lg ml-2">Recalculate PRs</Text>
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