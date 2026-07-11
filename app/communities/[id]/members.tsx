import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/loadingScreen';
import {
    getCommunityMembers,
    getMyCommunities,
    leaveCommunity,
    setCommunityVisibility,
    CommunityMember,
} from '@/repositories/communities';
import { removeMember, reportMember, promoteMember } from '@/repositories/communityModeration';
import { getReliability } from '@/repositories/communityCalendar';
import { ReportModal } from '@/components/reportModal';
import { logger } from '@/utils/logger';

export default function CommunityMembersScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const { user } = useAuth();
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [reliability, setReliability] = useState<Map<string, { kept: number; total: number }>>(new Map());
    const [myRole, setMyRole] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [reportTarget, setReportTarget] = useState<CommunityMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [stale, setStale] = useState(false);

    const isAdmin = myRole === 'admin';

    const load = useCallback(async () => {
        if (!id) return;
        const [mem, rel, mine] = await Promise.all([
            getCommunityMembers(id),
            getReliability(id),
            getMyCommunities(),
        ]);
        setMembers(mem.data);
        setReliability(new Map(rel.data.map(r => [r.user_id, { kept: r.kept, total: r.total }])));
        const thisOne = mine.data.find(c => c.id === id);
        if (thisOne) {
            setMyRole(thisOne.role);
            setIsPublic(thisOne.is_public);
        }
        setStale(mem.stale || rel.stale);
    }, [id]);

    const toggleVisibility = useCallback(async (next: boolean) => {
        if (!id) return;
        setIsPublic(next); // optimistic
        try {
            await setCommunityVisibility(id, next);
        } catch (e) {
            logger.error('Failed to set visibility:', e);
            setIsPublic(!next);
            Alert.alert('Could not update', 'Check your connection and try again.');
        }
    }, [id]);

    const confirmRemove = useCallback((m: CommunityMember) => {
        if (!id) return;
        Alert.alert('Remove member', `Remove ${m.username} from this community?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    setMembers(prev => prev.filter(x => x.user_id !== m.user_id));
                    try {
                        await removeMember(id, m.user_id);
                    } catch (e) {
                        logger.error('Failed to remove member:', e);
                        Alert.alert('Could not remove', 'Check your connection and try again.');
                        load();
                    }
                },
            },
        ]);
    }, [id, load]);

    const confirmPromote = useCallback((m: CommunityMember) => {
        if (!id) return;
        Alert.alert(
            'Make admin',
            `Give ${m.username} admin rights? They'll be able to moderate posts and manage members.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Make admin',
                    onPress: async () => {
                        setMembers(prev => prev.map(x => x.user_id === m.user_id ? { ...x, role: 'admin' } : x));
                        try {
                            await promoteMember(id, m.user_id);
                        } catch (e) {
                            logger.error('Failed to promote member:', e);
                            Alert.alert('Could not promote', 'Check your connection and try again.');
                            load();
                        }
                    },
                },
            ]
        );
    }, [id, load]);

    // Per-member action menu: report (anyone), and admin actions on non-admins.
    const memberMenu = useCallback((m: CommunityMember) => {
        const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
            { text: 'Report', onPress: () => setReportTarget(m) },
        ];
        if (isAdmin && m.role !== 'admin') {
            buttons.push({ text: 'Make admin', onPress: () => confirmPromote(m) });
            buttons.push({ text: 'Remove from community', style: 'destructive', onPress: () => confirmRemove(m) });
        }
        buttons.push({ text: 'Cancel', style: 'cancel' });
        Alert.alert(m.username, undefined, buttons);
    }, [isAdmin, confirmPromote, confirmRemove]);

    const submitMemberReport = useCallback(async (reason: string | null) => {
        const m = reportTarget;
        setReportTarget(null);
        if (!m || !id || !user?.id) return;
        try {
            await reportMember(id, m.user_id, user.id, reason);
            Alert.alert('Reported', 'Thanks — an admin will review this.');
        } catch (e) {
            logger.error('Failed to report member:', e);
            Alert.alert('Could not report', 'Check your connection and try again.');
        }
    }, [reportTarget, id, user?.id]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                await load();
                if (active) setLoading(false);
            })();
            return () => { active = false; };
        }, [load])
    );

    const handleLeave = useCallback(() => {
        if (!id || !user?.id) return;
        Alert.alert(
            'Leave community',
            `Leave "${name ?? 'this community'}"? You can rejoin later with the invite code.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveCommunity(id, user.id);
                            // Back to the communities list (past the community home).
                            router.dismissAll?.();
                            router.replace('/communities');
                        } catch (e) {
                            logger.error('Failed to leave community:', e);
                            Alert.alert('Could not leave', 'Please check your connection and try again.');
                        }
                    },
                },
            ]
        );
    }, [id, user?.id, name]);

    if (loading) return <LoadingScreen message="Loading members..." />;

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
                    <Text className="text-primary_a0 font-bold text-2xl text-center">Members</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {stale && (
                    <View className="flex-row items-center justify-center mb-4">
                        <AntDesign name="disconnect" size={12} color="#7a7a7a" />
                        <Text className="text-surface_a50 text-xs ml-2">Offline — showing last synced</Text>
                    </View>
                )}

                {/* Admin panel */}
                {isAdmin && (
                    <View className="bg-surface_a10 rounded-xl p-4 mb-4">
                        <Text className="text-surface_a50 text-xs font-bold uppercase tracking-wider mb-3">Admin</Text>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-3">
                                <Text className="text-white font-semibold">Discoverable</Text>
                                <Text className="text-surface_a50 text-xs mt-0.5">Let anyone find and join this community</Text>
                            </View>
                            <Switch
                                value={isPublic}
                                onValueChange={toggleVisibility}
                                trackColor={{ true: '#f34023', false: '#3a3a3a' }}
                                thumbColor="#fff"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/communities/[id]/reports', params: { id: id!, name: name ?? '' } })}
                            className="flex-row items-center justify-between mt-4 pt-4 border-t border-surface_a20"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white font-semibold">Reports</Text>
                            <AntDesign name="right" size={14} color="#7a7a7a" />
                        </TouchableOpacity>
                    </View>
                )}

                {stale && members.length === 0 ? (
                    <Text className="text-surface_a50 text-center mt-12">
                        You are offline and have no saved member list yet.
                    </Text>
                ) : (
                    members.map(m => {
                        const rel = reliability.get(m.user_id);
                        const isSelf = m.user_id === user?.id;
                        return (
                            <View key={m.user_id} className="bg-surface_a10 px-4 py-4 rounded-xl mb-2 flex-row items-center">
                                <View className="w-9 h-9 rounded-full bg-surface_a20 items-center justify-center mr-3">
                                    <Text className="text-white font-bold">{m.username?.charAt(0).toUpperCase() ?? '?'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-semibold" numberOfLines={1}>
                                        {m.username}
                                        {isSelf ? '  (you)' : ''}
                                    </Text>
                                    {rel && rel.total > 0 && (
                                        <Text className="text-surface_a50 text-xs mt-0.5">
                                            Kept {rel.kept}/{rel.total} planned sessions
                                        </Text>
                                    )}
                                </View>
                                {m.role === 'admin' && (
                                    <View className="bg-surface_a20 px-2 py-1 rounded-md mr-1">
                                        <Text className="text-surface_a50 text-xs font-bold">ADMIN</Text>
                                    </View>
                                )}
                                {!isSelf && (
                                    <TouchableOpacity onPress={() => memberMenu(m)} className="p-2" activeOpacity={0.7}>
                                        <AntDesign name="ellipsis" size={18} color="#7a7a7a" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}

                <TouchableOpacity
                    onPress={handleLeave}
                    className="mt-6 py-4 rounded-xl flex-row items-center justify-center border border-primary_a0"
                    activeOpacity={0.85}
                >
                    <AntDesign name="logout" size={18} color="#eb0202" />
                    <Text className="text-primary_a0 font-bold text-base ml-2">Leave community</Text>
                </TouchableOpacity>
            </ScrollView>

            <ReportModal
                visible={!!reportTarget}
                subject={reportTarget ? `Report ${reportTarget.username} to the community admins.` : ''}
                onCancel={() => setReportTarget(null)}
                onSubmit={submitMemberReport}
            />
        </SafeAreaView>
    );
}
