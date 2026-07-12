import { useContext } from 'react';
import { logger } from '@/utils/logger';
import { Alert } from '@/utils/themedAlert';
import { supabase } from '@/utils/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { UserContext } from '@/contexts/UserContext';
import { clearAllUserData } from '@/db/cleanup';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
    const auth = useContext(AuthContext);
    const userContext = useContext(UserContext);

    if (!auth) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    const signUp = async (email: string, password: string, username: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username },
                },
            });

            if (error) {
                return { error: error.message };
            }

            return {};
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign up' };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { error: error.message };
            }

            // Store the user ID for offline access
            if (data.user) {
                await AsyncStorage.setItem('lastUserId', data.user.id);
            }

            return {};
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign in' };
        }
    };

    const signOut = async () => {
        const isOffline = userContext?.isOffline || false;

        // Show warning if offline
        if (isOffline) {
            return new Promise<void>((resolve) => {
                Alert.alert(
                    'Sign Out Offline',
                    'You are currently offline. If you sign out now, you will need an internet connection to sign back in.\n\nAre you sure you want to continue?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => resolve(),
                        },
                        {
                            text: 'Sign Out',
                            style: 'destructive',
                            onPress: async () => {
                                await performSignOut();
                                resolve();
                            },
                        },
                    ]
                );
            });
        }

        // If online, sign out normally
        await performSignOut();
    };

    const performSignOut = async () => {
        try {
            // Clear user state immediately
            userContext?.clearUser();

            // Clear local database first (most important for offline)
            await clearAllUserData();

            // Clear stored user ID
            await AsyncStorage.removeItem('lastUserId');

            await supabase.auth.signOut({ scope: 'local' });

            // Force navigate to login
            router.replace('/auth/login');
        } catch (error) {
            logger.error('Failed to sign out:', error);

            // Even if something fails, try to clear critical data and redirect
            try {
                userContext?.clearUser();
                await AsyncStorage.removeItem('lastUserId');
                // Still try to clear local Supabase session
                await supabase.auth.signOut({ scope: 'local' });
            } catch (cleanupError) {
                logger.error('Failed to cleanup:', cleanupError);
            }

            router.replace('/auth/login');
        }
    };

    return {
        session: auth.session,
        user: userContext?.user || null,
        isLoading: auth.isLoading || userContext?.isLoading || false,
        isOffline: userContext?.isOffline || false,
        signUp,
        signIn,
        signOut,
    };
};
